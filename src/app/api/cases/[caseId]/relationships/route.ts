import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkPermission, getCaseAccessFilter } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";

// ─── GET: List relationships for a case ────────────────

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

  // Fetch relationships where this case is either the "from" or "to" side
  const where = {
    OR: [{ fromCaseId: caseId }, { toCaseId: caseId }],
  };

  const [data, total] = await Promise.all([
    prisma.caseRelationship.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        fromCase: { select: { id: true, caseNumber: true, title: true } },
        toCase: { select: { id: true, caseNumber: true, title: true } },
      },
    }),
    prisma.caseRelationship.count({ where }),
  ]);

  void logAudit({
    userId,
    action: "READ",
    entityType: "CaseRelationship",
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

// ─── POST: Create a case relationship ──────────────────

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

  const { toCaseId, relationship, notes } = body as {
    toCaseId?: string;
    relationship?: string;
    notes?: string;
  };

  if (!toCaseId) {
    return Response.json(
      { error: "toCaseId is required" },
      { status: 422 },
    );
  }

  if (!relationship) {
    return Response.json(
      { error: "relationship is required" },
      { status: 422 },
    );
  }

  if (toCaseId === caseId) {
    return Response.json(
      { error: "A case cannot be related to itself" },
      { status: 422 },
    );
  }

  // Verify the target case exists and user has access
  const toCaseRecord = await prisma.case.findFirst({
    where: { id: toCaseId, ...accessFilter },
    select: { id: true, caseNumber: true },
  });

  if (!toCaseRecord) {
    return Response.json({ error: "Target case not found" }, { status: 404 });
  }

  const caseRelationship = await prisma.caseRelationship.create({
    data: {
      fromCaseId: caseId,
      toCaseId,
      relationship,
      notes: notes || null,
    },
    include: {
      fromCase: { select: { id: true, caseNumber: true, title: true } },
      toCase: { select: { id: true, caseNumber: true, title: true } },
    },
  });

  void logAudit({
    userId,
    action: "CREATE",
    entityType: "CaseRelationship",
    entityId: caseRelationship.id,
    metadata: {
      fromCaseId: caseId,
      fromCaseNumber: caseRecord.caseNumber,
      toCaseId,
      toCaseNumber: toCaseRecord.caseNumber,
      relationship,
    },
  });

  return Response.json(caseRelationship, { status: 201 });
}
