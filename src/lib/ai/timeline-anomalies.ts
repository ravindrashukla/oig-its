import { prisma } from "@/lib/prisma";

// ─── Types ──────────────────────────────────────────────

export interface TimelineAnomaly {
  type: string;
  date: string;
  description: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
}

export interface TimelineAnomalyResult {
  anomalies: TimelineAnomaly[];
}

// ─── Helpers ───────────────────────────────────────────

function isWeekend(date: Date): boolean {
  const day = date.getUTCDay();
  return day === 0 || day === 6;
}

// Post-investigation statuses where new evidence is suspicious
const LATE_STATUSES = new Set([
  "UNDER_REVIEW",
  "PENDING_ACTION",
  "CLOSED",
  "ARCHIVED",
]);

// ─── Main detection function ───────────────────────────

export async function detectTimelineAnomalies(
  caseId: string,
): Promise<TimelineAnomalyResult> {
  // Fetch all event types in parallel
  const [statusHistory, notes, documents, evidenceItems, tasks] =
    await Promise.all([
      prisma.caseStatusHistory.findMany({
        where: { caseId },
        select: { id: true, fromStatus: true, toStatus: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.caseNote.findMany({
        where: { caseId },
        select: { id: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.document.findMany({
        where: { caseId },
        select: { id: true, title: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.evidenceItem.findMany({
        where: { caseId },
        select: { id: true, title: true, collectedAt: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.task.findMany({
        where: { caseId },
        select: { id: true, createdAt: true, completedAt: true },
        orderBy: { createdAt: "asc" },
      }),
    ]);

  const anomalies: TimelineAnomaly[] = [];

  // ── Build combined timeline for gap detection ──
  const allDates: Date[] = [
    ...statusHistory.map((e) => new Date(e.createdAt)),
    ...notes.map((e) => new Date(e.createdAt)),
    ...documents.map((e) => new Date(e.createdAt)),
    ...evidenceItems.map((e) => new Date(e.createdAt)),
    ...tasks.map((e) => new Date(e.createdAt)),
  ].sort((a, b) => a.getTime() - b.getTime());

  // 1. Flag gaps > 30 days with no activity
  for (let i = 1; i < allDates.length; i++) {
    const gapDays =
      (allDates[i].getTime() - allDates[i - 1].getTime()) /
      (1000 * 60 * 60 * 24);
    if (gapDays > 30) {
      anomalies.push({
        type: "ACTIVITY_GAP",
        date: allDates[i - 1].toISOString(),
        description: `${Math.round(gapDays)}-day gap in case activity (${allDates[i - 1].toISOString().slice(0, 10)} to ${allDates[i].toISOString().slice(0, 10)})`,
        severity: gapDays > 90 ? "HIGH" : "MEDIUM",
      });
    }
  }

  // 2. Evidence collected after case moved to UNDER_REVIEW or later
  // Find the earliest date the case entered a late status
  let firstLateStatusDate: Date | null = null;
  for (const sh of statusHistory) {
    if (LATE_STATUSES.has(sh.toStatus)) {
      firstLateStatusDate = new Date(sh.createdAt);
      break;
    }
  }

  if (firstLateStatusDate) {
    for (const ev of evidenceItems) {
      const collectedDate = new Date(ev.collectedAt);
      if (collectedDate > firstLateStatusDate) {
        anomalies.push({
          type: "LATE_EVIDENCE",
          date: collectedDate.toISOString(),
          description: `Evidence "${ev.title}" collected on ${collectedDate.toISOString().slice(0, 10)} after case moved to review/later status on ${firstLateStatusDate.toISOString().slice(0, 10)}`,
          severity: "HIGH",
        });
      }
    }
  }

  // 3. Documents uploaded on weekends
  for (const doc of documents) {
    const docDate = new Date(doc.createdAt);
    if (isWeekend(docDate)) {
      anomalies.push({
        type: "WEEKEND_UPLOAD",
        date: docDate.toISOString(),
        description: `Document "${doc.title}" uploaded on ${docDate.toISOString().slice(0, 10)} (weekend)`,
        severity: "LOW",
      });
    }
  }

  // 4. Multiple status changes on the same day (rapid back-and-forth)
  const statusByDay = new Map<string, typeof statusHistory>();
  for (const sh of statusHistory) {
    const dayKey = new Date(sh.createdAt).toISOString().slice(0, 10);
    if (!statusByDay.has(dayKey)) {
      statusByDay.set(dayKey, []);
    }
    statusByDay.get(dayKey)!.push(sh);
  }

  for (const [day, changes] of statusByDay) {
    if (changes.length >= 2) {
      const transitions = changes
        .map((c) => `${c.fromStatus ?? "—"} → ${c.toStatus}`)
        .join(", ");
      anomalies.push({
        type: "RAPID_STATUS_CHANGE",
        date: new Date(day).toISOString(),
        description: `${changes.length} status changes on ${day}: ${transitions}`,
        severity: changes.length >= 3 ? "HIGH" : "MEDIUM",
      });
    }
  }

  // Sort anomalies by date descending
  anomalies.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  return { anomalies };
}
