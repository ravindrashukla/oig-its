import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkPermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { createInquirySchema } from "@/lib/validators/inquiry";

// ─── GET: List inquiries ──────────────────────────────────────

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId, role } = session.user;

  if (!checkPermission(role, "case:read")) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const page = Math.max(Number(url.searchParams.get("page")) || 1, 1);
  const pageSize = Math.min(
    Math.max(Number(url.searchParams.get("pageSize")) || 20, 1),
    100,
  );
  const sortBy = url.searchParams.get("sortBy") || "receivedAt";
  const sortOrder = url.searchParams.get("sortOrder") === "asc" ? "asc" : "desc";
  const search = url.searchParams.get("search") || undefined;
  const source = url.searchParams.get("source") || undefined;
  const status = url.searchParams.get("status") || undefined;
  const assignedToId = url.searchParams.get("assignedToId") || undefined;
  const dateFrom = url.searchParams.get("dateFrom") || undefined;
  const dateTo = url.searchParams.get("dateTo") || undefined;

  const where: Record<string, unknown> = {
    ...(source && { source }),
    ...(status && { status }),
    ...(assignedToId && { assignedToId }),
    ...(dateFrom || dateTo
      ? {
          receivedAt: {
            ...(dateFrom && { gte: new Date(dateFrom) }),
            ...(dateTo && { lte: new Date(dateTo) }),
          },
        }
      : {}),
    ...(search && {
      OR: [
        { subject: { contains: search, mode: "insensitive" as const } },
        { inquiryNumber: { contains: search, mode: "insensitive" as const } },
        { description: { contains: search, mode: "insensitive" as const } },
        { complainantName: { contains: search, mode: "insensitive" as const } },
      ],
    }),
  };

  const allowedSortFields = [
    "receivedAt",
    "createdAt",
    "updatedAt",
    "inquiryNumber",
    "subject",
    "status",
    "priority",
    "source",
  ];
  const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : "receivedAt";

  const [data, total] = await Promise.all([
    prisma.preliminaryInquiry.findMany({
      where,
      orderBy: { [safeSortBy]: sortOrder },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        assignedTo: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        convertedCase: {
          select: { id: true, caseNumber: true, title: true },
        },
      },
    }),
    prisma.preliminaryInquiry.count({ where }),
  ]);

  void logAudit({
    userId,
    action: "READ",
    entityType: "PreliminaryInquiry",
    entityId: "list",
    metadata: { page, pageSize, filters: { source, status, search } },
  });

  return Response.json({
    data,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}

// ─── POST: Create a new inquiry ───────────────────────────────

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId, role } = session.user;

  if (!checkPermission(role, "case:create")) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createInquirySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  const inquiryNumber = await generateInquiryNumber();

  const inquiry = await prisma.preliminaryInquiry.create({
    data: {
      inquiryNumber,
      source: parsed.data.source,
      subject: parsed.data.subject,
      description: parsed.data.description,
      complainantName: parsed.data.complainantName || null,
      complainantEmail: parsed.data.complainantEmail || null,
      complainantPhone: parsed.data.complainantPhone || null,
      isAnonymous: parsed.data.isAnonymous ?? false,
      category: parsed.data.category || null,
      priority: parsed.data.priority || "MEDIUM",
    },
    include: {
      assignedTo: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
    },
  });

  void logAudit({
    userId,
    action: "CREATE",
    entityType: "PreliminaryInquiry",
    entityId: inquiry.id,
    metadata: { inquiryNumber, source: parsed.data.source, subject: parsed.data.subject },
  });

  return Response.json(inquiry, { status: 201 });
}

// ─── Inquiry number generator ─────────────────────────────────

async function generateInquiryNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `INQ-${year}-`;

  const latest = await prisma.preliminaryInquiry.findFirst({
    where: { inquiryNumber: { startsWith: prefix } },
    orderBy: { inquiryNumber: "desc" },
    select: { inquiryNumber: true },
  });

  let seq = 1;
  if (latest) {
    const lastSeq = parseInt(latest.inquiryNumber.replace(prefix, ""), 10);
    if (!isNaN(lastSeq)) {
      seq = lastSeq + 1;
    }
  }

  return `${prefix}${String(seq).padStart(5, "0")}`;
}
