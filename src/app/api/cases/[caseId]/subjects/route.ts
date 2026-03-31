import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkPermission, getCaseAccessFilter } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";

// ─── GET: List subjects for a case ──────────────────────

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
  const search = url.searchParams.get("search") || undefined;
  const role_ = url.searchParams.get("role") || undefined;
  const type = url.searchParams.get("type") || undefined;

  const where = {
    caseId,
    ...(role_ && { role: role_ as import("@/generated/prisma").SubjectRole }),
    ...(type && {
      subject: { type: type as import("@/generated/prisma").SubjectType },
    }),
    ...(search && {
      subject: {
        OR: [
          { firstName: { contains: search, mode: "insensitive" as const } },
          { lastName: { contains: search, mode: "insensitive" as const } },
          { orgName: { contains: search, mode: "insensitive" as const } },
          { email: { contains: search, mode: "insensitive" as const } },
        ],
      },
    }),
  };

  const [data, total] = await Promise.all([
    prisma.caseSubject.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        subject: true,
      },
    }),
    prisma.caseSubject.count({ where }),
  ]);

  void logAudit({
    userId,
    action: "READ",
    entityType: "CaseSubject",
    entityId: caseId,
    metadata: { page, pageSize, search },
  });

  return Response.json({
    data,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}

// ─── POST: Link a subject to a case ─────────────────────

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

  const { subjectId, role: subjectRole, notes } = body as {
    subjectId?: string;
    role?: string;
    notes?: string;
  };

  if (!subjectId) {
    return Response.json(
      { error: "subjectId is required" },
      { status: 422 },
    );
  }

  // Verify the subject exists
  const subject = await prisma.subject.findUnique({
    where: { id: subjectId },
  });

  if (!subject) {
    return Response.json({ error: "Subject not found" }, { status: 404 });
  }

  // WPN16: Auto-detect duplicate subjects on case linking
  let warning: string | undefined;
  const existingCaseSubjects = await prisma.caseSubject.findMany({
    where: { caseId },
    include: { subject: true },
  });

  const potentialDuplicates = existingCaseSubjects.filter((cs) => {
    const existing = cs.subject;
    // Compare firstName+lastName (case-insensitive) for individuals
    if (subject.firstName && subject.lastName && existing.firstName && existing.lastName) {
      if (
        subject.firstName.toLowerCase() === existing.firstName.toLowerCase() &&
        subject.lastName.toLowerCase() === existing.lastName.toLowerCase()
      ) {
        return true;
      }
    }
    // Compare orgName (case-insensitive) for organizations
    if (subject.orgName && existing.orgName) {
      if (subject.orgName.toLowerCase() === existing.orgName.toLowerCase()) {
        return true;
      }
    }
    return false;
  });

  if (potentialDuplicates.length > 0) {
    const names = potentialDuplicates.map((cs) => {
      const s = cs.subject;
      return s.orgName || `${s.firstName} ${s.lastName}`;
    });
    warning = `Potential duplicate subject(s) already linked to this case: ${names.join(", ")}`;
  }

  const caseSubject = await prisma.caseSubject.create({
    data: {
      caseId,
      subjectId,
      role: (subjectRole as import("@/generated/prisma").SubjectRole) || "SUBJECT_OF_INTEREST",
      notes: notes || null,
    },
    include: {
      subject: true,
    },
  });

  void logAudit({
    userId,
    action: "CREATE",
    entityType: "CaseSubject",
    entityId: caseSubject.id,
    metadata: {
      caseId,
      caseNumber: caseRecord.caseNumber,
      subjectId,
      role: subjectRole,
    },
  });

  return Response.json(
    warning ? { ...caseSubject, warning } : caseSubject,
    { status: 201 },
  );
}

// ─── PATCH: Update a case-subject role/notes ────────────

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

  // Verify the user can access this case
  const accessFilter = getCaseAccessFilter(role, userId);
  const caseRecord = await prisma.case.findFirst({
    where: { id: caseId, ...accessFilter },
    select: { id: true, caseNumber: true },
  });

  if (!caseRecord) {
    return Response.json({ error: "Case not found" }, { status: 404 });
  }

  const url = new URL(request.url);
  const caseSubjectId = url.searchParams.get("caseSubjectId");
  if (!caseSubjectId) {
    return Response.json(
      { error: "caseSubjectId query param is required" },
      { status: 400 },
    );
  }

  let body: { role?: string; notes?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const validRoles: import("@/generated/prisma").SubjectRole[] = [
    "COMPLAINANT",
    "RESPONDENT",
    "WITNESS",
    "SUBJECT_OF_INTEREST",
    "INFORMANT",
    "OTHER",
  ];

  if (body.role && !validRoles.includes(body.role as import("@/generated/prisma").SubjectRole)) {
    return Response.json({ error: "Invalid role" }, { status: 422 });
  }

  // Find the existing CaseSubject (must belong to this case)
  const existing = await prisma.caseSubject.findFirst({
    where: { id: caseSubjectId, caseId },
    include: { subject: true },
  });

  if (!existing) {
    return Response.json({ error: "CaseSubject not found" }, { status: 404 });
  }

  const oldRole = existing.role;

  const updated = await prisma.caseSubject.update({
    where: { id: caseSubjectId },
    data: {
      ...(body.role !== undefined && {
        role: body.role as import("@/generated/prisma").SubjectRole,
      }),
      ...(body.notes !== undefined && { notes: body.notes }),
    },
    include: {
      subject: true,
    },
  });

  void logAudit({
    userId,
    action: "UPDATE",
    entityType: "CaseSubject",
    entityId: caseSubjectId,
    metadata: {
      caseId,
      caseNumber: caseRecord.caseNumber,
      oldRole,
      newRole: updated.role,
      notes: body.notes,
    },
  });

  return Response.json(updated);
}
