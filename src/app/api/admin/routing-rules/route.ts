import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkPermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";

const ROUTING_RULE_PREFIX = "ROUTING_RULE_";

// ─── GET: List routing rules ───────────────────────────────

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
      key: { startsWith: ROUTING_RULE_PREFIX },
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

// ─── POST: Create a routing rule ───────────────────────────

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

  const { fromStatus, toStatus, assignToRole, notifyRole } = body as {
    fromStatus?: string;
    toStatus?: string;
    assignToRole?: string;
    notifyRole?: string;
  };

  if (!fromStatus || !toStatus) {
    return Response.json(
      { error: "fromStatus and toStatus are required" },
      { status: 422 },
    );
  }

  if (!assignToRole && !notifyRole) {
    return Response.json(
      { error: "At least one of assignToRole or notifyRole is required" },
      { status: 422 },
    );
  }

  const validStatuses = ["INTAKE", "OPEN", "ACTIVE", "UNDER_REVIEW", "PENDING_ACTION", "CLOSED", "ARCHIVED"];
  if (!validStatuses.includes(fromStatus) || !validStatuses.includes(toStatus)) {
    return Response.json(
      { error: `fromStatus and toStatus must be one of: ${validStatuses.join(", ")}` },
      { status: 422 },
    );
  }

  const validRoles = ["ADMIN", "INVESTIGATOR", "SUPERVISOR", "ANALYST", "AUDITOR", "READONLY"];
  if (assignToRole && !validRoles.includes(assignToRole)) {
    return Response.json(
      { error: `assignToRole must be one of: ${validRoles.join(", ")}` },
      { status: 422 },
    );
  }
  if (notifyRole && !validRoles.includes(notifyRole)) {
    return Response.json(
      { error: `notifyRole must be one of: ${validRoles.join(", ")}` },
      { status: 422 },
    );
  }

  // Generate unique key
  const key = `${ROUTING_RULE_PREFIX}${fromStatus}_TO_${toStatus}_${Date.now()}`;

  const ruleData = {
    fromStatus,
    toStatus,
    assignToRole: assignToRole ?? null,
    notifyRole: notifyRole ?? null,
    category: "ROUTING_RULE",
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
    metadata: { type: "ROUTING_RULE", fromStatus, toStatus, assignToRole, notifyRole },
  });

  return Response.json(
    { id: setting.id, key: setting.key, ...ruleData },
    { status: 201 },
  );
}
