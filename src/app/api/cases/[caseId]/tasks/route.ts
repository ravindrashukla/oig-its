import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkPermission, getCaseAccessFilter } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { createTaskSchema } from "@/lib/validators/task";
import type { TaskStatus, Priority } from "@/generated/prisma";

const taskInclude = {
  assignee: {
    select: { id: true, firstName: true, lastName: true, email: true },
  },
  case: {
    select: { id: true, caseNumber: true, title: true },
  },
} as const;

// ─── GET: List tasks for a case ─────────────────────────────

export async function GET(
  request: Request,
  { params }: { params: Promise<{ caseId: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId, role } = session.user;

  if (!checkPermission(role, "task:read")) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { caseId } = await params;

  const accessFilter = getCaseAccessFilter(role, userId);
  const caseRecord = await prisma.case.findFirst({
    where: { id: caseId, ...accessFilter },
    select: { id: true },
  });

  if (!caseRecord) {
    return Response.json({ error: "Case not found" }, { status: 404 });
  }

  const url = new URL(request.url);
  const page = Math.max(Number(url.searchParams.get("page")) || 1, 1);
  const pageSize = Math.min(
    Math.max(Number(url.searchParams.get("pageSize")) || 20, 1),
    100,
  );
  const sortBy = url.searchParams.get("sortBy") || "createdAt";
  const sortOrder = url.searchParams.get("sortOrder") === "asc" ? "asc" : "desc";
  const search = url.searchParams.get("search") || undefined;
  const status = url.searchParams.get("status") as TaskStatus | undefined;
  const priority = url.searchParams.get("priority") as Priority | undefined;
  const assigneeId = url.searchParams.get("assigneeId") || undefined;

  const where = {
    caseId,
    ...(search && {
      OR: [
        { title: { contains: search, mode: "insensitive" as const } },
        { description: { contains: search, mode: "insensitive" as const } },
      ],
    }),
    ...(status && { status }),
    ...(priority && { priority }),
    ...(assigneeId && { assigneeId }),
  };

  const allowedSortFields = ["createdAt", "updatedAt", "title", "status", "priority", "dueDate"];
  const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : "createdAt";

  const [data, total] = await Promise.all([
    prisma.task.findMany({
      where,
      orderBy: { [safeSortBy]: sortOrder },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: taskInclude,
    }),
    prisma.task.count({ where }),
  ]);

  void logAudit({
    userId,
    action: "READ",
    entityType: "Task",
    entityId: caseId,
    metadata: { page, pageSize, search, status, priority },
  });

  return Response.json({
    data,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}

// ─── POST: Create a task for a case ─────────────────────────

export async function POST(
  request: Request,
  { params }: { params: Promise<{ caseId: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId, role } = session.user;

  if (!checkPermission(role, "task:create")) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { caseId } = await params;

  const accessFilter = getCaseAccessFilter(role, userId);
  const caseRecord = await prisma.case.findFirst({
    where: { id: caseId, ...accessFilter },
    select: { id: true, caseNumber: true },
  });

  if (!caseRecord) {
    return Response.json({ error: "Case not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createTaskSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  const { title, description, priority, status, assigneeId, dueDate } = parsed.data;

  const task = await prisma.task.create({
    data: {
      caseId,
      title,
      description: description || null,
      priority: priority as Priority,
      status: (status as TaskStatus) || "PENDING",
      assigneeId: assigneeId || null,
      dueDate: dueDate ? new Date(dueDate) : null,
    },
    include: taskInclude,
  });

  void logAudit({
    userId,
    action: "CREATE",
    entityType: "Task",
    entityId: task.id,
    metadata: { caseId, caseNumber: caseRecord.caseNumber, title, priority },
  });

  return Response.json(task, { status: 201 });
}
