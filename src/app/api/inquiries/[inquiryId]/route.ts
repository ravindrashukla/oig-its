import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkPermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { updateInquirySchema } from "@/lib/validators/inquiry";
import { sendInquiryStatusEmail } from "@/lib/inquiry-email";

const inquiryInclude = {
  assignedTo: {
    select: { id: true, firstName: true, lastName: true, email: true },
  },
  convertedCase: {
    select: { id: true, caseNumber: true, title: true },
  },
} as const;

// ─── GET: Single inquiry detail ─────────────────────────────

export async function GET(
  request: Request,
  { params }: { params: Promise<{ inquiryId: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { role } = session.user;

  if (!checkPermission(role, "case:read")) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { inquiryId } = await params;

  const inquiry = await prisma.preliminaryInquiry.findUnique({
    where: { id: inquiryId },
    include: inquiryInclude,
  });

  if (!inquiry) {
    return Response.json({ error: "Inquiry not found" }, { status: 404 });
  }

  void logAudit({
    userId: session.user.userId,
    action: "READ",
    entityType: "PreliminaryInquiry",
    entityId: inquiry.id,
  });

  return Response.json(inquiry);
}

// ─── PATCH: Update inquiry ──────────────────────────────────

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ inquiryId: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId, role } = session.user;

  if (!checkPermission(role, "case:update")) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { inquiryId } = await params;

  const existing = await prisma.preliminaryInquiry.findUnique({
    where: { id: inquiryId },
  });

  if (!existing) {
    return Response.json({ error: "Inquiry not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = updateInquirySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  const data = parsed.data;

  // When status changes to CONVERTED, require convertedCaseId
  if (data.status === "CONVERTED" && !data.convertedCaseId && !existing.convertedCaseId) {
    return Response.json(
      { error: "convertedCaseId is required when status is CONVERTED" },
      { status: 422 },
    );
  }

  const updateData: Record<string, unknown> = {};
  if (data.status !== undefined) updateData.status = data.status;
  if (data.assignedToId !== undefined) updateData.assignedToId = data.assignedToId;
  if (data.priority !== undefined) updateData.priority = data.priority;
  if (data.responseMessage !== undefined) updateData.responseMessage = data.responseMessage;
  if (data.convertedCaseId !== undefined) updateData.convertedCaseId = data.convertedCaseId;
  if (data.category !== undefined) updateData.category = data.category;

  if (data.status === "CLOSED") {
    updateData.closedAt = new Date();
  }

  const updated = await prisma.preliminaryInquiry.update({
    where: { id: inquiryId },
    data: updateData,
    include: inquiryInclude,
  });

  void logAudit({
    userId,
    action: "UPDATE",
    entityType: "PreliminaryInquiry",
    entityId: inquiryId,
    metadata: { changes: data },
  });

  // EF14: Send email notice to submitter on status change
  if (
    (data.status === "UNDER_REVIEW" || data.status === "CLOSED") &&
    existing.complainantEmail
  ) {
    void sendInquiryStatusEmail({
      to: existing.complainantEmail,
      inquiryNumber: existing.inquiryNumber,
      status: data.status,
      complainantName: existing.complainantName,
    });
  }

  return Response.json(updated);
}
