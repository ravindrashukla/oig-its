import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import type { NotificationType } from "@/generated/prisma";

// ─── GET: Fetch notifications for the current user ───────────

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId } = session.user;
  const url = new URL(request.url);

  const page = Math.max(Number(url.searchParams.get("page")) || 1, 1);
  const pageSize = Math.min(Math.max(Number(url.searchParams.get("pageSize")) || 20, 1), 100);
  const unreadOnly = url.searchParams.get("unreadOnly") === "true";
  const type = url.searchParams.get("type") as NotificationType | undefined;

  const where = {
    userId,
    ...(unreadOnly && { isRead: false }),
    ...(type && { type }),
  };

  const [data, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId, isRead: false } }),
  ]);

  void logAudit({
    userId,
    action: "READ",
    entityType: "Notification",
    entityId: "list",
    metadata: { page, pageSize, unreadOnly, type },
  });

  return Response.json({
    data,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
    unreadCount,
  });
}

// ─── PATCH: Mark notifications as read ───────────────────────

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId } = session.user;

  let body: { notificationIds?: string[]; markAllRead?: boolean };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.markAllRead) {
    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });

    void logAudit({
      userId,
      action: "UPDATE",
      entityType: "Notification",
      entityId: "all",
      metadata: { markAllRead: true },
    });

    return Response.json({ success: true });
  }

  if (body.notificationIds && Array.isArray(body.notificationIds)) {
    await prisma.notification.updateMany({
      where: {
        id: { in: body.notificationIds },
        userId, // ensure user owns these notifications
      },
      data: { isRead: true },
    });

    void logAudit({
      userId,
      action: "UPDATE",
      entityType: "Notification",
      entityId: body.notificationIds.join(","),
      metadata: { count: body.notificationIds.length },
    });

    return Response.json({ success: true });
  }

  return Response.json({ error: "Provide notificationIds or markAllRead" }, { status: 400 });
}
