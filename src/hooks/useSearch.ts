"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useState, useCallback, useRef, useEffect } from "react";

// ─── Types ──────────────────────────────────────────────

export interface SearchHit {
  id: string;
  title?: string;
  caseNumber?: string;
  fileName?: string;
  status?: string;
  type?: string;
  priority?: string;
  description?: string;
  [key: string]: unknown;
}

export interface SearchIndexResult {
  index: string;
  hits: SearchHit[];
  estimatedTotalHits: number;
  facetDistribution?: Record<string, Record<string, number>>;
}

export interface SuggestResponse {
  results: SearchIndexResult[];
}

export interface FullSearchResponse {
  results?: SearchIndexResult[];
  index?: string;
  hits?: SearchHit[];
  estimatedTotalHits?: number;
  facetDistribution?: Record<string, Record<string, number>>;
  offset?: number;
  limit?: number;
}

// ─── Fetchers ───────────────────────────────────────────

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`${res.status}: ${body || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

// ─── useSearchSuggest: lightweight autocomplete ─────────

export function useSearchSuggest(query: string, enabled = true) {
  return useQuery<SuggestResponse>({
    queryKey: ["search", "suggest", query],
    queryFn: () =>
      fetchJson<SuggestResponse>(
        `/api/search?q=${encodeURIComponent(query)}&suggest=true`,
      ),
    enabled: enabled && query.length >= 1,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

// ─── useSearch: full search with facets ─────────────────

export interface SearchParams {
  q: string;
  index?: string;
  limit?: number;
  offset?: number;
  filter?: string;
  sort?: string;
  facets?: string;
}

export function useSearch(params: SearchParams, enabled = true) {
  const qs = new URLSearchParams();
  if (params.q) qs.set("q", params.q);
  if (params.index) qs.set("index", params.index);
  if (params.limit) qs.set("limit", String(params.limit));
  if (params.offset) qs.set("offset", String(params.offset));
  if (params.filter) qs.set("filter", params.filter);
  if (params.sort) qs.set("sort", params.sort);
  if (params.facets) qs.set("facets", params.facets);

  return useQuery<FullSearchResponse>({
    queryKey: ["search", "full", qs.toString()],
    queryFn: () =>
      fetchJson<FullSearchResponse>(`/api/search?${qs.toString()}`),
    enabled: enabled && params.q.length >= 1,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

// ─── useDebouncedValue ──────────────────────────────────

export function useDebouncedValue<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = useState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    timerRef.current = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timerRef.current);
  }, [value, delay]);

  return debounced;
}

// ─── useCommandPaletteSearch: combined debounce + suggest

export function useCommandPaletteSearch() {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 200);
  const { data, isLoading } = useSearchSuggest(debouncedQuery);

  const allHits = (data?.results ?? []).flatMap((r) =>
    r.hits.map((h) => ({ ...h, _index: r.index })),
  );

  const reset = useCallback(() => setQuery(""), []);

  return { query, setQuery, debouncedQuery, hits: allHits, isLoading, reset };
}
