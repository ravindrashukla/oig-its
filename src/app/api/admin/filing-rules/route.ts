import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkPermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";

const FILING_RULE_PREFIX = "FILING_RULE_";

// ─── GET: List filing rules ────────────────────────────────

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { role } = session.user;

  if (!checkPermission(role, "settings:read")) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const settings = await prisma.systemSetting.findMany({
    where: {
      key: { startsWith: FILING_RULE_PREFIX },
    },
    orderBy: { key: "asc" },
  });

  const rules = settings.map((s) => ({
    id: s.id,
    key: s.key,
    ...(s.value as Record<string, unknown>),
  }));

  return Response.json({ data: rules });
}

// ─── POST: Create a filing rule ────────────────────────────

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId, role } = session.user;

  if (!checkPermission(role, "settings:update")) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { name, entityType, field, operator, value, action } = body as {
    name?: string;
    entityType?: string;
    field?: string;
    operator?: string;
    value?: unknown;
    action?: string;
  };

  if (!name || !entityType || !field || !operator || !action) {
    return Response.json(
      { error: "name, entityType, field, operator, and action are required" },
      { status: 422 },
    );
  }

  const validOperators = ["IS_EMPTY", "IS_NOT_EMPTY", "EQUALS", "NOT_EQUALS", "CONTAINS", "GREATER_THAN", "LESS_THAN"];
  if (!validOperators.includes(operator)) {
    return Response.json(
      { error: `operator must be one of: ${validOperators.join(", ")}` },
      { status: 422 },
    );
  }

  const validActions = ["ACCEPT", "REJECT", "FLAG_FOR_REVIEW"];
  if (!validActions.includes(action)) {
    return Response.json(
      { error: `action must be one of: ${validActions.join(", ")}` },
      { status: 422 },
    );
  }

  const validEntityTypes = ["Case", "Evidence", "Document", "Task"];
  if (!validEntityTypes.includes(entityType)) {
    return Response.json(
      { error: `entityType must be one of: ${validEntityTypes.join(", ")}` },
      { status: 422 },
    );
  }

  // Generate unique key
  const safeKey = name.replace(/[^a-zA-Z0-9]/g, "_").toUpperCase();
  const key = `${FILING_RULE_PREFIX}${safeKey}_${Date.now()}`;

  const ruleData = {
    name,
    entityType,
    field,
    operator,
    value: value ?? null,
    action,
    category: "FILING_RULE",
    createdBy: userId,
    createdAt: new Date().toISOString(),
  };

  const setting = await prisma.systemSetting.create({
    data: {
      key,
      value: ruleData as any,
    },
  });

  void logAudit({
    userId,
    action: "CREATE",
    entityType: "SystemSetting",
    entityId: setting.id,
    metadata: { type: "FILING_RULE", name, entityType, field, operator, action },
  });

  return Response.json(
    { id: setting.id, key: setting.key, ...ruleData },
    { status: 201 },
  );
}
