import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ─── GET: List preferences for current user ──────────────────

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId } = session.user;
  const url = new URL(request.url);
  const key = url.searchParams.get("key") || undefined;

  const preferences = await prisma.userPreference.findMany({
    where: {
      userId,
      ...(key ? { key } : {}),
    },
    orderBy: { key: "asc" },
  });

  return Response.json({ data: preferences });
}

// ─── PUT: Upsert a preference ────────────────────────────────

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId } = session.user;

  let body: { key: string; value: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.key || body.value === undefined) {
    return Response.json(
      { error: "key and value are required" },
      { status: 400 },
    );
  }

  if (typeof body.key !== "string" || body.key.length > 100) {
    return Response.json(
      { error: "key must be a string with max 100 characters" },
      { status: 400 },
    );
  }

  const preference = await prisma.userPreference.upsert({
    where: {
      userId_key: { userId, key: body.key },
    },
    update: { value: body.value as any },
    create: {
      userId,
      key: body.key,
      value: body.value as any,
    },
  });

  return Response.json(preference);
}
