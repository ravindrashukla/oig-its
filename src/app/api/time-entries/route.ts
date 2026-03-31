import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkPermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import type { UserRole } from "@/generated/prisma";

const timeEntryInclude = {
  user: {
    select: { id: true, firstName: true, lastName: true, email: true },
  },
  approvedBy: {
    select: { id: true, firstName: true, lastName: true },
  },
  case: {
    select: { id: true, caseNumber: true, title: true },
  },
} as const;

// ─── GET: List time entries ──────────────────────────────────

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
  const sortBy = url.searchParams.get("sortBy") || "date";
  const sortOrder = url.searchParams.get("sortOrder") === "asc" ? "asc" : "desc";
  const filterUserId = url.searchParams.get("userId") || undefined;
  const caseId = url.searchParams.get("caseId") || undefined;
  const dateFrom = url.searchParams.get("dateFrom") || undefined;
  const dateTo = url.searchParams.get("dateTo") || undefined;
  const activityType = url.searchParams.get("activityType") || undefined;
  const status = url.searchParams.get("status") || undefined;

  // Users can see their own; supervisors/admins can see anyone's
  const canSeeAll = (["ADMIN", "SUPERVISOR"] as UserRole[]).includes(role);
  const targetUserId = canSeeAll && filterUserId ? filterUserId : canSeeAll ? undefined : userId;

  const where = {
    ...(targetUserId && { userId: targetUserId }),
    ...(caseId && { caseId }),
    ...(activityType && { activityType }),
    ...(status && { status }),
    ...(dateFrom || dateTo
      ? {
          date: {
            ...(dateFrom && { gte: new Date(dateFrom) }),
            ...(dateTo && { lte: new Date(dateTo) }),
          },
        }
      : {}),
  };

  const allowedSortFields = ["date", "createdAt", "hours", "activityType", "status"];
  const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : "date";

  const [data, total] = await Promise.all([
    prisma.timeEntry.findMany({
      where,
      orderBy: { [safeSortBy]: sortOrder },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: timeEntryInclude,
    }),
    prisma.timeEntry.count({ where }),
  ]);

  void logAudit({
    userId,
    action: "READ",
    entityType: "TimeEntry",
    entityId: "list",
    metadata: { page, pageSize, activityType, status },
  });

  return Response.json({
    data,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}

// ─── POST: Create a time entry ───────────────────────────────

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId, role } = session.user;

  if (!checkPermission(role, "task:create")) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { date, hours, activityType, caseId, description, isOvertime, isLeap } =
    body as Record<string, unknown>;

  if (!date || !hours || !activityType) {
    return Response.json(
      { error: "date, hours, and activityType are required" },
      { status: 422 },
    );
  }

  const validActivityTypes = [
    "CASE_WORK", "TRAINING", "ADMIN", "TRAVEL", "OVERTIME",
    "UNDERCOVER", "COURT", "LEAVE", "OTHER",
  ];
  if (!validActivityTypes.includes(activityType as string)) {
    return Response.json(
      { error: `activityType must be one of: ${validActivityTypes.join(", ")}` },
      { status: 422 },
    );
  }

  if (typeof hours !== "number" || hours <= 0 || hours > 24) {
    return Response.json(
      { error: "hours must be a number between 0 and 24" },
      { status: 422 },
    );
  }

  // Verify case exists if provided
  if (caseId) {
    const caseExists = await prisma.case.findUnique({
      where: { id: caseId as string },
      select: { id: true },
    });
    if (!caseExists) {
      return Response.json({ error: "Case not found" }, { status: 404 });
    }
  }

  const entry = await prisma.timeEntry.create({
    data: {
      userId,
      date: new Date(date as string),
      hours: hours as number,
      activityType: activityType as string,
      caseId: (caseId as string) || null,
      description: (description as string) || null,
      isOvertime: Boolean(isOvertime),
      isLeap: Boolean(isLeap),
    },
    include: timeEntryInclude,
  });

  void logAudit({
    userId,
    action: "CREATE",
    entityType: "TimeEntry",
    entityId: entry.id,
    metadata: { activityType, hours, date },
  });

  return Response.json(entry, { status: 201 });
}

// ─── PATCH: Update a time entry ──────────────────────────────

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId, role } = session.user;

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) {
    return Response.json({ error: "id query parameter is required" }, { status: 400 });
  }

  const existing = await prisma.timeEntry.findUnique({
    where: { id },
    select: { id: true, userId: true, status: true },
  });

  if (!existing) {
    return Response.json({ error: "Time entry not found" }, { status: 404 });
  }

  // Only DRAFT entries can be edited by the owner
  const isOwner = existing.userId === userId;
  const isAdmin = (["ADMIN", "SUPERVISOR"] as UserRole[]).includes(role);

  if (!isOwner && !isAdmin) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  if (existing.status !== "DRAFT" && isOwner && !isAdmin) {
    return Response.json(
      { error: "Only DRAFT entries can be edited" },
      { status: 400 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const {
    date, hours, activityType, caseId, description,
    isOvertime, isLeap, status,
  } = body as Record<string, unknown>;

  // Admins/supervisors can approve or reject
  const updatedData: Record<string, unknown> = {};

  if (date !== undefined) updatedData.date = new Date(date as string);
  if (hours !== undefined) updatedData.hours = hours;
  if (activityType !== undefined) updatedData.activityType = activityType;
  if (caseId !== undefined) updatedData.caseId = caseId || null;
  if (description !== undefined) updatedData.description = description || null;
  if (isOvertime !== undefined) updatedData.isOvertime = Boolean(isOvertime);
  if (isLeap !== undefined) updatedData.isLeap = Boolean(isLeap);

  if (status !== undefined) {
    if (status === "APPROVED" || status === "REJECTED") {
      if (!isAdmin) {
        return Response.json(
          { error: "Only supervisors/admins can approve or reject" },
          { status: 403 },
        );
      }
      updatedData.status = status;
      updatedData.approvedById = userId;
      updatedData.approvedAt = new Date();
    } else {
      updatedData.status = status;
    }
  }

  const entry = await prisma.timeEntry.update({
    where: { id },
    data: updatedData,
    include: timeEntryInclude,
  });

  void logAudit({
    userId,
    action: "UPDATE",
    entityType: "TimeEntry",
    entityId: entry.id,
    metadata: { status, hours },
  });

  return Response.json(entry);
}
