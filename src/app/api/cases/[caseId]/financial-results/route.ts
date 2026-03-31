import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkPermission, getCaseAccessFilter } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const createFinancialResultSchema = z.object({
  subjectId: z.string().optional(),
  type: z.string().min(1, "type is required"),
  amount: z.number({ error: "amount is required" }),
  description: z.string().optional(),
  status: z.string().optional(),
  resultDate: z.string().optional(),
});

// ─── GET: List financial results for a case ─────────────

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
      ],
    }),
    ...(type && { type }),
    ...(status && { status }),
  };

  const [data, total] = await Promise.all([
    prisma.financialResult.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        subject: {
          select: {
            id: true,
            type: true,
            firstName: true,
            lastName: true,
            orgName: true,
          },
        },
      },
    }),
    prisma.financialResult.count({ where }),
  ]);

  void logAudit({
    userId,
    action: "READ",
    entityType: "FinancialResult",
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

// ─── POST: Create a financial result for a case ─────────

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

  const parsed = createFinancialResultSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  const { subjectId, type, amount, description, status, resultDate } = parsed.data;

  const financialResult = await prisma.financialResult.create({
    data: {
      caseId,
      subjectId: subjectId || null,
      type,
      amount,
      description: description || null,
      status: status || "PENDING",
      resultDate: resultDate ? new Date(resultDate) : null,
    },
    include: {
      subject: {
        select: {
          id: true,
          type: true,
          firstName: true,
          lastName: true,
          orgName: true,
        },
      },
    },
  });

  void logAudit({
    userId,
    action: "CREATE",
    entityType: "FinancialResult",
    entityId: financialResult.id,
    metadata: {
      caseId,
      caseNumber: caseRecord.caseNumber,
      type,
      amount,
      subjectId,
    },
  });

  return Response.json(financialResult, { status: 201 });
}
