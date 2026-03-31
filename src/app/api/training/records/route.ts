import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkPermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import type { UserRole } from "@/generated/prisma";

const recordInclude = {
  user: {
    select: { id: true, firstName: true, lastName: true, email: true },
  },
  course: {
    select: {
      id: true,
      title: true,
      provider: true,
      category: true,
      method: true,
      duration: true,
      credits: true,
      isRequired: true,
    },
  },
} as const;

/**
 * Determine which training records the user can see:
 * - ADMIN / SUPERVISOR: all records
 * - Others: only their own
 */
function getRecordAccessFilter(role: UserRole, userId: string): any {
  const unrestricted: UserRole[] = ["ADMIN", "SUPERVISOR"];
  if (unrestricted.includes(role)) return {};
  return { userId };
}

// ─── GET: List training records ──────────────────────────

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
  const filterUserId = url.searchParams.get("userId") || undefined;
  const courseId = url.searchParams.get("courseId") || undefined;
  const status = url.searchParams.get("status") || undefined;
  const expirationFrom = url.searchParams.get("expirationFrom") || undefined;
  const expirationTo = url.searchParams.get("expirationTo") || undefined;

  const accessFilter = getRecordAccessFilter(role, userId);

  const where: any = {
    ...accessFilter,
    ...(filterUserId && { userId: filterUserId }),
    ...(courseId && { courseId }),
    ...(status && { status }),
    ...(expirationFrom || expirationTo
      ? {
          expirationDate: {
            ...(expirationFrom && { gte: new Date(expirationFrom) }),
            ...(expirationTo && { lte: new Date(expirationTo) }),
          },
        }
      : {}),
  };

  const [data, total] = await Promise.all([
    prisma.trainingRecord.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: recordInclude,
    }),
    prisma.trainingRecord.count({ where }),
  ]);

  void logAudit({
    userId,
    action: "READ",
    entityType: "TrainingRecord",
    entityId: "list",
    metadata: { page, pageSize, status, courseId },
  });

  return Response.json({
    data,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}

// ─── POST: Create a training record (enroll or log) ──────

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId: sessionUserId, role } = session.user;

  if (!checkPermission(role, "training:read")) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { userId, courseId, status, completionDate, expirationDate, score, hours, notes } = body;

  const targetUserId = userId || sessionUserId;

  // Non-admin/supervisor can only create records for themselves
  if (targetUserId !== sessionUserId && !checkPermission(role, "training:create")) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!courseId || typeof courseId !== "string") {
    return Response.json({ error: "courseId is required" }, { status: 422 });
  }

  // Verify course exists
  const course = await prisma.trainingCourse.findUnique({
    where: { id: courseId },
    select: { id: true },
  });
  if (!course) {
    return Response.json({ error: "Course not found" }, { status: 404 });
  }

  const record = await prisma.trainingRecord.create({
    data: {
      userId: targetUserId,
      courseId,
      status: status || "ENROLLED",
      completionDate: completionDate ? new Date(completionDate) : null,
      expirationDate: expirationDate ? new Date(expirationDate) : null,
      score: score != null ? Number(score) : null,
      hours: hours != null ? Number(hours) : null,
      notes: notes || null,
    },
    include: recordInclude,
  });

  void logAudit({
    userId: sessionUserId,
    action: "CREATE",
    entityType: "TrainingRecord",
    entityId: record.id,
    metadata: { targetUserId, courseId, status: status || "ENROLLED" },
  });

  return Response.json(record, { status: 201 });
}

// ─── PATCH: Update a training record ─────────────────────

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId, role } = session.user;

  if (!checkPermission(role, "training:update")) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) {
    return Response.json({ error: "id query parameter is required" }, { status: 400 });
  }

  const accessFilter = getRecordAccessFilter(role, userId);
  const existing = await prisma.trainingRecord.findFirst({
    where: { id, ...accessFilter },
    select: { id: true },
  });

  if (!existing) {
    return Response.json({ error: "Training record not found" }, { status: 404 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { status, completionDate, expirationDate, score, hours, certificateKey, notes } = body;

  const record = await prisma.trainingRecord.update({
    where: { id },
    data: {
      ...(status !== undefined && { status }),
      ...(completionDate !== undefined && {
        completionDate: completionDate ? new Date(completionDate) : null,
      }),
      ...(expirationDate !== undefined && {
        expirationDate: expirationDate ? new Date(expirationDate) : null,
      }),
      ...(score !== undefined && { score: score != null ? Number(score) : null }),
      ...(hours !== undefined && { hours: hours != null ? Number(hours) : null }),
      ...(certificateKey !== undefined && { certificateKey: certificateKey || null }),
      ...(notes !== undefined && { notes: notes || null }),
    },
    include: recordInclude,
  });

  void logAudit({
    userId,
    action: "UPDATE",
    entityType: "TrainingRecord",
    entityId: record.id,
    metadata: { status, score },
  });

  return Response.json(record);
}
