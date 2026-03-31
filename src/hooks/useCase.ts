"use client";

import { useQuery } from "@tanstack/react-query";
import type { CaseDetail } from "@/types/case";

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`${res.status}: ${body || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

/** Fetch a single case with full detail relations */
export function useCase(caseId: string) {
  return useQuery<CaseDetail>({
    queryKey: ["case", caseId],
    queryFn: () => fetchJson<CaseDetail>(`/api/cases/${caseId}`),
    enabled: !!caseId,
  });
}
