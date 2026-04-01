import { prisma } from "@/lib/prisma";

// ─── Case Similarity & Clustering (CM4, RRS11) ──────────────

const CASE_TYPES = [
  "FRAUD",
  "WASTE",
  "ABUSE",
  "MISCONDUCT",
  "WHISTLEBLOWER",
  "COMPLIANCE",
  "OUTREACH",
  "BRIEFING",
  "OTHER",
] as const;

const COMPLAINT_SOURCES = [
  "HOTLINE",
  "CONGRESSIONAL",
  "REFERRAL",
  "PROACTIVE",
  "MANAGEMENT",
  "AUDIT",
  "FOIA",
  "OTHER",
] as const;

const PRIORITY_MAP: Record<string, number> = {
  LOW: 0,
  MEDIUM: 1,
  HIGH: 2,
  CRITICAL: 3,
};

interface CaseFeatureVector {
  caseId: string;
  caseNumber: string;
  title: string;
  caseType: string;
  complaintSource: string | null;
  features: number[];
}

/**
 * Build a feature vector for a case.
 * Layout: [caseType one-hot (9)] [priority ordinal (1)] [complaintSource one-hot (8)]
 *         [numSubjects (1)] [numEvidence (1)] [financialTotal (1)] [numViolations (1)]
 * Total: 22 features
 */
function buildFeatureVector(
  caseType: string,
  priority: string,
  complaintSource: string | null,
  numSubjects: number,
  numEvidence: number,
  financialTotal: number,
  numViolations: number,
): number[] {
  const vec: number[] = [];

  // Case type one-hot (9)
  for (const t of CASE_TYPES) {
    vec.push(caseType === t ? 1 : 0);
  }

  // Priority ordinal (1) — normalized 0-1
  vec.push((PRIORITY_MAP[priority] ?? 1) / 3);

  // Complaint source one-hot (8)
  for (const s of COMPLAINT_SOURCES) {
    vec.push(complaintSource === s ? 1 : 0);
  }

  // Numeric features (4) — will be normalized after all vectors are built
  vec.push(numSubjects);
  vec.push(numEvidence);
  vec.push(financialTotal);
  vec.push(numViolations);

  return vec;
}

function normalizeNumericFeatures(vectors: number[][]): void {
  // Normalize the last 4 features (indices 18-21) using min-max scaling
  const numericIndices = [18, 19, 20, 21];
  for (const idx of numericIndices) {
    let min = Infinity;
    let max = -Infinity;
    for (const v of vectors) {
      if (v[idx] < min) min = v[idx];
      if (v[idx] > max) max = v[idx];
    }
    const range = max - min || 1;
    for (const v of vectors) {
      v[idx] = (v[idx] - min) / range;
    }
  }
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

async function loadCaseVectors(): Promise<CaseFeatureVector[]> {
  const cases = await prisma.case.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      caseNumber: true,
      title: true,
      caseType: true,
      priority: true,
      complaintSource: true,
      _count: {
        select: {
          subjects: true,
          evidenceItems: true,
          violations: true,
        },
      },
      financialResults: {
        select: { amount: true },
      },
    },
  });

  const vectors: CaseFeatureVector[] = cases.map((c) => {
    const financialTotal = c.financialResults.reduce(
      (sum, f) => sum + (f.amount || 0),
      0,
    );
    return {
      caseId: c.id,
      caseNumber: c.caseNumber,
      title: c.title,
      caseType: c.caseType,
      complaintSource: c.complaintSource,
      features: buildFeatureVector(
        c.caseType,
        c.priority,
        c.complaintSource,
        c._count.subjects,
        c._count.evidenceItems,
        financialTotal,
        c._count.violations,
      ),
    };
  });

  // Normalize numeric features across all vectors
  if (vectors.length > 0) {
    normalizeNumericFeatures(vectors.map((v) => v.features));
  }

  return vectors;
}

function findSharedFeatures(a: CaseFeatureVector, b: CaseFeatureVector): string[] {
  const shared: string[] = [];
  if (a.caseType === b.caseType) shared.push(`Same type: ${a.caseType}`);
  if (
    a.complaintSource &&
    b.complaintSource &&
    a.complaintSource === b.complaintSource
  ) {
    shared.push(`Same source: ${a.complaintSource}`);
  }
  return shared;
}

export async function findSimilarCases(
  caseId: string,
  topN = 5,
): Promise<
  {
    caseId: string;
    caseNumber: string;
    title: string;
    similarity: number;
    sharedFeatures: string[];
  }[]
> {
  const vectors = await loadCaseVectors();
  const target = vectors.find((v) => v.caseId === caseId);
  if (!target) return [];

  const scored = vectors
    .filter((v) => v.caseId !== caseId)
    .map((v) => ({
      caseId: v.caseId,
      caseNumber: v.caseNumber,
      title: v.title,
      similarity: Math.round(cosineSimilarity(target.features, v.features) * 1000) / 1000,
      sharedFeatures: findSharedFeatures(target, v),
    }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topN);

  return scored;
}

// ─── K-Means Clustering ──────────────────────────────────────

function euclidean(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return Math.sqrt(sum);
}

function centroid(vectors: number[][]): number[] {
  if (vectors.length === 0) return [];
  const dim = vectors[0].length;
  const c = new Array(dim).fill(0);
  for (const v of vectors) {
    for (let i = 0; i < dim; i++) c[i] += v[i];
  }
  for (let i = 0; i < dim; i++) c[i] /= vectors.length;
  return c;
}

export async function clusterCases(
  k = 5,
): Promise<
  {
    id: number;
    label: string;
    caseCount: number;
    topType: string;
    topSource: string;
    caseIds: string[];
  }[]
> {
  const vectors = await loadCaseVectors();
  if (vectors.length === 0) return [];

  // Adjust k if fewer cases than clusters
  const actualK = Math.min(k, vectors.length);

  // Initialize centroids using first k cases (deterministic)
  let centroids = vectors.slice(0, actualK).map((v) => [...v.features]);

  const assignments = new Array(vectors.length).fill(0);
  const maxIter = 20;

  for (let iter = 0; iter < maxIter; iter++) {
    let changed = false;

    // Assign each case to nearest centroid
    for (let i = 0; i < vectors.length; i++) {
      let bestCluster = 0;
      let bestDist = Infinity;
      for (let c = 0; c < actualK; c++) {
        const dist = euclidean(vectors[i].features, centroids[c]);
        if (dist < bestDist) {
          bestDist = dist;
          bestCluster = c;
        }
      }
      if (assignments[i] !== bestCluster) {
        assignments[i] = bestCluster;
        changed = true;
      }
    }

    if (!changed) break;

    // Recompute centroids
    for (let c = 0; c < actualK; c++) {
      const members = vectors
        .filter((_, i) => assignments[i] === c)
        .map((v) => v.features);
      if (members.length > 0) {
        centroids[c] = centroid(members);
      }
    }
  }

  // Build cluster results
  const clusters: {
    id: number;
    label: string;
    caseCount: number;
    topType: string;
    topSource: string;
    caseIds: string[];
  }[] = [];

  for (let c = 0; c < actualK; c++) {
    const members = vectors.filter((_, i) => assignments[i] === c);
    if (members.length === 0) continue;

    // Find most common type and source
    const typeCounts: Record<string, number> = {};
    const sourceCounts: Record<string, number> = {};
    for (const m of members) {
      typeCounts[m.caseType] = (typeCounts[m.caseType] || 0) + 1;
      if (m.complaintSource) {
        sourceCounts[m.complaintSource] =
          (sourceCounts[m.complaintSource] || 0) + 1;
      }
    }

    const topType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "UNKNOWN";
    const topSource = Object.entries(sourceCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";

    clusters.push({
      id: c,
      label: `${topType} / ${topSource}`,
      caseCount: members.length,
      topType,
      topSource,
      caseIds: members.map((m) => m.caseId),
    });
  }

  return clusters;
}
