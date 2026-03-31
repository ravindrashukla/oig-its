import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkPermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import type { UserRole } from "@/generated/prisma";

const timesheetInclude = {
  user: {
    select: { id: true, firstName: true, lastName: true, email: true },
  },
  approvedBy: {
    select: { id: true, firstName: true, lastName: true },
  },
} as const;

// ─── GET: List timesheets ────────────────────────────────────

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
  const sortBy = url.searchParams.get("sortBy") || "periodStart";
  const sortOrder = url.searchParams.get("sortOrder") === "asc" ? "asc" : "desc";
  const status = url.searchParams.get("status") || undefined;
  const dateFrom = url.searchParams.get("dateFrom") || undefined;
  const dateTo = url.searchParams.get("dateTo") || undefined;
  const filterUserId = url.searchParams.get("userId") || undefined;

  const canSeeAll = (["ADMIN", "SUPERVISOR"] as UserRole[]).includes(role);
  const targetUserId = canSeeAll && filterUserId ? filterUserId : canSeeAll ? undefined : userId;

  const where = {
    ...(targetUserId && { userId: targetUserId }),
    ...(status && { status }),
    ...(dateFrom || dateTo
      ? {
          periodStart: {
            ...(dateFrom && { gte: new Date(dateFrom) }),
            ...(dateTo && { lte: new Date(dateTo) }),
          },
        }
      : {}),
  };

  const allowedSortFields = ["periodStart", "periodEnd", "totalHours", "status", "createdAt"];
  const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : "periodStart";

  const [data, total] = await Promise.all([
    prisma.timesheet.findMany({
      where,
      orderBy: { [safeSortBy]: sortOrder },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: timesheetInclude,
    }),
    prisma.timesheet.count({ where }),
  ]);

  // Compute availability pay and substantial hours for each timesheet
  let basicPayRate = 50;
  try {
    const rateSetting = await prisma.systemSetting.findUnique({
      where: { key: "availabilityPayRate" },
    });
    if (rateSetting?.value && typeof rateSetting.value === "number") {
      basicPayRate = rateSetting.value;
    } else if (
      rateSetting?.value &&
      typeof rateSetting.value === "object" &&
      rateSetting.value !== null &&
      "rate" in (rateSetting.value as Record<string, unknown>)
    ) {
      basicPayRate = Number((rateSetting.value as Record<string, unknown>).rate) || 50;
    }
  } catch {
    // Use default rate
  }

  const enrichedData = data.map((ts) => {
    const regularHours = Math.round((ts.totalHours - ts.overtimeHours - ts.leapHours) * 100) / 100;
    const availabilityPay = Math.round(ts.leapHours * basicPayRate * 0.25 * 100) / 100;
    const periodDays = Math.max(
      1,
      Math.ceil(
        (new Date(ts.periodEnd).getTime() - new Date(ts.periodStart).getTime()) /
          (1000 * 60 * 60 * 24),
      ) + 1,
    );
    const unscheduledHours = ts.overtimeHours + ts.leapHours;
    const substantialHours = unscheduledHours / periodDays >= 2;

    return {
      ...ts,
      regularHours: Math.max(0, regularHours),
      availabilityPay,
      substantialHours,
    };
  });

  void logAudit({
    userId,
    action: "READ",
    entityType: "Timesheet",
    entityId: "list",
    metadata: { page, pageSize, status },
  });

  return Response.json({
    data: enrichedData,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}

// ─── POST: Create/generate a timesheet for a period ──────────

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

  const { periodStart, periodEnd, notes } = body as Record<string, unknown>;

  if (!periodStart || !periodEnd) {
    return Response.json(
      { error: "periodStart and periodEnd are required" },
      { status: 422 },
    );
  }

  const start = new Date(periodStart as string);
  const end = new Date(periodEnd as string);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return Response.json({ error: "Invalid date format" }, { status: 422 });
  }

  if (end <= start) {
    return Response.json(
      { error: "periodEnd must be after periodStart" },
      { status: 422 },
    );
  }

  // Calculate totals from time entries in the period
  const entries = await prisma.timeEntry.findMany({
    where: {
      userId,
      date: { gte: start, lte: end },
    },
    select: { hours: true, isOvertime: true, isLeap: true, date: true },
  });

  let totalHours = 0;
  let overtimeHours = 0;
  let leapHours = 0;
  let regularHours = 0;

  for (const entry of entries) {
    totalHours += entry.hours;
    if (entry.isOvertime) {
      overtimeHours += entry.hours;
    } else if (entry.isLeap) {
      leapHours += entry.hours;
    } else {
      regularHours += entry.hours;
    }
  }

  // Availability Pay per Title 5 USC 5545a — 25% of basic pay rate
  // Look up configurable rate from SystemSetting, default $50/hr
  let basicPayRate = 50;
  try {
    const rateSetting = await prisma.systemSetting.findUnique({
      where: { key: "availabilityPayRate" },
    });
    if (rateSetting?.value && typeof rateSetting.value === "number") {
      basicPayRate = rateSetting.value;
    } else if (
      rateSetting?.value &&
      typeof rateSetting.value === "object" &&
      rateSetting.value !== null &&
      "rate" in (rateSetting.value as Record<string, unknown>)
    ) {
      basicPayRate = Number((rateSetting.value as Record<string, unknown>).rate) || 50;
    }
  } catch {
    // Use default rate
  }

  const availabilityPay = Math.round(leapHours * basicPayRate * 0.25 * 100) / 100;

  // Substantial hours check: average 2+ hours/day of unscheduled duty per pay period
  // Count calendar days in the period
  const periodDays = Math.max(
    1,
    Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1,
  );
  // Unscheduled duty = overtime + LEAP hours
  const unscheduledHours = overtimeHours + leapHours;
  const avgUnscheduledPerDay = unscheduledHours / periodDays;
  const substantialHours = avgUnscheduledPerDay >= 2;

  const timesheet = await prisma.timesheet.create({
    data: {
      userId,
      periodStart: start,
      periodEnd: end,
      totalHours,
      overtimeHours,
      leapHours,
      notes: (notes as string) || null,
    },
    include: timesheetInclude,
  });

  void logAudit({
    userId,
    action: "CREATE",
    entityType: "Timesheet",
    entityId: timesheet.id,
    metadata: {
      periodStart,
      periodEnd,
      totalHours,
      overtimeHours,
      leapHours,
      regularHours,
      availabilityPay,
      substantialHours,
    },
  });

  // Return timesheet with computed fields
  return Response.json(
    {
      ...timesheet,
      regularHours: Math.round(regularHours * 100) / 100,
      availabilityPay,
      substantialHours,
    },
    { status: 201 },
  );
}

// ─── PATCH: Update timesheet status (submit, approve, reject) ─

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

  const existing = await prisma.timesheet.findUnique({
    where: { id },
    select: { id: true, userId: true, status: true },
  });

  if (!existing) {
    return Response.json({ error: "Timesheet not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { status, notes } = body as Record<string, unknown>;

  if (!status) {
    return Response.json({ error: "status is required" }, { status: 422 });
  }

  const isOwner = existing.userId === userId;
  const isAdmin = (["ADMIN", "SUPERVISOR"] as UserRole[]).includes(role);

  const updatedData: Record<string, unknown> = {};

  if (status === "SUBMITTED") {
    if (!isOwner) {
      return Response.json(
        { error: "Only the owner can submit a timesheet" },
        { status: 403 },
      );
    }
    if (existing.status !== "DRAFT" && existing.status !== "REJECTED") {
      return Response.json(
        { error: "Only DRAFT or REJECTED timesheets can be submitted" },
        { status: 400 },
      );
    }
    updatedData.status = "SUBMITTED";
    updatedData.submittedAt = new Date();
  } else if (status === "APPROVED") {
    if (!isAdmin) {
      return Response.json(
        { error: "Only supervisors/admins can approve timesheets" },
        { status: 403 },
      );
    }
    if (existing.status !== "SUBMITTED") {
      return Response.json(
        { error: "Only SUBMITTED timesheets can be approved" },
        { status: 400 },
      );
    }
    updatedData.status = "APPROVED";
    updatedData.approvedById = userId;
    updatedData.approvedAt = new Date();
    updatedData.certifiedAt = new Date();
  } else if (status === "REJECTED") {
    if (!isAdmin) {
      return Response.json(
        { error: "Only supervisors/admins can reject timesheets" },
        { status: 403 },
      );
    }
    if (existing.status !== "SUBMITTED") {
      return Response.json(
        { error: "Only SUBMITTED timesheets can be rejected" },
        { status: 400 },
      );
    }
    updatedData.status = "REJECTED";
    updatedData.approvedById = userId;
    updatedData.approvedAt = new Date();
  } else {
    return Response.json(
      { error: "status must be SUBMITTED, APPROVED, or REJECTED" },
      { status: 422 },
    );
  }

  if (notes !== undefined) {
    updatedData.notes = (notes as string) || null;
  }

  const timesheet = await prisma.timesheet.update({
    where: { id },
    data: updatedData,
    include: timesheetInclude,
  });

  void logAudit({
    userId,
    action: "UPDATE",
    entityType: "Timesheet",
    entityId: timesheet.id,
    metadata: { status, previousStatus: existing.status },
  });

  return Response.json(timesheet);
}
