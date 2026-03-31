import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkPermission, getCaseAccessFilter } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const createTechniqueSchema = z.object({
  type: z.string().min(1, "type is required"),
  description: z.string().min(1, "description is required"),
  date: z.string().min(1, "date is required"),
  endDate: z.string().optional(),
  status: z.string().optional(),
  authorizedBy: z.string().optional(),
  findings: z.string().optional(),
});

// ─── GET: List investigative techniques for a case ─────

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
  const type = url.searchParams.get("type") || undefined;
  const status = url.searchParams.get("status") || undefined;

  const where = {
    caseId,
    ...(search && {
      OR: [
        { description: { contains: search, mode: "insensitive" as const } },
        { findings: { contains: search, mode: "insensitive" as const } },
      ],
    }),
    ...(type && { type }),
    ...(status && { status }),
  };

  const [data, total] = await Promise.all([
    prisma.investigativeTechnique.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.investigativeTechnique.count({ where }),
  ]);

  void logAudit({
    userId,
    action: "READ",
    entityType: "InvestigativeTechnique",
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

// ─── POST: Create an investigative technique for a case ─

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

  const parsed = createTechniqueSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  const { type, description, date, endDate, status, authorizedBy, findings } =
    parsed.data;

  const technique = await prisma.investigativeTechnique.create({
    data: {
      caseId,
      type,
      description,
      date: new Date(date),
      endDate: endDate ? new Date(endDate) : null,
      status: status || "PLANNED",
      authorizedBy: authorizedBy || null,
      findings: findings || null,
    },
  });

  void logAudit({
    userId,
    action: "CREATE",
    entityType: "InvestigativeTechnique",
    entityId: technique.id,
    metadata: {
      caseId,
      caseNumber: caseRecord.caseNumber,
      type,
      description,
    },
  });

  return Response.json(technique, { status: 201 });
}
