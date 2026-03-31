import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkPermission, getCaseAccessFilter } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { downloadFile } from "@/lib/minio";
import archiver from "archiver";
import { PassThrough, Readable } from "stream";

// ─── GET: Download all documents for a case as ZIP ────────

// NOTE (CM45): The `archiver` package does NOT support password-protected/encrypted
// ZIP files. True ZIP encryption (AES-256 or ZipCrypto) requires a different library
// such as `minizip-asm.js` or a native binding like `node-7z`. The `password` query
// parameter below is accepted as a placeholder for future implementation. When a
// suitable library is integrated, the password should be used to encrypt the archive
// before streaming it to the client.

export async function GET(
  _request: Request,
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

  // Verify case access
  const accessFilter = getCaseAccessFilter(role, userId);
  const caseRecord = await prisma.case.findFirst({
    where: { id: caseId, ...accessFilter },
    select: { id: true, caseNumber: true },
  });

  if (!caseRecord) {
    return Response.json({ error: "Case not found" }, { status: 404 });
  }

  // CM45: Accept optional password parameter (placeholder — see note above)
  const url = new URL(_request.url);
  const password = url.searchParams.get("password") || undefined;
  if (password) {
    // TODO: Apply password encryption once a compatible library is integrated.
    // For now the parameter is accepted but the archive is NOT encrypted.
    console.warn(
      "[download-all] Password parameter provided but ZIP encryption is not yet implemented",
    );
  }

  const documents = await prisma.document.findMany({
    where: { caseId },
    orderBy: { createdAt: "desc" },
  });

  if (documents.length === 0) {
    return Response.json(
      { error: "No documents found for this case" },
      { status: 404 },
    );
  }

  // Create a zip archive streamed through a PassThrough
  const passthrough = new PassThrough();
  const archive = archiver("zip", { zlib: { level: 5 } });

  archive.on("error", (err) => {
    console.error("[download-all] Archive error:", err);
    passthrough.destroy(err);
  });

  archive.pipe(passthrough);

  // Add each document to the archive
  for (const doc of documents) {
    try {
      const s3Response = await downloadFile(doc.fileKey);
      if (s3Response.Body) {
        archive.append(Readable.fromWeb(s3Response.Body as unknown as import("stream/web").ReadableStream), {
          name: doc.fileName,
        });
      }
    } catch (err) {
      console.error(
        `[download-all] Failed to fetch file ${doc.fileKey}:`,
        err,
      );
      // Skip files that can't be fetched; don't fail the whole archive
    }
  }

  // Finalize the archive (no more files to add)
  void archive.finalize();

  // Log access for each document
  const accessLogPromises = documents.map((doc) =>
    prisma.documentAccessLog.create({
      data: {
        documentId: doc.id,
        userId,
        action: "DOWNLOAD_ZIP",
      },
    }),
  );
  void Promise.all(accessLogPromises).catch((err) =>
    console.error("[download-all] Failed to log access:", err),
  );

  void logAudit({
    userId,
    action: "EXPORT",
    entityType: "Document",
    entityId: caseId,
    metadata: {
      caseNumber: caseRecord.caseNumber,
      documentCount: documents.length,
      action: "download-all-zip",
      passwordProtected: !!password,
    },
  });

  const zipFileName = `${caseRecord.caseNumber}-documents.zip`;

  // Convert the Node.js PassThrough stream to a web ReadableStream
  const readable = new ReadableStream({
    start(controller) {
      passthrough.on("data", (chunk: Buffer) => {
        controller.enqueue(new Uint8Array(chunk));
      });
      passthrough.on("end", () => {
        controller.close();
      });
      passthrough.on("error", (err) => {
        controller.error(err);
      });
    },
  });

  return new Response(readable as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(zipFileName)}"`,
    },
  });
}
