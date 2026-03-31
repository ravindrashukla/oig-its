import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import type { WorkflowStatus } from "@/generated/prisma";

// ─── Nodemailer transporter (lazy singleton) ──────────────────

let _transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (!_transporter) {
    _transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "localhost",
      port: Number(process.env.SMTP_PORT) || 1025,
      secure: process.env.SMTP_SECURE === "true",
      ...(process.env.SMTP_USER && {
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      }),
    });
  }
  return _transporter;
}

// ─── Send notification (in-app + optional email) ──────────────

interface SendNotificationParams {
  userId: string;
  type: "CASE_ASSIGNED" | "CASE_UPDATED" | "TASK_ASSIGNED" | "TASK_DUE" | "DOCUMENT_UPLOADED" | "EVIDENCE_ADDED" | "WORKFLOW_ACTION" | "SYSTEM_ALERT" | "ANNOUNCEMENT";
  title: string;
  message: string;
  link?: string;
}

export async function sendNotification(params: SendNotificationParams): Promise<void> {
  const { userId, type, title, message, link } = params;

  // Create in-app notification
  await prisma.notification.create({
    data: { userId, type, title, message, link },
  });

  // Check user's notification preferences for email
  const pref = await prisma.notificationPreference.findUnique({
    where: { userId_type: { userId, type } },
  });

  // Default: send email unless explicitly disabled
  const shouldEmail = pref ? pref.email && !pref.disabled : true;

  if (shouldEmail) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, firstName: true },
    });

    if (user?.email) {
      try {
        await getTransporter().sendMail({
          from: process.env.SMTP_FROM || "noreply@oig.gov",
          to: user.email,
          subject: `[OIG-ITS] ${title}`,
          text: `${message}${link ? `\n\nView details: ${process.env.NEXTAUTH_URL || "http://localhost:3000"}${link}` : ""}`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px;">
              <h2 style="color: #1a1a1a;">${title}</h2>
              <p style="color: #4a4a4a;">${message}</p>
              ${link ? `<p><a href="${process.env.NEXTAUTH_URL || "http://localhost:3000"}${link}" style="color: #2563eb;">View details &rarr;</a></p>` : ""}
              <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 20px 0;" />
              <p style="color: #9a9a9a; font-size: 12px;">OIG Investigation Tracking System</p>
            </div>
          `,
        });
      } catch (err) {
        console.error("[workflow] Email send failed:", err);
      }
    }
  }
}

// ─── Initiate a pending action on a workflow ──────────────────

interface InitiatePendingActionParams {
  instanceId: string;
  userId: string;
  action: string;
  notes?: string;
}

export async function initiatePendingAction(
  params: InitiatePendingActionParams,
): Promise<{ instance: any; action: any }> {
  const { instanceId, userId, action, notes } = params;

  const instance = await prisma.workflowInstance.findUnique({
    where: { id: instanceId },
    include: {
      definition: true,
      case: { select: { id: true, caseNumber: true, title: true } },
    },
  });

  if (!instance) {
    throw new Error("Workflow instance not found");
  }

  if (instance.status !== "ACTIVE" && instance.status !== "PAUSED") {
    throw new Error(`Cannot act on workflow in ${instance.status} status`);
  }

  const steps = instance.definition.steps as Array<{
    name: string;
    type: string;
    assigneeRole?: string;
    description?: string;
  }>;

  const currentStepDef = steps[instance.currentStep];
  if (!currentStepDef) {
    throw new Error("Current step not found in workflow definition");
  }

  // Record the step action
  const stepAction = await prisma.workflowStepAction.create({
    data: {
      instanceId,
      stepIndex: instance.currentStep,
      action,
      userId,
      notes: notes || null,
    },
  });

  // Advance workflow based on action
  let newStatus: WorkflowStatus = instance.status;
  let newStep = instance.currentStep;

  if (action === "approve" || action === "complete") {
    if (instance.currentStep >= steps.length - 1) {
      // Last step — complete the workflow
      newStatus = "COMPLETED";
    } else {
      newStep = instance.currentStep + 1;
    }
  } else if (action === "reject") {
    newStatus = "CANCELLED";
  } else if (action === "pause") {
    newStatus = "PAUSED";
  } else if (action === "resume") {
    newStatus = "ACTIVE";
  }

  const updatedInstance = await prisma.workflowInstance.update({
    where: { id: instanceId },
    data: {
      currentStep: newStep,
      status: newStatus,
      ...(newStatus === "COMPLETED" && { completedAt: new Date() }),
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

  // Notify relevant users about the action
  const caseAssignments = await prisma.caseAssignment.findMany({
    where: { caseId: instance.caseId, removedAt: null },
    select: { userId: true },
  });

  const notifyUserIds = caseAssignments
    .map((a) => a.userId)
    .filter((id) => id !== userId);

  const actorUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { firstName: true, lastName: true },
  });
  const actorName = actorUser ? `${actorUser.firstName} ${actorUser.lastName}` : "Unknown";

  for (const targetUserId of notifyUserIds) {
    await sendNotification({
      userId: targetUserId,
      type: "WORKFLOW_ACTION",
      title: `Workflow ${action}: ${instance.definition.name}`,
      message: `${actorName} performed "${action}" on step "${currentStepDef.name}" for case ${instance.case.caseNumber}`,
      link: `/dashboard/cases/${instance.caseId}`,
    });
  }

  void logAudit({
    userId,
    action: "UPDATE",
    entityType: "WorkflowInstance",
    entityId: instanceId,
    metadata: { action, stepIndex: instance.currentStep, stepName: currentStepDef.name, newStatus },
  });

  return { instance: updatedInstance, action: stepAction };
}
