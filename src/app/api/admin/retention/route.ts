import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkPermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";

// ─── GET: List cases eligible for retention cleanup ────────

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId, role } = session.user;

  if (role !== "ADMIN") {
    return Response.json({ error: "Admin access required" }, { status: 403 });
  }

  // Look up configurable retention years from SystemSetting
  let retentionYears = 10;
  const setting = await prisma.systemSetting.findUnique({
    where: { key: "RETENTION_YEARS" },
  });
  if (setting && typeof setting.value === "number") {
    retentionYears = setting.value;
  } else if (setting && typeof (setting.value as any) === "object" && (setting.value as any).value) {
    retentionYears = Number((setting.value as any).value) || 10;
  }

  const cutoffDate = new Date();
  cutoffDate.setFullYear(cutoffDate.getFullYear() - retentionYears);

  const eligibleCases = await prisma.case.findMany({
    where: {
      status: { in: ["CLOSED", "ARCHIVED"] },
      closedAt: { lt: cutoffDate },
      deletedAt: null,
    },
    orderBy: { closedAt: "asc" },
    select: {
      id: true,
      caseNumber: true,
      title: true,
      status: true,
      closedAt: true,
      createdAt: true,
    },
  });

  const now = new Date();
  const data = eligibleCases.map((c) => {
    const closedAt = c.closedAt!;
    const ageYears = (now.getTime() - closedAt.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    return {
      id: c.id,
      caseNumber: c.caseNumber,
      title: c.title,
      status: c.status,
      closedAt: closedAt.toISOString(),
      ageYears: Math.round(ageYears * 10) / 10,
    };
  });

  return Response.json({
    retentionYears,
    cutoffDate: cutoffDate.toISOString(),
    eligibleCount: data.length,
    cases: data,
  });
}

// ─── POST: Execute retention cleanup (admin only) ──────────

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId, role } = session.user;

  if (role !== "ADMIN") {
    return Response.json({ error: "Admin access required" }, { status: 403 });
  }

  // Look up configurable retention years from SystemSetting
  let retentionYears = 10;
  const setting = await prisma.systemSetting.findUnique({
    where: { key: "RETENTION_YEARS" },
  });
  if (setting && typeof setting.value === "number") {
    retentionYears = setting.value;
  } else if (setting && typeof (setting.value as any) === "object" && (setting.value as any).value) {
    retentionYears = Number((setting.value as any).value) || 10;
  }

  const cutoffDate = new Date();
  cutoffDate.setFullYear(cutoffDate.getFullYear() - retentionYears);

  const eligibleCases = await prisma.case.findMany({
    where: {
      status: { in: ["CLOSED", "ARCHIVED"] },
      closedAt: { lt: cutoffDate },
      deletedAt: null,
    },
    select: { id: true, caseNumber: true },
  });

  if (eligibleCases.length === 0) {
    return Response.json({ message: "No cases eligible for retention cleanup", deletedCount: 0 });
  }

  const now = new Date();
  const caseIds = eligibleCases.map((c) => c.id);

  // Soft-delete: set deletedAt timestamp
  await prisma.case.updateMany({
    where: { id: { in: caseIds } },
    data: { deletedAt: now },
  });

  void logAudit({
    userId,
    action: "DELETE",
    entityType: "Case",
    entityId: "retention-cleanup",
    metadata: {
      action: "retention_cleanup",
      retentionYears,
      cutoffDate: cutoffDate.toISOString(),
      deletedCount: eligibleCases.length,
      caseNumbers: eligibleCases.map((c) => c.caseNumber),
    },
  });

  return Response.json({
    message: "Retention cleanup completed",
    deletedCount: eligibleCases.length,
    deletedCases: eligibleCases.map((c) => c.caseNumber),
  });
}
