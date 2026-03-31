"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import type { PaginatedResponse, QueryFilters } from "@/types";

export interface Technique {
  id: string;
  caseId: string;
  type: string;
  description: string;
  date: string;
  endDate: string | null;
  status: string;
  authorizedBy: string | null;
  findings: string | null;
  createdAt: string;
  updatedAt: string;
}

type TechniqueListResponse = PaginatedResponse<Technique>;

interface TechniqueFilters extends QueryFilters {
  type?: string;
  status?: string;
}

export interface CreateTechniqueInput {
  type: string;
  description: string;
  date: string;
  endDate?: string;
  status?: string;
  authorizedBy?: string;
  findings?: string;
}

function buildSearchParams(filters: TechniqueFilters): string {
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

export function useTechniques(caseId: string, filters: TechniqueFilters = {}) {
  const qs = buildSearchParams({ page: 1, pageSize: 20, ...filters });

  return useQuery<TechniqueListResponse>({
    queryKey: ["techniques", caseId, qs],
    queryFn: () =>
      fetchJson<TechniqueListResponse>(
        `/api/cases/${caseId}/techniques?${qs}`,
      ),
    placeholderData: keepPreviousData,
    enabled: !!caseId,
  });
}

export function useCreateTechnique(caseId: string) {
  const queryClient = useQueryClient();

  return useMutation<Technique, Error, CreateTechniqueInput>({
    mutationFn: async (input) => {
      const res = await fetch(`/api/cases/${caseId}/techniques`, {
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
      queryClient.invalidateQueries({ queryKey: ["techniques", caseId] });
    },
  });
}
