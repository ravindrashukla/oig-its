import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkPermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";

// ─── GET: List reviews for a report run ─────────────────────

export async function GET(
  request: Request,
  { params }: { params: Promise<{ reportId: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { role } = session.user;

  if (!checkPermission(role, "report:read")) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { reportId } = await params;
  const url = new URL(request.url);
  const reportRunId = url.searchParams.get("reportRunId");

  const where = {
    reportRun: { definitionId: reportId },
    ...(reportRunId && { reportRunId }),
  };

  const reviews = await prisma.reportReview.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      submittedBy: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
      reviewer: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
      reportRun: {
        select: { id: true, definitionId: true, startedAt: true, resultCount: true },
      },
    },
  });

  return Response.json({ data: reviews });
}

// ─── POST: Submit a report run for review ───────────────────

export async function POST(
  request: Request,
  { params }: { params: Promise<{ reportId: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId, role } = session.user;

  if (!checkPermission(role, "report:run")) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { reportId } = await params;

  let body: { reportRunId: string; reviewerId?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.reportRunId) {
    return Response.json({ error: "reportRunId is required" }, { status: 400 });
  }

  // Verify report run exists and belongs to this report definition
  const reportRun = await prisma.reportRun.findFirst({
    where: { id: body.reportRunId, definitionId: reportId },
  });

  if (!reportRun) {
    return Response.json({ error: "Report run not found" }, { status: 404 });
  }

  const review = await prisma.reportReview.create({
    data: {
      reportRunId: body.reportRunId,
      submittedById: userId,
      reviewerId: body.reviewerId ?? null,
      status: "SUBMITTED",
    },
    include: {
      submittedBy: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
      reviewer: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
    },
  });

  // Notify reviewer if assigned
  if (body.reviewerId) {
    await prisma.notification.create({
      data: {
        userId: body.reviewerId,
        type: "WORKFLOW_ACTION",
        title: "Report Review Requested",
        message: `A report has been submitted for your review.`,
        link: `/dashboard/reports/${reportId}`,
      },
    });
  }

  void logAudit({
    userId,
    action: "CREATE",
    entityType: "ReportReview",
    entityId: review.id,
    metadata: { reportId, reportRunId: body.reportRunId, reviewerId: body.reviewerId },
  });

  return Response.json(review, { status: 201 });
}

// ─── PATCH: Review action (approve/reject/request revision) ─

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ reportId: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId, role } = session.user;

  // Only supervisors and admins can review
  if (role !== "SUPERVISOR" && role !== "ADMIN") {
    return Response.json({ error: "Forbidden: only supervisors and admins can review reports" }, { status: 403 });
  }

  const { reportId } = await params;

  let body: { reviewId: string; action: "approve" | "reject" | "request_revision"; comments?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.reviewId || !body.action) {
    return Response.json({ error: "reviewId and action are required" }, { status: 400 });
  }

  const validActions = ["approve", "reject", "request_revision"];
  if (!validActions.includes(body.action)) {
    return Response.json(
      { error: `Invalid action. Must be one of: ${validActions.join(", ")}` },
      { status: 400 },
    );
  }

  const review = await prisma.reportReview.findFirst({
    where: {
      id: body.reviewId,
      reportRun: { definitionId: reportId },
    },
  });

  if (!review) {
    return Response.json({ error: "Review not found" }, { status: 404 });
  }

  const statusMap: Record<string, string> = {
    approve: "APPROVED",
    reject: "REJECTED",
    request_revision: "REVISION_REQUESTED",
  };

  const updated = await prisma.reportReview.update({
    where: { id: body.reviewId },
    data: {
      status: statusMap[body.action],
      reviewerId: userId,
      reviewedAt: new Date(),
      comments: body.comments ?? null,
    },
    include: {
      submittedBy: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
      reviewer: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
    },
  });

  // Notify submitter of the review outcome
  await prisma.notification.create({
    data: {
      userId: review.submittedById,
      type: "WORKFLOW_ACTION",
      title: `Report Review ${statusMap[body.action].replace("_", " ")}`,
      message: body.comments
        ? `Your report review has been ${body.action.replace("_", " ")}d. Comment: ${body.comments}`
        : `Your report review has been ${body.action.replace("_", " ")}d.`,
      link: `/dashboard/reports/${reportId}`,
    },
  });

  void logAudit({
    userId,
    action: "STATUS_CHANGE",
    entityType: "ReportReview",
    entityId: body.reviewId,
    metadata: { reportId, action: body.action, newStatus: statusMap[body.action] },
  });

  return Response.json(updated);
}
