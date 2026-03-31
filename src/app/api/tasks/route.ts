import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkPermission, getCaseAccessFilter } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { sendNotification } from "@/lib/workflow";
import { updateTaskSchema } from "@/lib/validators/task";
import type { TaskStatus, Priority } from "@/generated/prisma";

const taskInclude = {
  assignee: {
    select: { id: true, firstName: true, lastName: true, email: true },
  },
  case: {
    select: { id: true, caseNumber: true, title: true },
  },
} as const;

// ─── GET: List all tasks across cases (global view) ─────────

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId, role } = session.user;

  if (!checkPermission(role, "task:read")) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
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
  const caseId = url.searchParams.get("caseId") || undefined;

  const accessFilter = getCaseAccessFilter(role, userId);

  const where = {
    case: accessFilter,
    ...(search && {
      OR: [
        { title: { contains: search, mode: "insensitive" as const } },
        { description: { contains: search, mode: "insensitive" as const } },
      ],
    }),
    ...(status && { status }),
    ...(priority && { priority }),
    ...(assigneeId && { assigneeId }),
    ...(caseId && { caseId }),
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
    entityId: "list",
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

// ─── PATCH: Update a task (by taskId query param) ───────────

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId, role } = session.user;

  if (!checkPermission(role, "task:update")) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const taskId = url.searchParams.get("taskId");
  if (!taskId) {
    return Response.json({ error: "taskId is required" }, { status: 400 });
  }

  const accessFilter = getCaseAccessFilter(role, userId);
  const existing = await prisma.task.findFirst({
    where: { id: taskId, case: accessFilter },
    select: { id: true, status: true, caseId: true },
  });

  if (!existing) {
    return Response.json({ error: "Task not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = updateTaskSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  const { title, description, priority, status, assigneeId, dueDate, delegateTo } = parsed.data;

  // Handle delegation: delegateTo takes precedence over assigneeId
  const effectiveAssigneeId = delegateTo || assigneeId;

  // If delegating, verify the target user exists
  if (delegateTo) {
    const targetUser = await prisma.user.findUnique({
      where: { id: delegateTo },
      select: { id: true, isActive: true },
    });
    if (!targetUser || !targetUser.isActive) {
      return Response.json(
        { error: "Delegate target user not found or inactive" },
        { status: 422 },
      );
    }
  }

  // Get previous assignee for audit trail
  const previousTask = delegateTo
    ? await prisma.task.findUnique({
        where: { id: taskId },
        select: { assigneeId: true, title: true },
      })
    : null;

  const task = await prisma.task.update({
    where: { id: taskId },
    data: {
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description: description || null }),
      ...(priority !== undefined && { priority: priority as Priority }),
      ...(status !== undefined && { status: status as TaskStatus }),
      ...(effectiveAssigneeId !== undefined && { assigneeId: effectiveAssigneeId || null }),
      ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
      ...(status === "COMPLETED" && existing.status !== "COMPLETED" && { completedAt: new Date() }),
      ...(status && status !== "COMPLETED" && existing.status === "COMPLETED" && { completedAt: null }),
    },
    include: taskInclude,
  });

  // If delegating, create audit log and notification for the new assignee
  if (delegateTo) {
    void logAudit({
      userId,
      action: "ASSIGN",
      entityType: "Task",
      entityId: task.id,
      metadata: {
        caseId: existing.caseId,
        fromAssigneeId: previousTask?.assigneeId || null,
        toAssigneeId: delegateTo,
      },
    });

    void sendNotification({
      userId: delegateTo,
      type: "TASK_ASSIGNED",
      title: "Task delegated to you",
      message: `Task delegated to you: ${task.title}`,
      link: `/dashboard/cases/${existing.caseId}/tasks`,
    });
  }

  void logAudit({
    userId,
    action: "UPDATE",
    entityType: "Task",
    entityId: task.id,
    metadata: { caseId: existing.caseId, status, priority },
  });

  return Response.json(task);
}
