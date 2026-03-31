import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkPermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";

// ─── GET: Training cost analytics (TM19) ────────────────

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId, role } = session.user;

  if (!checkPermission(role, "training:read")) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  // Only admin/supervisor can see cost analytics
  if (role !== "ADMIN" && role !== "SUPERVISOR") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  // Total training cost (sum of all record costs)
  const allRecords = await prisma.trainingRecord.findMany({
    where: { cost: { not: null } },
    select: {
      cost: true,
      userId: true,
      courseId: true,
      course: {
        select: {
          id: true,
          title: true,
          category: true,
        },
      },
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  const totalCost = allRecords.reduce((sum, r) => sum + (r.cost ?? 0), 0);

  // Cost by category
  const costByCategory: Record<string, number> = {};
  for (const record of allRecords) {
    const category = record.course.category || "UNCATEGORIZED";
    costByCategory[category] = (costByCategory[category] || 0) + (record.cost ?? 0);
  }
  const costByCategoryArray = Object.entries(costByCategory)
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);

  // Cost by user (top 10)
  const costByUser: Record<string, { name: string; total: number }> = {};
  for (const record of allRecords) {
    const uid = record.user.id;
    if (!costByUser[uid]) {
      costByUser[uid] = {
        name: `${record.user.firstName} ${record.user.lastName}`,
        total: 0,
      };
    }
    costByUser[uid].total += record.cost ?? 0;
  }
  const costByUserArray = Object.entries(costByUser)
    .map(([id, { name, total }]) => ({ userId: id, name, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  // Cost by course (top 10)
  const costByCourse: Record<string, { title: string; total: number }> = {};
  for (const record of allRecords) {
    const cid = record.course.id;
    if (!costByCourse[cid]) {
      costByCourse[cid] = {
        title: record.course.title,
        total: 0,
      };
    }
    costByCourse[cid].total += record.cost ?? 0;
  }
  const costByCourseArray = Object.entries(costByCourse)
    .map(([id, { title, total }]) => ({ courseId: id, title, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  void logAudit({
    userId,
    action: "READ",
    entityType: "TrainingAnalytics",
    entityId: "cost-summary",
  });

  return Response.json({
    totalCost,
    costByCategory: costByCategoryArray,
    costByUser: costByUserArray,
    costByCourse: costByCourseArray,
  });
}
