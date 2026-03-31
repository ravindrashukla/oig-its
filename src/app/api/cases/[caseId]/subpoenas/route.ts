import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkPermission, getCaseAccessFilter } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";

const subpoenaInclude = {
  approvedBy: {
    select: { id: true, firstName: true, lastName: true, email: true },
  },
  case: {
    select: { id: true, caseNumber: true, title: true },
  },
} as const;

// ─── GET: List subpoena packages for a case ────────────────

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
  const status = url.searchParams.get("status") || undefined;

  const where = {
    caseId,
    ...(status && { status }),
  };

  const subpoenas = await prisma.subpoenaPackage.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: subpoenaInclude,
  });

  void logAudit({
    userId,
    action: "READ",
    entityType: "SubpoenaPackage",
    entityId: caseId,
    metadata: { status },
  });

  return Response.json({ data: subpoenas });
}

// ─── POST: Create a subpoena package ───────────────────────

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

  let body: {
    title: string;
    documentIds?: string[];
    issuedTo?: string;
    notes?: string;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.title) {
    return Response.json({ error: "title is required" }, { status: 400 });
  }

  const subpoena = await prisma.subpoenaPackage.create({
    data: {
      caseId,
      title: body.title,
      documentIds: body.documentIds ?? [],
      issuedTo: body.issuedTo ?? null,
      notes: body.notes ?? null,
      status: "DRAFT",
    },
    include: subpoenaInclude,
  });

  void logAudit({
    userId,
    action: "CREATE",
    entityType: "SubpoenaPackage",
    entityId: subpoena.id,
    metadata: {
      caseId,
      caseNumber: caseRecord.caseNumber,
      title: body.title,
      documentCount: body.documentIds?.length ?? 0,
    },
  });

  return Response.json(subpoena, { status: 201 });
}

// ─── PATCH: Update subpoena status ─────────────────────────

export async function PATCH(
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

  let body: {
    subpoenaId: string;
    action: "submit" | "approve" | "serve" | "return";
    issuedTo?: string;
    issuedDate?: string;
    returnDate?: string;
    notes?: string;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.subpoenaId || !body.action) {
    return Response.json({ error: "subpoenaId and action are required" }, { status: 400 });
  }

  const validActions = ["submit", "approve", "serve", "return"];
  if (!validActions.includes(body.action)) {
    return Response.json(
      { error: `Invalid action. Must be one of: ${validActions.join(", ")}` },
      { status: 400 },
    );
  }

  // Approval requires supervisor or admin role
  if (body.action === "approve" && role !== "SUPERVISOR" && role !== "ADMIN") {
    return Response.json(
      { error: "Forbidden: only supervisors and admins can approve subpoena packages" },
      { status: 403 },
    );
  }

  const subpoena = await prisma.subpoenaPackage.findFirst({
    where: { id: body.subpoenaId, caseId },
  });

  if (!subpoena) {
    return Response.json({ error: "Subpoena package not found" }, { status: 404 });
  }

  const statusMap: Record<string, string> = {
    submit: "PENDING_APPROVAL",
    approve: "APPROVED",
    serve: "SERVED",
    return: "RETURNED",
  };

  const updateData: Record<string, unknown> = {
    status: statusMap[body.action],
  };

  if (body.action === "approve") {
    updateData.approvedById = userId;
    updateData.approvedAt = new Date();
  }

  if (body.action === "serve") {
    updateData.issuedTo = body.issuedTo ?? subpoena.issuedTo;
    updateData.issuedDate = body.issuedDate ? new Date(body.issuedDate) : new Date();
  }

  if (body.action === "return") {
    updateData.returnDate = body.returnDate ? new Date(body.returnDate) : new Date();
  }

  if (body.notes !== undefined) {
    updateData.notes = body.notes;
  }

  const updated = await prisma.subpoenaPackage.update({
    where: { id: body.subpoenaId },
    data: updateData,
    include: subpoenaInclude,
  });

  void logAudit({
    userId,
    action: "STATUS_CHANGE",
    entityType: "SubpoenaPackage",
    entityId: body.subpoenaId,
    metadata: {
      caseId,
      action: body.action,
      newStatus: statusMap[body.action],
    },
  });

  return Response.json(updated);
}
