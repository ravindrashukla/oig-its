import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkPermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";

// ─── GET: List courses with pagination & filters ─────────

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
  const search = url.searchParams.get("search") || undefined;
  const category = url.searchParams.get("category") || undefined;
  const isRequired = url.searchParams.get("isRequired");
  const isActive = url.searchParams.get("isActive");

  const where: any = {
    ...(category && { category }),
    ...(isRequired !== null &&
      isRequired !== undefined &&
      isRequired !== "" && {
        isRequired: isRequired === "true",
      }),
    ...(isActive !== null &&
      isActive !== undefined &&
      isActive !== "" && {
        isActive: isActive === "true",
      }),
    ...(search && {
      OR: [
        { title: { contains: search, mode: "insensitive" as const } },
        { provider: { contains: search, mode: "insensitive" as const } },
      ],
    }),
  };

  const [data, total] = await Promise.all([
    prisma.trainingCourse.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        _count: {
          select: { records: true, assignments: true },
        },
      },
    }),
    prisma.trainingCourse.count({ where }),
  ]);

  void logAudit({
    userId,
    action: "READ",
    entityType: "TrainingCourse",
    entityId: "list",
    metadata: { page, pageSize, search, category },
  });

  return Response.json({
    data,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}

// ─── POST: Create a new course (admin/supervisor only) ───

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId, role } = session.user;

  if (!checkPermission(role, "training:create")) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { title, description, provider, category, method, duration, credits, isRequired, isRepeating, repeatInterval } = body;

  if (!title || typeof title !== "string" || title.trim().length === 0) {
    return Response.json({ error: "Title is required" }, { status: 422 });
  }

  const course = await prisma.trainingCourse.create({
    data: {
      title: title.trim(),
      description: description || null,
      provider: provider || null,
      category: category || null,
      method: method || null,
      duration: duration != null ? Number(duration) : null,
      credits: credits != null ? Number(credits) : null,
      isRequired: isRequired === true,
      isRepeating: isRepeating === true,
      repeatInterval: repeatInterval || null,
    },
    include: {
      _count: {
        select: { records: true, assignments: true },
      },
    },
  });

  void logAudit({
    userId,
    action: "CREATE",
    entityType: "TrainingCourse",
    entityId: course.id,
    metadata: { title, category, isRequired },
  });

  return Response.json(course, { status: 201 });
}
