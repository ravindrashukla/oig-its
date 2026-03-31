"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";

// ─── Types ───────────────────────────────────────────────────

export interface TimeEntryFilters {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  userId?: string;
  caseId?: string;
  dateFrom?: string;
  dateTo?: string;
  activityType?: string;
  status?: string;
}

export interface TimesheetFilters {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  userId?: string;
}

export interface TimeEntryInput {
  date: string;
  hours: number;
  activityType: string;
  caseId?: string;
  description?: string;
  isOvertime?: boolean;
  isLeap?: boolean;
}

export interface TimesheetInput {
  periodStart: string;
  periodEnd: string;
  notes?: string;
}

export interface TimeEntryWithRelations {
  id: string;
  userId: string;
  caseId: string | null;
  activityType: string;
  description: string | null;
  date: string;
  hours: number;
  isOvertime: boolean;
  isLeap: boolean;
  status: string;
  approvedById: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  user: { id: string; firstName: string; lastName: string; email: string };
  approvedBy: { id: string; firstName: string; lastName: string } | null;
  case: { id: string; caseNumber: string; title: string } | null;
}

export interface TimesheetWithRelations {
  id: string;
  userId: string;
  periodStart: string;
  periodEnd: string;
  totalHours: number;
  overtimeHours: number;
  leapHours: number;
  status: string;
  submittedAt: string | null;
  approvedById: string | null;
  approvedAt: string | null;
  certifiedAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  user: { id: string; firstName: string; lastName: string; email: string };
  approvedBy: { id: string; firstName: string; lastName: string } | null;
}

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ─── Helpers ─────────────────────────────────────────────────

function buildSearchParams(filters: Record<string, unknown>): string {
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

// ─── Time Entries ────────────────────────────────────────────

export function useTimeEntries(filters: TimeEntryFilters = {}) {
  const qs = buildSearchParams({ page: 1, pageSize: 20, ...filters });

  return useQuery<PaginatedResponse<TimeEntryWithRelations>>({
    queryKey: ["timeEntries", qs],
    queryFn: () =>
      fetchJson<PaginatedResponse<TimeEntryWithRelations>>(
        `/api/time-entries?${qs}`,
      ),
    placeholderData: keepPreviousData,
  });
}

export function useCreateTimeEntry() {
  const queryClient = useQueryClient();

  return useMutation<TimeEntryWithRelations, Error, TimeEntryInput>({
    mutationFn: async (input) => {
      const res = await fetch("/api/time-entries", {
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
      queryClient.invalidateQueries({ queryKey: ["timeEntries"] });
    },
  });
}

export function useUpdateTimeEntry() {
  const queryClient = useQueryClient();

  return useMutation<
    TimeEntryWithRelations,
    Error,
    { id: string } & Partial<TimeEntryInput> & { status?: string }
  >({
    mutationFn: async ({ id, ...input }) => {
      const res = await fetch(`/api/time-entries?id=${id}`, {
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
      queryClient.invalidateQueries({ queryKey: ["timeEntries"] });
    },
  });
}

// ─── Timesheets ──────────────────────────────────────────────

export function useTimesheets(filters: TimesheetFilters = {}) {
  const qs = buildSearchParams({ page: 1, pageSize: 20, ...filters });

  return useQuery<PaginatedResponse<TimesheetWithRelations>>({
    queryKey: ["timesheets", qs],
    queryFn: () =>
      fetchJson<PaginatedResponse<TimesheetWithRelations>>(
        `/api/timesheets?${qs}`,
      ),
    placeholderData: keepPreviousData,
  });
}

export function useCreateTimesheet() {
  const queryClient = useQueryClient();

  return useMutation<TimesheetWithRelations, Error, TimesheetInput>({
    mutationFn: async (input) => {
      const res = await fetch("/api/timesheets", {
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
      queryClient.invalidateQueries({ queryKey: ["timesheets"] });
    },
  });
}

export function useUpdateTimesheet() {
  const queryClient = useQueryClient();

  return useMutation<
    TimesheetWithRelations,
    Error,
    { id: string; status: string; notes?: string }
  >({
    mutationFn: async ({ id, ...input }) => {
      const res = await fetch(`/api/timesheets?id=${id}`, {
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
      queryClient.invalidateQueries({ queryKey: ["timesheets"] });
    },
  });
}
