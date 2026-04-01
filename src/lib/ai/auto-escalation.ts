import { prisma } from "@/lib/prisma";

// ─── Types ──────────────────────────────────────────────

export interface EscalationRecommendation {
  caseId: string;
  caseNumber: string;
  currentPriority: string;
  recommendedPriority: string | null;
  reason: string;
}

// ─── Main escalation check ─────────────────────────────

export async function checkEscalations(): Promise<EscalationRecommendation[]> {
  const recommendations: EscalationRecommendation[] = [];

  const now = new Date();
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  // Fetch active/open cases with related data
  const cases = await prisma.case.findMany({
    where: {
      status: { in: ["ACTIVE", "OPEN"] },
      deletedAt: null,
    },
    select: {
      id: true,
      caseNumber: true,
      priority: true,
      dueDate: true,
      financialResults: {
        select: { amount: true },
      },
      evidenceItems: {
        select: { id: true },
      },
      violations: {
        select: { id: true },
      },
    },
  });

  // Batch-fetch the latest audit log per case for staleness check
  const caseIds = cases.map((c) => c.id);
  const latestAuditLogs = caseIds.length > 0
    ? await prisma.auditLog.groupBy({
        by: ["entityId"],
        where: {
          entityType: "Case",
          entityId: { in: caseIds },
        },
        _max: { createdAt: true },
      })
    : [];

  const latestAuditMap = new Map<string, Date>();
  for (const entry of latestAuditLogs) {
    if (entry._max.createdAt) {
      latestAuditMap.set(entry.entityId, entry._max.createdAt);
    }
  }

  for (const c of cases) {
    // 1. Financial results > $500K and not CRITICAL
    const totalFinancial = c.financialResults.reduce(
      (sum, fr) => sum + fr.amount,
      0,
    );
    if (totalFinancial > 500_000 && c.priority !== "CRITICAL") {
      recommendations.push({
        caseId: c.id,
        caseNumber: c.caseNumber,
        currentPriority: c.priority,
        recommendedPriority: "CRITICAL",
        reason: `Financial results total $${totalFinancial.toLocaleString()} exceeds $500K threshold`,
      });
    }

    // 2. Due date within 7 days and priority LOW/MEDIUM
    if (
      c.dueDate &&
      new Date(c.dueDate) <= sevenDaysFromNow &&
      (c.priority === "LOW" || c.priority === "MEDIUM")
    ) {
      recommendations.push({
        caseId: c.id,
        caseNumber: c.caseNumber,
        currentPriority: c.priority,
        recommendedPriority: "HIGH",
        reason: `Due date is within 7 days (${new Date(c.dueDate).toISOString().slice(0, 10)}) but priority is ${c.priority}`,
      });
    }

    // 3. No audit log entries in 14 days → stale
    const lastActivity = latestAuditMap.get(c.id);
    if (!lastActivity || lastActivity < fourteenDaysAgo) {
      recommendations.push({
        caseId: c.id,
        caseNumber: c.caseNumber,
        currentPriority: c.priority,
        recommendedPriority: null,
        reason: lastActivity
          ? `No activity for ${Math.round((now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24))} days — flagged as stale`
          : "No audit log activity recorded — flagged as stale",
      });
    }

    // 4. Evidence count > 10 with no violations → flag for review
    if (c.evidenceItems.length > 10 && c.violations.length === 0) {
      recommendations.push({
        caseId: c.id,
        caseNumber: c.caseNumber,
        currentPriority: c.priority,
        recommendedPriority: null,
        reason: `${c.evidenceItems.length} evidence items collected but no violations recorded — needs review`,
      });
    }
  }

  return recommendations;
}
