"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";

export interface SystemSetting {
  id: string;
  key: string;
  value: unknown;
  updatedAt: string;
}

export interface ReferenceDataEntry {
  id: string;
  category: string;
  code: string;
  label: string;
  sortOrder: number;
  isActive: boolean;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`${res.status}: ${body || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

// ─── System Settings ─────────────────────────────────────────

export function useSettings() {
  return useQuery<{ data: SystemSetting[] }>({
    queryKey: ["settings"],
    queryFn: () => fetchJson<{ data: SystemSetting[] }>("/api/settings"),
  });
}

export function useUpdateSetting() {
  const queryClient = useQueryClient();

  return useMutation<SystemSetting, Error, { key: string; value: unknown }>({
    mutationFn: async (body) => {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(data.error ?? "Failed to update setting");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
  });
}

// ─── Reference Data ──────────────────────────────────────────

export function useReferenceData(category?: string) {
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  params.set("activeOnly", "false");
  const qs = params.toString();

  return useQuery<{ data: ReferenceDataEntry[]; grouped: Record<string, ReferenceDataEntry[]> }>({
    queryKey: ["reference-data", qs],
    queryFn: () =>
      fetchJson<{ data: ReferenceDataEntry[]; grouped: Record<string, ReferenceDataEntry[]> }>(
        `/api/reference-data?${qs}`,
      ),
  });
}

export function useCreateReferenceData() {
  const queryClient = useQueryClient();

  return useMutation<
    ReferenceDataEntry,
    Error,
    { category: string; code: string; label: string; sortOrder?: number }
  >({
    mutationFn: async (body) => {
      const res = await fetch("/api/reference-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(data.error ?? "Failed to create entry");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reference-data"] });
    },
  });
}

export function useUpdateReferenceData() {
  const queryClient = useQueryClient();

  return useMutation<
    ReferenceDataEntry,
    Error,
    { id: string; label?: string; sortOrder?: number; isActive?: boolean }
  >({
    mutationFn: async ({ id, ...body }) => {
      const res = await fetch(`/api/reference-data?id=${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(data.error ?? "Failed to update entry");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reference-data"] });
    },
  });
}
