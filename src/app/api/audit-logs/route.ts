import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkPermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import type { AuditAction } from "@/generated/prisma";

// ─── GET: Fetch paginated audit logs ─────────────────────────

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId, role } = session.user;

  if (!checkPermission(role, "audit:read")) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const format = url.searchParams.get("format") || undefined;
  const page = Math.max(Number(url.searchParams.get("page")) || 1, 1);
  const pageSize = Math.min(Math.max(Number(url.searchParams.get("pageSize")) || 50, 1), 200);
  const action = url.searchParams.get("action") as AuditAction | undefined;
  const entityType = url.searchParams.get("entityType") || undefined;
  const userIdFilter = url.searchParams.get("userId") || undefined;
  const dateFrom = url.searchParams.get("dateFrom") || undefined;
  const dateTo = url.searchParams.get("dateTo") || undefined;
  const search = url.searchParams.get("search") || undefined;

  const where = {
    ...(action && { action }),
    ...(entityType && { entityType }),
    ...(userIdFilter && { userId: userIdFilter }),
    ...(dateFrom || dateTo
      ? {
          createdAt: {
            ...(dateFrom && { gte: new Date(dateFrom) }),
            ...(dateTo && { lte: new Date(dateTo) }),
          },
        }
      : {}),
    ...(search && {
      OR: [
        { entityType: { contains: search, mode: "insensitive" as const } },
        { entityId: { contains: search, mode: "insensitive" as const } },
      ],
    }),
  };

  // AF5: CSV export mode
  if (format === "csv") {
    const allData = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 10000,
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true, role: true },
        },
      },
    });

    void logAudit({
      userId,
      action: "EXPORT",
      entityType: "AuditLog",
      entityId: "csv",
      metadata: { recordCount: allData.length, action, entityType, userIdFilter },
    });

    const csvHeader = "Timestamp,User,Email,Action,Entity Type,Entity ID,IP Address";
    const csvRows = allData.map((row) => {
      const userName = row.user
        ? `${row.user.firstName} ${row.user.lastName}`
        : "System";
      const email = row.user?.email ?? "";
      // Escape fields that might contain commas or quotes
      const escape = (val: string) => `"${val.replace(/"/g, '""')}"`;
      return [
        escape(row.createdAt.toISOString()),
        escape(userName),
        escape(email),
        escape(row.action),
        escape(row.entityType),
        escape(row.entityId),
        escape(row.ipAddress ?? ""),
      ].join(",");
    });

    const csv = [csvHeader, ...csvRows].join("\n");

    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="audit-logs-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  }

  const [data, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true, role: true },
        },
      },
    }),
    prisma.auditLog.count({ where }),
  ]);

  void logAudit({
    userId,
    action: "READ",
    entityType: "AuditLog",
    entityId: "list",
    metadata: { page, pageSize, action, entityType, userIdFilter },
  });

  return Response.json({
    data,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}
