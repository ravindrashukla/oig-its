import { prisma } from "@/lib/prisma";

// ─── Types ──────────────────────────────────────────────

export interface ReadinessItem {
  item: string;
  points: number;
  status: "complete" | "incomplete";
}

export interface ClosureReadinessResult {
  score: number;
  ready: boolean;
  missing: ReadinessItem[];
}

// ─── Main scoring function ─────────────────────────────

export async function scoreCaseReadiness(
  caseId: string,
): Promise<ClosureReadinessResult> {
  // Fetch all relevant data in parallel
  const [
    caseData,
    subjects,
    violations,
    evidenceItems,
    verifiedEvidence,
    financialResults,
    tasks,
    referrals,
    techniques,
    notes,
    documents,
    workflowInstances,
    checklistItems,
  ] = await Promise.all([
    prisma.case.findUnique({
      where: { id: caseId },
      select: { id: true, status: true },
    }),
    prisma.caseSubject.findMany({
      where: { caseId },
      select: { id: true },
    }),
    prisma.violation.findMany({
      where: { caseId },
      select: { id: true },
    }),
    prisma.evidenceItem.findMany({
      where: { caseId },
      select: { id: true, status: true },
    }),
    prisma.evidenceItem.count({
      where: { caseId, status: "VERIFIED" },
    }),
    prisma.financialResult.findMany({
      where: { caseId },
      select: { id: true },
    }),
    prisma.task.findMany({
      where: { caseId },
      select: { id: true, status: true },
    }),
    prisma.referral.findMany({
      where: { caseId },
      select: { id: true, status: true },
    }),
    prisma.investigativeTechnique.findMany({
      where: { caseId },
      select: { id: true },
    }),
    prisma.caseNote.findMany({
      where: { caseId },
      select: { id: true },
    }),
    prisma.document.findMany({
      where: { caseId },
      select: { id: true },
    }),
    prisma.workflowInstance.findMany({
      where: { caseId },
      select: { id: true, status: true },
    }),
    prisma.closeChecklist.findMany({
      where: { caseId },
      select: { id: true, isRequired: true, isCompleted: true },
    }),
  ]);

  if (!caseData) {
    return { score: 0, ready: false, missing: [{ item: "Case not found", points: 0, status: "incomplete" }] };
  }

  const items: ReadinessItem[] = [];
  let score = 0;

  // 1. Subjects documented (+15)
  const hasSubjects = subjects.length > 0;
  items.push({ item: "Subjects documented", points: 15, status: hasSubjects ? "complete" : "incomplete" });
  if (hasSubjects) score += 15;

  // 2. Violations recorded (+10)
  const hasViolations = violations.length > 0;
  items.push({ item: "Violations recorded", points: 10, status: hasViolations ? "complete" : "incomplete" });
  if (hasViolations) score += 10;

  // 3. Evidence collected (+10)
  const hasEvidence = evidenceItems.length > 0;
  items.push({ item: "Evidence collected", points: 10, status: hasEvidence ? "complete" : "incomplete" });
  if (hasEvidence) score += 10;

  // 4. Evidence verified (+5)
  const hasVerified = verifiedEvidence > 0;
  items.push({ item: "Evidence verified", points: 5, status: hasVerified ? "complete" : "incomplete" });
  if (hasVerified) score += 5;

  // 5. Financial results documented (+10)
  const hasFinancials = financialResults.length > 0;
  items.push({ item: "Financial results documented", points: 10, status: hasFinancials ? "complete" : "incomplete" });
  if (hasFinancials) score += 10;

  // 6. All tasks complete (+10)
  const allTasksComplete =
    tasks.length > 0 &&
    tasks.every((t) => t.status === "COMPLETED" || t.status === "CANCELLED");
  items.push({ item: "All tasks complete", points: 10, status: allTasksComplete ? "complete" : "incomplete" });
  if (allTasksComplete) score += 10;

  // 7. Referrals resolved (+5)
  const referralsResolved =
    referrals.length === 0 ||
    referrals.every((r) => r.status === "COMPLETED" || r.status === "DECLINED");
  items.push({ item: "Referrals resolved", points: 5, status: referralsResolved ? "complete" : "incomplete" });
  if (referralsResolved) score += 5;

  // 8. Investigation techniques logged (+5)
  const hasTechniques = techniques.length > 0;
  items.push({ item: "Investigation techniques logged", points: 5, status: hasTechniques ? "complete" : "incomplete" });
  if (hasTechniques) score += 5;

  // 9. Case notes > 3 (+5)
  const enoughNotes = notes.length > 3;
  items.push({ item: "Case notes > 3", points: 5, status: enoughNotes ? "complete" : "incomplete" });
  if (enoughNotes) score += 5;

  // 10. Supervisor review done (+5)
  // Check if case has been in UNDER_REVIEW status (indicating supervisor review)
  const supervisorReview = await prisma.caseStatusHistory.findFirst({
    where: { caseId, toStatus: "UNDER_REVIEW" },
  });
  const hasReview = !!supervisorReview;
  items.push({ item: "Supervisor review done", points: 5, status: hasReview ? "complete" : "incomplete" });
  if (hasReview) score += 5;

  // 11. Checklist items complete (+10)
  const requiredChecklist = checklistItems.filter((c) => c.isRequired);
  const allChecklistComplete =
    requiredChecklist.length > 0 &&
    requiredChecklist.every((c) => c.isCompleted);
  items.push({ item: "Checklist items complete", points: 10, status: allChecklistComplete ? "complete" : "incomplete" });
  if (allChecklistComplete) score += 10;

  // 12. Documents > 2 (+5)
  const enoughDocs = documents.length > 2;
  items.push({ item: "Documents > 2", points: 5, status: enoughDocs ? "complete" : "incomplete" });
  if (enoughDocs) score += 5;

  // 13. No pending workflow steps (+5)
  const hasPendingWorkflows = workflowInstances.some(
    (w) => w.status === "ACTIVE" || w.status === "PAUSED",
  );
  const workflowsClear = !hasPendingWorkflows;
  items.push({ item: "No pending workflow steps", points: 5, status: workflowsClear ? "complete" : "incomplete" });
  if (workflowsClear) score += 5;

  // Filter to only incomplete items for the "missing" list
  const missing = items.filter((i) => i.status === "incomplete");

  return {
    score: Math.min(100, score),
    ready: score >= 80,
    missing,
  };
}
