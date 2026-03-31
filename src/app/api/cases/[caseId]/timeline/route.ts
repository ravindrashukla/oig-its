import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkPermission, getCaseAccessFilter } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";

export interface TimelineEvent {
  id: string;
  type: "status_change" | "note" | "document" | "evidence" | "assignment" | "task";
  title: string;
  description: string | null;
  createdAt: string;
  actor: { id: string; firstName: string; lastName: string } | null;
  metadata?: Record<string, unknown>;
}

// ─── GET: Fetch timeline events for a case ──────────────

export async function GET(
  request: Request,
  { params }: { params: Promise<{ caseId: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId, role } = session.user;

  if (!checkPermission(role, "case:read")) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { caseId } = await params;

  // Verify the user can access this case
  const accessFilter = getCaseAccessFilter(role, userId);
  const caseRecord = await prisma.case.findFirst({
    where: { id: caseId, ...accessFilter },
    select: { id: true },
  });

  if (!caseRecord) {
    return Response.json({ error: "Case not found" }, { status: 404 });
  }

  // Fetch all event sources in parallel
  const [statusHistory, notes, documents, evidenceItems, assignments, tasks] =
    await Promise.all([
      prisma.caseStatusHistory.findMany({
        where: { caseId },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      prisma.caseNote.findMany({
        where: { caseId },
        orderBy: { createdAt: "desc" },
        take: 100,
        include: {
          author: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      }),
      prisma.document.findMany({
        where: { caseId },
        orderBy: { createdAt: "desc" },
        take: 50,
        select: {
          id: true,
          title: true,
          fileName: true,
          status: true,
          uploadedBy: true,
          createdAt: true,
        },
      }),
      prisma.evidenceItem.findMany({
        where: { caseId },
        orderBy: { createdAt: "desc" },
        take: 50,
        select: {
          id: true,
          title: true,
          type: true,
          status: true,
          createdAt: true,
        },
      }),
      prisma.caseAssignment.findMany({
        where: { caseId },
        orderBy: { assignedAt: "desc" },
        take: 50,
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      }),
      prisma.task.findMany({
        where: { caseId },
        orderBy: { createdAt: "desc" },
        take: 50,
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          createdAt: true,
          assignee: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      }),
    ]);

  // Build unified timeline
  const events: TimelineEvent[] = [];

  for (const sh of statusHistory) {
    events.push({
      id: sh.id,
      type: "status_change",
      title: sh.fromStatus
        ? `Status changed from ${formatEnum(sh.fromStatus)} to ${formatEnum(sh.toStatus)}`
        : `Status set to ${formatEnum(sh.toStatus)}`,
      description: sh.reason || null,
      createdAt: sh.createdAt.toISOString(),
      actor: null,
      metadata: { fromStatus: sh.fromStatus, toStatus: sh.toStatus },
    });
  }

  for (const note of notes) {
    events.push({
      id: note.id,
      type: "note",
      title: "Note added",
      description: note.content,
      createdAt: note.createdAt.toISOString(),
      actor: note.author,
      metadata: { isPrivate: note.isPrivate },
    });
  }

  for (const doc of documents) {
    events.push({
      id: doc.id,
      type: "document",
      title: `Document uploaded: ${doc.title}`,
      description: doc.fileName,
      createdAt: doc.createdAt.toISOString(),
      actor: null,
      metadata: { status: doc.status },
    });
  }

  for (const ev of evidenceItems) {
    events.push({
      id: ev.id,
      type: "evidence",
      title: `Evidence added: ${ev.title}`,
      description: null,
      createdAt: ev.createdAt.toISOString(),
      actor: null,
      metadata: { evidenceType: ev.type, status: ev.status },
    });
  }

  for (const a of assignments) {
    events.push({
      id: a.id,
      type: "assignment",
      title: `${a.user.firstName} ${a.user.lastName} assigned as ${a.role}`,
      description: a.removedAt ? "Later removed from case" : null,
      createdAt: a.assignedAt.toISOString(),
      actor: a.user,
    });
  }

  for (const t of tasks) {
    events.push({
      id: t.id,
      type: "task",
      title: `Task created: ${t.title}`,
      description: null,
      createdAt: t.createdAt.toISOString(),
      actor: t.assignee,
      metadata: { status: t.status, priority: t.priority },
    });
  }

  // Sort by date descending
  events.sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  void logAudit({
    userId,
    action: "READ",
    entityType: "CaseTimeline",
    entityId: caseId,
  });

  return Response.json({ data: events });
}

function formatEnum(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
