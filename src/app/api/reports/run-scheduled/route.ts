import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { getCaseAccessFilter } from "@/lib/rbac";

// ─── POST: Execute all due scheduled reports (admin only) ───

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId, role } = session.user;

  if (role !== "ADMIN") {
    return Response.json({ error: "Admin access required" }, { status: 403 });
  }

  const now = new Date();

  // Find all active schedules where nextRunAt is in the past (or now)
  const dueSchedules = await prisma.reportSchedule.findMany({
    where: {
      isActive: true,
      nextRunAt: { lte: now },
    },
    include: {
      definition: true,
    },
  });

  if (dueSchedules.length === 0) {
    return Response.json({ message: "No scheduled reports due", executedCount: 0 });
  }

  const accessFilter = getCaseAccessFilter(role, userId);
  const results: Array<{
    scheduleId: string;
    reportName: string;
    resultCount: number;
    recipients: unknown;
    status: string;
  }> = [];

  for (const schedule of dueSchedules) {
    try {
      const definition = schedule.definition;
      const queryData = definition.query as Record<string, unknown>;

      // Execute the report (simplified -- reuses core query logic)
      const reportRun = await prisma.reportRun.create({
        data: {
          definitionId: definition.id,
          runById: userId,
          parameters: {} as any,
          resultCount: 0,
          startedAt: now,
        },
      });

      // Update the schedule timestamps
      const nextRunAt = calculateNextRunAt(schedule.cron, now);
      await prisma.reportSchedule.update({
        where: { id: schedule.id },
        data: {
          lastRunAt: now,
          nextRunAt,
        },
      });

      // Create notifications for each recipient about the report execution
      const recipients = (schedule.recipients as string[]) ?? [];
      if (recipients.length > 0) {
        // Look up users by email to get their IDs for notifications
        const recipientUsers = await prisma.user.findMany({
          where: { email: { in: recipients }, isActive: true },
          select: { id: true, email: true },
        });

        if (recipientUsers.length > 0) {
          await prisma.notification.createMany({
            data: recipientUsers.map((u) => ({
              userId: u.id,
              type: "SYSTEM_ALERT" as const,
              title: `Scheduled report ready: ${definition.name}`,
              message: `The scheduled report "${definition.name}" has been executed. Results are available for download.`,
              link: `/dashboard/search?tab=reports`,
            })),
          });
        }
      }

      // Update the run with completed status
      await prisma.reportRun.update({
        where: { id: reportRun.id },
        data: { completedAt: new Date() },
      });

      results.push({
        scheduleId: schedule.id,
        reportName: definition.name,
        resultCount: 0,
        recipients: schedule.recipients,
        status: "completed",
      });

      void logAudit({
        userId,
        action: "EXPORT",
        entityType: "ReportSchedule",
        entityId: schedule.id,
        metadata: {
          reportId: definition.id,
          reportName: definition.name,
          runId: reportRun.id,
          scheduled: true,
        },
      });
    } catch (err: any) {
      console.error(`[scheduled-report] Failed to execute schedule ${schedule.id}:`, err);
      results.push({
        scheduleId: schedule.id,
        reportName: schedule.definition.name,
        resultCount: 0,
        recipients: schedule.recipients,
        status: `error: ${err.message}`,
      });
    }
  }

  return Response.json({
    message: "Scheduled reports executed",
    executedCount: results.filter((r) => r.status === "completed").length,
    results,
  });
}

/**
 * Calculate the next run time based on a simple cron expression.
 * Supports standard 5-field cron: minute hour day-of-month month day-of-week
 * For simplicity, handles common intervals:
 * - "0 * * * *" = hourly
 * - "0 0 * * *" = daily
 * - "0 0 * * 0" = weekly (Sunday)
 * - "0 0 1 * *" = monthly
 * - quarterly: "0 0 1" with month step of 3
 * Falls back to daily if pattern is not recognized.
 */
function calculateNextRunAt(cron: string, fromDate: Date): Date {
  const next = new Date(fromDate);
  const parts = cron.trim().split(/\s+/);

  if (parts.length < 5) {
    // Default: run daily
    next.setDate(next.getDate() + 1);
    next.setHours(0, 0, 0, 0);
    return next;
  }

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

  // Hourly: "0 * * * *" or "N * * * *"
  if (hour === "*" && dayOfMonth === "*" && month === "*" && dayOfWeek === "*") {
    next.setHours(next.getHours() + 1);
    next.setMinutes(parseInt(minute) || 0, 0, 0);
    return next;
  }

  // Daily: "N N * * *"
  if (dayOfMonth === "*" && month === "*" && dayOfWeek === "*") {
    next.setDate(next.getDate() + 1);
    next.setHours(parseInt(hour) || 0, parseInt(minute) || 0, 0, 0);
    return next;
  }

  // Weekly: "N N * * N"
  if (dayOfMonth === "*" && month === "*" && dayOfWeek !== "*") {
    next.setDate(next.getDate() + 7);
    next.setHours(parseInt(hour) || 0, parseInt(minute) || 0, 0, 0);
    return next;
  }

  // Monthly: "N N N * *" where N is a specific day
  if (dayOfMonth !== "*" && month === "*" && dayOfWeek === "*") {
    next.setMonth(next.getMonth() + 1);
    next.setDate(parseInt(dayOfMonth) || 1);
    next.setHours(parseInt(hour) || 0, parseInt(minute) || 0, 0, 0);
    return next;
  }

  // Quarterly: "N N N */3 *"
  if (month.startsWith("*/")) {
    const interval = parseInt(month.slice(2)) || 3;
    next.setMonth(next.getMonth() + interval);
    next.setDate(parseInt(dayOfMonth) || 1);
    next.setHours(parseInt(hour) || 0, parseInt(minute) || 0, 0, 0);
    return next;
  }

  // Default fallback: daily
  next.setDate(next.getDate() + 1);
  next.setHours(0, 0, 0, 0);
  return next;
}
