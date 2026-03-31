import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkPermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";

const assignmentInclude = {
  course: {
    select: { id: true, title: true, provider: true, category: true, isRequired: true },
  },
  assignedBy: {
    select: { id: true, firstName: true, lastName: true, email: true },
  },
} as const;

// ─── GET: List training assignments ──────────────────────

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId, role } = session.user;

  if (!checkPermission(role, "training:read")) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const page = Math.max(Number(url.searchParams.get("page")) || 1, 1);
  const pageSize = Math.min(
    Math.max(Number(url.searchParams.get("pageSize")) || 20, 1),
    100,
  );
  const courseId = url.searchParams.get("courseId") || undefined;
  const assignedTo = url.searchParams.get("assignedTo") || undefined;
  const assigneeType = url.searchParams.get("assigneeType") || undefined;

  const where: any = {
    isActive: true,
    ...(courseId && { courseId }),
    ...(assignedTo && { assignedTo }),
    ...(assigneeType && { assigneeType }),
  };

  const [data, total] = await Promise.all([
    prisma.trainingAssignment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: assignmentInclude,
    }),
    prisma.trainingAssignment.count({ where }),
  ]);

  void logAudit({
    userId,
    action: "READ",
    entityType: "TrainingAssignment",
    entityId: "list",
    metadata: { page, pageSize, courseId, assignedTo },
  });

  return Response.json({
    data,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}

// ─── POST: Assign a course (admin/supervisor only) ───────

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId, role } = session.user;

  if (!checkPermission(role, "training:assign")) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { courseId, assignedTo, assigneeType, dueDate, bookingStatus, purchaseOrderNumber } = body;

  if (!courseId || typeof courseId !== "string") {
    return Response.json({ error: "courseId is required" }, { status: 422 });
  }
  if (!assignedTo || typeof assignedTo !== "string") {
    return Response.json({ error: "assignedTo is required" }, { status: 422 });
  }
  if (!assigneeType || !["USER", "ROLE", "GROUP"].includes(assigneeType)) {
    return Response.json(
      { error: "assigneeType must be USER, ROLE, or GROUP" },
      { status: 422 },
    );
  }

  // Verify course exists
  const course = await prisma.trainingCourse.findUnique({
    where: { id: courseId },
    select: { id: true },
  });
  if (!course) {
    return Response.json({ error: "Course not found" }, { status: 404 });
  }

  const assignment = await prisma.trainingAssignment.create({
    data: {
      courseId,
      assignedTo,
      assigneeType,
      dueDate: dueDate ? new Date(dueDate) : null,
      assignedById: userId,
      bookingStatus: bookingStatus || "PENDING",
      purchaseOrderNumber: purchaseOrderNumber || null,
    },
    include: assignmentInclude,
  });

  void logAudit({
    userId,
    action: "CREATE",
    entityType: "TrainingAssignment",
    entityId: assignment.id,
    metadata: { courseId, assignedTo, assigneeType },
  });

  return Response.json(assignment, { status: 201 });
}

// ─── PATCH: Update a training assignment (booking/procurement) ──

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId, role } = session.user;

  if (!checkPermission(role, "training:assign")) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) {
    return Response.json({ error: "id query parameter is required" }, { status: 400 });
  }

  const existing = await prisma.trainingAssignment.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) {
    return Response.json({ error: "Assignment not found" }, { status: 404 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { bookingStatus, purchaseOrderNumber, approvedById, approvedAt, dueDate, isActive } = body;

  const validStatuses = ["PENDING", "BOOKED", "WAITLISTED", "CANCELLED"];
  if (bookingStatus !== undefined && !validStatuses.includes(bookingStatus)) {
    return Response.json(
      { error: `bookingStatus must be one of: ${validStatuses.join(", ")}` },
      { status: 422 },
    );
  }

  const assignment = await prisma.trainingAssignment.update({
    where: { id },
    data: {
      ...(bookingStatus !== undefined && { bookingStatus }),
      ...(purchaseOrderNumber !== undefined && { purchaseOrderNumber: purchaseOrderNumber || null }),
      ...(approvedById !== undefined && { approvedById: approvedById || null }),
      ...(approvedAt !== undefined && { approvedAt: approvedAt ? new Date(approvedAt) : null }),
      ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
      ...(isActive !== undefined && { isActive }),
    },
    include: assignmentInclude,
  });

  void logAudit({
    userId,
    action: "UPDATE",
    entityType: "TrainingAssignment",
    entityId: assignment.id,
    metadata: { bookingStatus, purchaseOrderNumber },
  });

  return Response.json(assignment);
}
