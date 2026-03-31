"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import type { Document } from "@/generated/prisma";
import type { PaginatedResponse, QueryFilters } from "@/types";

type DocumentWithCounts = Document & {
  _count: { comments: number; accessLogs: number };
};

type DocumentListResponse = PaginatedResponse<DocumentWithCounts>;

interface DocumentFilters extends QueryFilters {
  status?: string;
}

function buildSearchParams(filters: DocumentFilters): string {
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

/** Fetch paginated documents for a case */
export function useDocuments(caseId: string, filters: DocumentFilters = {}) {
  const qs = buildSearchParams({ page: 1, pageSize: 20, ...filters });

  return useQuery<DocumentListResponse>({
    queryKey: ["documents", caseId, qs],
    queryFn: () =>
      fetchJson<DocumentListResponse>(
        `/api/cases/${caseId}/documents?${qs}`,
      ),
    placeholderData: keepPreviousData,
    enabled: !!caseId,
  });
}

/** Upload a document to a case */
export function useUploadDocument(caseId: string) {
  const queryClient = useQueryClient();

  return useMutation<
    DocumentWithCounts,
    Error,
    { file: File; title?: string }
  >({
    mutationFn: async ({ file, title }) => {
      const formData = new FormData();
      formData.append("file", file);
      if (title) formData.append("title", title);

      const res = await fetch(`/api/cases/${caseId}/documents`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(body.error ?? `Upload failed: ${res.status}`);
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents", caseId] });
    },
  });
}

/** Build a download URL for a document */
export function getDocumentDownloadUrl(
  caseId: string,
  documentId: string,
): string {
  return `/api/cases/${caseId}/documents/${documentId}/download`;
}
