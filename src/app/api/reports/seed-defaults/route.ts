import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

// ─── Standard report definitions ─────────────────────────────

const DEFAULT_REPORTS = [
  {
    name: "Case Summary Report",
    description:
      "Overview of all cases including status, type, priority, and assignment details.",
    query: { _reportType: "CASE_SUMMARY" },
    columns: [
      { key: "caseNumber", label: "Case Number" },
      { key: "title", label: "Title" },
      { key: "status", label: "Status" },
      { key: "caseType", label: "Type" },
      { key: "priority", label: "Priority" },
      { key: "createdBy", label: "Created By" },
      { key: "assignees", label: "Assignees" },
      { key: "openedAt", label: "Opened" },
      { key: "closedAt", label: "Closed" },
      { key: "dueDate", label: "Due Date" },
      { key: "taskCount", label: "Tasks" },
      { key: "documentCount", label: "Documents" },
      { key: "evidenceCount", label: "Evidence" },
    ],
    filters: {
      available: ["status", "caseType", "priority", "dateFrom", "dateTo"],
    },
  },
  {
    name: "Investigation Activity Report",
    description:
      "Cases with investigative techniques, evidence counts, and document counts.",
    query: { _reportType: "INVESTIGATION_ACTIVITY" },
    columns: [
      { key: "caseNumber", label: "Case Number" },
      { key: "title", label: "Title" },
      { key: "status", label: "Status" },
      { key: "priority", label: "Priority" },
      { key: "assignees", label: "Assignees" },
      { key: "techniqueCount", label: "Techniques" },
      { key: "techniques", label: "Technique Types" },
      { key: "documentCount", label: "Documents" },
      { key: "evidenceCount", label: "Evidence" },
      { key: "taskCount", label: "Tasks" },
      { key: "noteCount", label: "Notes" },
    ],
    filters: {
      available: ["status", "priority", "dateFrom", "dateTo"],
    },
  },
  {
    name: "Task Completion Report",
    description:
      "Tasks grouped by status with assignee information and overdue analysis.",
    query: { _reportType: "TASK_COMPLETION" },
    columns: [
      { key: "caseNumber", label: "Case Number" },
      { key: "caseTitle", label: "Case Title" },
      { key: "taskTitle", label: "Task" },
      { key: "status", label: "Status" },
      { key: "priority", label: "Priority" },
      { key: "assignee", label: "Assignee" },
      { key: "dueDate", label: "Due Date" },
      { key: "completedAt", label: "Completed" },
      { key: "createdAt", label: "Created" },
      { key: "isOverdue", label: "Overdue" },
    ],
    filters: {
      available: ["status", "priority", "assigneeId", "dateFrom", "dateTo"],
    },
  },
  {
    name: "Evidence Chain of Custody Report",
    description:
      "Evidence items with full chain of custody details across cases.",
    query: { _reportType: "EVIDENCE_CHAIN" },
    columns: [
      { key: "caseNumber", label: "Case Number" },
      { key: "caseTitle", label: "Case Title" },
      { key: "evidenceTitle", label: "Evidence" },
      { key: "type", label: "Type" },
      { key: "status", label: "Status" },
      { key: "source", label: "Source" },
      { key: "collectedAt", label: "Collected" },
      { key: "custodyChain", label: "Chain of Custody" },
      { key: "custodyCount", label: "Transfers" },
    ],
    filters: {
      available: ["type", "status", "dateFrom", "dateTo"],
    },
  },
  {
    name: "Financial Summary Report",
    description:
      "Financial results grouped by type with totals per case and subject.",
    query: { _reportType: "FINANCIAL" },
    columns: [
      { key: "caseNumber", label: "Case Number" },
      { key: "caseTitle", label: "Case Title" },
      { key: "type", label: "Type" },
      { key: "amount", label: "Amount" },
      { key: "status", label: "Status" },
      { key: "description", label: "Description" },
      { key: "subject", label: "Subject" },
      { key: "resultDate", label: "Result Date" },
      { key: "createdAt", label: "Created" },
    ],
    filters: {
      available: ["type", "status", "dateFrom", "dateTo"],
    },
  },
  {
    name: "Semiannual Report to Congress",
    description:
      "Cases opened and closed during 6-month period with outcomes, violations, and financial results.",
    query: { _reportType: "SEMIANNUAL" },
    columns: [
      { key: "caseNumber", label: "Case Number" },
      { key: "title", label: "Title" },
      { key: "caseType", label: "Type" },
      { key: "status", label: "Status" },
      { key: "openedAt", label: "Opened" },
      { key: "closedAt", label: "Closed" },
      { key: "subjectCount", label: "Subjects" },
      { key: "violationCount", label: "Violations" },
      { key: "substantiatedViolations", label: "Substantiated" },
      { key: "totalFinancialAmount", label: "Financial Total" },
      { key: "referralCount", label: "Referrals" },
      { key: "administrativeActions", label: "Admin Actions" },
      { key: "legalActions", label: "Legal Actions" },
    ],
    filters: {
      available: ["periodStart", "periodEnd"],
    },
  },
  {
    name: "Audit Trail Report",
    description:
      "Audit logs filtered by date range, entity type, and action with user details.",
    query: { _reportType: "AUDIT_TRAIL" },
    columns: [
      { key: "timestamp", label: "Timestamp" },
      { key: "user", label: "User" },
      { key: "userEmail", label: "Email" },
      { key: "action", label: "Action" },
      { key: "entityType", label: "Entity Type" },
      { key: "entityId", label: "Entity ID" },
      { key: "ipAddress", label: "IP Address" },
    ],
    filters: {
      available: ["action", "entityType", "dateFrom", "dateTo"],
    },
  },
];

// ─── POST: Seed default report definitions ───────────────────

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId, role } = session.user;

  // Only admins can seed defaults
  if (role !== "ADMIN") {
    return Response.json({ error: "Forbidden - Admin only" }, { status: 403 });
  }

  const created: string[] = [];
  const skipped: string[] = [];

  for (const report of DEFAULT_REPORTS) {
    const existing = await prisma.reportDefinition.findUnique({
      where: { name: report.name },
    });

    if (existing) {
      skipped.push(report.name);
      continue;
    }

    await prisma.reportDefinition.create({
      data: {
        name: report.name,
        description: report.description,
        query: report.query as any,
        columns: report.columns as any,
        filters: report.filters as any,
        isPublic: true,
      },
    });

    created.push(report.name);
  }

  void logAudit({
    userId,
    action: "CREATE",
    entityType: "ReportDefinition",
    entityId: "seed-defaults",
    metadata: { created, skipped },
  });

  return Response.json({
    message: `Seeded ${created.length} report(s), skipped ${skipped.length} existing.`,
    created,
    skipped,
  });
}
