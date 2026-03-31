"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import type { TaskListResponse } from "@/types/task";
import type { TaskFilters } from "@/types";
import type { TaskWithRelations } from "@/types/task";
import type { CreateTaskInput, UpdateTaskInput } from "@/lib/validators/task";

function buildSearchParams(filters: TaskFilters): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  }
  return params.toString();
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`${res.status}: ${body || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

/** Fetch paginated tasks for a specific case */
export function useCaseTasks(caseId: string, filters: TaskFilters = {}) {
  const qs = buildSearchParams({ page: 1, pageSize: 50, ...filters });

  return useQuery<TaskListResponse>({
    queryKey: ["tasks", "case", caseId, qs],
    queryFn: () =>
      fetchJson<TaskListResponse>(`/api/cases/${caseId}/tasks?${qs}`),
    placeholderData: keepPreviousData,
    enabled: !!caseId,
  });
}

/** Fetch paginated tasks across all cases (global view) */
export function useTasks(filters: TaskFilters = {}) {
  const qs = buildSearchParams({ page: 1, pageSize: 20, ...filters });

  return useQuery<TaskListResponse>({
    queryKey: ["tasks", "global", qs],
    queryFn: () => fetchJson<TaskListResponse>(`/api/tasks?${qs}`),
    placeholderData: keepPreviousData,
  });
}

/** Create a new task for a case */
export function useCreateTask(caseId: string) {
  const queryClient = useQueryClient();

  return useMutation<TaskWithRelations, Error, CreateTaskInput>({
    mutationFn: async (input) => {
      const res = await fetch(`/api/cases/${caseId}/tasks`, {
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
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

/** Update an existing task */
export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation<
    TaskWithRelations,
    Error,
    { taskId: string } & UpdateTaskInput
  >({
    mutationFn: async ({ taskId, ...input }) => {
      const res = await fetch(`/api/tasks?taskId=${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(body.error ?? `Update failed: ${res.status}`);
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}
