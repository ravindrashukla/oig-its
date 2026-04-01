import { prisma } from "@/lib/prisma";

// ─── Subject Risk Profiling (CM8, CM49) ─────────────────────

interface RiskFactor {
  factor: string;
  points: number;
  description: string;
}

interface CaseHistoryEntry {
  caseId: string;
  caseNumber: string;
  role: string;
  status: string;
}

interface SubjectRiskProfile {
  subjectId: string;
  subjectName: string;
  riskScore: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  factors: RiskFactor[];
  caseHistory: CaseHistoryEntry[];
}

function riskLevel(score: number): "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" {
  if (score >= 80) return "CRITICAL";
  if (score >= 60) return "HIGH";
  if (score >= 35) return "MEDIUM";
  return "LOW";
}

/**
 * Compute a financial impact score on a log scale.
 */
function financialImpactPoints(totalAmount: number): number {
  if (totalAmount <= 0) return 0;
  if (totalAmount >= 1_000_000) return 25;
  if (totalAmount >= 100_000) return 15;
  if (totalAmount >= 10_000) return 10;
  if (totalAmount >= 1_000) return 5;
  return 2;
}

/**
 * Profile the risk of a single subject by examining their involvement
 * across cases, violations, financial results, and network connections.
 */
export async function profileSubjectRisk(
  subjectId: string,
): Promise<SubjectRiskProfile> {
  const subject = await prisma.subject.findUniqueOrThrow({
    where: { id: subjectId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      orgName: true,
      type: true,
      caseSubjects: {
        select: {
          role: true,
          case: {
            select: { id: true, caseNumber: true, status: true },
          },
        },
      },
      violations: {
        select: { id: true, status: true, type: true },
      },
      financialResults: {
        select: { amount: true },
      },
    },
  });

  const factors: RiskFactor[] = [];
  let rawScore = 0;

  const name = subject.orgName || `${subject.firstName || ""} ${subject.lastName || ""}`.trim() || "Unknown";

  // ── Case involvement: +5 per case ─────────────────────
  const caseCount = subject.caseSubjects.length;
  if (caseCount > 0) {
    const pts = caseCount * 5;
    rawScore += pts;
    factors.push({
      factor: "Case involvement",
      points: pts,
      description: `Involved in ${caseCount} case(s).`,
    });
  }

  // ── Violations: +10 per violation, +20 if SUBSTANTIATED ─
  for (const v of subject.violations) {
    const pts = v.status === "SUBSTANTIATED" ? 20 : 10;
    rawScore += pts;
    factors.push({
      factor: `Violation: ${v.type}`,
      points: pts,
      description: `${v.type} violation (${v.status}).`,
    });
  }

  // ── Financial impact (log scale) ──────────────────────
  const totalFinancial = subject.financialResults.reduce(
    (sum, fr) => sum + Math.abs(fr.amount),
    0,
  );
  if (totalFinancial > 0) {
    const pts = financialImpactPoints(totalFinancial);
    rawScore += pts;
    factors.push({
      factor: "Financial impact",
      points: pts,
      description: `Total financial impact: $${totalFinancial.toLocaleString()}.`,
    });
  }

  // ── Network connections (hub score) ───────────────────
  // Count unique other subjects that share cases with this subject
  const caseIds = subject.caseSubjects.map((cs) => cs.case.id);
  if (caseIds.length > 0) {
    const connectedSubjects = await prisma.caseSubject.findMany({
      where: {
        caseId: { in: caseIds },
        subjectId: { not: subjectId },
      },
      select: { subjectId: true },
    });
    const uniqueConnections = new Set(connectedSubjects.map((c) => c.subjectId)).size;
    if (uniqueConnections >= 5) {
      const pts = Math.min(15, uniqueConnections);
      rawScore += pts;
      factors.push({
        factor: "Network hub",
        points: pts,
        description: `Connected to ${uniqueConnections} other subjects across cases.`,
      });
    }
  }

  // ── Repeat offender (appears in > 2 cases) ───────────
  if (caseCount > 2) {
    rawScore += 15;
    factors.push({
      factor: "Repeat offender",
      points: 15,
      description: `Appears in ${caseCount} cases (> 2 threshold).`,
    });
  }

  // ── Role escalation (WITNESS -> RESPONDENT) ───────────
  const roles = subject.caseSubjects.map((cs) => cs.role);
  if (roles.includes("WITNESS") && roles.includes("RESPONDENT")) {
    rawScore += 10;
    factors.push({
      factor: "Role escalation",
      points: 10,
      description: "Started as WITNESS in one case, became RESPONDENT in another.",
    });
  }

  // Clamp to 0-100
  const score = Math.min(100, Math.max(0, rawScore));

  const caseHistory: CaseHistoryEntry[] = subject.caseSubjects.map((cs) => ({
    caseId: cs.case.id,
    caseNumber: cs.case.caseNumber,
    role: cs.role,
    status: cs.case.status,
  }));

  return {
    subjectId,
    subjectName: name,
    riskScore: score,
    riskLevel: riskLevel(score),
    factors,
    caseHistory,
  };
}

/**
 * Profile all subjects and return the top 20 by risk score.
 */
export async function profileAllSubjects(): Promise<SubjectRiskProfile[]> {
  const subjects = await prisma.subject.findMany({
    select: { id: true },
  });

  const profiles: SubjectRiskProfile[] = [];
  for (const s of subjects) {
    const profile = await profileSubjectRisk(s.id);
    profiles.push(profile);
  }

  profiles.sort((a, b) => b.riskScore - a.riskScore);
  return profiles.slice(0, 20);
}
