import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkPermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { initiatePendingAction } from "@/lib/workflow";
import type { NextRequest } from "next/server";
import type { UserRole } from "@/generated/prisma";

// ─── POST: Perform an action on a workflow step ──────────────

export async function POST(
  request: NextRequest,
  ctx: RouteContext<"/api/workflows/[instanceId]/action">,
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId, role } = session.user;

  if (!checkPermission(role, "case:update")) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { instanceId } = await ctx.params;

  let body: { action: string; notes?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.action) {
    return Response.json({ error: "action is required" }, { status: 400 });
  }

  const validActions = ["approve", "reject", "complete", "pause", "resume", "skip", "revert"];
  if (!validActions.includes(body.action)) {
    return Response.json(
      { error: `Invalid action. Must be one of: ${validActions.join(", ")}` },
      { status: 400 },
    );
  }

  // ─── Handle "skip" action (ADMIN and SUPERVISOR only) ──────
  if (body.action === "skip") {
    const skipRoles: UserRole[] = ["ADMIN", "SUPERVISOR"];
    if (!skipRoles.includes(role as UserRole)) {
      return Response.json(
        { error: "Only ADMIN and SUPERVISOR roles can skip workflow steps" },
        { status: 403 },
      );
    }

    const instance = await prisma.workflowInstance.findUnique({
      where: { id: instanceId },
      include: { definition: true },
    });

    if (!instance) {
      return Response.json({ error: "Workflow instance not found" }, { status: 404 });
    }

    if (instance.status !== "ACTIVE" && instance.status !== "PAUSED") {
      return Response.json(
        { error: `Cannot act on workflow in ${instance.status} status` },
        { status: 400 },
      );
    }

    const steps = instance.definition.steps as Array<{
      name: string;
      type: string;
    }>;

    const currentStepDef = steps[instance.currentStep];

    // Record the skip action
    const stepAction = await prisma.workflowStepAction.create({
      data: {
        instanceId,
        stepIndex: instance.currentStep,
        action: "skip",
        userId,
        notes: body.notes || null,
      },
    });

    // Advance to next step or complete if at the end
    const isLastStep = instance.currentStep >= steps.length - 1;
    const updatedInstance = await prisma.workflowInstance.update({
      where: { id: instanceId },
      data: {
        currentStep: isLastStep ? instance.currentStep : instance.currentStep + 1,
        status: isLastStep ? "COMPLETED" : instance.status,
        ...(isLastStep && { completedAt: new Date() }),
      },
      include: {
        definition: true,
        case: { select: { id: true, caseNumber: true, title: true } },
        actions: {
          include: { user: { select: { id: true, firstName: true, lastName: true } } },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    void logAudit({
      userId,
      action: "UPDATE",
      entityType: "WorkflowInstance",
      entityId: instanceId,
      metadata: {
        action: "skip",
        stepIndex: instance.currentStep,
        stepName: currentStepDef?.name,
        notes: body.notes,
      },
    });

    return Response.json({ instance: updatedInstance, action: stepAction });
  }

  // ─── Handle "revert" action (ADMIN only) ───────────────────
  if (body.action === "revert") {
    if ((role as UserRole) !== "ADMIN") {
      return Response.json(
        { error: "Only ADMIN role can revert workflow steps" },
        { status: 403 },
      );
    }

    const instance = await prisma.workflowInstance.findUnique({
      where: { id: instanceId },
      include: { definition: true },
    });

    if (!instance) {
      return Response.json({ error: "Workflow instance not found" }, { status: 404 });
    }

    if (instance.status !== "ACTIVE" && instance.status !== "PAUSED") {
      return Response.json(
        { error: `Cannot act on workflow in ${instance.status} status` },
        { status: 400 },
      );
    }

    if (instance.currentStep <= 0) {
      return Response.json(
        { error: "Cannot revert: workflow is already at the first step" },
        { status: 400 },
      );
    }

    const steps = instance.definition.steps as Array<{
      name: string;
      type: string;
    }>;

    const previousStep = instance.currentStep - 1;
    const previousStepDef = steps[previousStep];

    // Record the revert action
    const stepAction = await prisma.workflowStepAction.create({
      data: {
        instanceId,
        stepIndex: instance.currentStep,
        action: "revert",
        userId,
        notes: body.notes || null,
      },
    });

    const updatedInstance = await prisma.workflowInstance.update({
      where: { id: instanceId },
      data: {
        currentStep: previousStep,
      },
      include: {
        definition: true,
        case: { select: { id: true, caseNumber: true, title: true } },
        actions: {
          include: { user: { select: { id: true, firstName: true, lastName: true } } },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    void logAudit({
      userId,
      action: "UPDATE",
      entityType: "WorkflowInstance",
      entityId: instanceId,
      metadata: {
        action: "revert",
        fromStep: instance.currentStep,
        toStep: previousStep,
        stepName: previousStepDef?.name,
        notes: body.notes,
      },
    });

    return Response.json({ instance: updatedInstance, action: stepAction });
  }

  // ─── Standard actions (approve, reject, complete, pause, resume) ──
  try {
    const result = await initiatePendingAction({
      instanceId,
      userId,
      action: body.action,
      notes: body.notes,
    });

    void logAudit({
      userId,
      action: "UPDATE",
      entityType: "WorkflowInstance",
      entityId: instanceId,
      metadata: { action: body.action, notes: body.notes },
    });

    return Response.json(result);
  } catch (err: any) {
    const message = err?.message || "Failed to process action";
    const status = message.includes("not found") ? 404 : 400;
    return Response.json({ error: message }, { status });
  }
}
