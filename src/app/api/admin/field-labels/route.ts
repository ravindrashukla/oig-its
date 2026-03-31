import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

const VALID_ENTITY_TYPES = ["Case", "Subject", "Evidence", "Document", "Task"];

// ─── GET: List all field labels ─────────────────────────────

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const entityType = url.searchParams.get("entityType");

  const where = {
    ...(entityType && { entityType }),
  };

  const labels = await prisma.fieldLabel.findMany({
    where,
    orderBy: [{ entityType: "asc" }, { fieldName: "asc" }],
  });

  return Response.json({ data: labels });
}

// ─── POST: Create or update a field label ───────────────────

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId, role } = session.user;

  // Only admins can manage field labels
  if (role !== "ADMIN") {
    return Response.json({ error: "Forbidden: admin access required" }, { status: 403 });
  }

  let body: { entityType: string; fieldName: string; customLabel: string; isActive?: boolean };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.entityType || !body.fieldName || !body.customLabel) {
    return Response.json(
      { error: "entityType, fieldName, and customLabel are required" },
      { status: 400 },
    );
  }

  if (!VALID_ENTITY_TYPES.includes(body.entityType)) {
    return Response.json(
      { error: `Invalid entityType. Must be one of: ${VALID_ENTITY_TYPES.join(", ")}` },
      { status: 400 },
    );
  }

  const label = await prisma.fieldLabel.upsert({
    where: {
      entityType_fieldName: {
        entityType: body.entityType,
        fieldName: body.fieldName,
      },
    },
    create: {
      entityType: body.entityType,
      fieldName: body.fieldName,
      customLabel: body.customLabel,
      isActive: body.isActive ?? true,
    },
    update: {
      customLabel: body.customLabel,
      isActive: body.isActive ?? true,
    },
  });

  void logAudit({
    userId,
    action: "UPDATE",
    entityType: "FieldLabel",
    entityId: label.id,
    metadata: {
      entityType: body.entityType,
      fieldName: body.fieldName,
      customLabel: body.customLabel,
    },
  });

  return Response.json(label, { status: 201 });
}
