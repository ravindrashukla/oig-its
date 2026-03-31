"use client";

import { useQuery } from "@tanstack/react-query";

export interface TimelineEvent {
  id: string;
  type: "status_change" | "note" | "document" | "evidence" | "assignment" | "task";
  title: string;
  description: string | null;
  createdAt: string;
  actor: { id: string; firstName: string; lastName: string } | null;
  metadata?: Record<string, unknown>;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`${res.status}: ${body || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

/** Fetch timeline events for a case */
export function useCaseTimeline(caseId: string) {
  return useQuery<{ data: TimelineEvent[] }>({
    queryKey: ["timeline", caseId],
    queryFn: () =>
      fetchJson<{ data: TimelineEvent[] }>(
        `/api/cases/${caseId}/timeline`,
      ),
    enabled: !!caseId,
  });
}
