import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import type { CaseType, Priority } from "@/generated/prisma";

const VALID_CASE_TYPES = new Set([
  "FRAUD", "WASTE", "ABUSE", "MISCONDUCT", "WHISTLEBLOWER", "COMPLIANCE", "OUTREACH", "BRIEFING", "OTHER",
]);

const VALID_PRIORITIES = new Set(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);

async function generateCaseNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `OIG-${year}-`;

  const allCases = await prisma.case.findMany({
    where: { caseNumber: { startsWith: prefix } },
    select: { caseNumber: true },
  });

  let maxSeq = 0;
  for (const c of allCases) {
    const seq = parseInt(c.caseNumber.replace(prefix, ""), 10);
    if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
  }

  return `${prefix}${String(maxSeq + 1).padStart(5, "0")}`;
}

interface ImportCaseInput {
  title?: string;
  description?: string;
  caseType?: string;
  priority?: string;
  dueDate?: string;
  organizationId?: string;
  subjects?: Array<{
    type?: string;
    firstName?: string;
    lastName?: string;
    orgName?: string;
    email?: string;
    role?: string;
  }>;
  assigneeIds?: string[];
}

// ─── POST: Bulk import cases ──────────────────────────────

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId, role } = session.user;

  // Requires admin permission
  if (role !== "ADMIN") {
    return Response.json({ error: "Forbidden: Admin role required for bulk import" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!Array.isArray(body)) {
    return Response.json({ error: "Request body must be a JSON array of case objects" }, { status: 400 });
  }

  const cases = body as ImportCaseInput[];
  const errors: Array<{ index: number; errors: string[] }> = [];
  let imported = 0;

  for (let i = 0; i < cases.length; i++) {
    const item = cases[i];
    const itemErrors: string[] = [];

    // Validate required fields
    if (!item.title || typeof item.title !== "string" || item.title.trim().length < 3) {
      itemErrors.push("title is required and must be at least 3 characters");
    }

    if (item.caseType && !VALID_CASE_TYPES.has(item.caseType)) {
      itemErrors.push(`Invalid caseType: ${item.caseType}`);
    }

    if (item.priority && !VALID_PRIORITIES.has(item.priority)) {
      itemErrors.push(`Invalid priority: ${item.priority}`);
    }

    if (item.dueDate && isNaN(Date.parse(item.dueDate))) {
      itemErrors.push("Invalid dueDate format");
    }

    if (itemErrors.length > 0) {
      errors.push({ index: i, errors: itemErrors });
      continue;
    }

    try {
      const caseNumber = await generateCaseNumber();

      await prisma.$transaction(async (tx) => {
        const newCase = await tx.case.create({
          data: {
            caseNumber,
            title: item.title!.trim(),
            description: item.description || null,
            caseType: (item.caseType as CaseType) || "OTHER",
            priority: (item.priority as Priority) || "MEDIUM",
            dueDate: item.dueDate ? new Date(item.dueDate) : null,
            organizationId: item.organizationId || null,
            createdById: userId,
          },
        });

        // Create subjects if provided
        if (item.subjects && Array.isArray(item.subjects)) {
          for (const subjectInput of item.subjects) {
            const subject = await tx.subject.create({
              data: {
                type: (subjectInput.type as any) || "INDIVIDUAL",
                firstName: subjectInput.firstName || null,
                lastName: subjectInput.lastName || null,
                orgName: subjectInput.orgName || null,
                email: subjectInput.email || null,
              },
            });

            await tx.caseSubject.create({
              data: {
                caseId: newCase.id,
                subjectId: subject.id,
                role: (subjectInput.role as any) || "SUBJECT_OF_INTEREST",
              },
            });
          }
        }

        // Create assignments if provided
        if (item.assigneeIds && Array.isArray(item.assigneeIds)) {
          for (const assigneeId of item.assigneeIds) {
            await tx.caseAssignment.create({
              data: {
                caseId: newCase.id,
                userId: assigneeId,
                role: "investigator",
              },
            });
          }
        }
      });

      imported++;
    } catch (err) {
      errors.push({
        index: i,
        errors: [`Database error: ${err instanceof Error ? err.message : "Unknown error"}`],
      });
    }
  }

  void logAudit({
    userId,
    action: "CREATE",
    entityType: "CaseImport",
    entityId: "bulk",
    metadata: { imported, failed: errors.length, totalSubmitted: cases.length },
  });

  return Response.json({
    imported,
    failed: errors.length,
    errors,
  });
}
