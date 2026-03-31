import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkPermission, getCaseAccessFilter } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { downloadFile } from "@/lib/minio";

// ─── GET: Download a document ──────────────────────────────

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ caseId: string; documentId: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId, role } = session.user;

  if (!checkPermission(role, "document:read")) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { caseId, documentId } = await params;

  // Verify case access
  const accessFilter = getCaseAccessFilter(role, userId);
  const caseRecord = await prisma.case.findFirst({
    where: { id: caseId, ...accessFilter },
    select: { id: true },
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

  let s3Response;
  try {
    s3Response = await downloadFile(document.fileKey);
  } catch {
    return Response.json({ error: "File not found in storage" }, { status: 404 });
  }

  // Log document access
  await prisma.documentAccessLog.create({
    data: {
      documentId: document.id,
      userId,
      action: "DOWNLOAD",
    },
  });

  void logAudit({
    userId,
    action: "READ",
    entityType: "Document",
    entityId: document.id,
    metadata: { caseId, fileName: document.fileName, action: "download" },
  });

  const stream = s3Response.Body as ReadableStream;

  return new Response(stream as unknown as BodyInit, {
    headers: {
      "Content-Type": document.mimeType,
      "Content-Disposition": `attachment; filename="${encodeURIComponent(document.fileName)}"`,
      ...(document.fileSize ? { "Content-Length": String(document.fileSize) } : {}),
    },
  });
}
