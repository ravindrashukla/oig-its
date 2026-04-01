import { prisma } from "@/lib/prisma";

// ─── Types ──────────────────────────────────────────────

export interface InvestigatorRecommendation {
  userId: string;
  name: string;
  score: number;
  reasons: string[];
  activeCaseCount: number;
  expertise: number;
}

// ─── Main recommendation function ──────────────────────

export async function recommendInvestigator(
  caseType: string,
  priority: string,
  organizationId?: string,
): Promise<InvestigatorRecommendation[]> {
  // 1. Query all active investigators and supervisors
  const whereClause: Record<string, unknown> = {
    isActive: true,
    role: { in: ["INVESTIGATOR", "SUPERVISOR"] },
  };
  if (organizationId) {
    whereClause.organizationId = organizationId;
  }

  const users = await prisma.user.findMany({
    where: whereClause,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      caseAssignments: {
        select: {
          caseId: true,
          removedAt: true,
          case: {
            select: {
              caseType: true,
              status: true,
              dueDate: true,
            },
          },
        },
      },
    },
  });

  const now = new Date();
  const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const scored: InvestigatorRecommendation[] = users.map((user) => {
    const reasons: string[] = [];
    let score = 0;

    const allAssignments = user.caseAssignments;
    const totalCases = allAssignments.length;

    // Active cases: not removed, status is INTAKE/OPEN/ACTIVE/UNDER_REVIEW/PENDING_ACTION
    const activeCases = allAssignments.filter(
      (a) =>
        !a.removedAt &&
        ["INTAKE", "OPEN", "ACTIVE", "UNDER_REVIEW", "PENDING_ACTION"].includes(
          a.case.status,
        ),
    );
    const activeCaseCount = activeCases.length;

    // ── Expertise match: proportion of past cases with same type ──
    const sameTypeCases = allAssignments.filter(
      (a) => a.case.caseType === caseType,
    );
    const expertise =
      totalCases > 0
        ? Math.round((sameTypeCases.length / totalCases) * 100)
        : 0;
    const expertiseScore = totalCases > 0
      ? (sameTypeCases.length / totalCases) * 30
      : 0;
    score += expertiseScore;
    if (sameTypeCases.length > 0) {
      reasons.push(
        `${sameTypeCases.length}/${totalCases} past cases match type ${caseType} (${expertise}% expertise)`,
      );
    }

    // ── Workload: fewer active cases = higher score (max 25) ──
    const workloadScore = Math.max(0, 25 - activeCaseCount * 5);
    score += workloadScore;
    if (activeCaseCount === 0) {
      reasons.push("No active cases — fully available");
    } else if (activeCaseCount <= 2) {
      reasons.push(`Light workload (${activeCaseCount} active cases)`);
    } else {
      reasons.push(`Current workload: ${activeCaseCount} active cases`);
    }

    // ── Success rate: closed cases / total assigned (max 25) ──
    const closedCases = allAssignments.filter(
      (a) => a.case.status === "CLOSED",
    );
    const successRate =
      totalCases > 0 ? closedCases.length / totalCases : 0;
    const successScore = successRate * 25;
    score += successScore;
    if (totalCases > 0) {
      reasons.push(
        `${Math.round(successRate * 100)}% success rate (${closedCases.length}/${totalCases} closed)`,
      );
    }

    // ── Availability: no cases due this week = bonus 20 ──
    const hasCaseDueThisWeek = activeCases.some(
      (a) => a.case.dueDate && new Date(a.case.dueDate) <= oneWeekFromNow,
    );
    if (!hasCaseDueThisWeek) {
      score += 20;
      reasons.push("No cases due this week — available for new assignment");
    } else {
      reasons.push("Has cases due within 7 days");
    }

    return {
      userId: user.id,
      name: `${user.firstName} ${user.lastName}`,
      score: Math.round(Math.min(100, score)),
      reasons,
      activeCaseCount,
      expertise,
    };
  });

  // Sort descending by score, return top 3
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 3);
}
