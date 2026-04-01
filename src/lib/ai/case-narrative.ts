import { prisma } from "@/lib/prisma";

// ─── Automated Case Narrative (RRS16, CM34) ─────────────────

interface NarrativeSections {
  opening: string;
  subjects: string;
  investigation: string;
  violations: string;
  financial: string;
  referrals: string;
  status: string;
}

interface CaseNarrative {
  narrative: string;
  sections: NarrativeSections;
  wordCount: number;
}

function formatDate(date: Date | null | undefined): string {
  if (!date) return "an unspecified date";
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function humanList(items: string[]): string {
  if (items.length === 0) return "none";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

/**
 * Compute a simple case readiness score (0-100) based on data completeness.
 */
function readinessScore(data: {
  hasSubjects: boolean;
  hasViolations: boolean;
  hasFinancials: boolean;
  hasTechniques: boolean;
  hasReferrals: boolean;
  subjectCount: number;
  violationCount: number;
}): number {
  let score = 20; // base for having a case
  if (data.hasSubjects) score += 15;
  if (data.subjectCount > 1) score += 5;
  if (data.hasViolations) score += 20;
  if (data.violationCount > 1) score += 5;
  if (data.hasFinancials) score += 15;
  if (data.hasTechniques) score += 10;
  if (data.hasReferrals) score += 10;
  return Math.min(100, score);
}

/**
 * Generate a structured plain-English narrative for a case.
 */
export async function generateCaseNarrative(
  caseId: string,
): Promise<CaseNarrative> {
  const caseData = await prisma.case.findUniqueOrThrow({
    where: { id: caseId },
    select: {
      id: true,
      caseNumber: true,
      title: true,
      description: true,
      caseType: true,
      status: true,
      priority: true,
      openedAt: true,
      closedAt: true,
      dueDate: true,
      subjects: {
        select: {
          role: true,
          subject: {
            select: {
              firstName: true,
              lastName: true,
              orgName: true,
              type: true,
            },
          },
        },
      },
      violations: {
        select: {
          type: true,
          title: true,
          status: true,
          subject: {
            select: { firstName: true, lastName: true, orgName: true },
          },
        },
      },
      financialResults: {
        select: { type: true, amount: true, status: true },
      },
      techniques: {
        select: { type: true, status: true, findings: true },
      },
      referrals: {
        select: { agencyName: true, status: true, referralDate: true },
      },
    },
  });

  const subjectCount = caseData.subjects.length;

  // ── Opening ───────────────────────────────────────────
  const opening = `Case ${caseData.caseNumber} is a ${caseData.caseType.toLowerCase()} investigation opened on ${formatDate(caseData.openedAt)} involving ${subjectCount} subject${subjectCount !== 1 ? "s" : ""}.${caseData.description ? ` ${caseData.description}` : ""}`;

  // ── Subjects ──────────────────────────────────────────
  let subjectsText: string;
  if (subjectCount === 0) {
    subjectsText = "No subjects have been identified in this case.";
  } else {
    const respondents = caseData.subjects.filter(
      (s) => s.role === "RESPONDENT",
    );
    const others = caseData.subjects.filter((s) => s.role !== "RESPONDENT");

    const parts: string[] = [];

    if (respondents.length > 0) {
      const primary = respondents[0];
      const pName =
        primary.subject.orgName ||
        `${primary.subject.firstName || ""} ${primary.subject.lastName || ""}`.trim();
      parts.push(
        `The primary respondent is ${pName}, a ${primary.subject.type.toLowerCase()}.`,
      );
      if (respondents.length > 1) {
        const otherRespondents = respondents.slice(1).map((s) =>
          s.subject.orgName ||
          `${s.subject.firstName || ""} ${s.subject.lastName || ""}`.trim(),
        );
        parts.push(
          `Additional respondents include ${humanList(otherRespondents)}.`,
        );
      }
    }

    if (others.length > 0) {
      const otherNames = others.map((s) => {
        const n =
          s.subject.orgName ||
          `${s.subject.firstName || ""} ${s.subject.lastName || ""}`.trim();
        return `${n} (${s.role.toLowerCase().replace(/_/g, " ")})`;
      });
      parts.push(`Additional subjects include ${humanList(otherNames)}.`);
    }

    subjectsText = parts.join(" ");
  }

  // ── Investigation techniques ──────────────────────────
  let investigationText: string;
  if (caseData.techniques.length === 0) {
    investigationText =
      "No investigative techniques have been documented for this case.";
  } else {
    const techniqueTypes = [
      ...new Set(
        caseData.techniques.map((t) =>
          t.type.toLowerCase().replace(/_/g, " "),
        ),
      ),
    ];
    const completed = caseData.techniques.filter(
      (t) => t.status === "COMPLETED",
    );
    const withFindings = completed.filter((t) => t.findings);

    investigationText = `Investigative techniques employed include ${humanList(techniqueTypes)}.`;
    if (withFindings.length > 0) {
      investigationText += ` Key findings from completed techniques: ${withFindings.map((t) => t.findings).join("; ")}.`;
    }
  }

  // ── Violations ────────────────────────────────────────
  let violationsText: string;
  if (caseData.violations.length === 0) {
    violationsText = "No violations have been documented in this case.";
  } else {
    const violationDescriptions = caseData.violations.map((v) => {
      const subjectName =
        v.subject.orgName ||
        `${v.subject.firstName || ""} ${v.subject.lastName || ""}`.trim();
      return `${v.title} (${v.type}, ${v.status.toLowerCase()}) against ${subjectName}`;
    });
    violationsText = `Violations documented include ${humanList(violationDescriptions)}.`;
  }

  // ── Financial ─────────────────────────────────────────
  let financialText: string;
  if (caseData.financialResults.length === 0) {
    financialText = "No financial results have been recorded for this case.";
  } else {
    const total = caseData.financialResults.reduce(
      (sum, fr) => sum + fr.amount,
      0,
    );
    const recoveries = caseData.financialResults
      .filter((fr) => fr.type === "RECOVERY")
      .reduce((sum, fr) => sum + fr.amount, 0);
    const fines = caseData.financialResults
      .filter((fr) => fr.type === "FINE" || fr.type === "PENALTY")
      .reduce((sum, fr) => sum + fr.amount, 0);
    const savings = caseData.financialResults
      .filter((fr) => fr.type === "SAVINGS" || fr.type === "COST_AVOIDANCE")
      .reduce((sum, fr) => sum + fr.amount, 0);

    const parts = [`Financial impact totals ${formatCurrency(total)}`];
    const breakdowns: string[] = [];
    if (recoveries > 0) breakdowns.push(`${formatCurrency(recoveries)} in recoveries`);
    if (fines > 0) breakdowns.push(`${formatCurrency(fines)} in fines and penalties`);
    if (savings > 0) breakdowns.push(`${formatCurrency(savings)} in savings and cost avoidance`);
    if (breakdowns.length > 0) {
      parts.push(`including ${humanList(breakdowns)}`);
    }
    financialText = parts.join(", ") + ".";
  }

  // ── Referrals ─────────────────────────────────────────
  let referralsText: string;
  if (caseData.referrals.length === 0) {
    referralsText = "No external referrals have been made for this case.";
  } else {
    const agencies = caseData.referrals.map(
      (r) => `${r.agencyName} (${r.status.toLowerCase()})`,
    );
    referralsText = `The case has been referred to ${humanList(agencies)}.`;
  }

  // ── Status ────────────────────────────────────────────
  const readiness = readinessScore({
    hasSubjects: subjectCount > 0,
    hasViolations: caseData.violations.length > 0,
    hasFinancials: caseData.financialResults.length > 0,
    hasTechniques: caseData.techniques.length > 0,
    hasReferrals: caseData.referrals.length > 0,
    subjectCount,
    violationCount: caseData.violations.length,
  });

  let statusText = `Current status: ${caseData.status.replace(/_/g, " ")}. Priority: ${caseData.priority}. Case readiness score: ${readiness}/100.`;
  if (caseData.dueDate) {
    statusText += ` Due date: ${formatDate(caseData.dueDate)}.`;
  }
  if (caseData.closedAt) {
    statusText += ` Closed on: ${formatDate(caseData.closedAt)}.`;
  }

  const sections: NarrativeSections = {
    opening,
    subjects: subjectsText,
    investigation: investigationText,
    violations: violationsText,
    financial: financialText,
    referrals: referralsText,
    status: statusText,
  };

  const narrative = [
    opening,
    "",
    subjectsText,
    "",
    investigationText,
    "",
    violationsText,
    "",
    financialText,
    "",
    referralsText,
    "",
    statusText,
  ].join("\n");

  const wordCount = narrative.split(/\s+/).filter(Boolean).length;

  return { narrative, sections, wordCount };
}
