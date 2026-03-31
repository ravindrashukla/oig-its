import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkPermission, getCaseAccessFilter } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { createCaseSchema, createDraftCaseSchema } from "@/lib/validators/case";
import type { CaseStatus, CaseType, Priority } from "@/generated/prisma";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId, role } = session.user;

  if (!checkPermission(role, "case:read")) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const view = url.searchParams.get("view");

  // ─── Dashboard metrics view ──────────────────────────────
  if (view === "metrics") {
    return handleMetrics(userId, role);
  }

  // ─── Upcoming deadlines view ─────────────────────────────
  if (view === "deadlines") {
    const limit = Math.min(Number(url.searchParams.get("limit")) || 10, 50);
    return handleDeadlines(userId, role, limit);
  }

  // ─── Notifications view ──────────────────────────────────
  if (view === "notifications") {
    const limit = Math.min(Number(url.searchParams.get("limit")) || 10, 50);
    return handleNotifications(userId, limit);
  }

  // ─── Paginated case list ─────────────────────────────────
  const page = Math.max(Number(url.searchParams.get("page")) || 1, 1);
  const pageSize = Math.min(
    Math.max(Number(url.searchParams.get("pageSize")) || 20, 1),
    100
  );
  const sortBy = url.searchParams.get("sortBy") || "createdAt";
  const sortOrder = url.searchParams.get("sortOrder") === "asc" ? "asc" : "desc";
  const search = url.searchParams.get("search") || undefined;
  const status = url.searchParams.get("status") as CaseStatus | undefined;
  const caseType = url.searchParams.get("caseType") as CaseType | undefined;
  const priority = url.searchParams.get("priority") as Priority | undefined;
  const assigneeId = url.searchParams.get("assigneeId") || undefined;
  const organizationId = url.searchParams.get("organizationId") || undefined;
  const dateFrom = url.searchParams.get("dateFrom") || undefined;
  const dateTo = url.searchParams.get("dateTo") || undefined;

  const accessFilter = getCaseAccessFilter(role, userId);

  const where = {
    ...accessFilter,
    ...(status && { status }),
    ...(caseType && { caseType }),
    ...(priority && { priority }),
    ...(organizationId && { organizationId }),
    ...(assigneeId && {
      assignments: { some: { userId: assigneeId } },
    }),
    ...(dateFrom || dateTo
      ? {
          createdAt: {
            ...(dateFrom && { gte: new Date(dateFrom) }),
            ...(dateTo && { lte: new Date(dateTo) }),
          },
        }
      : {}),
    ...(search && {
      OR: [
        { title: { contains: search, mode: "insensitive" as const } },
        { caseNumber: { contains: search, mode: "insensitive" as const } },
        { description: { contains: search, mode: "insensitive" as const } },
      ],
    }),
  };

  const allowedSortFields = [
    "createdAt",
    "updatedAt",
    "caseNumber",
    "title",
    "status",
    "priority",
    "dueDate",
    "openedAt",
  ];
  const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : "createdAt";

  const [data, total] = await Promise.all([
    prisma.case.findMany({
      where,
      orderBy: { [safeSortBy]: sortOrder },
      skip: (page - 1) * pageSize,
      take: pageSize,
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
    prisma.case.count({ where }),
  ]);

  void logAudit({
    userId,
    action: "READ",
    entityType: "Case",
    entityId: "list",
    metadata: { page, pageSize, filters: { status, caseType, priority, search } },
  });

  return Response.json({
    data,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}

// ─── POST: Create a new case ──────────────────────────────────

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId, role } = session.user;

  if (!checkPermission(role, "case:create")) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // CM17: Check if this is a draft save (relaxed validation)
  const rawBody = body as Record<string, unknown>;
  const isDraft = rawBody?.isDraft === true;

  if (isDraft) {
    const parsed = createDraftCaseSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
        { status: 422 },
      );
    }

    const { title, description, caseType, priority, dueDate, organizationId } = parsed.data;
    const caseNumber = await generateCaseNumber();

    const newCase = await prisma.case.create({
      data: {
        caseNumber,
        title: title || `Draft - ${caseNumber}`,
        description: description || null,
        caseType: (caseType as CaseType) || "OTHER",
        priority: (priority as Priority) || "MEDIUM",
        status: "INTAKE",
        isDraft: true,
        dueDate: dueDate ? new Date(dueDate) : null,
        organizationId: organizationId || null,
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
    });

    void logAudit({
      userId,
      action: "CREATE",
      entityType: "Case",
      entityId: newCase.id,
      metadata: { caseNumber, title, isDraft: true },
    });

    return Response.json(newCase, { status: 201 });
  }

  const parsed = createCaseSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  const { title, description, caseType, priority, dueDate, organizationId } =
    parsed.data;

  const caseNumber = await generateCaseNumber();

  const newCase = await prisma.case.create({
    data: {
      caseNumber,
      title,
      description: description || null,
      caseType: caseType as CaseType,
      priority: priority as Priority,
      dueDate: dueDate ? new Date(dueDate) : null,
      organizationId: organizationId || null,
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

  void logAudit({
    userId,
    action: "CREATE",
    entityType: "Case",
    entityId: newCase.id,
    metadata: { caseNumber, title, caseType, priority },
  });

  return Response.json(newCase, { status: 201 });
}

// ─── Auto-increment case number generator ─────────────────────

async function generateCaseNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `OIG-${year}-`;

  // Find the highest sequence number by counting all cases for this year
  const allCases = await prisma.case.findMany({
    where: { caseNumber: { startsWith: prefix } },
    select: { caseNumber: true },
  });

  let maxSeq = 0;
  for (const c of allCases) {
    const seqStr = c.caseNumber.replace(prefix, "");
    const seq = parseInt(seqStr, 10);
    if (!isNaN(seq) && seq > maxSeq) {
      maxSeq = seq;
    }
  }

  return `${prefix}${String(maxSeq + 1).padStart(5, "0")}`;
}

// ─── Helpers ────────────────────────────────────────────────

async function handleMetrics(userId: string, role: string) {
  const accessFilter = getCaseAccessFilter(role as any, userId);

  const [
    totalCases,
    activeCases,
    closedCases,
    criticalCases,
    overdueTasks,
    upcomingDeadlines,
    unreadNotifications,
    statusCounts,
    typeCounts,
  ] = await Promise.all([
    prisma.case.count({ where: accessFilter }),
    prisma.case.count({
      where: { ...accessFilter, status: { in: ["OPEN", "ACTIVE", "INTAKE"] } },
    }),
    prisma.case.count({
      where: { ...accessFilter, status: { in: ["CLOSED", "ARCHIVED"] } },
    }),
    prisma.case.count({
      where: { ...accessFilter, priority: "CRITICAL" },
    }),
    prisma.task.count({
      where: {
        status: { in: ["PENDING", "IN_PROGRESS"] },
        dueDate: { lt: new Date() },
        case: accessFilter,
      },
    }),
    prisma.case.count({
      where: {
        ...accessFilter,
        dueDate: {
          gte: new Date(),
          lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      },
    }),
    prisma.notification.count({
      where: { userId, isRead: false },
    }),
    prisma.case.groupBy({
      by: ["status"],
      where: accessFilter,
      _count: true,
    }),
    prisma.case.groupBy({
      by: ["caseType"],
      where: accessFilter,
      _count: true,
    }),
  ]);

  const casesByStatus: Record<string, number> = {};
  for (const row of statusCounts) {
    casesByStatus[row.status] = row._count;
  }

  const casesByType: Record<string, number> = {};
  for (const row of typeCounts) {
    casesByType[row.caseType] = row._count;
  }

  return Response.json({
    totalCases,
    activeCases,
    closedCases,
    criticalCases,
    overdueTasks,
    upcomingDeadlines,
    unreadNotifications,
    casesByStatus,
    casesByType,
  });
}

async function handleDeadlines(userId: string, role: string, limit: number) {
  const accessFilter = getCaseAccessFilter(role as any, userId);
  const now = new Date();

  const [caseDueDates, taskDueDates] = await Promise.all([
    prisma.case.findMany({
      where: {
        ...accessFilter,
        dueDate: { gte: now },
        status: { notIn: ["CLOSED", "ARCHIVED"] },
      },
      orderBy: { dueDate: "asc" },
      take: limit,
      select: {
        id: true,
        title: true,
        caseNumber: true,
        dueDate: true,
        priority: true,
      },
    }),
    prisma.task.findMany({
      where: {
        status: { in: ["PENDING", "IN_PROGRESS"] },
        dueDate: { gte: now },
        case: accessFilter,
      },
      orderBy: { dueDate: "asc" },
      take: limit,
      select: {
        id: true,
        title: true,
        dueDate: true,
        priority: true,
        case: { select: { id: true, caseNumber: true } },
      },
    }),
  ]);

  const deadlines = [
    ...caseDueDates.map((c) => ({
      id: c.id,
      title: c.title,
      caseNumber: c.caseNumber,
      caseId: c.id,
      dueDate: c.dueDate!.toISOString(),
      type: "case" as const,
      priority: c.priority,
    })),
    ...taskDueDates.map((t) => ({
      id: t.id,
      title: t.title,
      caseNumber: t.case.caseNumber,
      caseId: t.case.id,
      dueDate: t.dueDate!.toISOString(),
      type: "task" as const,
      priority: t.priority,
    })),
  ]
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, limit);

  return Response.json(deadlines);
}

async function handleNotifications(userId: string, limit: number) {
  const notifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return Response.json(notifications);
}
