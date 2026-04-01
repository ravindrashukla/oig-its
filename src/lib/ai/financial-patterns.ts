import { prisma } from "@/lib/prisma";

// ─── Financial Pattern Mining (FC1, RRS24) ──────────────────

interface PatternResult {
  type: string;
  description: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  affectedResults: {
    id: string;
    caseId: string;
    amount: number;
    type: string;
    resultDate: Date | null;
  }[];
}

/**
 * Detect suspicious financial patterns across all FinancialResult records.
 */
export async function mineFinancialPatterns(): Promise<{
  patterns: PatternResult[];
}> {
  const results = await prisma.financialResult.findMany({
    select: {
      id: true,
      caseId: true,
      subjectId: true,
      type: true,
      amount: true,
      description: true,
      status: true,
      resultDate: true,
    },
  });

  const patterns: PatternResult[] = [];

  // ── 1. Round number detection ──────────────────────────
  const roundThresholds = [10000, 50000, 100000, 250000, 500000, 1000000];
  const roundMatches = results.filter((r) =>
    roundThresholds.some((t) => Math.abs(r.amount) === t),
  );
  if (roundMatches.length > 0) {
    patterns.push({
      type: "ROUND_NUMBERS",
      description: `${roundMatches.length} financial result(s) are exact round numbers ($10K, $50K, $100K, etc.), which may indicate estimated or fabricated amounts.`,
      severity: roundMatches.length >= 3 ? "HIGH" : "MEDIUM",
      affectedResults: roundMatches.map((r) => ({
        id: r.id,
        caseId: r.caseId,
        amount: r.amount,
        type: r.type,
        resultDate: r.resultDate,
      })),
    });
  }

  // ── 2. Just-below-threshold amounts ────────────────────
  const thresholds = [10000, 25000, 50000, 100000];
  const belowThreshold = results.filter((r) => {
    const amt = Math.abs(r.amount);
    return thresholds.some((t) => amt >= t * 0.99 && amt < t && amt !== t);
  });
  if (belowThreshold.length > 0) {
    patterns.push({
      type: "BELOW_THRESHOLD",
      description: `${belowThreshold.length} financial result(s) are just below common reporting thresholds (e.g., $9,999.99), suggesting potential structuring.`,
      severity: "HIGH",
      affectedResults: belowThreshold.map((r) => ({
        id: r.id,
        caseId: r.caseId,
        amount: r.amount,
        type: r.type,
        resultDate: r.resultDate,
      })),
    });
  }

  // ── 3. Sequential/clustered amounts from same subject ──
  const bySubject = new Map<string, typeof results>();
  for (const r of results) {
    if (!r.subjectId) continue;
    const list = bySubject.get(r.subjectId) || [];
    list.push(r);
    bySubject.set(r.subjectId, list);
  }

  for (const [, subjectResults] of bySubject) {
    if (subjectResults.length < 3) continue;
    const sorted = subjectResults
      .map((r) => r.amount)
      .sort((a, b) => a - b);

    // Check for sequential amounts (consistent increments)
    const diffs: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      diffs.push(Math.round((sorted[i] - sorted[i - 1]) * 100) / 100);
    }
    const uniqueDiffs = new Set(diffs);
    if (uniqueDiffs.size === 1 && diffs[0] > 0) {
      patterns.push({
        type: "SEQUENTIAL_AMOUNTS",
        description: `${subjectResults.length} financial results from the same subject have sequential amounts with a consistent increment of $${diffs[0].toLocaleString()}.`,
        severity: "HIGH",
        affectedResults: subjectResults.map((r) => ({
          id: r.id,
          caseId: r.caseId,
          amount: r.amount,
          type: r.type,
          resultDate: r.resultDate,
        })),
      });
    }

    // Check for clustered amounts (many results within 10% of each other)
    const median = sorted[Math.floor(sorted.length / 2)];
    if (median > 0) {
      const clustered = subjectResults.filter(
        (r) => Math.abs(r.amount - median) / median <= 0.1,
      );
      if (clustered.length >= 3 && clustered.length >= subjectResults.length * 0.7) {
        patterns.push({
          type: "CLUSTERED_AMOUNTS",
          description: `${clustered.length} of ${subjectResults.length} financial results from the same subject are clustered within 10% of $${median.toLocaleString()}.`,
          severity: "MEDIUM",
          affectedResults: clustered.map((r) => ({
            id: r.id,
            caseId: r.caseId,
            amount: r.amount,
            type: r.type,
            resultDate: r.resultDate,
          })),
        });
      }
    }
  }

  // ── 4. Unusual distribution (outlier detection) ────────
  if (results.length >= 5) {
    const amounts = results.map((r) => Math.abs(r.amount)).sort((a, b) => a - b);
    const q1 = amounts[Math.floor(amounts.length * 0.25)];
    const q3 = amounts[Math.floor(amounts.length * 0.75)];
    const iqr = q3 - q1;
    const upperFence = q3 + 3 * iqr; // extreme outliers

    const outliers = results.filter((r) => Math.abs(r.amount) > upperFence);
    if (outliers.length > 0 && upperFence > 0) {
      patterns.push({
        type: "OUTLIER_AMOUNTS",
        description: `${outliers.length} financial result(s) are extreme outliers (above $${Math.round(upperFence).toLocaleString()}) compared to the typical range of $${q1.toLocaleString()} - $${q3.toLocaleString()}.`,
        severity: "CRITICAL",
        affectedResults: outliers.map((r) => ({
          id: r.id,
          caseId: r.caseId,
          amount: r.amount,
          type: r.type,
          resultDate: r.resultDate,
        })),
      });
    }
  }

  // ── 5. Weekend/holiday dated results ───────────────────
  const holidays = new Set([
    "01-01", "07-04", "12-25", "12-31", "11-28", "11-29",
  ]);
  const weekendResults = results.filter((r) => {
    if (!r.resultDate) return false;
    const d = new Date(r.resultDate);
    const day = d.getDay();
    const mmdd = `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return day === 0 || day === 6 || holidays.has(mmdd);
  });
  if (weekendResults.length > 0) {
    patterns.push({
      type: "WEEKEND_HOLIDAY",
      description: `${weekendResults.length} financial result(s) are dated on weekends or major holidays, which is unusual for official financial transactions.`,
      severity: weekendResults.length >= 5 ? "HIGH" : "MEDIUM",
      affectedResults: weekendResults.map((r) => ({
        id: r.id,
        caseId: r.caseId,
        amount: r.amount,
        type: r.type,
        resultDate: r.resultDate,
      })),
    });
  }

  // Sort patterns by severity
  const severityOrder: Record<string, number> = {
    CRITICAL: 0,
    HIGH: 1,
    MEDIUM: 2,
    LOW: 3,
  };
  patterns.sort(
    (a, b) => severityOrder[a.severity] - severityOrder[b.severity],
  );

  return { patterns };
}
