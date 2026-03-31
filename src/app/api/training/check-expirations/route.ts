import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

/**
 * POST /api/training/check-expirations
 *
 * Admin-only endpoint (called by cron or manually) that:
 * 1. Finds COMPLETED training records expiring within 30 days and creates notifications
 * 2. Finds records past their expiration date and marks them EXPIRED
 */
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId, role } = session.user;

  if (role !== "ADMIN") {
    return Response.json({ error: "Forbidden: admin only" }, { status: 403 });
  }

  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  // 1. Find COMPLETED records expiring within the next 30 days
  const expiringRecords = await prisma.trainingRecord.findMany({
    where: {
      status: "COMPLETED",
      expirationDate: {
        gt: now,
        lte: thirtyDaysFromNow,
      },
    },
    include: {
      user: { select: { id: true, firstName: true, lastName: true } },
      course: { select: { id: true, title: true } },
    },
  });

  // Create notifications for expiring records
  let notificationsSent = 0;
  for (const record of expiringRecords) {
    const expirationStr = record.expirationDate!.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    await prisma.notification.create({
      data: {
        userId: record.userId,
        type: "SYSTEM_ALERT",
        title: "Training expiring soon",
        message: `Your ${record.course.title} certification expires on ${expirationStr}. Please renew.`,
        link: `/dashboard/training`,
      },
    });
    notificationsSent++;
  }

  // 2. Find records where expirationDate has passed and update status to EXPIRED
  const expiredResult = await prisma.trainingRecord.updateMany({
    where: {
      status: "COMPLETED",
      expirationDate: {
        lte: now,
      },
    },
    data: {
      status: "EXPIRED",
    },
  });

  void logAudit({
    userId,
    action: "UPDATE",
    entityType: "TrainingRecord",
    entityId: "check-expirations",
    metadata: {
      notificationsSent,
      recordsExpired: expiredResult.count,
    },
  });

  return Response.json({
    notificationsSent,
    recordsExpired: expiredResult.count,
  });
}
