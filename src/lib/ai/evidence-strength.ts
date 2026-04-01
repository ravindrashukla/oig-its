import { prisma } from "@/lib/prisma";

// ─── Types ──────────────────────────────────────────────

export interface EvidenceBreakdown {
  category: string;
  points: number;
  detail: string;
}

export interface EvidenceStrengthResult {
  score: number;
  grade: "A" | "B" | "C" | "D" | "F";
  breakdown: EvidenceBreakdown[];
}

// ─── Per-type point values ─────────────────────────────

const TYPE_POINTS: Record<string, number> = {
  DOCUMENT: 3,
  PHOTO: 3,
  VIDEO: 3,
  AUDIO: 3,
  DIGITAL: 4,
  TESTIMONY: 2,
  PHYSICAL: 5,
  OTHER: 2,
};

// ─── Main scoring function ─────────────────────────────

export async function scoreEvidenceStrength(
  caseId: string,
): Promise<EvidenceStrengthResult> {
  const evidenceItems = await prisma.evidenceItem.findMany({
    where: { caseId },
    select: {
      id: true,
      type: true,
      source: true,
      collectedAt: true,
      chainOfCustody: {
        select: { id: true },
      },
    },
  });

  const breakdown: EvidenceBreakdown[] = [];
  let rawScore = 0;

  // 1. Score by evidence type
  const typeCounts: Record<string, number> = {};
  for (const item of evidenceItems) {
    typeCounts[item.type] = (typeCounts[item.type] || 0) + 1;
  }

  let typeTotal = 0;
  for (const [type, count] of Object.entries(typeCounts)) {
    const pts = (TYPE_POINTS[type] ?? 2) * count;
    typeTotal += pts;
    breakdown.push({
      category: "Evidence Type",
      points: pts,
      detail: `${count} ${type.toLowerCase()} item(s) × ${TYPE_POINTS[type] ?? 2} pts`,
    });
  }
  // Cap type-based points at 40
  const cappedTypePoints = Math.min(40, typeTotal);
  rawScore += cappedTypePoints;

  // 2. Custody chain completeness: all items have >= 2 custody entries
  if (evidenceItems.length > 0) {
    const allHaveCustody = evidenceItems.every(
      (item) => item.chainOfCustody.length >= 2,
    );
    if (allHaveCustody) {
      rawScore += 10;
      breakdown.push({
        category: "Custody Chain",
        points: 10,
        detail: "All evidence items have ≥ 2 chain-of-custody entries",
      });
    } else {
      const incomplete = evidenceItems.filter(
        (item) => item.chainOfCustody.length < 2,
      ).length;
      breakdown.push({
        category: "Custody Chain",
        points: 0,
        detail: `${incomplete} item(s) have fewer than 2 custody entries`,
      });
    }
  }

  // 3. Type diversity: 3+ different types
  const uniqueTypes = Object.keys(typeCounts).length;
  if (uniqueTypes >= 3) {
    rawScore += 15;
    breakdown.push({
      category: "Type Diversity",
      points: 15,
      detail: `${uniqueTypes} different evidence types collected`,
    });
  } else {
    breakdown.push({
      category: "Type Diversity",
      points: 0,
      detail: `Only ${uniqueTypes} evidence type(s) — need 3+ for bonus`,
    });
  }

  // 4. Corroboration: evidence from different sources
  const uniqueSources = new Set(
    evidenceItems.map((item) => item.source).filter(Boolean),
  );
  if (uniqueSources.size >= 2) {
    rawScore += 10;
    breakdown.push({
      category: "Corroboration",
      points: 10,
      detail: `Evidence from ${uniqueSources.size} different sources`,
    });
  } else {
    breakdown.push({
      category: "Corroboration",
      points: 0,
      detail: `Evidence from ${uniqueSources.size} source(s) — need 2+ for bonus`,
    });
  }

  // 5. Timeline coverage: evidence dates span > 30 days
  if (evidenceItems.length >= 2) {
    const dates = evidenceItems
      .map((item) => new Date(item.collectedAt).getTime())
      .sort((a, b) => a - b);
    const spanDays =
      (dates[dates.length - 1] - dates[0]) / (1000 * 60 * 60 * 24);
    if (spanDays > 30) {
      rawScore += 5;
      breakdown.push({
        category: "Timeline Coverage",
        points: 5,
        detail: `Evidence spans ${Math.round(spanDays)} days (>30 day threshold)`,
      });
    } else {
      breakdown.push({
        category: "Timeline Coverage",
        points: 0,
        detail: `Evidence spans ${Math.round(spanDays)} days — need >30 for bonus`,
      });
    }
  }

  // Clamp score to 0-100
  const score = Math.max(0, Math.min(100, rawScore));

  // Assign letter grade
  let grade: EvidenceStrengthResult["grade"];
  if (score >= 80) grade = "A";
  else if (score >= 60) grade = "B";
  else if (score >= 40) grade = "C";
  else if (score >= 20) grade = "D";
  else grade = "F";

  return { score, grade, breakdown };
}
