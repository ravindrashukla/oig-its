import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkPermission, getCaseAccessFilter } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { updateCaseSchema } from "@/lib/validators/case";
import type { CaseStatus, CaseType, Priority, UserRole } from "@/generated/prisma";

// ─── GET: Fetch a single case with full details ─────────

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
    include: {
      assignments: {
        where: { removedAt: null },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
            },
          },
        },
      },
      createdBy: {
        select: { id: true, firstName: true, lastName: true },
      },
      subjects: {
        include: {
          subject: true,
        },
      },
      statusHistory: {
        orderBy: { createdAt: "desc" },
        take: 50,
      },
      notes: {
        orderBy: { createdAt: "desc" },
        take: 50,
        include: {
          author: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      },
      _count: {
        select: {
          tasks: true,
          documents: true,
          evidenceItems: true,
          notes: true,
          subjects: true,
        },
      },
    },
  });

  if (!caseRecord) {
    return Response.json({ error: "Case not found" }, { status: 404 });
  }

  void logAudit({
    userId,
    action: "READ",
    entityType: "Case",
    entityId: caseId,
    metadata: { caseNumber: caseRecord.caseNumber },
  });

  return Response.json(caseRecord);
}

// ─── PATCH: Update a case ─────────────────────────────────

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

  const accessFilter = getCaseAccessFilter(role, userId);
  const existingCase = await prisma.case.findFirst({
    where: { id: caseId, ...accessFilter },
    include: {
      subjects: true,
      documents: true,
      tasks: true,
    },
  });

  if (!existingCase) {
    return Response.json({ error: "Case not found" }, { status: 404 });
  }

  // ─── Parse and validate body ──────────────────────────────
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = updateCaseSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  const data = parsed.data;

  // ─── Case locking checks ─────────────────────────────────
  const lockRoles: UserRole[] = ["ADMIN", "SUPERVISOR"];
  const isLockToggle = typeof data.isLocked === "boolean";

  // Only ADMIN/SUPERVISOR can lock/unlock
  if (isLockToggle && !lockRoles.includes(role as UserRole)) {
    return Response.json(
      { error: "Only ADMIN and SUPERVISOR roles can lock or unlock cases" },
      { status: 403 },
    );
  }

  // If case is currently locked and the request is NOT an unlock, reject
  // Exception: followUpOnly cases allow editing follow-up fields and adding notes
  if (existingCase.isLocked && !(isLockToggle && data.isLocked === false)) {
    if ((existingCase as any).followUpOnly) {
      // Only allow follow-up fields on a followUpOnly locked case
      const allowedFollowUpKeys = ["followUpDate", "followUpNotes", "followUpStatus", "hasPendingFollowUp", "reason"];
      const requestedKeys = Object.keys(data).filter((k) => (data as any)[k] !== undefined);
      const disallowedKeys = requestedKeys.filter((k) => !allowedFollowUpKeys.includes(k));
      if (disallowedKeys.length > 0) {
        return Response.json(
          { error: "Case is closed with follow-up only. Only follow-up fields (followUpDate, followUpNotes, followUpStatus) can be edited." },
          { status: 423 },
        );
      }
    } else {
      return Response.json(
        { error: "Case is locked and cannot be edited" },
        { status: 423 },
      );
    }
  }

  // ─── Prevent unassigned cases from leaving INTAKE (WPN19) ──
  if (
    data.status &&
    existingCase.status === "INTAKE" &&
    data.status !== "INTAKE"
  ) {
    const assignmentCount = await prisma.caseAssignment.count({
      where: { caseId, removedAt: null },
    });

    if (assignmentCount === 0) {
      return Response.json(
        {
          error:
            "Case must have at least one assigned investigator before progressing from INTAKE",
        },
        { status: 422 },
      );
    }
  }

  // ─── Pre-close validation (CM40/CM41/WPN17) ────────────────
  if (data.status === "CLOSED" && existingCase.status !== "CLOSED") {
    const failures: string[] = [];

    if (existingCase.subjects.length === 0) {
      failures.push("Case must have at least 1 subject linked");
    }

    if (existingCase.documents.length === 0) {
      failures.push("Case must have at least 1 document");
    }

    const openTasks = existingCase.tasks.filter(
      (t) => t.status === "PENDING" || t.status === "IN_PROGRESS",
    );
    if (openTasks.length > 0) {
      failures.push(
        "All tasks must be COMPLETED, CANCELLED, or BLOCKED before closing (found " +
          openTasks.length +
          " open task(s))",
      );
    }

    // CM41: Check that all REQUIRED checklist items are completed
    const incompleteChecklist = await prisma.closeChecklist.findMany({
      where: {
        caseId,
        isRequired: true,
        isCompleted: false,
      },
      select: { id: true, item: true },
    });

    if (incompleteChecklist.length > 0) {
      failures.push(
        "All required close-checklist items must be completed before closing",
      );
      return Response.json(
        {
          error: "Pre-close validation failed",
          requirements: failures,
          incompleteChecklistItems: incompleteChecklist,
        },
        { status: 422 },
      );
    }

    if (failures.length > 0) {
      return Response.json(
        { error: "Pre-close validation failed", requirements: failures },
        { status: 422 },
      );
    }
  }

  // ─── Build update payload ─────────────────────────────────
  const updateData: Record<string, unknown> = {};

  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.status !== undefined) updateData.status = data.status as CaseStatus;
  if (data.priority !== undefined) updateData.priority = data.priority as Priority;
  if (data.caseType !== undefined) updateData.caseType = data.caseType as CaseType;
  if (data.dueDate !== undefined) {
    updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
  }
  if (data.closedAt !== undefined) {
    updateData.closedAt = data.closedAt ? new Date(data.closedAt) : null;
  }
  if (data.complaintSource !== undefined) updateData.complaintSource = data.complaintSource;
  if (data.crimeType !== undefined) updateData.crimeType = data.crimeType;
  if (data.investigationApproach !== undefined) updateData.investigationApproach = data.investigationApproach;
  if (data.affectedProgram !== undefined) updateData.affectedProgram = data.affectedProgram;
  if (data.suspectType !== undefined) updateData.suspectType = data.suspectType;

  // CM39: follow-up fields
  if (data.hasPendingFollowUp !== undefined) updateData.hasPendingFollowUp = data.hasPendingFollowUp;
  if (data.followUpDate !== undefined) {
    updateData.followUpDate = data.followUpDate ? new Date(data.followUpDate) : null;
  }
  if (data.followUpNotes !== undefined) updateData.followUpNotes = data.followUpNotes;
  if (data.followUpStatus !== undefined) updateData.followUpStatus = data.followUpStatus;

  // Auto-set closedAt when closing
  if (data.status === "CLOSED" && !data.closedAt) {
    updateData.closedAt = new Date();
  }

  // DMR3: Auto-lock cases on CLOSED or ARCHIVED
  if (
    data.status &&
    (data.status === "CLOSED" || data.status === "ARCHIVED") &&
    data.status !== existingCase.status
  ) {
    updateData.isLocked = true;
    updateData.lockedAt = new Date();
    updateData.lockedBy = userId;
  }

  // CM39: When closing with hasPendingFollowUp, lock but allow follow-up edits
  if (data.status === "CLOSED" && data.hasPendingFollowUp) {
    updateData.isLocked = true;
    updateData.lockedAt = new Date();
    updateData.lockedBy = userId;
    updateData.followUpOnly = true;
    updateData.hasPendingFollowUp = true;
  }

  // Handle locking
  if (isLockToggle) {
    updateData.isLocked = data.isLocked;
    if (data.isLocked) {
      updateData.lockedAt = new Date();
      updateData.lockedBy = userId;
    } else {
      updateData.lockedAt = null;
      updateData.lockedBy = null;
    }
  }

  // ─── Persist update + status history in a transaction ─────
  const updatedCase = await prisma.$transaction(async (tx) => {
    // Create status history record if status changed
    if (data.status && data.status !== existingCase.status) {
      await tx.caseStatusHistory.create({
        data: {
          caseId,
          fromStatus: existingCase.status,
          toStatus: data.status as CaseStatus,
          changedBy: userId,
          reason: data.reason ?? null,
        },
      });
    }

    // AF2: Track case type changes in history
    if (data.caseType && data.caseType !== existingCase.caseType) {
      await tx.caseStatusHistory.create({
        data: {
          caseId,
          fromStatus: existingCase.status,
          toStatus: existingCase.status,
          changedBy: userId,
          reason: data.reason ?? `Case type changed from ${existingCase.caseType} to ${data.caseType}`,
        },
      });
    }

    // CM35: optionally reassign case on status change
    if (data.routeTo && data.status && data.status !== existingCase.status) {
      // Upsert: if user is already assigned, update; otherwise create
      await tx.caseAssignment.upsert({
        where: { caseId_userId: { caseId, userId: data.routeTo } },
        update: { removedAt: null, assignedAt: new Date() },
        create: {
          caseId,
          userId: data.routeTo,
          role: "investigator",
        },
      });
    }

    return tx.case.update({
      where: { id: caseId },
      data: updateData as any,
      include: {
        assignments: {
          where: { removedAt: null },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
              },
            },
          },
        },
        createdBy: {
          select: { id: true, firstName: true, lastName: true },
        },
        subjects: {
          include: { subject: true },
        },
        statusHistory: {
          orderBy: { createdAt: "desc" },
          take: 50,
        },
        _count: {
          select: {
            tasks: true,
            documents: true,
            evidenceItems: true,
            notes: true,
            subjects: true,
          },
        },
      },
    });
  });

  // ─── AF4: Field-level audit log ───────────────────────────
  const changes: Record<string, { old: unknown; new: unknown }> = {};

  for (const key of Object.keys(updateData)) {
    const oldVal = (existingCase as any)[key];
    const newVal = updateData[key];
    if (oldVal !== newVal) {
      changes[key] = { old: oldVal, new: newVal };
    }
  }

  void logAudit({
    userId,
    action: data.status && data.status !== existingCase.status ? "STATUS_CHANGE" : "UPDATE",
    entityType: "Case",
    entityId: caseId,
    metadata: {
      caseNumber: existingCase.caseNumber,
      changes,
    },
  });

  return Response.json(updatedCase);
}
