import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkPermission, getCaseAccessFilter } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const createNoteSchema = z.object({
  content: z
    .string()
    .min(1, "Content is required")
    .max(10000, "Content must be under 10000 characters"),
  isPrivate: z.boolean().optional(),
});

// ─── GET: List notes for a case (paginated) ─────────────────

export async function GET(
  request: Request,
  { params }: { params: Promise<{ caseId: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId, role } = session.user;

  if (!checkPermission(role, "case:read")) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { caseId } = await params;

  const accessFilter = getCaseAccessFilter(role, userId);
  const caseRecord = await prisma.case.findFirst({
    where: { id: caseId, ...accessFilter },
    select: { id: true },
  });

  if (!caseRecord) {
    return Response.json({ error: "Case not found" }, { status: 404 });
  }

  const url = new URL(request.url);
  const page = Math.max(Number(url.searchParams.get("page")) || 1, 1);
  const pageSize = Math.min(
    Math.max(Number(url.searchParams.get("pageSize")) || 20, 1),
    100,
  );

  const where = {
    caseId,
    // Non-admin/supervisor users can only see non-private notes (unless they authored them)
    ...(!["ADMIN", "SUPERVISOR"].includes(role) && {
      OR: [
        { isPrivate: false },
        { authorId: userId },
      ],
    }),
  };

  const [data, total] = await Promise.all([
    prisma.caseNote.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        author: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    }),
    prisma.caseNote.count({ where }),
  ]);

  void logAudit({
    userId,
    action: "READ",
    entityType: "CaseNote",
    entityId: caseId,
    metadata: { page, pageSize },
  });

  return Response.json({
    data,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}

// ─── POST: Create a note for a case ─────────────────────────

export async function POST(
  request: Request,
  { params }: { params: Promise<{ caseId: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId, role } = session.user;

  if (!checkPermission(role, "case:update")) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { caseId } = await params;

  const accessFilter = getCaseAccessFilter(role, userId);
  const caseRecord = await prisma.case.findFirst({
    where: { id: caseId, ...accessFilter },
    select: { id: true, caseNumber: true },
  });

  if (!caseRecord) {
    return Response.json({ error: "Case not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createNoteSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  const { content, isPrivate } = parsed.data;

  const note = await prisma.caseNote.create({
    data: {
      caseId,
      authorId: userId,
      content,
      isPrivate: isPrivate ?? false,
    },
    include: {
      author: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
    },
  });

  void logAudit({
    userId,
    action: "CREATE",
    entityType: "CaseNote",
    entityId: note.id,
    metadata: { caseId, caseNumber: caseRecord.caseNumber, isPrivate: isPrivate ?? false },
  });

  return Response.json(note, { status: 201 });
}
