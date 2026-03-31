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

  // Create the case and update inquiry in a transaction
  const [newCase] = await prisma.$transaction([
    prisma.case.create({
      data: {
        caseNumber,
        title: caseTitle,
        description: `Converted from inquiry ${inquiry.inquiryNumber}.\n\n${inquiry.description}`,
        caseType: caseType as any,
        priority: priority as any,
        complaintSource: inquiry.source,
        createdById: userId,
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
    }),
    prisma.preliminaryInquiry.update({
      where: { id: inquiryId },
      data: {
        status: "CONVERTED",
        convertedCaseId: undefined, // will be set below
      },
    }),
  ]);

  // Update inquiry with convertedCaseId (needs the created case id)
  await prisma.preliminaryInquiry.update({
    where: { id: inquiryId },
    data: {
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

  const latest = await prisma.case.findFirst({
    where: { caseNumber: { startsWith: prefix } },
    orderBy: { caseNumber: "desc" },
    select: { caseNumber: true },
  });

  let seq = 1;
  if (latest) {
    const lastSeq = parseInt(latest.caseNumber.replace(prefix, ""), 10);
    if (!isNaN(lastSeq)) {
      seq = lastSeq + 1;
    }
  }

  return `${prefix}${String(seq).padStart(5, "0")}`;
}
