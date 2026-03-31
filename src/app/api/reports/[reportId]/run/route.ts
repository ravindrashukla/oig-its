import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkPermission, getCaseAccessFilter } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import type { ReportType } from "@/app/api/reports/route";

// ─── POST: Execute a report ──────────────────────────────────

export async function POST(
  request: Request,
  { params }: { params: Promise<{ reportId: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId, role } = session.user;

  if (!checkPermission(role, "report:run")) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { reportId } = await params;

  const definition = await prisma.reportDefinition.findUnique({
    where: { id: reportId },
  });

  if (!definition) {
    return Response.json({ error: "Report not found" }, { status: 404 });
  }

  let body: any = {};
  try {
    body = await request.json();
  } catch {
    // body is optional
  }

  const format: "json" | "csv" = body.format === "csv" ? "csv" : "json";
  const parameters = body.parameters ?? {};

  const startedAt = new Date();
  const queryData = definition.query as Record<string, unknown>;
  const reportType = (queryData._reportType ?? "CUSTOM") as ReportType;
  const accessFilter = getCaseAccessFilter(role, userId);

  let rows: any[] = [];

  try {
    rows = await executeReport(reportType, queryData, parameters, accessFilter);
  } catch (err: any) {
    console.error("[report] Execution failed:", err);
    return Response.json(
      { error: "Report execution failed", details: err.message },
      { status: 500 },
    );
  }

  // Record the run
  const run = await prisma.reportRun.create({
    data: {
      definitionId: reportId,
      runById: userId,
      parameters: parameters as any,
      resultCount: rows.length,
      startedAt,
      completedAt: new Date(),
    },
  });

  void logAudit({
    userId,
    action: "EXPORT",
    entityType: "ReportRun",
    entityId: run.id,
    metadata: { reportId, reportType, format, resultCount: rows.length },
  });

  if (format === "csv") {
    const columns = definition.columns as Array<{ key: string; label: string }>;
    const csv = toCsv(rows, columns);
    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${slugify(definition.name)}-${startedAt.toISOString().slice(0, 10)}.csv"`,
      },
    });
  }

  return Response.json({
    reportId,
    reportName: definition.name,
    reportType,
    runId: run.id,
    resultCount: rows.length,
    data: rows,
  });
}

// ─── Report execution logic ──────────────────────────────────

async function executeReport(
  type: ReportType,
  queryData: Record<string, unknown>,
  parameters: Record<string, unknown>,
  accessFilter: any,
): Promise<any[]> {
  const dateFrom = parameters.dateFrom
    ? new Date(parameters.dateFrom as string)
    : undefined;
  const dateTo = parameters.dateTo
    ? new Date(parameters.dateTo as string)
    : undefined;
  const dateRange = dateFrom || dateTo
    ? {
        createdAt: {
          ...(dateFrom && { gte: dateFrom }),
          ...(dateTo && { lte: dateTo }),
        },
      }
    : {};

  switch (type) {
    case "CASE_SUMMARY":
      return executeCaseSummary(accessFilter, parameters, dateRange);

    case "INVESTIGATION_ACTIVITY":
      return executeInvestigationActivity(accessFilter, parameters, dateRange);

    case "TASK_COMPLETION":
      return executeTaskCompletion(accessFilter, parameters, dateRange);

    case "EVIDENCE_CHAIN":
      return executeEvidenceChain(accessFilter, parameters, dateRange);

    case "AUDIT_TRAIL":
      return executeAuditTrail(parameters, dateRange);

    case "FINANCIAL":
      return executeFinancial(accessFilter, parameters, dateRange);

    case "SEMIANNUAL":
      return executeSemiannual(accessFilter, parameters);

    case "CUSTOM":
    default:
      return executeCustom(queryData, accessFilter, parameters, dateRange);
  }
}

async function executeCaseSummary(
  accessFilter: any,
  parameters: Record<string, unknown>,
  dateRange: any,
) {
  const statusFilter = parameters.status
    ? { status: parameters.status as string }
    : {};
  const typeFilter = parameters.caseType
    ? { caseType: parameters.caseType as string }
    : {};

  const cases = await prisma.case.findMany({
    where: { ...accessFilter, ...statusFilter, ...typeFilter, ...dateRange },
    orderBy: { createdAt: "desc" },
    take: 5000,
    include: {
      assignments: {
        where: { removedAt: null },
        include: {
          user: { select: { firstName: true, lastName: true, email: true } },
        },
      },
      createdBy: { select: { firstName: true, lastName: true } },
      _count: { select: { tasks: true, documents: true, evidenceItems: true } },
    },
  });

  return cases.map((c) => ({
    caseNumber: c.caseNumber,
    title: c.title,
    status: c.status,
    caseType: c.caseType,
    priority: c.priority,
    createdBy: `${c.createdBy.firstName} ${c.createdBy.lastName}`,
    assignees: c.assignments
      .map((a) => `${a.user.firstName} ${a.user.lastName}`)
      .join("; "),
    openedAt: c.openedAt?.toISOString() ?? "",
    closedAt: c.closedAt?.toISOString() ?? "",
    dueDate: c.dueDate?.toISOString() ?? "",
    taskCount: c._count.tasks,
    documentCount: c._count.documents,
    evidenceCount: c._count.evidenceItems,
  }));
}

async function executeInvestigationActivity(
  accessFilter: any,
  _parameters: Record<string, unknown>,
  dateRange: any,
) {
  const cases = await prisma.case.findMany({
    where: { ...accessFilter, ...dateRange },
    orderBy: { createdAt: "desc" },
    take: 5000,
    include: {
      techniques: { select: { type: true, status: true, date: true } },
      _count: { select: { documents: true, evidenceItems: true, tasks: true, notes: true } },
      assignments: {
        where: { removedAt: null },
        include: {
          user: { select: { firstName: true, lastName: true } },
        },
      },
    },
  });

  return cases.map((c) => ({
    caseNumber: c.caseNumber,
    title: c.title,
    status: c.status,
    priority: c.priority,
    assignees: c.assignments
      .map((a) => `${a.user.firstName} ${a.user.lastName}`)
      .join("; "),
    techniqueCount: c.techniques.length,
    techniques: c.techniques.map((t) => t.type).join("; "),
    documentCount: c._count.documents,
    evidenceCount: c._count.evidenceItems,
    taskCount: c._count.tasks,
    noteCount: c._count.notes,
  }));
}

async function executeTaskCompletion(
  accessFilter: any,
  _parameters: Record<string, unknown>,
  dateRange: any,
) {
  const tasks = await prisma.task.findMany({
    where: {
      case: accessFilter,
      ...dateRange,
    },
    orderBy: { createdAt: "desc" },
    take: 5000,
    include: {
      assignee: { select: { firstName: true, lastName: true, email: true } },
      case: { select: { caseNumber: true, title: true } },
    },
  });

  return tasks.map((t) => ({
    caseNumber: t.case.caseNumber,
    caseTitle: t.case.title,
    taskTitle: t.title,
    status: t.status,
    priority: t.priority,
    assignee: t.assignee
      ? `${t.assignee.firstName} ${t.assignee.lastName}`
      : "Unassigned",
    dueDate: t.dueDate?.toISOString() ?? "",
    completedAt: t.completedAt?.toISOString() ?? "",
    createdAt: t.createdAt.toISOString(),
    isOverdue:
      t.dueDate && !t.completedAt && t.dueDate < new Date() ? "Yes" : "No",
  }));
}

async function executeEvidenceChain(
  accessFilter: any,
  _parameters: Record<string, unknown>,
  dateRange: any,
) {
  const evidenceItems = await prisma.evidenceItem.findMany({
    where: {
      case: accessFilter,
      ...dateRange,
    },
    orderBy: { createdAt: "desc" },
    take: 5000,
    include: {
      case: { select: { caseNumber: true, title: true } },
      chainOfCustody: {
        orderBy: { occurredAt: "asc" },
        include: {
          fromUser: { select: { firstName: true, lastName: true } },
          toUser: { select: { firstName: true, lastName: true } },
        },
      },
    },
  });

  return evidenceItems.map((e) => ({
    caseNumber: e.case.caseNumber,
    caseTitle: e.case.title,
    evidenceTitle: e.title,
    type: e.type,
    status: e.status,
    source: e.source ?? "",
    collectedAt: e.collectedAt.toISOString(),
    custodyChain: e.chainOfCustody
      .map(
        (c) =>
          `${c.action}: ${c.fromUser ? `${c.fromUser.firstName} ${c.fromUser.lastName}` : "N/A"} -> ${c.toUser.firstName} ${c.toUser.lastName} (${c.occurredAt.toISOString()})`,
      )
      .join(" | "),
    custodyCount: e.chainOfCustody.length,
  }));
}

async function executeAuditTrail(
  parameters: Record<string, unknown>,
  dateRange: any,
) {
  const entityTypeFilter = parameters.entityType
    ? { entityType: parameters.entityType as string }
    : {};
  const actionFilter = parameters.action
    ? { action: parameters.action as any }
    : {};

  const logs = await prisma.auditLog.findMany({
    where: { ...entityTypeFilter, ...actionFilter, ...dateRange },
    orderBy: { createdAt: "desc" },
    take: 5000,
    include: {
      user: {
        select: { firstName: true, lastName: true, email: true },
      },
    },
  });

  return logs.map((l) => ({
    timestamp: l.createdAt.toISOString(),
    user: l.user
      ? `${l.user.firstName} ${l.user.lastName}`
      : "System",
    userEmail: l.user?.email ?? "",
    action: l.action,
    entityType: l.entityType,
    entityId: l.entityId,
    ipAddress: l.ipAddress ?? "",
  }));
}

async function executeFinancial(
  accessFilter: any,
  _parameters: Record<string, unknown>,
  dateRange: any,
) {
  const results = await prisma.financialResult.findMany({
    where: {
      case: accessFilter,
      ...dateRange,
    },
    orderBy: { createdAt: "desc" },
    take: 5000,
    include: {
      case: { select: { caseNumber: true, title: true } },
      subject: { select: { firstName: true, lastName: true, orgName: true } },
    },
  });

  return results.map((r) => ({
    caseNumber: r.case.caseNumber,
    caseTitle: r.case.title,
    type: r.type,
    amount: r.amount,
    status: r.status,
    description: r.description ?? "",
    subject: r.subject
      ? r.subject.orgName || `${r.subject.firstName} ${r.subject.lastName}`
      : "",
    resultDate: r.resultDate?.toISOString() ?? "",
    createdAt: r.createdAt.toISOString(),
  }));
}

async function executeSemiannual(
  accessFilter: any,
  parameters: Record<string, unknown>,
) {
  // Default to current 6-month period
  const now = new Date();
  const periodStart = parameters.periodStart
    ? new Date(parameters.periodStart as string)
    : new Date(now.getFullYear(), now.getMonth() < 6 ? 0 : 6, 1);
  const periodEnd = parameters.periodEnd
    ? new Date(parameters.periodEnd as string)
    : new Date(now.getFullYear(), now.getMonth() < 6 ? 6 : 12, 0);

  const cases = await prisma.case.findMany({
    where: {
      ...accessFilter,
      OR: [
        { openedAt: { gte: periodStart, lte: periodEnd } },
        { closedAt: { gte: periodStart, lte: periodEnd } },
      ],
    },
    orderBy: { openedAt: "asc" },
    take: 5000,
    include: {
      violations: { select: { type: true, status: true, disposition: true } },
      financialResults: { select: { type: true, amount: true, status: true } },
      referrals: { select: { agencyName: true, status: true } },
      subjectActions: { select: { category: true, type: true, status: true } },
      _count: { select: { subjects: true } },
    },
  });

  return cases.map((c) => ({
    caseNumber: c.caseNumber,
    title: c.title,
    caseType: c.caseType,
    status: c.status,
    openedAt: c.openedAt?.toISOString() ?? "",
    closedAt: c.closedAt?.toISOString() ?? "",
    subjectCount: c._count.subjects,
    violationCount: c.violations.length,
    substantiatedViolations: c.violations.filter(
      (v) => v.status === "SUBSTANTIATED",
    ).length,
    totalFinancialAmount: c.financialResults.reduce(
      (sum, f) => sum + f.amount,
      0,
    ),
    referralCount: c.referrals.length,
    administrativeActions: c.subjectActions.filter(
      (a) => a.category === "ADMINISTRATIVE",
    ).length,
    legalActions: c.subjectActions.filter((a) => a.category === "LEGAL").length,
  }));
}

async function executeCustom(
  queryData: Record<string, unknown>,
  accessFilter: any,
  parameters: Record<string, unknown>,
  dateRange: any,
) {
  // For custom reports, try to query the entity specified in the query data
  const entity = (queryData.entity as string) ?? "case";

  switch (entity.toLowerCase()) {
    case "case":
      return executeCaseSummary(accessFilter, parameters, dateRange);
    case "task":
      return executeTaskCompletion(accessFilter, parameters, dateRange);
    case "evidence":
      return executeEvidenceChain(accessFilter, parameters, dateRange);
    case "audit":
      return executeAuditTrail(parameters, dateRange);
    case "financial":
      return executeFinancial(accessFilter, parameters, dateRange);
    default:
      return executeCaseSummary(accessFilter, parameters, dateRange);
  }
}

// ─── Helpers ─────────────────────────────────────────────────

function toCsv(
  rows: any[],
  columns: Array<{ key: string; label: string }>,
): string {
  if (rows.length === 0) return "";

  // Use column definitions if provided, otherwise derive from data keys
  const headers =
    columns.length > 0
      ? columns
      : Object.keys(rows[0]).map((k) => ({ key: k, label: k }));

  const headerLine = headers.map((h) => escapeCsvField(h.label)).join(",");
  const dataLines = rows.map((row) =>
    headers.map((h) => escapeCsvField(String(row[h.key] ?? ""))).join(","),
  );

  return [headerLine, ...dataLines].join("\n");
}

function escapeCsvField(field: string): string {
  if (field.includes(",") || field.includes('"') || field.includes("\n")) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
