import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

// ─── POST: Process due calendar reminders (admin only, CM43) ─────

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId, role } = session.user;

  // Admin only
  if (role !== "ADMIN") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const now = new Date();

  // Find all active reminders where date <= now
  const dueReminders = await prisma.calendarReminder.findMany({
    where: {
      isActive: true,
      date: { lte: now },
    },
    include: {
      case: { select: { id: true, caseNumber: true, title: true } },
    },
  });

  let notificationCount = 0;

  for (const reminder of dueReminders) {
    // Create a notification for the user
    await prisma.notification.create({
      data: {
        userId: reminder.userId,
        type: "SYSTEM_ALERT",
        title: `Reminder: ${reminder.title}`,
        message: reminder.description
          ? `${reminder.description}${reminder.case ? ` (Case ${reminder.case.caseNumber})` : ""}`
          : `Calendar reminder is due${reminder.case ? ` for case ${reminder.case.caseNumber}` : ""}.`,
        link: reminder.caseId ? `/dashboard/cases/${reminder.caseId}` : "/dashboard",
      },
    });
    notificationCount++;

    if (reminder.isRecurring && reminder.frequency) {
      // Calculate next occurrence based on frequency
      const nextDate = calculateNextOccurrence(reminder.date, reminder.frequency);
      await prisma.calendarReminder.update({
        where: { id: reminder.id },
        data: { date: nextDate },
      });
    } else {
      // Non-recurring: deactivate
      await prisma.calendarReminder.update({
        where: { id: reminder.id },
        data: { isActive: false },
      });
    }
  }

  void logAudit({
    userId,
    action: "UPDATE",
    entityType: "CalendarReminder",
    entityId: "check-reminders",
    metadata: { processedCount: dueReminders.length, notificationCount },
  });

  return Response.json({
    processed: dueReminders.length,
    notificationsSent: notificationCount,
  });
}

function calculateNextOccurrence(current: Date, frequency: string): Date {
  const next = new Date(current);

  switch (frequency) {
    case "DAILY":
      next.setDate(next.getDate() + 1);
      break;
    case "WEEKLY":
      next.setDate(next.getDate() + 7);
      break;
    case "MONTHLY":
      next.setMonth(next.getMonth() + 1);
      break;
    case "QUARTERLY":
      next.setMonth(next.getMonth() + 3);
      break;
    case "SEMIANNUAL":
      next.setMonth(next.getMonth() + 6);
      break;
    case "ANNUAL":
      next.setFullYear(next.getFullYear() + 1);
      break;
    default:
      // Default to monthly if frequency is unknown
      next.setMonth(next.getMonth() + 1);
      break;
  }

  return next;
}
