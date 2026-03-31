import { getServerSession } from "next-auth";
import { hashSync } from "bcryptjs";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkPermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import type { UserRole } from "@/generated/prisma";

// ─── GET: List all users ─────────────────────────────────────

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId, role } = session.user;

  if (!checkPermission(role, "user:read")) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const page = Math.max(Number(url.searchParams.get("page")) || 1, 1);
  const pageSize = Math.min(Math.max(Number(url.searchParams.get("pageSize")) || 25, 1), 100);
  const search = url.searchParams.get("search") || undefined;
  const roleFilter = url.searchParams.get("role") as UserRole | undefined;
  const isActive = url.searchParams.get("isActive");

  const where = {
    ...(roleFilter && { role: roleFilter }),
    ...(isActive !== null && isActive !== undefined && isActive !== ""
      ? { isActive: isActive === "true" }
      : {}),
    ...(search && {
      OR: [
        { firstName: { contains: search, mode: "insensitive" as const } },
        { lastName: { contains: search, mode: "insensitive" as const } },
        { email: { contains: search, mode: "insensitive" as const } },
      ],
    }),
  };

  const [data, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { lastName: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        organization: { select: { id: true, name: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  void logAudit({
    userId,
    action: "READ",
    entityType: "User",
    entityId: "list",
    metadata: { page, pageSize, search, role: roleFilter },
  });

  return Response.json({
    data,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}

// ─── PATCH: Update a user (by userId query param) ────────────

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId, role } = session.user;

  if (!checkPermission(role, "user:update")) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const targetUserId = url.searchParams.get("userId");
  if (!targetUserId) {
    return Response.json({ error: "userId query param is required" }, { status: 400 });
  }

  let body: { role?: UserRole; isActive?: boolean };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const validRoles: UserRole[] = ["ADMIN", "INVESTIGATOR", "SUPERVISOR", "ANALYST", "AUDITOR", "READONLY"];
  if (body.role && !validRoles.includes(body.role)) {
    return Response.json({ error: "Invalid role" }, { status: 422 });
  }

  const existing = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!existing) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  const updated = await prisma.user.update({
    where: { id: targetUserId },
    data: {
      ...(body.role !== undefined && { role: body.role }),
      ...(body.isActive !== undefined && { isActive: body.isActive }),
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
      organization: { select: { id: true, name: true } },
    },
  });

  // AF4: Field-level audit trail for user updates
  const changes: Record<string, { old: unknown; new: unknown }> = {};
  if (body.role !== undefined && body.role !== existing.role) {
    changes.role = { old: existing.role, new: body.role };
  }
  if (body.isActive !== undefined && body.isActive !== existing.isActive) {
    changes.isActive = { old: existing.isActive, new: body.isActive };
  }

  void logAudit({
    userId,
    action: "UPDATE",
    entityType: "User",
    entityId: targetUserId,
    metadata: { changes },
  });

  return Response.json(updated);
}

// ─── POST: Create a new user ────────────────────────────

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId, role } = session.user;

  if (!checkPermission(role, "user:create")) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: {
    email?: string;
    firstName?: string;
    lastName?: string;
    role?: UserRole;
    organizationId?: string;
    password?: string;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Validate required fields
  if (!body.email || !body.firstName || !body.lastName || !body.password) {
    return Response.json(
      { error: "email, firstName, lastName, and password are required" },
      { status: 422 },
    );
  }

  if (body.password.length < 8) {
    return Response.json(
      { error: "Password must be at least 8 characters" },
      { status: 422 },
    );
  }

  const validRoles: UserRole[] = ["ADMIN", "INVESTIGATOR", "SUPERVISOR", "ANALYST", "AUDITOR", "READONLY"];
  if (body.role && !validRoles.includes(body.role)) {
    return Response.json({ error: "Invalid role" }, { status: 422 });
  }

  // Check for duplicate email
  const existing = await prisma.user.findUnique({
    where: { email: body.email },
    select: { id: true },
  });

  if (existing) {
    return Response.json({ error: "A user with this email already exists" }, { status: 409 });
  }

  const passwordHash = hashSync(body.password, 10);

  const created = await prisma.user.create({
    data: {
      email: body.email,
      firstName: body.firstName,
      lastName: body.lastName,
      role: body.role || "READONLY",
      organizationId: body.organizationId || null,
      passwordHash,
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
      organization: { select: { id: true, name: true } },
    },
  });

  void logAudit({
    userId,
    action: "CREATE",
    entityType: "User",
    entityId: created.id,
    metadata: {
      email: body.email,
      role: body.role || "READONLY",
      organizationId: body.organizationId,
    },
  });

  return Response.json(created, { status: 201 });
}
