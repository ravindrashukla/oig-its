"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";

export interface SavedSearch {
  id: string;
  userId: string;
  name: string;
  query: Record<string, unknown>;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

interface SavedSearchesResponse {
  data: SavedSearch[];
}

export interface CreateSavedSearchInput {
  name: string;
  query: Record<string, unknown>;
  isDefault?: boolean;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`${res.status}: ${body || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export function useSavedSearches() {
  return useQuery<SavedSearchesResponse>({
    queryKey: ["saved-searches"],
    queryFn: () => fetchJson<SavedSearchesResponse>("/api/saved-searches"),
  });
}

export function useCreateSavedSearch() {
  const queryClient = useQueryClient();

  return useMutation<SavedSearch, Error, CreateSavedSearchInput>({
    mutationFn: async (input) => {
      const res = await fetch("/api/saved-searches", {
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
      queryClient.invalidateQueries({ queryKey: ["saved-searches"] });
    },
  });
}

export function useDeleteSavedSearch() {
  const queryClient = useQueryClient();

  return useMutation<{ success: boolean }, Error, string>({
    mutationFn: async (id) => {
      const res = await fetch(`/api/saved-searches?id=${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(body.error ?? `Delete failed: ${res.status}`);
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-searches"] });
    },
  });
}
