"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import type { PaginatedResponse, QueryFilters } from "@/types";

interface ViolationSubject {
  id: string;
  type: string;
  firstName: string | null;
  lastName: string | null;
  orgName: string | null;
}

export interface Violation {
  id: string;
  caseId: string;
  subjectId: string;
  type: string;
  title: string;
  description: string | null;
  status: string;
  disposition: string | null;
  createdAt: string;
  updatedAt: string;
  subject: ViolationSubject;
}

type ViolationListResponse = PaginatedResponse<Violation>;

interface ViolationFilters extends QueryFilters {
  type?: string;
  status?: string;
}

export interface CreateViolationInput {
  subjectId: string;
  type: string;
  title: string;
  description?: string;
  status?: string;
  disposition?: string;
}

function buildSearchParams(filters: ViolationFilters): string {
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

export function useViolations(caseId: string, filters: ViolationFilters = {}) {
  const qs = buildSearchParams({ page: 1, pageSize: 20, ...filters });

  return useQuery<ViolationListResponse>({
    queryKey: ["violations", caseId, qs],
    queryFn: () =>
      fetchJson<ViolationListResponse>(
        `/api/cases/${caseId}/violations?${qs}`,
      ),
    placeholderData: keepPreviousData,
    enabled: !!caseId,
  });
}

export function useCreateViolation(caseId: string) {
  const queryClient = useQueryClient();

  return useMutation<Violation, Error, CreateViolationInput>({
    mutationFn: async (input) => {
      const res = await fetch(`/api/cases/${caseId}/violations`, {
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
      queryClient.invalidateQueries({ queryKey: ["violations", caseId] });
    },
  });
}
