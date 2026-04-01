import { prisma } from "@/lib/prisma";

// ─── Workload Balancing (RRS23, C17) ────────────────────────

interface InvestigatorWorkload {
  userId: string;
  name: string;
  activeCases: number;
  criticalCases: number;
  pendingTasks: number;
  overdueTasks: number;
  casesDueThisWeek: number;
  workloadScore: number;
}

interface SupervisorQueue {
  userId: string;
  name: string;
  pendingApprovals: number;
}

interface WorkloadAnalysis {
  investigators: InvestigatorWorkload[];
  overloaded: InvestigatorWorkload[];
  underloaded: InvestigatorWorkload[];
  avgWorkload: number;
  supervisorQueues: SupervisorQueue[];
}

// Weights for workload score calculation
const WEIGHTS = {
  activeCases: 10,
  criticalCases: 15,
  pendingTasks: 3,
  overdueTasks: 20,
  casesDueThisWeek: 8,
};

export async function analyzeWorkload(): Promise<WorkloadAnalysis> {
  const now = new Date();
  const endOfWeek = new Date(now);
  endOfWeek.setDate(now.getDate() + (7 - now.getDay()));
  endOfWeek.setHours(23, 59, 59, 999);

  // Get all investigators
  const investigators = await prisma.user.findMany({
    where: { role: "INVESTIGATOR", isActive: true },
    select: { id: true, firstName: true, lastName: true },
  });

  const workloads: InvestigatorWorkload[] = [];

  for (const inv of investigators) {
    // Active cases assigned to this investigator
    const assignments = await prisma.caseAssignment.findMany({
      where: {
        userId: inv.id,
        removedAt: null,
        case: {
          status: { in: ["OPEN", "ACTIVE", "UNDER_REVIEW", "PENDING_ACTION"] },
          deletedAt: null,
        },
      },
      select: {
        case: { select: { id: true, priority: true, dueDate: true } },
      },
    });

    const activeCases = assignments.length;
    const criticalCases = assignments.filter(
      (a) => a.case.priority === "CRITICAL",
    ).length;
    const casesDueThisWeek = assignments.filter(
      (a) => a.case.dueDate && a.case.dueDate <= endOfWeek && a.case.dueDate >= now,
    ).length;

    // Tasks assigned to this investigator
    const pendingTasks = await prisma.task.count({
      where: {
        assigneeId: inv.id,
        status: { in: ["PENDING", "IN_PROGRESS"] },
      },
    });

    const overdueTasks = await prisma.task.count({
      where: {
        assigneeId: inv.id,
        status: { in: ["PENDING", "IN_PROGRESS"] },
        dueDate: { lt: now },
      },
    });

    const workloadScore =
      activeCases * WEIGHTS.activeCases +
      criticalCases * WEIGHTS.criticalCases +
      pendingTasks * WEIGHTS.pendingTasks +
      overdueTasks * WEIGHTS.overdueTasks +
      casesDueThisWeek * WEIGHTS.casesDueThisWeek;

    workloads.push({
      userId: inv.id,
      name: `${inv.firstName} ${inv.lastName}`,
      activeCases,
      criticalCases,
      pendingTasks,
      overdueTasks,
      casesDueThisWeek,
      workloadScore,
    });
  }

  // Calculate statistics
  const scores = workloads.map((w) => w.workloadScore);
  const avgWorkload = scores.length > 0
    ? scores.reduce((s, v) => s + v, 0) / scores.length
    : 0;

  const variance = scores.length > 0
    ? scores.reduce((s, v) => s + (v - avgWorkload) ** 2, 0) / scores.length
    : 0;
  const stddev = Math.sqrt(variance);

  const overloaded = workloads.filter(
    (w) => w.workloadScore > avgWorkload + 1.5 * stddev,
  );
  const underloaded = workloads.filter(
    (w) => w.workloadScore < avgWorkload - 1 * stddev,
  );

  // Supervisor approval queues
  const supervisors = await prisma.user.findMany({
    where: { role: "SUPERVISOR", isActive: true },
    select: { id: true, firstName: true, lastName: true },
  });

  const supervisorQueues: SupervisorQueue[] = [];

  for (const sup of supervisors) {
    // Count workflow step actions pending for this supervisor
    // Pending = workflow instances that are ACTIVE where the current step
    // hasn't been acted upon by this supervisor
    const activeInstances = await prisma.workflowInstance.findMany({
      where: { status: "ACTIVE" },
      select: {
        id: true,
        currentStep: true,
        actions: {
          where: { userId: sup.id },
          select: { stepIndex: true },
        },
      },
    });

    // A pending approval is an active instance where the supervisor hasn't
    // acted on the current step yet
    const pendingApprovals = activeInstances.filter((inst) => {
      const actedSteps = new Set(inst.actions.map((a) => a.stepIndex));
      return !actedSteps.has(inst.currentStep);
    }).length;

    supervisorQueues.push({
      userId: sup.id,
      name: `${sup.firstName} ${sup.lastName}`,
      pendingApprovals,
    });
  }

  // Sort by workload score descending
  workloads.sort((a, b) => b.workloadScore - a.workloadScore);

  return {
    investigators: workloads,
    overloaded,
    underloaded,
    avgWorkload: Math.round(avgWorkload * 100) / 100,
    supervisorQueues,
  };
}
