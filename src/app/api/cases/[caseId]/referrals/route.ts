import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkPermission, getCaseAccessFilter } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const createReferralSchema = z.object({
  agencyName: z.string().min(1, "agencyName is required"),
  agencyType: z.string().min(1, "agencyType is required"),
  contactName: z.string().optional(),
  contactEmail: z.string().optional(),
  referralDate: z.string().optional(),
  reason: z.string().min(1, "reason is required"),
  status: z.string().optional(),
  outcome: z.string().optional(),
});

// ─── GET: List referrals for a case ────────────────────

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
  const status = url.searchParams.get("status") || undefined;
  const agencyType = url.searchParams.get("agencyType") || undefined;

  const where = {
    caseId,
    ...(search && {
      OR: [
        { agencyName: { contains: search, mode: "insensitive" as const } },
        { reason: { contains: search, mode: "insensitive" as const } },
      ],
    }),
    ...(status && { status }),
    ...(agencyType && { agencyType }),
  };

  const [data, total] = await Promise.all([
    prisma.referral.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.referral.count({ where }),
  ]);

  void logAudit({
    userId,
    action: "READ",
    entityType: "Referral",
    entityId: caseId,
    metadata: { page, pageSize, search, status, agencyType },
  });

  return Response.json({
    data,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}

// ─── POST: Create a referral for a case ────────────────

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

  const parsed = createReferralSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  const {
    agencyName,
    agencyType,
    contactName,
    contactEmail,
    referralDate,
    reason,
    status,
    outcome,
  } = parsed.data;

  const referral = await prisma.referral.create({
    data: {
      caseId,
      agencyName,
      agencyType,
      contactName: contactName || null,
      contactEmail: contactEmail || null,
      referralDate: referralDate ? new Date(referralDate) : new Date(),
      reason,
      status: status || "PENDING",
      outcome: outcome || null,
    },
  });

  void logAudit({
    userId,
    action: "CREATE",
    entityType: "Referral",
    entityId: referral.id,
    metadata: {
      caseId,
      caseNumber: caseRecord.caseNumber,
      agencyName,
      agencyType,
      reason,
    },
  });

  return Response.json(referral, { status: 201 });
}
