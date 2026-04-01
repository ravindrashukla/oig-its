import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkPermission, getCaseAccessFilter } from "@/lib/rbac";
import { cacheGet, cacheSet } from "@/lib/cache";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId, role } = session.user;

  if (!checkPermission(role, "case:read")) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const cacheKey = `analytics:${role}:${userId}`;
  const cached = cacheGet(cacheKey);
  if (cached) return Response.json(cached);

  const accessFilter = getCaseAccessFilter(role, userId);
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    // Cases by status
    statusCounts,
    // Cases by type
    typeCounts,
    // Cases by priority
    priorityCounts,
    // Cases by month (raw query via groupBy on openedAt — we'll bucket in JS)
    allCaseDates,
    // Avg days to close
    closedCases,
    // Total cases for closure rate
    totalCases,
    totalClosedArchived,
    // Investigator workload
    investigators,
    // Financial summary
    financialResults,
    // Evidence summary
    evidenceByType,
    evidenceByStatus,
    totalEvidence,
    // Task completion
    taskStatusCounts,
    // Overdue tasks
    overdueTasks,
    // Recent activity
    casesCreatedLast30,
    documentsUploadedLast30,
    evidenceCollectedLast30,
    // RRS12: Status history for avg days in status
    statusHistoryRecords,
    // RRS12: First actions per case (tasks and evidence)
    casesWithFirstAction,
    // RRS12: Active/open cases with no audit activity in last 30 days
    activeCaseIds,
    // RRS12: Oldest active cases
    oldestActiveCasesRaw,
  ] = await Promise.all([
    // Cases by status
    prisma.case.groupBy({
      by: ["status"],
      where: accessFilter,
      _count: true,
    }),
    // Cases by type
    prisma.case.groupBy({
      by: ["caseType"],
      where: accessFilter,
      _count: true,
    }),
    // Cases by priority
    prisma.case.groupBy({
      by: ["priority"],
      where: accessFilter,
      _count: true,
    }),
    // All case open dates for monthly bucketing
    prisma.case.findMany({
      where: accessFilter,
      select: { openedAt: true },
    }),
    // Closed cases with open/close dates for avg days calculation
    prisma.case.findMany({
      where: {
        ...accessFilter,
        status: { in: ["CLOSED", "ARCHIVED"] },
        closedAt: { not: null },
      },
      select: { openedAt: true, closedAt: true },
    }),
    // Total cases
    prisma.case.count({ where: accessFilter }),
    // Total closed/archived
    prisma.case.count({
      where: { ...accessFilter, status: { in: ["CLOSED", "ARCHIVED"] } },
    }),
    // Investigators with workload
    prisma.user.findMany({
      where: {
        role: { in: ["INVESTIGATOR", "SUPERVISOR"] },
        isActive: true,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        caseAssignments: {
          where: {
            removedAt: null,
            case: {
              status: { notIn: ["CLOSED", "ARCHIVED"] },
            },
          },
          select: { id: true },
        },
        tasks: {
          select: { status: true },
        },
      },
    }),
    // Financial results
    prisma.financialResult.findMany({
      where: { case: accessFilter },
      select: { type: true, amount: true },
    }),
    // Evidence by type
    prisma.evidenceItem.groupBy({
      by: ["type"],
      where: { case: accessFilter },
      _count: true,
    }),
    // Evidence by status
    prisma.evidenceItem.groupBy({
      by: ["status"],
      where: { case: accessFilter },
      _count: true,
    }),
    // Total evidence
    prisma.evidenceItem.count({ where: { case: accessFilter } }),
    // Task status counts
    prisma.task.groupBy({
      by: ["status"],
      where: { case: accessFilter },
      _count: true,
    }),
    // Overdue tasks
    prisma.task.count({
      where: {
        status: { in: ["PENDING", "IN_PROGRESS"] },
        dueDate: { lt: now },
        case: accessFilter,
      },
    }),
    // Cases created last 30 days
    prisma.case.count({
      where: { ...accessFilter, createdAt: { gte: thirtyDaysAgo } },
    }),
    // Documents uploaded last 30 days
    prisma.document.count({
      where: { case: accessFilter, createdAt: { gte: thirtyDaysAgo } },
    }),
    // Evidence collected last 30 days
    prisma.evidenceItem.count({
      where: { case: accessFilter, collectedAt: { gte: thirtyDaysAgo } },
    }),
    // RRS12: All status history records for computing avg days in status
    prisma.caseStatusHistory.findMany({
      where: { case: accessFilter },
      select: { caseId: true, toStatus: true, createdAt: true },
      orderBy: [{ caseId: "asc" }, { createdAt: "asc" }],
    }),
    // RRS12: Cases with their openedAt plus earliest task and evidence dates
    prisma.case.findMany({
      where: accessFilter,
      select: {
        id: true,
        openedAt: true,
        tasks: {
          select: { createdAt: true },
          orderBy: { createdAt: "asc" },
          take: 1,
        },
        evidenceItems: {
          select: { collectedAt: true },
          orderBy: { collectedAt: "asc" },
          take: 1,
        },
      },
    }),
    // RRS12: Active/open case ids for checking audit activity
    prisma.case.findMany({
      where: {
        ...accessFilter,
        status: { in: ["ACTIVE", "OPEN"] },
      },
      select: { id: true, openedAt: true },
    }),
    // RRS12: Top 5 oldest active cases
    prisma.case.findMany({
      where: {
        ...accessFilter,
        status: { in: ["ACTIVE", "OPEN", "INTAKE", "UNDER_REVIEW", "PENDING_ACTION"] },
      },
      orderBy: { openedAt: "asc" },
      take: 5,
      select: {
        id: true,
        caseNumber: true,
        title: true,
        status: true,
        openedAt: true,
      },
    }),
  ]);

  // ─── Build casesByStatus ──────────────────────────────────
  const casesByStatus: Record<string, number> = {};
  for (const row of statusCounts) {
    casesByStatus[row.status] = row._count;
  }

  // ─── Build casesByType ────────────────────────────────────
  const casesByType: Record<string, number> = {};
  for (const row of typeCounts) {
    casesByType[row.caseType] = row._count;
  }

  // ─── Build casesByPriority ────────────────────────────────
  const casesByPriority: Record<string, number> = {};
  for (const row of priorityCounts) {
    casesByPriority[row.priority] = row._count;
  }

  // ─── Build casesByMonth ───────────────────────────────────
  const monthMap: Record<string, number> = {};
  for (const c of allCaseDates) {
    const d = new Date(c.openedAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthMap[key] = (monthMap[key] || 0) + 1;
  }
  const casesByMonth = Object.entries(monthMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, count]) => ({ month, count }));

  // ─── Avg days to close ────────────────────────────────────
  let avgDaysToClose = 0;
  if (closedCases.length > 0) {
    const totalDays = closedCases.reduce((sum, c) => {
      const opened = new Date(c.openedAt).getTime();
      const closed = new Date(c.closedAt!).getTime();
      return sum + (closed - opened) / (1000 * 60 * 60 * 24);
    }, 0);
    avgDaysToClose = Math.round((totalDays / closedCases.length) * 10) / 10;
  }

  // ─── Closure rate ─────────────────────────────────────────
  const closureRate = totalCases > 0
    ? Math.round((totalClosedArchived / totalCases) * 100) / 100
    : 0;

  // ─── Investigator workload ────────────────────────────────
  const investigatorWorkload = investigators.map((inv) => ({
    userId: inv.id,
    name: `${inv.firstName} ${inv.lastName}`,
    activeCases: inv.caseAssignments.length,
    completedTasks: inv.tasks.filter((t) => t.status === "COMPLETED").length,
    pendingTasks: inv.tasks.filter(
      (t) => t.status === "PENDING" || t.status === "IN_PROGRESS",
    ).length,
  }));

  // ─── Financial summary ────────────────────────────────────
  const financialSummary = {
    totalRecoveries: 0,
    totalFines: 0,
    totalRestitution: 0,
    totalSavings: 0,
  };
  for (const fr of financialResults) {
    switch (fr.type) {
      case "RECOVERY":
        financialSummary.totalRecoveries += fr.amount;
        break;
      case "FINE":
      case "PENALTY":
        financialSummary.totalFines += fr.amount;
        break;
      case "RESTITUTION":
        financialSummary.totalRestitution += fr.amount;
        break;
      case "SAVINGS":
      case "COST_AVOIDANCE":
        financialSummary.totalSavings += fr.amount;
        break;
    }
  }

  // ─── Evidence summary ─────────────────────────────────────
  const byType: Record<string, number> = {};
  for (const row of evidenceByType) {
    byType[row.type] = row._count;
  }
  const byStatus: Record<string, number> = {};
  for (const row of evidenceByStatus) {
    byStatus[row.status] = row._count;
  }
  const evidenceSummary = { total: totalEvidence, byType, byStatus };

  // ─── Task completion ──────────────────────────────────────
  const taskStatusMap: Record<string, number> = {};
  let totalTasks = 0;
  for (const row of taskStatusCounts) {
    taskStatusMap[row.status] = row._count;
    totalTasks += row._count;
  }
  const taskCompletion = {
    total: totalTasks,
    completed: taskStatusMap["COMPLETED"] || 0,
    pending: taskStatusMap["PENDING"] || 0,
    inProgress: taskStatusMap["IN_PROGRESS"] || 0,
    blocked: taskStatusMap["BLOCKED"] || 0,
  };

  // ─── Recent activity ──────────────────────────────────────
  const recentActivity = {
    casesCreatedLast30Days: casesCreatedLast30,
    documentsUploadedLast30Days: documentsUploadedLast30,
    evidenceCollectedLast30Days: evidenceCollectedLast30,
  };

  // ─── RRS12: Avg days in status ───────────────────────────
  const statusDurations: Record<string, number[]> = {};
  const groupedHistory: Record<string, typeof statusHistoryRecords> = {};
  for (const record of statusHistoryRecords) {
    if (!groupedHistory[record.caseId]) groupedHistory[record.caseId] = [];
    groupedHistory[record.caseId].push(record);
  }
  for (const records of Object.values(groupedHistory)) {
    for (let i = 0; i < records.length; i++) {
      const status = records[i].toStatus;
      const enteredAt = new Date(records[i].createdAt).getTime();
      const exitedAt = i + 1 < records.length
        ? new Date(records[i + 1].createdAt).getTime()
        : now.getTime();
      const days = (exitedAt - enteredAt) / (1000 * 60 * 60 * 24);
      if (!statusDurations[status]) statusDurations[status] = [];
      statusDurations[status].push(days);
    }
  }
  const avgDaysInStatus: Record<string, number> = {};
  for (const [status, durations] of Object.entries(statusDurations)) {
    const avg = durations.reduce((sum, d) => sum + d, 0) / durations.length;
    avgDaysInStatus[status] = Math.round(avg * 10) / 10;
  }

  // ─── RRS12: Avg days to first action ─────────────────────
  let avgDaysToFirstAction = 0;
  const casesWithAction: number[] = [];
  for (const c of casesWithFirstAction) {
    const openedMs = new Date(c.openedAt).getTime();
    const firstTaskMs = c.tasks.length > 0 ? new Date(c.tasks[0].createdAt).getTime() : Infinity;
    const firstEvidenceMs = c.evidenceItems.length > 0 ? new Date(c.evidenceItems[0].collectedAt).getTime() : Infinity;
    const firstActionMs = Math.min(firstTaskMs, firstEvidenceMs);
    if (firstActionMs !== Infinity) {
      casesWithAction.push((firstActionMs - openedMs) / (1000 * 60 * 60 * 24));
    }
  }
  if (casesWithAction.length > 0) {
    avgDaysToFirstAction =
      Math.round(
        (casesWithAction.reduce((sum, d) => sum + d, 0) / casesWithAction.length) * 10,
      ) / 10;
  }

  // ─── RRS12: Cases with no activity in last 30 days ───────
  let casesWithNoActivityLast30Days = 0;
  if (activeCaseIds.length > 0) {
    const caseIdList = activeCaseIds.map((c) => c.id);
    const recentAuditCases = await prisma.auditLog.findMany({
      where: {
        entityType: "Case",
        entityId: { in: caseIdList },
        createdAt: { gte: thirtyDaysAgo },
      },
      select: { entityId: true },
      distinct: ["entityId"],
    });
    const activeCaseIdsWithActivity = new Set(recentAuditCases.map((a) => a.entityId));
    casesWithNoActivityLast30Days = caseIdList.filter((id) => !activeCaseIdsWithActivity.has(id)).length;
  }

  // ─── RRS12: Oldest active cases ──────────────────────────
  const oldestActiveCases = oldestActiveCasesRaw.map((c) => ({
    id: c.id,
    caseNumber: c.caseNumber,
    title: c.title,
    status: c.status,
    openedAt: c.openedAt,
    daysOpen: Math.round(
      (now.getTime() - new Date(c.openedAt).getTime()) / (1000 * 60 * 60 * 24),
    ),
  }));

  const payload = {
    casesByStatus,
    casesByType,
    casesByPriority,
    casesByMonth,
    avgDaysToClose,
    closureRate,
    investigatorWorkload,
    financialSummary,
    evidenceSummary,
    taskCompletion,
    overdueTasks,
    recentActivity,
    avgDaysInStatus,
    avgDaysToFirstAction,
    casesWithNoActivityLast30Days,
    oldestActiveCases,
  };

  cacheSet(cacheKey, payload, 300); // 5 minutes
  return Response.json(payload);
}
