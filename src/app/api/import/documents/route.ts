import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { buildFileKey, uploadFile } from "@/lib/minio";

// ─── POST: Bulk import documents with CSV metadata ──────────

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId, role } = session.user;

  // Requires admin permission
  if (role !== "ADMIN") {
    return Response.json({ error: "Forbidden: Admin role required for bulk document import" }, { status: 403 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: "Invalid form data" }, { status: 400 });
  }

  // Get the CSV metadata file
  const csvFile = formData.get("metadata") as File | null;
  if (!csvFile) {
    return Response.json({ error: "metadata CSV file is required" }, { status: 400 });
  }

  // Parse CSV
  const csvText = await csvFile.text();
  const rows = parseCSV(csvText);

  if (rows.length === 0) {
    return Response.json({ error: "CSV metadata file is empty or has no data rows" }, { status: 400 });
  }

  // Collect all document files from the form
  const fileMap = new Map<string, File>();
  for (const [key, value] of formData.entries()) {
    if (key !== "metadata" && value instanceof File) {
      fileMap.set(value.name, value);
    }
  }

  let imported = 0;
  let failed = 0;
  const errors: Array<{ row: number; error: string }> = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const title = row.title?.trim();
    const caseNumber = row.caseNumber?.trim() || row.casenumber?.trim();
    const description = row.description?.trim() || "";
    const fileName = row.fileName?.trim() || row.filename?.trim();

    if (!caseNumber) {
      errors.push({ row: i + 1, error: "Missing caseNumber" });
      failed++;
      continue;
    }

    // Look up the case by case number
    const caseRecord = await prisma.case.findUnique({
      where: { caseNumber },
      select: { id: true },
    });

    if (!caseRecord) {
      errors.push({ row: i + 1, error: `Case not found: ${caseNumber}` });
      failed++;
      continue;
    }

    if (!fileName) {
      errors.push({ row: i + 1, error: "Missing fileName" });
      failed++;
      continue;
    }

    const file = fileMap.get(fileName);
    if (!file) {
      errors.push({ row: i + 1, error: `File not found in upload: ${fileName}` });
      failed++;
      continue;
    }

    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      const fileKey = buildFileKey(caseRecord.id, file.name);

      await uploadFile(fileKey, buffer, file.type || "application/octet-stream");

      await prisma.document.create({
        data: {
          caseId: caseRecord.id,
          title: title || file.name,
          fileName: file.name,
          fileKey,
          mimeType: file.type || "application/octet-stream",
          fileSize: file.size,
          status: "UPLOADED",
          uploadedBy: userId,
        },
      });

      imported++;
    } catch (err) {
      errors.push({
        row: i + 1,
        error: `Upload failed: ${err instanceof Error ? err.message : "Unknown error"}`,
      });
      failed++;
    }
  }

  void logAudit({
    userId,
    action: "CREATE",
    entityType: "DocumentImport",
    entityId: "bulk",
    metadata: { imported, failed, totalRows: rows.length },
  });

  return Response.json({ imported, failed, errors });
}

/**
 * Simple CSV parser: splits by newlines, then by commas.
 * First row is treated as headers. Returns array of objects.
 */
function parseCSV(text: string): Array<Record<string, string>> {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) return [];

  const headers = splitCSVLine(lines[0]).map((h) => h.trim());
  const results: Array<Record<string, string>> = [];

  for (let i = 1; i < lines.length; i++) {
    const values = splitCSVLine(lines[i]);
    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j]?.trim() || "";
    }
    results.push(row);
  }

  return results;
}

/**
 * Split a CSV line respecting quoted fields.
 */
function splitCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }

  result.push(current);
  return result;
}
