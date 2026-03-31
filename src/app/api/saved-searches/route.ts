import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const createSavedSearchSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(200, "Name must be under 200 characters"),
  query: z.record(z.string(), z.unknown(), { message: "Query must be a JSON object" }),
  isDefault: z.boolean().optional(),
});

// ─── GET: List saved searches for current user ──────────────

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId } = session.user;

  const searches = await prisma.savedSearch.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  return Response.json({ data: searches });
}

// ─── POST: Create a saved search ────────────────────────────

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

  const parsed = createSavedSearchSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  const { name, query, isDefault } = parsed.data;

  // If setting as default, unset any existing default for this user
  if (isDefault) {
    await prisma.savedSearch.updateMany({
      where: { userId, isDefault: true },
      data: { isDefault: false },
    });
  }

  const savedSearch = await prisma.savedSearch.create({
    data: {
      userId,
      name,
      query: query as any,
      isDefault: isDefault ?? false,
    },
  });

  void logAudit({
    userId,
    action: "CREATE",
    entityType: "SavedSearch",
    entityId: savedSearch.id,
    metadata: { name },
  });

  return Response.json(savedSearch, { status: 201 });
}

// ─── DELETE: Delete a saved search by id ────────────────────

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId } = session.user;

  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  if (!id) {
    return Response.json({ error: "Query parameter 'id' is required" }, { status: 400 });
  }

  const existing = await prisma.savedSearch.findUnique({
    where: { id },
  });

  if (!existing) {
    return Response.json({ error: "Saved search not found" }, { status: 404 });
  }

  if (existing.userId !== userId) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.savedSearch.delete({ where: { id } });

  void logAudit({
    userId,
    action: "DELETE",
    entityType: "SavedSearch",
    entityId: id,
    metadata: { name: existing.name },
  });

  return Response.json({ success: true });
}
