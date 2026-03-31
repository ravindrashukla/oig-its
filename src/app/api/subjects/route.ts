import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkPermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";

// ─── GET: List all subjects (global view) ───────────────

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
  const page = Math.max(Number(url.searchParams.get("page")) || 1, 1);
  const pageSize = Math.min(
    Math.max(Number(url.searchParams.get("pageSize")) || 20, 1),
    100,
  );
  const search = url.searchParams.get("search") || undefined;
  const type = url.searchParams.get("type") || undefined;

  const where = {
    ...(type && { type: type as import("@/generated/prisma").SubjectType }),
    ...(search && {
      OR: [
        { firstName: { contains: search, mode: "insensitive" as const } },
        { lastName: { contains: search, mode: "insensitive" as const } },
        { orgName: { contains: search, mode: "insensitive" as const } },
        { email: { contains: search, mode: "insensitive" as const } },
      ],
    }),
  };

  const [data, total] = await Promise.all([
    prisma.subject.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        parent: { select: { id: true, type: true, firstName: true, lastName: true, orgName: true } },
        children: { select: { id: true, type: true, firstName: true, lastName: true, orgName: true } },
      },
    }),
    prisma.subject.count({ where }),
  ]);

  void logAudit({
    userId,
    action: "READ",
    entityType: "Subject",
    entityId: "list",
    metadata: { page, pageSize, search, type },
  });

  return Response.json({
    data,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}

// ─── POST: Create a subject (with duplicate detection) ──

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId, role } = session.user;

  if (!checkPermission(role, "case:update")) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const {
    type,
    firstName,
    lastName,
    orgName,
    email,
    phone,
    address,
    notes,
    parentId,
  } = body as {
    type?: string;
    firstName?: string;
    lastName?: string;
    orgName?: string;
    email?: string;
    phone?: string;
    address?: string;
    notes?: string;
    parentId?: string;
  };

  if (!type) {
    return Response.json({ error: "type is required" }, { status: 422 });
  }

  // ── Duplicate detection ──────────────────────────────
  let duplicates: unknown[] = [];

  if (type === "INDIVIDUAL") {
    const conditions: object[] = [];

    if (firstName && lastName) {
      conditions.push({
        AND: [
          { firstName: { equals: firstName, mode: "insensitive" as const } },
          { lastName: { equals: lastName, mode: "insensitive" as const } },
        ],
      });
    }

    if (email) {
      conditions.push({
        email: { equals: email, mode: "insensitive" as const },
      });
    }

    if (conditions.length > 0) {
      duplicates = await prisma.subject.findMany({
        where: { type: "INDIVIDUAL", OR: conditions },
        take: 10,
      });
    }
  } else if (
    type === "ORGANIZATION" ||
    type === "VENDOR" ||
    type === "DEPARTMENT"
  ) {
    if (orgName) {
      duplicates = await prisma.subject.findMany({
        where: {
          type: type as import("@/generated/prisma").SubjectType,
          orgName: { equals: orgName, mode: "insensitive" as const },
        },
        take: 10,
      });
    }
  }

  // ── Create the subject regardless of duplicates ──────
  const subject = await prisma.subject.create({
    data: {
      type: type as import("@/generated/prisma").SubjectType,
      firstName: firstName || null,
      lastName: lastName || null,
      orgName: orgName || null,
      email: email || null,
      phone: phone || null,
      address: address || null,
      notes: notes || null,
      parentId: parentId || null,
    },
    include: {
      parent: { select: { id: true, type: true, firstName: true, lastName: true, orgName: true } },
      children: { select: { id: true, type: true, firstName: true, lastName: true, orgName: true } },
    },
  });

  void logAudit({
    userId,
    action: "CREATE",
    entityType: "Subject",
    entityId: subject.id,
    metadata: { type, firstName, lastName, orgName, email },
  });

  if (duplicates.length > 0) {
    return Response.json(
      {
        data: subject,
        warning: "Potential duplicates found",
        duplicates,
      },
      { status: 201 },
    );
  }

  return Response.json(subject, { status: 201 });
}

// ─── PATCH: Update a subject by ?id= ──────────────────────

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId, role } = session.user;

  if (!checkPermission(role, "case:update")) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) {
    return Response.json({ error: "id query param is required" }, { status: 400 });
  }

  const existing = await prisma.subject.findUnique({ where: { id } });
  if (!existing) {
    return Response.json({ error: "Subject not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const {
    type,
    firstName,
    lastName,
    orgName,
    email,
    phone,
    address,
    notes,
    parentId,
  } = body as {
    type?: string;
    firstName?: string;
    lastName?: string;
    orgName?: string;
    email?: string;
    phone?: string;
    address?: string;
    notes?: string;
    parentId?: string | null;
  };

  const subject = await prisma.subject.update({
    where: { id },
    data: {
      ...(type !== undefined && { type: type as import("@/generated/prisma").SubjectType }),
      ...(firstName !== undefined && { firstName: firstName || null }),
      ...(lastName !== undefined && { lastName: lastName || null }),
      ...(orgName !== undefined && { orgName: orgName || null }),
      ...(email !== undefined && { email: email || null }),
      ...(phone !== undefined && { phone: phone || null }),
      ...(address !== undefined && { address: address || null }),
      ...(notes !== undefined && { notes: notes || null }),
      ...(parentId !== undefined && { parentId: parentId || null }),
    },
    include: {
      parent: { select: { id: true, type: true, firstName: true, lastName: true, orgName: true } },
      children: { select: { id: true, type: true, firstName: true, lastName: true, orgName: true } },
    },
  });

  void logAudit({
    userId,
    action: "UPDATE",
    entityType: "Subject",
    entityId: subject.id,
    metadata: { type, firstName, lastName, orgName, email },
  });

  return Response.json(subject);
}

// ─── DELETE: Delete a subject by ?id= ─────────────────────

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId, role } = session.user;

  if (!checkPermission(role, "case:delete")) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) {
    return Response.json({ error: "id query param is required" }, { status: 400 });
  }

  const existing = await prisma.subject.findUnique({
    where: { id },
    include: { caseSubjects: { select: { id: true }, take: 1 } },
  });

  if (!existing) {
    return Response.json({ error: "Subject not found" }, { status: 404 });
  }

  if (existing.caseSubjects.length > 0) {
    return Response.json(
      { error: "Cannot delete subject that is linked to cases. Remove case links first." },
      { status: 422 },
    );
  }

  await prisma.subject.delete({ where: { id } });

  void logAudit({
    userId,
    action: "DELETE",
    entityType: "Subject",
    entityId: id,
  });

  return Response.json({ success: true });
}
