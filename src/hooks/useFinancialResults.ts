"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import type { PaginatedResponse, QueryFilters } from "@/types";

interface FinancialSubject {
  id: string;
  type: string;
  firstName: string | null;
  lastName: string | null;
  orgName: string | null;
}

export interface FinancialResult {
  id: string;
  caseId: string;
  subjectId: string | null;
  type: string;
  amount: number;
  description: string | null;
  status: string;
  resultDate: string | null;
  createdAt: string;
  updatedAt: string;
  subject: FinancialSubject | null;
}

type FinancialResultListResponse = PaginatedResponse<FinancialResult>;

interface FinancialResultFilters extends QueryFilters {
  type?: string;
  status?: string;
}

export interface CreateFinancialResultInput {
  subjectId?: string;
  type: string;
  amount: number;
  description?: string;
  status?: string;
  resultDate?: string;
}

function buildSearchParams(filters: FinancialResultFilters): string {
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

export function useFinancialResults(
  caseId: string,
  filters: FinancialResultFilters = {},
) {
  const qs = buildSearchParams({ page: 1, pageSize: 50, ...filters });

  return useQuery<FinancialResultListResponse>({
    queryKey: ["financial-results", caseId, qs],
    queryFn: () =>
      fetchJson<FinancialResultListResponse>(
        `/api/cases/${caseId}/financial-results?${qs}`,
      ),
    placeholderData: keepPreviousData,
    enabled: !!caseId,
  });
}

export function useCreateFinancialResult(caseId: string) {
  const queryClient = useQueryClient();

  return useMutation<FinancialResult, Error, CreateFinancialResultInput>({
    mutationFn: async (input) => {
      const res = await fetch(`/api/cases/${caseId}/financial-results`, {
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
      queryClient.invalidateQueries({
        queryKey: ["financial-results", caseId],
      });
    },
  });
}
