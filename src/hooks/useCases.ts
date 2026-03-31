"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import type { CaseListResponse, DashboardMetrics, DeadlineItem } from "@/types/case";
import type { CaseFilters } from "@/types";
import type { Notification } from "@/generated/prisma";

function buildSearchParams(filters: CaseFilters): string {
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

/** Fetch paginated & filtered case list */
export function useCases(filters: CaseFilters = {}) {
  const qs = buildSearchParams({ page: 1, pageSize: 20, ...filters });

  return useQuery<CaseListResponse>({
    queryKey: ["cases", qs],
    queryFn: () => fetchJson<CaseListResponse>(`/api/cases?${qs}`),
    placeholderData: keepPreviousData,
  });
}

/** Fetch dashboard metrics */
export function useDashboardMetrics() {
  return useQuery<DashboardMetrics>({
    queryKey: ["dashboard", "metrics"],
    queryFn: () => fetchJson<DashboardMetrics>("/api/cases?view=metrics"),
  });
}

/** Fetch upcoming deadlines */
export function useDeadlines(limit = 10) {
  return useQuery<DeadlineItem[]>({
    queryKey: ["dashboard", "deadlines", limit],
    queryFn: () =>
      fetchJson<DeadlineItem[]>(`/api/cases?view=deadlines&limit=${limit}`),
  });
}

/** Fetch recent notifications for current user */
export function useNotifications(limit = 10) {
  return useQuery<Notification[]>({
    queryKey: ["dashboard", "notifications", limit],
    queryFn: () =>
      fetchJson<Notification[]>(`/api/cases?view=notifications&limit=${limit}`),
  });
}
