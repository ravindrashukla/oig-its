import { prisma } from "@/lib/prisma";

// ─── Types ──────────────────────────────────────────────

export interface Anomaly {
  id: string;
  type: string;
  description: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  score: number;
  entityType: string;
  entityId: string;
}

// ─── Helpers ────────────────────────────────────────────

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function stddev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  const variance = values.reduce((sum, v) => sum + (v - m) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function zScore(value: number, m: number, sd: number): number {
  if (sd === 0) return 0;
  return (value - m) / sd;
}

function severityFromZScore(z: number): Anomaly["severity"] {
  if (z >= 4) return "CRITICAL";
  if (z >= 3) return "HIGH";
  if (z >= 2.5) return "MEDIUM";
  return "LOW";
}

// ─── Financial Anomalies ────────────────────────────────

export async function detectFinancialAnomalies(): Promise<Anomaly[]> {
  const results = await prisma.financialResult.findMany({
    select: { id: true, type: true, amount: true, caseId: true, description: true },
  });

  if (results.length === 0) return [];

  // Group by type
  const byType = new Map<string, typeof results>();
  for (const r of results) {
    const list = byType.get(r.type) || [];
    list.push(r);
    byType.set(r.type, list);
  }

  const anomalies: Anomaly[] = [];

  for (const [type, items] of byType) {
    const amounts = items.map((i) => i.amount);
    const m = mean(amounts);
    const sd = stddev(amounts);

    if (sd === 0) continue;

    for (const item of items) {
      const z = zScore(item.amount, m, sd);
      if (z > 2) {
        anomalies.push({
          id: `fin-${item.id}`,
          type: "FINANCIAL_OUTLIER",
          description: `${type} amount $${item.amount.toLocaleString()} is ${z.toFixed(1)} standard deviations above the mean ($${m.toFixed(0)})`,
          severity: severityFromZScore(z),
          score: Math.round(z * 25),
          entityType: "FinancialResult",
          entityId: item.id,
        });
      }
    }
  }

  return anomalies;
}

// ─── Case Anomalies ────────────────────────────────────

export async function detectCaseAnomalies(): Promise<Anomaly[]> {
  const now = new Date();

  const cases = await prisma.case.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      caseNumber: true,
      title: true,
      status: true,
      openedAt: true,
      closedAt: true,
      _count: {
        select: {
          documents: true,
          evidenceItems: true,
          financialResults: true,
        },
      },
    },
  });

  if (cases.length === 0) return [];

  const anomalies: Anomaly[] = [];

  // Duration anomalies (for open cases, use days since opened)
  const durations = cases.map((c) => {
    const end = c.closedAt ?? now;
    return (end.getTime() - c.openedAt.getTime()) / (1000 * 60 * 60 * 24);
  });
  const durMean = mean(durations);
  const durSd = stddev(durations);

  // Document count anomalies
  const docCounts = cases.map((c) => c._count.documents);
  const docMean = mean(docCounts);
  const docSd = stddev(docCounts);

  // Evidence count anomalies
  const evCounts = cases.map((c) => c._count.evidenceItems);
  const evMean = mean(evCounts);
  const evSd = stddev(evCounts);

  // Financial result count anomalies
  const finCounts = cases.map((c) => c._count.financialResults);
  const finMean = mean(finCounts);
  const finSd = stddev(finCounts);

  for (let i = 0; i < cases.length; i++) {
    const c = cases[i];

    // Long-running case
    if (durSd > 0) {
      const z = zScore(durations[i], durMean, durSd);
      if (z > 2 && !c.closedAt) {
        anomalies.push({
          id: `case-dur-${c.id}`,
          type: "LONG_RUNNING_CASE",
          description: `Case ${c.caseNumber} has been open ${Math.round(durations[i])} days (${z.toFixed(1)} SD above avg of ${Math.round(durMean)} days)`,
          severity: severityFromZScore(z),
          score: Math.round(z * 25),
          entityType: "Case",
          entityId: c.id,
        });
      }
    }

    // High document count
    if (docSd > 0) {
      const z = zScore(docCounts[i], docMean, docSd);
      if (z > 2) {
        anomalies.push({
          id: `case-doc-${c.id}`,
          type: "HIGH_DOCUMENT_COUNT",
          description: `Case ${c.caseNumber} has ${docCounts[i]} documents (${z.toFixed(1)} SD above avg of ${Math.round(docMean)})`,
          severity: severityFromZScore(z),
          score: Math.round(z * 25),
          entityType: "Case",
          entityId: c.id,
        });
      }
    }

    // High evidence count
    if (evSd > 0) {
      const z = zScore(evCounts[i], evMean, evSd);
      if (z > 2) {
        anomalies.push({
          id: `case-ev-${c.id}`,
          type: "HIGH_EVIDENCE_COUNT",
          description: `Case ${c.caseNumber} has ${evCounts[i]} evidence items (${z.toFixed(1)} SD above avg of ${Math.round(evMean)})`,
          severity: severityFromZScore(z),
          score: Math.round(z * 25),
          entityType: "Case",
          entityId: c.id,
        });
      }
    }

    // High financial result count
    if (finSd > 0) {
      const z = zScore(finCounts[i], finMean, finSd);
      if (z > 2) {
        anomalies.push({
          id: `case-fin-${c.id}`,
          type: "HIGH_FINANCIAL_RESULTS",
          description: `Case ${c.caseNumber} has ${finCounts[i]} financial results (${z.toFixed(1)} SD above avg of ${Math.round(finMean)})`,
          severity: severityFromZScore(z),
          score: Math.round(z * 25),
          entityType: "Case",
          entityId: c.id,
        });
      }
    }
  }

  return anomalies;
}

// ─── Activity Anomalies ────────────────────────────────

export async function detectActivityAnomalies(): Promise<Anomaly[]> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // Count audit log entries per user in last 30 days
  const logCounts = await prisma.auditLog.groupBy({
    by: ["userId"],
    _count: { id: true },
    where: {
      createdAt: { gte: thirtyDaysAgo },
      userId: { not: null },
    },
  });

  // Count ACCESS_DENIED per user
  const deniedCounts = await prisma.auditLog.groupBy({
    by: ["userId"],
    _count: { id: true },
    where: {
      createdAt: { gte: thirtyDaysAgo },
      action: "ACCESS_DENIED",
      userId: { not: null },
    },
  });

  const anomalies: Anomaly[] = [];

  // Unusual total activity
  if (logCounts.length > 1) {
    const counts = logCounts.map((l) => l._count.id);
    const m = mean(counts);
    const sd = stddev(counts);

    if (sd > 0) {
      for (const entry of logCounts) {
        const z = zScore(entry._count.id, m, sd);
        if (Math.abs(z) > 2) {
          const direction = z > 0 ? "more" : "fewer";
          anomalies.push({
            id: `act-vol-${entry.userId}`,
            type: z > 0 ? "HIGH_ACTIVITY" : "LOW_ACTIVITY",
            description: `User has significantly ${direction} audit log entries (${entry._count.id}) than average (${Math.round(m)}) in last 30 days — z-score ${z.toFixed(1)}`,
            severity: severityFromZScore(Math.abs(z)),
            score: Math.round(Math.abs(z) * 25),
            entityType: "User",
            entityId: entry.userId ?? "unknown",
          });
        }
      }
    }
  }

  // Unusual ACCESS_DENIED counts
  if (deniedCounts.length > 0) {
    const counts = deniedCounts.map((d) => d._count.id);
    const m = mean(counts);
    const sd = stddev(counts);

    // If anyone has many ACCESS_DENIED events, flag them
    for (const entry of deniedCounts) {
      // Flag if > 5 denied events or if z > 2 when there's variance
      const z = sd > 0 ? zScore(entry._count.id, m, sd) : 0;
      if (entry._count.id > 5 || (sd > 0 && z > 2)) {
        anomalies.push({
          id: `act-denied-${entry.userId}`,
          type: "EXCESSIVE_ACCESS_DENIED",
          description: `User had ${entry._count.id} ACCESS_DENIED events in last 30 days`,
          severity: entry._count.id > 20 ? "HIGH" : entry._count.id > 10 ? "MEDIUM" : "LOW",
          score: Math.min(100, entry._count.id * 5),
          entityType: "User",
          entityId: entry.userId ?? "unknown",
        });
      }
    }
  }

  return anomalies;
}
