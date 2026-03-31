import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkPermission, getCaseAccessFilter } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";

// ─── POST: Approve a document (SUPERVISOR or ADMIN only) ──────

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ caseId: string; documentId: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId, role } = session.user;

  if (role !== "SUPERVISOR" && role !== "ADMIN") {
    return Response.json({ error: "Only supervisors and admins can approve documents" }, { status: 403 });
  }

  if (!checkPermission(role, "document:update")) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { caseId, documentId } = await params;

  // Verify case access
  const accessFilter = getCaseAccessFilter(role, userId);
  const caseRecord = await prisma.case.findFirst({
    where: { id: caseId, ...accessFilter },
    select: { id: true, caseNumber: true },
  });

  if (!caseRecord) {
    return Response.json({ error: "Case not found" }, { status: 404 });
  }

  const document = await prisma.document.findFirst({
    where: { id: documentId, caseId },
  });

  if (!document) {
    return Response.json({ error: "Document not found" }, { status: 404 });
  }

  const updated = await prisma.document.update({
    where: { id: documentId },
    data: {
      status: "APPROVED",
      approvedById: userId,
      approvedAt: new Date(),
    },
    include: {
      _count: { select: { comments: true, accessLogs: true } },
    },
  });

  void logAudit({
    userId,
    action: "UPDATE",
    entityType: "Document",
    entityId: documentId,
    metadata: {
      caseId,
      caseNumber: caseRecord.caseNumber,
      action: "approve",
      changes: {
        status: { old: document.status, new: "APPROVED" },
      },
    },
  });

  return Response.json(updated);
}

// ─── DELETE: Reject a document (SUPERVISOR or ADMIN only) ─────

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ caseId: string; documentId: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId, role } = session.user;

  if (role !== "SUPERVISOR" && role !== "ADMIN") {
    return Response.json({ error: "Only supervisors and admins can reject documents" }, { status: 403 });
  }

  if (!checkPermission(role, "document:update")) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { caseId, documentId } = await params;

  // Verify case access
  const accessFilter = getCaseAccessFilter(role, userId);
  const caseRecord = await prisma.case.findFirst({
    where: { id: caseId, ...accessFilter },
    select: { id: true, caseNumber: true },
  });

  if (!caseRecord) {
    return Response.json({ error: "Case not found" }, { status: 404 });
  }

  const document = await prisma.document.findFirst({
    where: { id: documentId, caseId },
  });

  if (!document) {
    return Response.json({ error: "Document not found" }, { status: 404 });
  }

  let rejectionNote = "";
  try {
    const body = await request.json();
    rejectionNote = body.reason || "";
  } catch {
    // reason is optional
  }

  const updated = await prisma.document.update({
    where: { id: documentId },
    data: {
      status: "DRAFT",
      approvedById: null,
      approvedAt: null,
    },
    include: {
      _count: { select: { comments: true, accessLogs: true } },
    },
  });

  // Add a rejection note as a document comment
  if (rejectionNote) {
    await prisma.documentComment.create({
      data: {
        documentId,
        authorId: userId,
        content: `[REJECTION] ${rejectionNote}`,
      },
    });
  }

  void logAudit({
    userId,
    action: "UPDATE",
    entityType: "Document",
    entityId: documentId,
    metadata: {
      caseId,
      caseNumber: caseRecord.caseNumber,
      action: "reject",
      rejectionNote,
      changes: {
        status: { old: document.status, new: "DRAFT" },
      },
    },
  });

  return Response.json(updated);
}
