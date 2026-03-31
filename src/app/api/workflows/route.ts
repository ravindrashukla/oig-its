import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkPermission, getCaseAccessFilter } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import type { WorkflowStatus } from "@/generated/prisma";

const instanceInclude = {
  definition: { select: { id: true, name: true, type: true, description: true, steps: true } },
  case: { select: { id: true, caseNumber: true, title: true, priority: true } },
  actions: {
    include: {
      user: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: { createdAt: "desc" as const },
  },
} as const;

// ─── GET: List workflow instances ────────────────────────────

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
  const pageSize = Math.min(Math.max(Number(url.searchParams.get("pageSize")) || 20, 1), 100);
  const status = url.searchParams.get("status") as WorkflowStatus | undefined;
  const caseId = url.searchParams.get("caseId") || undefined;
  const view = url.searchParams.get("view");

  const accessFilter = getCaseAccessFilter(role, userId);

  // ─── Pending approvals view ───────────────────────
  if (view === "pending") {
    const instances = await prisma.workflowInstance.findMany({
      where: {
        status: "ACTIVE",
        case: accessFilter,
      },
      include: instanceInclude,
      orderBy: { updatedAt: "desc" },
    });

    // Filter to instances where current step needs action
    const pendingApprovals = instances.filter((inst) => {
      const steps = inst.definition.steps as Array<{ name: string; type: string }>;
      const currentStep = steps[inst.currentStep];
      return currentStep && (currentStep.type === "approval" || currentStep.type === "review");
    });

    return Response.json(pendingApprovals);
  }

  // ─── Definitions list ──────────────────────────────
  if (view === "definitions") {
    const definitions = await prisma.workflowDefinition.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });
    return Response.json(definitions);
  }

  // ─── Paginated instance list ───────────────────────
  const where = {
    case: accessFilter,
    ...(status && { status }),
    ...(caseId && { caseId }),
  };

  const [data, total] = await Promise.all([
    prisma.workflowInstance.findMany({
      where,
      include: instanceInclude,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.workflowInstance.count({ where }),
  ]);

  void logAudit({
    userId,
    action: "READ",
    entityType: "WorkflowInstance",
    entityId: "list",
    metadata: { page, pageSize, status },
  });

  return Response.json({
    data,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}

// ─── POST: Start a new workflow instance on a case ───────────

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId, role } = session.user;

  if (!checkPermission(role, "case:update")) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { definitionId: string; caseId: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.definitionId || !body.caseId) {
    return Response.json({ error: "definitionId and caseId are required" }, { status: 400 });
  }

  const definition = await prisma.workflowDefinition.findUnique({
    where: { id: body.definitionId },
  });

  if (!definition || !definition.isActive) {
    return Response.json({ error: "Workflow definition not found or inactive" }, { status: 404 });
  }

  const accessFilter = getCaseAccessFilter(role, userId);
  const caseRecord = await prisma.case.findFirst({
    where: { id: body.caseId, ...accessFilter },
    select: { id: true },
  });

  if (!caseRecord) {
    return Response.json({ error: "Case not found" }, { status: 404 });
  }

  const instance = await prisma.workflowInstance.create({
    data: {
      definitionId: body.definitionId,
      caseId: body.caseId,
      status: "ACTIVE",
      currentStep: 0,
    },
    include: instanceInclude,
  });

  void logAudit({
    userId,
    action: "CREATE",
    entityType: "WorkflowInstance",
    entityId: instance.id,
    metadata: { definitionName: definition.name, caseId: body.caseId },
  });

  return Response.json(instance, { status: 201 });
}
