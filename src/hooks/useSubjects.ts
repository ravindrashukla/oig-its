"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import type { PaginatedResponse } from "@/types";
import type { CaseSubject, Subject } from "@/generated/prisma";

export type CaseSubjectWithSubject = CaseSubject & {
  subject: Subject;
};

export type SubjectListResponse = PaginatedResponse<CaseSubjectWithSubject>;

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`${res.status}: ${body || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

/** Fetch subjects for a case */
export function useCaseSubjects(caseId: string, filters: Record<string, string> = {}) {
  const params = new URLSearchParams(filters);

  return useQuery<SubjectListResponse>({
    queryKey: ["subjects", caseId, params.toString()],
    queryFn: () =>
      fetchJson<SubjectListResponse>(
        `/api/cases/${caseId}/subjects?${params.toString()}`,
      ),
    placeholderData: keepPreviousData,
    enabled: !!caseId,
  });
}

/** Link a subject to a case */
export function useLinkSubject(caseId: string) {
  const queryClient = useQueryClient();

  return useMutation<
    CaseSubjectWithSubject,
    Error,
    { subjectId: string; role?: string; notes?: string }
  >({
    mutationFn: async (input) => {
      const res = await fetch(`/api/cases/${caseId}/subjects`, {
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
      queryClient.invalidateQueries({ queryKey: ["subjects", caseId] });
      queryClient.invalidateQueries({ queryKey: ["case", caseId] });
    },
  });
}
