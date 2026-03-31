import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkPermission, getCaseAccessFilter } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";

const DEFAULT_CHECKLIST_ITEMS = [
  "All subjects documented",
  "All evidence collected and verified",
  "All tasks completed",
  "Financial results documented",
  "Final report submitted",
  "Supervisor review completed",
];

/**
 * GET /api/cases/[caseId]/checklist
 *
 * List checklist items for a case.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ caseId: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId, role } = session.user;

  if (!checkPermission(role, "case:read")) {
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

  const items = await prisma.closeChecklist.findMany({
    where: { caseId },
    orderBy: { sortOrder: "asc" },
    include: {
      completedBy: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  });

  return Response.json({ data: items });
}

/**
 * POST /api/cases/[caseId]/checklist
 *
 * Add a checklist item. If no items exist yet and no `item` is provided,
 * auto-generate the default checklist items.
 *
 * Body: { item?: string, isRequired?: boolean, sortOrder?: number }
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ caseId: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId, role } = session.user;

  if (!checkPermission(role, "case:update")) {
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

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    // empty body is fine for auto-generating defaults
  }

  const existingCount = await prisma.closeChecklist.count({ where: { caseId } });

  // If no items exist and no specific item provided, auto-generate defaults
  if (existingCount === 0 && !body.item) {
    const created = await prisma.closeChecklist.createMany({
      data: DEFAULT_CHECKLIST_ITEMS.map((item, index) => ({
        caseId,
        item,
        isRequired: true,
        sortOrder: index,
      })),
    });

    void logAudit({
      userId,
      action: "CREATE",
      entityType: "CloseChecklist",
      entityId: caseId,
      metadata: { caseNumber: caseRecord.caseNumber, itemsCreated: created.count, auto: true },
    });

    const items = await prisma.closeChecklist.findMany({
      where: { caseId },
      orderBy: { sortOrder: "asc" },
      include: {
        completedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    return Response.json({ data: items }, { status: 201 });
  }

  // Add a single checklist item
  if (!body.item || typeof body.item !== "string") {
    return Response.json(
      { error: "Field 'item' is required when checklist already exists" },
      { status: 422 },
    );
  }

  const newItem = await prisma.closeChecklist.create({
    data: {
      caseId,
      item: body.item,
      isRequired: typeof body.isRequired === "boolean" ? body.isRequired : true,
      sortOrder: typeof body.sortOrder === "number" ? body.sortOrder : existingCount,
    },
    include: {
      completedBy: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  });

  void logAudit({
    userId,
    action: "CREATE",
    entityType: "CloseChecklist",
    entityId: newItem.id,
    metadata: { caseNumber: caseRecord.caseNumber, item: body.item },
  });

  return Response.json(newItem, { status: 201 });
}

/**
 * PATCH /api/cases/[caseId]/checklist?id=<checklistItemId>
 *
 * Mark a checklist item as completed (or uncompleted).
 *
 * Body: { isCompleted: boolean }
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ caseId: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId, role } = session.user;

  if (!checkPermission(role, "case:update")) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { caseId } = await params;
  const url = new URL(request.url);
  const itemId = url.searchParams.get("id");

  if (!itemId) {
    return Response.json({ error: "Query parameter 'id' is required" }, { status: 400 });
  }

  const accessFilter = getCaseAccessFilter(role, userId);
  const caseRecord = await prisma.case.findFirst({
    where: { id: caseId, ...accessFilter },
    select: { id: true },
  });

  if (!caseRecord) {
    return Response.json({ error: "Case not found" }, { status: 404 });
  }

  const existing = await prisma.closeChecklist.findFirst({
    where: { id: itemId, caseId },
  });

  if (!existing) {
    return Response.json({ error: "Checklist item not found" }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const isCompleted = body.isCompleted === true;

  const updated = await prisma.closeChecklist.update({
    where: { id: itemId },
    data: {
      isCompleted,
      completedById: isCompleted ? userId : null,
      completedAt: isCompleted ? new Date() : null,
    },
    include: {
      completedBy: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  });

  void logAudit({
    userId,
    action: "UPDATE",
    entityType: "CloseChecklist",
    entityId: itemId,
    metadata: { caseId, item: existing.item, isCompleted },
  });

  return Response.json(updated);
}
