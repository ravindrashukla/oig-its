"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";

// ─── Types ───────────────────────────────────────────────────

export interface ReportDefinition {
  id: string;
  name: string;
  description: string | null;
  query: Record<string, unknown>;
  columns: Array<{ key: string; label: string }>;
  filters: { available?: string[] } | null;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  _count: { runs: number };
}

export interface ReportRunResult {
  reportId: string;
  reportName: string;
  reportType: string;
  runId: string;
  resultCount: number;
  data: Record<string, unknown>[];
}

// ─── Helpers ─────────────────────────────────────────────────

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`${res.status}: ${body || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

// ─── Hooks ───────────────────────────────────────────────────

/** Fetch all report definitions */
export function useReportDefinitions() {
  return useQuery<{ data: ReportDefinition[] }>({
    queryKey: ["reports"],
    queryFn: () => fetchJson<{ data: ReportDefinition[] }>("/api/reports"),
  });
}

/** Run a report and get JSON result */
export function useRunReport() {
  const queryClient = useQueryClient();

  return useMutation<
    ReportRunResult,
    Error,
    { reportId: string; format?: "json" | "csv"; parameters?: Record<string, unknown> }
  >({
    mutationFn: async ({ reportId, format = "json", parameters }) => {
      const res = await fetch(`/api/reports/${reportId}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format, parameters }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(body.error ?? `Run failed: ${res.status}`);
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
  });
}

/** Download a report as CSV */
export async function downloadReportCsv(
  reportId: string,
  reportName: string,
  parameters?: Record<string, unknown>,
) {
  const res = await fetch(`/api/reports/${reportId}/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ format: "csv", parameters }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error ?? `Download failed: ${res.status}`);
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${reportName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Seed default report definitions */
export function useSeedDefaultReports() {
  const queryClient = useQueryClient();

  return useMutation<
    { message: string; created: string[]; skipped: string[] },
    Error
  >({
    mutationFn: async () => {
      const res = await fetch("/api/reports/seed-defaults", {
        method: "POST",
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(body.error ?? `Seed failed: ${res.status}`);
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
  });
}

/** Create a new report definition */
export function useCreateReport() {
  const queryClient = useQueryClient();

  return useMutation<
    ReportDefinition,
    Error,
    {
      name: string;
      description?: string;
      type: string;
      query?: Record<string, unknown>;
      columns: Array<{ key: string; label: string }>;
      filters?: Record<string, unknown>;
    }
  >({
    mutationFn: async (input) => {
      const res = await fetch("/api/reports", {
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
      queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
  });
}
