import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkPermission, getCaseAccessFilter } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { createEvidenceSchema } from "@/lib/validators/evidence";

// ─── GET: List evidence items for a case ─────────────────

export async function GET(
  request: Request,
  { params }: { params: Promise<{ caseId: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId, role } = session.user;

  if (!checkPermission(role, "evidence:read")) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { caseId } = await params;

  // Verify the user can access this case
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
  const search = url.searchParams.get("search") || undefined;
  const type = url.searchParams.get("type") || undefined;
  const status = url.searchParams.get("status") || undefined;

  const where = {
    caseId,
    ...(search && {
      OR: [
        { title: { contains: search, mode: "insensitive" as const } },
        { description: { contains: search, mode: "insensitive" as const } },
        { source: { contains: search, mode: "insensitive" as const } },
      ],
    }),
    ...(type && { type: type as import("@/generated/prisma").EvidenceType }),
    ...(status && { status: status as import("@/generated/prisma").EvidenceStatus }),
  };

  const [data, total] = await Promise.all([
    prisma.evidenceItem.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        chainOfCustody: {
          orderBy: { occurredAt: "asc" },
          include: {
            fromUser: { select: { id: true, firstName: true, lastName: true } },
            toUser: { select: { id: true, firstName: true, lastName: true } },
          },
        },
        _count: { select: { files: true, chainOfCustody: true } },
      },
    }),
    prisma.evidenceItem.count({ where }),
  ]);

  void logAudit({
    userId,
    action: "READ",
    entityType: "EvidenceItem",
    entityId: caseId,
    metadata: { page, pageSize, search, type, status },
  });

  return Response.json({
    data,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}

// ─── POST: Create an evidence item for a case ────────────

export async function POST(
  request: Request,
  { params }: { params: Promise<{ caseId: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId, role } = session.user;

  if (!checkPermission(role, "evidence:create")) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { caseId } = await params;

  // Verify the user can access this case
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

  const parsed = createEvidenceSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  const { title, description, type, source, collectedAt } = parsed.data;

  const evidenceItem = await prisma.evidenceItem.create({
    data: {
      caseId,
      title,
      description: description || null,
      type,
      source: source || null,
      collectedAt: collectedAt ? new Date(collectedAt) : new Date(),
    },
    include: {
      chainOfCustody: {
        orderBy: { occurredAt: "asc" },
        include: {
          fromUser: { select: { id: true, firstName: true, lastName: true } },
          toUser: { select: { id: true, firstName: true, lastName: true } },
        },
      },
      _count: { select: { files: true, chainOfCustody: true } },
    },
  });

  // Create initial chain of custody entry
  await prisma.chainOfCustody.create({
    data: {
      evidenceItemId: evidenceItem.id,
      fromUserId: null,
      toUserId: userId,
      action: "Collected",
      notes: `Evidence item "${title}" collected and logged into system`,
      occurredAt: evidenceItem.collectedAt,
    },
  });

  // CM14: Auto-create timeline entry for evidence collection
  await prisma.caseNote.create({
    data: {
      caseId,
      authorId: userId,
      content: `[AUTO] Evidence collected: ${evidenceItem.title} (${evidenceItem.type})`,
      isPrivate: false,
    },
  });

  void logAudit({
    userId,
    action: "CREATE",
    entityType: "EvidenceItem",
    entityId: evidenceItem.id,
    metadata: {
      caseId,
      caseNumber: caseRecord.caseNumber,
      title,
      type,
      source,
    },
  });

  return Response.json(evidenceItem, { status: 201 });
}
