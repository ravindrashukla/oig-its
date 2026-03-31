"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";

// ─── Types ───────────────────────────────────────────────────

export interface WorkflowStep {
  name: string;
  type: string;
  assigneeRole?: string;
  description?: string;
}

export interface WorkflowInstanceWithRelations {
  id: string;
  definitionId: string;
  caseId: string;
  status: string;
  currentStep: number;
  data: any;
  startedAt: string;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  definition: {
    id: string;
    name: string;
    type: string;
    description: string | null;
  };
  case: {
    id: string;
    caseNumber: string;
    title: string;
    priority: string;
  };
  actions: Array<{
    id: string;
    stepIndex: number;
    action: string;
    notes: string | null;
    createdAt: string;
    user: { id: string; firstName: string; lastName: string };
  }>;
}

export interface WorkflowListResponse {
  data: WorkflowInstanceWithRelations[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface WorkflowDefinitionItem {
  id: string;
  name: string;
  type: string;
  description: string | null;
  steps: WorkflowStep[];
  isActive: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`${res.status}: ${body || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

// ─── Hooks ───────────────────────────────────────────────────

/** Fetch paginated workflow instances */
export function useWorkflows(filters: { page?: number; pageSize?: number; status?: string; caseId?: string } = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  }
  const qs = params.toString();

  return useQuery<WorkflowListResponse>({
    queryKey: ["workflows", qs],
    queryFn: () => fetchJson<WorkflowListResponse>(`/api/workflows?${qs}`),
    placeholderData: keepPreviousData,
  });
}

/** Fetch pending approval workflow instances */
export function usePendingApprovals() {
  return useQuery<WorkflowInstanceWithRelations[]>({
    queryKey: ["workflows", "pending"],
    queryFn: () => fetchJson<WorkflowInstanceWithRelations[]>("/api/workflows?view=pending"),
  });
}

/** Fetch workflow definitions */
export function useWorkflowDefinitions() {
  return useQuery<WorkflowDefinitionItem[]>({
    queryKey: ["workflows", "definitions"],
    queryFn: () => fetchJson<WorkflowDefinitionItem[]>("/api/workflows?view=definitions"),
  });
}

/** Perform an action on a workflow step */
export function useWorkflowAction() {
  const queryClient = useQueryClient();

  return useMutation<
    { instance: WorkflowInstanceWithRelations; action: any },
    Error,
    { instanceId: string; action: string; notes?: string }
  >({
    mutationFn: async ({ instanceId, action, notes }) => {
      const res = await fetch(`/api/workflows/${instanceId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, notes }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(body.error ?? `Action failed: ${res.status}`);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

/** Start a new workflow instance */
export function useStartWorkflow() {
  const queryClient = useQueryClient();

  return useMutation<
    WorkflowInstanceWithRelations,
    Error,
    { definitionId: string; caseId: string }
  >({
    mutationFn: async (input) => {
      const res = await fetch("/api/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(body.error ?? `Create failed: ${res.status}`);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
    },
  });
}
