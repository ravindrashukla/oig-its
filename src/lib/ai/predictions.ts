import { prisma } from "@/lib/prisma";

// ─── Types ──────────────────────────────────────────────

export interface PredictedDuration {
  predictedDays: number;
  confidence: "LOW" | "MEDIUM" | "HIGH";
  basedOnSampleSize: number;
}

export interface PredictedOutcome {
  prediction: "SUBSTANTIATED" | "UNSUBSTANTIATED";
  probability: number;
  basedOnSampleSize: number;
}

export interface CaseloadForecast {
  nextMonthPredicted: number;
  trend: "INCREASING" | "DECREASING" | "STABLE";
  monthlyData: { month: string; count: number }[];
  basedOnMonths: number;
}

export interface AtRiskCase {
  caseId: string;
  caseNumber: string;
  title: string;
  dueDate: Date;
  daysRemaining: number;
  predictedDaysNeeded: number;
  completionPercentage: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
}

// ─── Helpers ────────────────────────────────────────────

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * Simple linear regression: y = mx + b
 * Returns slope (m) and intercept (b)
 */
function linearRegression(xs: number[], ys: number[]): { slope: number; intercept: number } {
  const n = xs.length;
  if (n < 2) return { slope: 0, intercept: ys[0] ?? 0 };

  const xMean = mean(xs);
  const yMean = mean(ys);

  let numerator = 0;
  let denominator = 0;
  for (let i = 0; i < n; i++) {
    numerator += (xs[i] - xMean) * (ys[i] - yMean);
    denominator += (xs[i] - xMean) ** 2;
  }

  const slope = denominator !== 0 ? numerator / denominator : 0;
  const intercept = yMean - slope * xMean;

  return { slope, intercept };
}

// ─── Case type / priority encoding ──────────────────────

const TYPE_ENCODING: Record<string, number> = {
  FRAUD: 5,
  WASTE: 3,
  ABUSE: 4,
  MISCONDUCT: 4,
  WHISTLEBLOWER: 5,
  COMPLIANCE: 3,
  OUTREACH: 1,
  BRIEFING: 1,
  OTHER: 2,
};

const PRIORITY_ENCODING: Record<string, number> = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4,
};

// ─── Predict Case Duration ──────────────────────────────

export async function predictCaseDuration(caseData: {
  caseType: string;
  priority: string;
  subjectCount?: number;
  complaintSource?: string | null;
}): Promise<PredictedDuration> {
  // Gather historical closed cases
  const closedCases = await prisma.case.findMany({
    where: {
      closedAt: { not: null },
      deletedAt: null,
    },
    select: {
      caseType: true,
      priority: true,
      openedAt: true,
      closedAt: true,
      complaintSource: true,
      _count: { select: { subjects: true } },
    },
  });

  if (closedCases.length < 3) {
    // Not enough data — return a simple average or fallback
    const avgDays = closedCases.length > 0
      ? mean(closedCases.map((c) => (c.closedAt!.getTime() - c.openedAt.getTime()) / 86400000))
      : 90;
    return { predictedDays: Math.round(avgDays), confidence: "LOW", basedOnSampleSize: closedCases.length };
  }

  // Build feature vectors: [typeEncoding, priorityEncoding, subjectCount, sourceWeight]
  const features: number[][] = [];
  const durations: number[] = [];

  for (const c of closedCases) {
    const days = (c.closedAt!.getTime() - c.openedAt.getTime()) / 86400000;
    if (days <= 0) continue;
    features.push([
      TYPE_ENCODING[c.caseType] ?? 2,
      PRIORITY_ENCODING[c.priority] ?? 2,
      c._count.subjects,
    ]);
    durations.push(days);
  }

  // Compute a composite feature score for simple regression
  const compositeScores = features.map(
    (f) => f[0] * 10 + f[1] * 5 + f[2] * 3,
  );

  const { slope, intercept } = linearRegression(compositeScores, durations);

  const inputScore =
    (TYPE_ENCODING[caseData.caseType] ?? 2) * 10 +
    (PRIORITY_ENCODING[caseData.priority] ?? 2) * 5 +
    (caseData.subjectCount ?? 1) * 3;

  const predicted = Math.max(7, Math.round(slope * inputScore + intercept));

  const confidence: PredictedDuration["confidence"] =
    closedCases.length >= 50 ? "HIGH" : closedCases.length >= 15 ? "MEDIUM" : "LOW";

  return { predictedDays: predicted, confidence, basedOnSampleSize: closedCases.length };
}

// ─── Predict Closure Outcome ────────────────────────────

export async function predictClosureOutcome(caseData: {
  caseType: string;
  evidenceCount?: number;
  violationCount?: number;
  financialResultCount?: number;
}): Promise<PredictedOutcome> {
  // Look at historical closed cases with violations
  const closedCases = await prisma.case.findMany({
    where: {
      status: { in: ["CLOSED", "ARCHIVED"] },
      deletedAt: null,
    },
    select: {
      caseType: true,
      _count: {
        select: { evidenceItems: true, violations: true, financialResults: true },
      },
      violations: { select: { status: true } },
    },
  });

  if (closedCases.length < 3) {
    return { prediction: "UNSUBSTANTIATED", probability: 0.5, basedOnSampleSize: closedCases.length };
  }

  // Classify each historical case as substantiated or not
  let substantiatedCount = 0;
  const substantiatedFeatures: number[][] = [];
  const unsubstantiatedFeatures: number[][] = [];

  for (const c of closedCases) {
    const hasSubstantiated = c.violations.some((v) => v.status === "SUBSTANTIATED");
    const featureVec = [
      TYPE_ENCODING[c.caseType] ?? 2,
      c._count.evidenceItems,
      c._count.violations,
      c._count.financialResults,
    ];

    if (hasSubstantiated) {
      substantiatedCount++;
      substantiatedFeatures.push(featureVec);
    } else {
      unsubstantiatedFeatures.push(featureVec);
    }
  }

  // Simple Bayesian-style scoring: compare input features to each class mean
  const inputFeatures = [
    TYPE_ENCODING[caseData.caseType] ?? 2,
    caseData.evidenceCount ?? 0,
    caseData.violationCount ?? 0,
    caseData.financialResultCount ?? 0,
  ];

  const subMeans = substantiatedFeatures.length > 0
    ? [0, 1, 2, 3].map((i) => mean(substantiatedFeatures.map((f) => f[i])))
    : [0, 0, 0, 0];
  const unsubMeans = unsubstantiatedFeatures.length > 0
    ? [0, 1, 2, 3].map((i) => mean(unsubstantiatedFeatures.map((f) => f[i])))
    : [0, 0, 0, 0];

  // Distance to each class centroid
  const subDist = Math.sqrt(
    inputFeatures.reduce((sum, v, i) => sum + (v - subMeans[i]) ** 2, 0),
  );
  const unsubDist = Math.sqrt(
    inputFeatures.reduce((sum, v, i) => sum + (v - unsubMeans[i]) ** 2, 0),
  );

  // Prior probability
  const priorSub = substantiatedCount / closedCases.length;

  // Convert distances to probabilities (closer = higher)
  const totalDist = subDist + unsubDist;
  const rawProbSub = totalDist > 0 ? (1 - subDist / totalDist) : priorSub;

  // Blend with prior
  const probability = 0.7 * rawProbSub + 0.3 * priorSub;

  return {
    prediction: probability > 0.5 ? "SUBSTANTIATED" : "UNSUBSTANTIATED",
    probability: Math.round(probability * 100) / 100,
    basedOnSampleSize: closedCases.length,
  };
}

// ─── Predict Caseload ───────────────────────────────────

export async function predictCaseload(): Promise<CaseloadForecast> {
  const now = new Date();
  const twelveMonthsAgo = new Date(now);
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  const cases = await prisma.case.findMany({
    where: {
      openedAt: { gte: twelveMonthsAgo },
      deletedAt: null,
    },
    select: { openedAt: true },
    orderBy: { openedAt: "asc" },
  });

  // Bucket by month
  const buckets = new Map<string, number>();
  for (let m = 0; m < 12; m++) {
    const d = new Date(now);
    d.setMonth(d.getMonth() - 11 + m);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    buckets.set(key, 0);
  }

  for (const c of cases) {
    const key = `${c.openedAt.getFullYear()}-${String(c.openedAt.getMonth() + 1).padStart(2, "0")}`;
    if (buckets.has(key)) {
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }
  }

  const monthlyData = Array.from(buckets.entries()).map(([month, count]) => ({ month, count }));
  const counts = monthlyData.map((d) => d.count);
  const indices = counts.map((_, i) => i);

  const { slope, intercept } = linearRegression(indices, counts);
  const nextMonthPredicted = Math.max(0, Math.round(slope * 12 + intercept));

  let trend: CaseloadForecast["trend"] = "STABLE";
  if (slope > 0.5) trend = "INCREASING";
  else if (slope < -0.5) trend = "DECREASING";

  return {
    nextMonthPredicted,
    trend,
    monthlyData,
    basedOnMonths: monthlyData.filter((d) => d.count > 0).length,
  };
}

// ─── Identify At-Risk Cases ─────────────────────────────

export async function identifyAtRiskCases(): Promise<AtRiskCase[]> {
  const now = new Date();

  // Get active cases with due dates
  const activeCases = await prisma.case.findMany({
    where: {
      status: { in: ["OPEN", "ACTIVE", "UNDER_REVIEW", "PENDING_ACTION"] },
      dueDate: { not: null },
      deletedAt: null,
    },
    select: {
      id: true,
      caseNumber: true,
      title: true,
      caseType: true,
      priority: true,
      openedAt: true,
      dueDate: true,
      _count: { select: { subjects: true } },
      tasks: {
        select: { status: true },
      },
    },
  });

  const atRisk: AtRiskCase[] = [];

  for (const c of activeCases) {
    if (!c.dueDate) continue;

    const daysRemaining = (c.dueDate.getTime() - now.getTime()) / 86400000;
    const totalTasks = c.tasks.length;
    const completedTasks = c.tasks.filter(
      (t) => t.status === "COMPLETED" || t.status === "CANCELLED",
    ).length;
    const completionPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    // Predict how long this case type typically takes
    const prediction = await predictCaseDuration({
      caseType: c.caseType,
      priority: c.priority,
      subjectCount: c._count.subjects,
    });

    const daysSoFar = (now.getTime() - c.openedAt.getTime()) / 86400000;
    const predictedDaysNeeded = prediction.predictedDays;
    const predictedDaysRemaining = predictedDaysNeeded - daysSoFar;

    // Risk assessment: case is at risk if predicted remaining work > days until due
    const isAtRisk = predictedDaysRemaining > daysRemaining || (completionPercentage < 50 && daysRemaining < 14);

    if (isAtRisk || daysRemaining < 0) {
      let riskLevel: AtRiskCase["riskLevel"];
      if (daysRemaining < 0) riskLevel = "CRITICAL";
      else if (daysRemaining < 7) riskLevel = "HIGH";
      else if (daysRemaining < 14) riskLevel = "MEDIUM";
      else riskLevel = "LOW";

      atRisk.push({
        caseId: c.id,
        caseNumber: c.caseNumber,
        title: c.title,
        dueDate: c.dueDate,
        daysRemaining: Math.round(daysRemaining),
        predictedDaysNeeded,
        completionPercentage: Math.round(completionPercentage),
        riskLevel,
      });
    }
  }

  // Sort by risk (CRITICAL first, then by days remaining)
  const riskOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
  atRisk.sort((a, b) => riskOrder[a.riskLevel] - riskOrder[b.riskLevel] || a.daysRemaining - b.daysRemaining);

  return atRisk;
}
