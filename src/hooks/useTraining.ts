"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";

// ─── Types ───────────────────────────────────────────────

export interface TrainingCourseFilters {
  page?: number;
  pageSize?: number;
  search?: string;
  category?: string;
  isRequired?: string;
  isActive?: string;
}

export interface TrainingRecordFilters {
  page?: number;
  pageSize?: number;
  userId?: string;
  courseId?: string;
  status?: string;
  expirationFrom?: string;
  expirationTo?: string;
}

export interface TrainingAssignmentFilters {
  page?: number;
  pageSize?: number;
  courseId?: string;
  assignedTo?: string;
  assigneeType?: string;
}

export interface TrainingCourse {
  id: string;
  title: string;
  description: string | null;
  provider: string | null;
  category: string | null;
  method: string | null;
  duration: number | null;
  credits: number | null;
  isRequired: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count: { records: number; assignments: number };
}

export interface TrainingRecordUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface TrainingRecordCourse {
  id: string;
  title: string;
  provider: string | null;
  category: string | null;
  method: string | null;
  duration: number | null;
  credits: number | null;
  isRequired: boolean;
}

export interface TrainingRecord {
  id: string;
  userId: string;
  courseId: string;
  completionDate: string | null;
  expirationDate: string | null;
  status: string;
  score: number | null;
  hours: number | null;
  certificateKey: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  user: TrainingRecordUser;
  course: TrainingRecordCourse;
}

export interface TrainingAssignment {
  id: string;
  courseId: string;
  assignedTo: string;
  assigneeType: string;
  dueDate: string | null;
  assignedById: string;
  isActive: boolean;
  createdAt: string;
  course: {
    id: string;
    title: string;
    provider: string | null;
    category: string | null;
    isRequired: boolean;
  };
  assignedBy: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ─── Helpers ─────────────────────────────────────────────

function buildSearchParams(filters: Record<string, any>): string {
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

// ─── Course hooks ────────────────────────────────────────

export function useCourses(filters: TrainingCourseFilters = {}) {
  const qs = buildSearchParams({ page: 1, pageSize: 20, ...filters });

  return useQuery<PaginatedResponse<TrainingCourse>>({
    queryKey: ["training", "courses", qs],
    queryFn: () =>
      fetchJson<PaginatedResponse<TrainingCourse>>(
        `/api/training/courses?${qs}`,
      ),
    placeholderData: keepPreviousData,
  });
}

export function useCreateCourse() {
  const queryClient = useQueryClient();

  return useMutation<TrainingCourse, Error, Partial<TrainingCourse>>({
    mutationFn: async (input) => {
      const res = await fetch("/api/training/courses", {
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
      queryClient.invalidateQueries({ queryKey: ["training", "courses"] });
    },
  });
}

// ─── Record hooks ────────────────────────────────────────

export function useTrainingRecords(filters: TrainingRecordFilters = {}) {
  const qs = buildSearchParams({ page: 1, pageSize: 20, ...filters });

  return useQuery<PaginatedResponse<TrainingRecord>>({
    queryKey: ["training", "records", qs],
    queryFn: () =>
      fetchJson<PaginatedResponse<TrainingRecord>>(
        `/api/training/records?${qs}`,
      ),
    placeholderData: keepPreviousData,
  });
}

export function useCreateTrainingRecord() {
  const queryClient = useQueryClient();

  return useMutation<TrainingRecord, Error, Record<string, any>>({
    mutationFn: async (input) => {
      const res = await fetch("/api/training/records", {
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
      queryClient.invalidateQueries({ queryKey: ["training", "records"] });
    },
  });
}

export function useUpdateTrainingRecord() {
  const queryClient = useQueryClient();

  return useMutation<
    TrainingRecord,
    Error,
    { id: string } & Record<string, any>
  >({
    mutationFn: async ({ id, ...input }) => {
      const res = await fetch(`/api/training/records?id=${id}`, {
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
      queryClient.invalidateQueries({ queryKey: ["training", "records"] });
    },
  });
}

// ─── Assignment hooks ────────────────────────────────────

export function useTrainingAssignments(
  filters: TrainingAssignmentFilters = {},
) {
  const qs = buildSearchParams({ page: 1, pageSize: 20, ...filters });

  return useQuery<PaginatedResponse<TrainingAssignment>>({
    queryKey: ["training", "assignments", qs],
    queryFn: () =>
      fetchJson<PaginatedResponse<TrainingAssignment>>(
        `/api/training/assignments?${qs}`,
      ),
    placeholderData: keepPreviousData,
  });
}

export function useCreateTrainingAssignment() {
  const queryClient = useQueryClient();

  return useMutation<TrainingAssignment, Error, Record<string, any>>({
    mutationFn: async (input) => {
      const res = await fetch("/api/training/assignments", {
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
      queryClient.invalidateQueries({ queryKey: ["training", "assignments"] });
    },
  });
}
