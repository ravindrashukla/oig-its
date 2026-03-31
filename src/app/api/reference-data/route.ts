import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkPermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";

// ─── GET: List reference data ────────────────────────────────

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId, role } = session.user;

  if (!checkPermission(role, "settings:read")) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const category = url.searchParams.get("category") || undefined;
  const activeOnly = url.searchParams.get("activeOnly") !== "false";

  const where = {
    ...(category && { category }),
    ...(activeOnly && { isActive: true }),
  };

  const data = await prisma.referenceData.findMany({
    where,
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { label: "asc" }],
  });

  void logAudit({
    userId,
    action: "READ",
    entityType: "ReferenceData",
    entityId: category ?? "all",
  });

  // Group by category for easier frontend consumption
  const grouped: Record<string, typeof data> = {};
  for (const item of data) {
    if (!grouped[item.category]) grouped[item.category] = [];
    grouped[item.category].push(item);
  }

  return Response.json({ data, grouped });
}

// ─── POST: Create a reference data entry ─────────────────────

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId, role } = session.user;

  if (!checkPermission(role, "settings:update")) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { category: string; code: string; label: string; sortOrder?: number; metadata?: Record<string, unknown> };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.category || !body.code || !body.label) {
    return Response.json({ error: "category, code, and label are required" }, { status: 400 });
  }

  const entry = await prisma.referenceData.create({
    data: {
      category: body.category,
      code: body.code,
      label: body.label,
      sortOrder: body.sortOrder ?? 0,
      metadata: body.metadata as any,
    },
  });

  void logAudit({
    userId,
    action: "CREATE",
    entityType: "ReferenceData",
    entityId: entry.id,
    metadata: { category: body.category, code: body.code },
  });

  return Response.json(entry, { status: 201 });
}

// ─── PATCH: Update a reference data entry ────────────────────

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId, role } = session.user;

  if (!checkPermission(role, "settings:update")) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) {
    return Response.json({ error: "id query param is required" }, { status: 400 });
  }

  let body: { label?: string; sortOrder?: number; isActive?: boolean; metadata?: Record<string, unknown> };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const existing = await prisma.referenceData.findUnique({ where: { id } });
  if (!existing) {
    return Response.json({ error: "Reference data entry not found" }, { status: 404 });
  }

  const updated = await prisma.referenceData.update({
    where: { id },
    data: {
      ...(body.label !== undefined && { label: body.label }),
      ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
      ...(body.isActive !== undefined && { isActive: body.isActive }),
      ...(body.metadata !== undefined && { metadata: body.metadata as any }),
    },
  });

  void logAudit({
    userId,
    action: "UPDATE",
    entityType: "ReferenceData",
    entityId: id,
    metadata: { category: existing.category, code: existing.code, ...body },
  });

  return Response.json(updated);
}
