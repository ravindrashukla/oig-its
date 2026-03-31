import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkPermission, getCaseAccessFilter } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { buildFileKey, uploadFile, deleteFile } from "@/lib/minio";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

const ALLOWED_MIME_TYPES = new Set([
  // Documents
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-powerpoint",
  "text/plain",
  "text/csv",
  "text/xml",
  "application/xml",
  "application/json",
  // Images
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/tiff",
  "image/bmp",
  // Audio
  "audio/mpeg",
  "audio/wav",
  "audio/ogg",
  "audio/mp4",
  // Video
  "video/mp4",
  "video/mpeg",
  "video/quicktime",
  "video/x-msvideo",
  // Email
  "message/rfc822",
]);

// ─── GET: List documents for a case ────────────────────────

export async function GET(
  request: Request,
  { params }: { params: Promise<{ caseId: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId, role } = session.user;

  if (!checkPermission(role, "document:read")) {
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

  const url = new URL(request.url);
  const page = Math.max(Number(url.searchParams.get("page")) || 1, 1);
  const pageSize = Math.min(
    Math.max(Number(url.searchParams.get("pageSize")) || 20, 1),
    100,
  );
  const search = url.searchParams.get("search") || undefined;
  const status = url.searchParams.get("status") || undefined;

  const where = {
    caseId,
    ...(search && {
      OR: [
        { title: { contains: search, mode: "insensitive" as const } },
        { fileName: { contains: search, mode: "insensitive" as const } },
      ],
    }),
    ...(status && { status: status as import("@/generated/prisma").DocumentStatus }),
  };

  const [data, total] = await Promise.all([
    prisma.document.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        _count: { select: { comments: true, accessLogs: true } },
      },
    }),
    prisma.document.count({ where }),
  ]);

  void logAudit({
    userId,
    action: "READ",
    entityType: "Document",
    entityId: caseId,
    metadata: { page, pageSize, search, status },
  });

  return Response.json({
    data,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}

// ─── POST: Upload a document to a case ─────────────────────

export async function POST(
  request: Request,
  { params }: { params: Promise<{ caseId: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId, role } = session.user;

  if (!checkPermission(role, "document:create")) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { caseId } = await params;

  // Verify the user can access this case
  const accessFilter = getCaseAccessFilter(role, userId);
  const caseRecord = await prisma.case.findFirst({
    where: { id: caseId, ...accessFilter },
    select: { id: true, caseNumber: true },
  });

  if (!caseRecord) {
    return Response.json({ error: "Case not found" }, { status: 404 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  const title = (formData.get("title") as string) || "";
  const previousVersionId = (formData.get("previousVersionId") as string) || null;
  const requiresApproval = formData.get("requiresApproval") === "true";

  if (!file) {
    return Response.json({ error: "No file provided" }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return Response.json(
      { error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024} MB` },
      { status: 413 },
    );
  }

  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return Response.json(
      { error: `File type "${file.type}" is not allowed` },
      { status: 415 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const fileKey = buildFileKey(caseId, file.name);

  await uploadFile(fileKey, buffer, file.type);

  // DMR7: Determine version number if this is a new version of an existing document
  let version = 1;
  if (previousVersionId) {
    const previousDoc = await prisma.document.findFirst({
      where: { id: previousVersionId, caseId },
      select: { id: true, version: true },
    });
    if (!previousDoc) {
      return Response.json({ error: "Previous version document not found" }, { status: 404 });
    }
    version = previousDoc.version + 1;
  }

  // CM15: Determine initial status based on approval requirement
  const initialStatus = requiresApproval ? "DRAFT" : "UPLOADED";

  const document = await prisma.document.create({
    data: {
      caseId,
      title: title || file.name,
      fileName: file.name,
      fileKey,
      mimeType: file.type,
      fileSize: file.size,
      status: initialStatus,
      uploadedBy: userId,
      version,
      previousVersionId,
      requiresApproval,
    },
    include: {
      _count: { select: { comments: true, accessLogs: true } },
    },
  });

  // CM15: Notify supervisors if approval is required
  if (requiresApproval) {
    const supervisors = await prisma.caseAssignment.findMany({
      where: { caseId, removedAt: null },
      include: { user: { select: { id: true, role: true } } },
    });
    const supervisorIds = supervisors
      .filter((a) => a.user.role === "SUPERVISOR" || a.user.role === "ADMIN")
      .map((a) => a.user.id);

    if (supervisorIds.length > 0) {
      await prisma.notification.createMany({
        data: supervisorIds.map((supId) => ({
          userId: supId,
          type: "DOCUMENT_UPLOADED" as const,
          title: "Document requires your approval",
          message: `Document requires your approval: ${document.title}`,
          link: `/dashboard/cases/${caseId}/documents`,
        })),
      });
    }
  }

  // CM14: Auto-create timeline entry for document upload
  await prisma.caseNote.create({
    data: {
      caseId,
      authorId: userId,
      content: `[AUTO] Document uploaded: ${document.title} (${document.fileName})${version > 1 ? ` (v${version})` : ""}`,
      isPrivate: false,
    },
  });

  void logAudit({
    userId,
    action: "CREATE",
    entityType: "Document",
    entityId: document.id,
    metadata: {
      caseId,
      caseNumber: caseRecord.caseNumber,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      version,
      previousVersionId,
      requiresApproval,
    },
  });

  return Response.json(document, { status: 201 });
}

// ─── DELETE: Remove a document from a case ────────────────

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ caseId: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId, role } = session.user;

  if (!checkPermission(role, "document:delete")) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { caseId } = await params;

  // Verify the user can access this case
  const accessFilter = getCaseAccessFilter(role, userId);
  const caseRecord = await prisma.case.findFirst({
    where: { id: caseId, ...accessFilter },
    select: { id: true, caseNumber: true },
  });

  if (!caseRecord) {
    return Response.json({ error: "Case not found" }, { status: 404 });
  }

  const url = new URL(request.url);
  const documentId = url.searchParams.get("documentId");

  if (!documentId) {
    return Response.json({ error: "documentId query parameter is required" }, { status: 400 });
  }

  const document = await prisma.document.findFirst({
    where: { id: documentId, caseId },
  });

  if (!document) {
    return Response.json({ error: "Document not found" }, { status: 404 });
  }

  // Delete the file from MinIO storage
  try {
    await deleteFile(document.fileKey);
  } catch (err) {
    console.error("[document:delete] Failed to delete file from storage:", err);
    // Continue with DB deletion even if storage delete fails
  }

  // Delete the document record (cascades to access logs and comments)
  await prisma.document.delete({
    where: { id: documentId },
  });

  void logAudit({
    userId,
    action: "DELETE",
    entityType: "Document",
    entityId: documentId,
    metadata: {
      caseId,
      caseNumber: caseRecord.caseNumber,
      fileName: document.fileName,
      fileKey: document.fileKey,
    },
  });

  return new Response(null, { status: 204 });
}
