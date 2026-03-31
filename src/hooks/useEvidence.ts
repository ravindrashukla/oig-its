"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import type { EvidenceListResponse, EvidenceFilters } from "@/types/evidence";
import type { CreateEvidenceInput } from "@/lib/validators/evidence";
import type { EvidenceWithCustody } from "@/types/evidence";

function buildSearchParams(filters: EvidenceFilters): string {
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

/** Fetch paginated evidence items for a case */
export function useEvidence(caseId: string, filters: EvidenceFilters = {}) {
  const qs = buildSearchParams({ page: 1, pageSize: 20, ...filters });

  return useQuery<EvidenceListResponse>({
    queryKey: ["evidence", caseId, qs],
    queryFn: () =>
      fetchJson<EvidenceListResponse>(
        `/api/cases/${caseId}/evidence?${qs}`,
      ),
    placeholderData: keepPreviousData,
    enabled: !!caseId,
  });
}

/** Create a new evidence item */
export function useCreateEvidence(caseId: string) {
  const queryClient = useQueryClient();

  return useMutation<EvidenceWithCustody, Error, CreateEvidenceInput>({
    mutationFn: async (input) => {
      const res = await fetch(`/api/cases/${caseId}/evidence`, {
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
      queryClient.invalidateQueries({ queryKey: ["evidence", caseId] });
    },
  });
}
