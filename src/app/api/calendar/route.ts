import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

// ─── GET: List calendar reminders for current user ──────

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId } = session.user;

  const url = new URL(request.url);
  const dateFrom = url.searchParams.get("dateFrom") || undefined;
  const dateTo = url.searchParams.get("dateTo") || undefined;

  const where = {
    userId,
    isActive: true,
    ...(dateFrom || dateTo
      ? {
          date: {
            ...(dateFrom && { gte: new Date(dateFrom) }),
            ...(dateTo && { lte: new Date(dateTo) }),
          },
        }
      : {}),
  };

  const data = await prisma.calendarReminder.findMany({
    where,
    orderBy: { date: "asc" },
    include: {
      case: {
        select: { id: true, caseNumber: true, title: true },
      },
    },
  });

  void logAudit({
    userId,
    action: "READ",
    entityType: "CalendarReminder",
    entityId: "list",
    metadata: { dateFrom, dateTo },
  });

  return Response.json({ data });
}

// ─── POST: Create a calendar reminder ──────────────────

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId } = session.user;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const {
    title,
    description,
    date,
    isRecurring,
    frequency,
    caseId,
  } = body as Record<string, string | boolean | undefined>;

  if (!title || !date) {
    return Response.json(
      { error: "Validation failed", issues: { title: !title ? ["Required"] : [], date: !date ? ["Required"] : [] } },
      { status: 422 },
    );
  }

  const reminder = await prisma.calendarReminder.create({
    data: {
      userId,
      title: title as string,
      description: (description as string) || null,
      date: new Date(date as string),
      isRecurring: (isRecurring as boolean) || false,
      frequency: (frequency as string) || null,
      caseId: (caseId as string) || null,
    },
    include: {
      case: {
        select: { id: true, caseNumber: true, title: true },
      },
    },
  });

  void logAudit({
    userId,
    action: "CREATE",
    entityType: "CalendarReminder",
    entityId: reminder.id,
    metadata: { title, isRecurring, frequency },
  });

  return Response.json(reminder, { status: 201 });
}
