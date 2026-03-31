import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkPermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";

// ─── GET: List user's delegations ──────────────────────────

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
  const direction = url.searchParams.get("direction") || "both"; // from, to, both
  const activeOnly = url.searchParams.get("activeOnly") !== "false";

  const baseFilter: Record<string, unknown> = {};
  if (activeOnly) {
    baseFilter.isActive = true;
  }

  let delegations;

  if (direction === "from") {
    delegations = await prisma.delegation.findMany({
      where: { ...baseFilter, fromUserId: userId },
      include: {
        toUser: { select: { id: true, firstName: true, lastName: true, email: true, role: true } },
        case: { select: { id: true, caseNumber: true, title: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  } else if (direction === "to") {
    delegations = await prisma.delegation.findMany({
      where: { ...baseFilter, toUserId: userId },
      include: {
        fromUser: { select: { id: true, firstName: true, lastName: true, email: true, role: true } },
        case: { select: { id: true, caseNumber: true, title: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  } else {
    delegations = await prisma.delegation.findMany({
      where: {
        ...baseFilter,
        OR: [{ fromUserId: userId }, { toUserId: userId }],
      },
      include: {
        fromUser: { select: { id: true, firstName: true, lastName: true, email: true, role: true } },
        toUser: { select: { id: true, firstName: true, lastName: true, email: true, role: true } },
        case: { select: { id: true, caseNumber: true, title: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  void logAudit({
    userId,
    action: "READ",
    entityType: "Delegation",
    entityId: "list",
    metadata: { direction, activeOnly },
  });

  return Response.json({ data: delegations });
}

// ─── POST: Create a delegation ─────────────────────────────

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId, role } = session.user;

  if (!checkPermission(role, "case:update")) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { toUserId, type, caseId, startDate, endDate } = body as {
    toUserId?: string;
    type?: string;
    caseId?: string;
    startDate?: string;
    endDate?: string;
  };

  if (!toUserId || !type) {
    return Response.json(
      { error: "toUserId and type are required" },
      { status: 422 },
    );
  }

  const validTypes = ["APPROVAL", "TASK", "CASE_ACCESS"];
  if (!validTypes.includes(type)) {
    return Response.json(
      { error: `type must be one of: ${validTypes.join(", ")}` },
      { status: 422 },
    );
  }

  if (toUserId === userId) {
    return Response.json(
      { error: "Cannot delegate to yourself" },
      { status: 422 },
    );
  }

  // Verify target user exists
  const targetUser = await prisma.user.findUnique({
    where: { id: toUserId },
    select: { id: true, isActive: true },
  });

  if (!targetUser || !targetUser.isActive) {
    return Response.json({ error: "Target user not found or inactive" }, { status: 404 });
  }

  // If caseId is provided, verify the case exists
  if (caseId) {
    const caseRecord = await prisma.case.findUnique({
      where: { id: caseId },
      select: { id: true },
    });
    if (!caseRecord) {
      return Response.json({ error: "Case not found" }, { status: 404 });
    }
  }

  const delegation = await prisma.delegation.create({
    data: {
      fromUserId: userId,
      toUserId,
      type,
      caseId: caseId || null,
      startDate: startDate ? new Date(startDate) : new Date(),
      endDate: endDate ? new Date(endDate) : null,
      isActive: true,
    },
    include: {
      fromUser: { select: { id: true, firstName: true, lastName: true, email: true, role: true } },
      toUser: { select: { id: true, firstName: true, lastName: true, email: true, role: true } },
      case: { select: { id: true, caseNumber: true, title: true } },
    },
  });

  // Notify the delegate
  await prisma.notification.create({
    data: {
      userId: toUserId,
      type: "SYSTEM_ALERT",
      title: "New delegation received",
      message: `You have been delegated ${type} permissions by ${session.user.displayName}`,
      link: "/dashboard/approvals",
    },
  });

  void logAudit({
    userId,
    action: "CREATE",
    entityType: "Delegation",
    entityId: delegation.id,
    metadata: { toUserId, type, caseId },
  });

  return Response.json(delegation, { status: 201 });
}

// ─── PATCH: Deactivate a delegation ────────────────────────

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId, role } = session.user;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { id } = body as { id?: string };

  if (!id) {
    return Response.json({ error: "id is required" }, { status: 422 });
  }

  const delegation = await prisma.delegation.findUnique({
    where: { id },
  });

  if (!delegation) {
    return Response.json({ error: "Delegation not found" }, { status: 404 });
  }

  // Only the delegator, the delegate, or an admin can deactivate
  const isAdmin = role === "ADMIN";
  if (delegation.fromUserId !== userId && delegation.toUserId !== userId && !isAdmin) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const updated = await prisma.delegation.update({
    where: { id },
    data: { isActive: false },
    include: {
      fromUser: { select: { id: true, firstName: true, lastName: true, email: true, role: true } },
      toUser: { select: { id: true, firstName: true, lastName: true, email: true, role: true } },
      case: { select: { id: true, caseNumber: true, title: true } },
    },
  });

  void logAudit({
    userId,
    action: "UPDATE",
    entityType: "Delegation",
    entityId: id,
    metadata: { action: "deactivate" },
  });

  return Response.json(updated);
}
