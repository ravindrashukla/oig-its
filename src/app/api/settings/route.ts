import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkPermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";

// ─── GET: List all system settings ───────────────────────────

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId, role } = session.user;

  if (!checkPermission(role, "settings:read")) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const settings = await prisma.systemSetting.findMany({
    orderBy: { key: "asc" },
  });

  void logAudit({
    userId,
    action: "READ",
    entityType: "SystemSetting",
    entityId: "list",
  });

  return Response.json({ data: settings });
}

// ─── PATCH: Update a system setting ──────────────────────────

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId, role } = session.user;

  if (!checkPermission(role, "settings:update")) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { key: string; value: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.key || body.value === undefined) {
    return Response.json({ error: "key and value are required" }, { status: 400 });
  }

  const setting = await prisma.systemSetting.upsert({
    where: { key: body.key },
    update: { value: body.value as any },
    create: { key: body.key, value: body.value as any },
  });

  void logAudit({
    userId,
    action: "UPDATE",
    entityType: "SystemSetting",
    entityId: body.key,
    metadata: { value: body.value },
  });

  return Response.json(setting);
}
