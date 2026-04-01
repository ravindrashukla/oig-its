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

  const cacheKey = `analytics:financial:${role}:${userId}`;
  const cached = cacheGet(cacheKey);
  if (cached) return Response.json(cached);

  const accessFilter = getCaseAccessFilter(role, userId);
  const now = new Date();
  const twelveMonthsAgo = new Date(
    now.getFullYear(),
    now.getMonth() - 11,
    1,
  );

  // ─── Aggregate financial results ──────────────────────────
  const financialResults = await prisma.financialResult.findMany({
    where: { case: accessFilter },
    select: {
      type: true,
      amount: true,
      caseId: true,
      subjectId: true,
      resultDate: true,
      createdAt: true,
    },
  });

  let totalRecoveries = 0;
  let totalFines = 0;
  let totalRestitution = 0;
  let totalSavings = 0;

  for (const fr of financialResults) {
    switch (fr.type) {
      case "RECOVERY":
        totalRecoveries += fr.amount;
        break;
      case "FINE":
      case "PENALTY":
        totalFines += fr.amount;
        break;
      case "RESTITUTION":
        totalRestitution += fr.amount;
        break;
      case "SAVINGS":
      case "COST_AVOIDANCE":
        totalSavings += fr.amount;
        break;
    }
  }

  // ─── Investigative costs from time entries ────────────────
  const hourlyRateSetting = await prisma.systemSetting.findUnique({
    where: { key: "hourly_rate" },
  });
  const hourlyRate =
    hourlyRateSetting && typeof hourlyRateSetting.value === "object"
      ? (hourlyRateSetting.value as { rate?: number }).rate ?? 75
      : 75;

  const timeEntryAgg = await prisma.timeEntry.aggregate({
    where: { case: accessFilter },
    _sum: { hours: true },
  });
  const totalHours = timeEntryAgg._sum.hours ?? 0;
  const totalInvestigativeCosts = totalHours * hourlyRate;

  // ─── ROI ──────────────────────────────────────────────────
  const returnOnInvestment =
    totalInvestigativeCosts > 0
      ? (totalRecoveries + totalSavings - totalInvestigativeCosts) /
        totalInvestigativeCosts
      : 0;

  // ─── By case: top 10 by total financial impact ────────────
  const caseTotals: Record<
    string,
    { caseId: string; recovery: number; fines: number; restitution: number; savings: number; total: number }
  > = {};

  for (const fr of financialResults) {
    if (!caseTotals[fr.caseId]) {
      caseTotals[fr.caseId] = {
        caseId: fr.caseId,
        recovery: 0,
        fines: 0,
        restitution: 0,
        savings: 0,
        total: 0,
      };
    }
    const entry = caseTotals[fr.caseId];
    entry.total += fr.amount;
    switch (fr.type) {
      case "RECOVERY":
        entry.recovery += fr.amount;
        break;
      case "FINE":
      case "PENALTY":
        entry.fines += fr.amount;
        break;
      case "RESTITUTION":
        entry.restitution += fr.amount;
        break;
      case "SAVINGS":
      case "COST_AVOIDANCE":
        entry.savings += fr.amount;
        break;
    }
  }

  const topCaseIds = Object.values(caseTotals)
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  const caseDetails = topCaseIds.length > 0
    ? await prisma.case.findMany({
        where: { id: { in: topCaseIds.map((c) => c.caseId) } },
        select: { id: true, caseNumber: true, title: true },
      })
    : [];

  const caseMap = new Map(caseDetails.map((c) => [c.id, c]));

  const byCase = topCaseIds.map((entry) => {
    const c = caseMap.get(entry.caseId);
    return {
      caseId: entry.caseId,
      caseNumber: c?.caseNumber ?? "",
      title: c?.title ?? "",
      recovery: entry.recovery,
      fines: entry.fines,
      restitution: entry.restitution,
      savings: entry.savings,
      total: entry.total,
    };
  });

  // ─── By subject: top 10 by total financial impact ─────────
  const subjectTotals: Record<
    string,
    { subjectId: string; total: number }
  > = {};

  for (const fr of financialResults) {
    if (!fr.subjectId) continue;
    if (!subjectTotals[fr.subjectId]) {
      subjectTotals[fr.subjectId] = { subjectId: fr.subjectId, total: 0 };
    }
    subjectTotals[fr.subjectId].total += fr.amount;
  }

  const topSubjectIds = Object.values(subjectTotals)
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  const subjectDetails = topSubjectIds.length > 0
    ? await prisma.subject.findMany({
        where: { id: { in: topSubjectIds.map((s) => s.subjectId) } },
        select: { id: true, type: true, firstName: true, lastName: true, orgName: true },
      })
    : [];

  const subjectMap = new Map(subjectDetails.map((s) => [s.id, s]));

  const bySubject = topSubjectIds.map((entry) => {
    const s = subjectMap.get(entry.subjectId);
    return {
      subjectId: entry.subjectId,
      type: s?.type ?? "",
      name:
        s?.type === "INDIVIDUAL"
          ? `${s?.firstName ?? ""} ${s?.lastName ?? ""}`.trim()
          : s?.orgName ?? "",
      total: entry.total,
    };
  });

  // ─── By period: monthly breakdown for last 12 months ──────
  const monthMap: Record<string, number> = {};
  // Initialize all 12 months
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthMap[key] = 0;
  }

  for (const fr of financialResults) {
    const d = fr.resultDate ?? fr.createdAt;
    if (d < twelveMonthsAgo) continue;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (key in monthMap) {
      monthMap[key] += fr.amount;
    }
  }

  const byPeriod = Object.entries(monthMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, amount]) => ({ month, amount }));

  const payload = {
    totalRecoveries,
    totalFines,
    totalRestitution,
    totalSavings,
    totalInvestigativeCosts,
    returnOnInvestment,
    byCase,
    bySubject,
    byPeriod,
  };

  cacheSet(cacheKey, payload, 300); // 5 minutes
  return Response.json(payload);
}
