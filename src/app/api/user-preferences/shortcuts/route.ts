import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const DEFAULT_SHORTCUTS = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Cases", href: "/dashboard/cases" },
  { label: "Tasks", href: "/dashboard/tasks" },
  { label: "Notifications", href: "/dashboard/notifications" },
];

// ─── GET: Return user's custom shortcuts ─────────────────────

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId } = session.user;

  const pref = await prisma.userPreference.findUnique({
    where: { userId_key: { userId, key: "shortcuts" } },
  });

  return Response.json({
    data: pref ? pref.value : DEFAULT_SHORTCUTS,
    isDefault: !pref,
  });
}

// ─── PUT: Save custom shortcuts array ────────────────────────

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId } = session.user;

  let body: { shortcuts: Array<{ label: string; href: string; icon?: string }> };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!Array.isArray(body.shortcuts)) {
    return Response.json(
      { error: "shortcuts must be an array" },
      { status: 400 },
    );
  }

  // Validate each shortcut entry
  for (const s of body.shortcuts) {
    if (!s.label || !s.href) {
      return Response.json(
        { error: "Each shortcut must have a label and href" },
        { status: 400 },
      );
    }
  }

  const preference = await prisma.userPreference.upsert({
    where: { userId_key: { userId, key: "shortcuts" } },
    update: { value: body.shortcuts as any },
    create: {
      userId,
      key: "shortcuts",
      value: body.shortcuts as any,
    },
  });

  return Response.json({ data: preference.value });
}
