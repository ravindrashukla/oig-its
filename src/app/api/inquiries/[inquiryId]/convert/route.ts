import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkPermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";

// ─── POST: Convert inquiry to a case ────────────────────────

export async function POST(
  request: Request,
  { params }: { params: Promise<{ inquiryId: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId, role } = session.user;

  if (!checkPermission(role, "case:create")) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { inquiryId } = await params;

  const inquiry = await prisma.preliminaryInquiry.findUnique({
    where: { id: inquiryId },
  });

  if (!inquiry) {
    return Response.json({ error: "Inquiry not found" }, { status: 404 });
  }

  if (inquiry.status === "CONVERTED") {
    return Response.json(
      { error: "Inquiry has already been converted to a case" },
      { status: 409 },
    );
  }

  // Parse optional overrides from request body
  let bodyData: Record<string, unknown> = {};
  try {
    bodyData = (await request.json()) as Record<string, unknown>;
  } catch {
    // empty body is fine — use defaults
  }

  // Generate a case number
  const caseNumber = await generateCaseNumber();

  // Map inquiry source to case type (allow override)
  const defaultCaseType = inquiry.source === "WHISTLEBLOWER" ? "WHISTLEBLOWER" : "OTHER";
  const validCaseTypes = ["FRAUD", "WASTE", "ABUSE", "MISCONDUCT", "WHISTLEBLOWER", "COMPLIANCE", "OUTREACH", "BRIEFING", "OTHER"];
  const caseType = bodyData.caseType && validCaseTypes.includes(bodyData.caseType as string)
    ? (bodyData.caseType as string)
    : defaultCaseType;

  // Map inquiry priority to case priority (allow override)
  const priorityMap: Record<string, string> = {
    LOW: "LOW",
    MEDIUM: "MEDIUM",
    HIGH: "HIGH",
    CRITICAL: "CRITICAL",
  };
  const priority = bodyData.priority && priorityMap[bodyData.priority as string]
    ? priorityMap[bodyData.priority as string]
    : priorityMap[inquiry.priority] || "MEDIUM";

  // Allow title override
  const caseTitle = (bodyData.title as string) || inquiry.subject;

  // Create the case first, then update inquiry with case ID
  const newCase = await prisma.case.create({
    data: {
      caseNumber,
      title: caseTitle,
      description: `Converted from inquiry ${inquiry.inquiryNumber}.\n\n${inquiry.description}`,
      caseType: caseType as any,
      priority: priority as any,
      complaintSource: inquiry.source,
      createdById: userId,
      assignments: {
        create: {
          userId,
          role: "lead_investigator",
          assignedAt: new Date(),
        },
      },
    },
    include: {
      assignments: {
        where: { removedAt: null },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
            },
          },
        },
      },
      createdBy: {
        select: { id: true, firstName: true, lastName: true },
      },
      _count: {
        select: {
          tasks: true,
          documents: true,
          evidenceItems: true,
          notes: true,
        },
      },
    },
  });

  await prisma.preliminaryInquiry.update({
    where: { id: inquiryId },
    data: {
      status: "CONVERTED",
      convertedCaseId: newCase.id,
    },
  });

  void logAudit({
    userId,
    action: "CREATE",
    entityType: "Case",
    entityId: newCase.id,
    metadata: {
      convertedFromInquiry: inquiry.inquiryNumber,
      inquiryId,
      caseNumber,
    },
  });

  void logAudit({
    userId,
    action: "STATUS_CHANGE",
    entityType: "PreliminaryInquiry",
    entityId: inquiryId,
    metadata: {
      fromStatus: inquiry.status,
      toStatus: "CONVERTED",
      convertedCaseId: newCase.id,
    },
  });

  return Response.json(newCase, { status: 201 });
}

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
