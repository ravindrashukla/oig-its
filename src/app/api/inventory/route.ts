import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkPermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";

// ─── GET: List inventory items with pagination & filters ─

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
  const status = url.searchParams.get("status") || undefined;
  const assignedToId = url.searchParams.get("assignedToId") || undefined;
  const caseId = url.searchParams.get("caseId") || undefined;

  const where = {
    ...(type && { type }),
    ...(status && { status }),
    ...(assignedToId && { assignedToId }),
    ...(caseId && { caseId }),
    ...(search && {
      OR: [
        { name: { contains: search, mode: "insensitive" as const } },
        { serialNumber: { contains: search, mode: "insensitive" as const } },
        { barcode: { contains: search, mode: "insensitive" as const } },
      ],
    }),
  };

  const [data, total] = await Promise.all([
    prisma.inventoryItem.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        assignedTo: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        case: {
          select: { id: true, caseNumber: true, title: true },
        },
      },
    }),
    prisma.inventoryItem.count({ where }),
  ]);

  void logAudit({
    userId,
    action: "READ",
    entityType: "InventoryItem",
    entityId: "list",
    metadata: { page, pageSize, filters: { type, status, search } },
  });

  return Response.json({
    data,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}

// ─── POST: Create an inventory item (admin only) ────────

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId, role } = session.user;

  if (!checkPermission(role, "settings:update")) {
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
    name,
    description,
    serialNumber,
    barcode,
    status,
    assignedToId,
    caseId,
    location,
    region,
    acquiredDate,
    condition,
    notes,
  } = body as Record<string, string | undefined>;

  if (!type || !name) {
    return Response.json(
      { error: "Validation failed", issues: { type: !type ? ["Required"] : [], name: !name ? ["Required"] : [] } },
      { status: 422 },
    );
  }

  const item = await prisma.inventoryItem.create({
    data: {
      type,
      name,
      description: description || null,
      serialNumber: serialNumber || null,
      barcode: barcode || null,
      status: status || "AVAILABLE",
      assignedToId: assignedToId || null,
      caseId: caseId || null,
      location: location || null,
      region: region || null,
      acquiredDate: acquiredDate ? new Date(acquiredDate) : null,
      condition: condition || null,
      notes: notes || null,
    },
    include: {
      assignedTo: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
      case: {
        select: { id: true, caseNumber: true, title: true },
      },
    },
  });

  void logAudit({
    userId,
    action: "CREATE",
    entityType: "InventoryItem",
    entityId: item.id,
    metadata: { type, name, serialNumber },
  });

  return Response.json(item, { status: 201 });
}

// ─── PATCH: Update an inventory item ────────────────────

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
    return Response.json({ error: "Missing id query parameter" }, { status: 400 });
  }

  const existing = await prisma.inventoryItem.findUnique({ where: { id } });
  if (!existing) {
    return Response.json({ error: "Item not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const updates = body as Record<string, unknown>;

  const allowedFields = [
    "type", "name", "description", "serialNumber", "barcode",
    "status", "assignedToId", "caseId", "location", "region",
    "acquiredDate", "condition", "notes",
  ];

  const data: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (field in updates) {
      if (field === "acquiredDate" && updates[field]) {
        data[field] = new Date(updates[field] as string);
      } else {
        data[field] = updates[field] ?? null;
      }
    }
  }

  const item = await prisma.inventoryItem.update({
    where: { id },
    data,
    include: {
      assignedTo: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
      case: {
        select: { id: true, caseNumber: true, title: true },
      },
    },
  });

  void logAudit({
    userId,
    action: "UPDATE",
    entityType: "InventoryItem",
    entityId: id,
    metadata: { updatedFields: Object.keys(data) },
  });

  return Response.json(item);
}
