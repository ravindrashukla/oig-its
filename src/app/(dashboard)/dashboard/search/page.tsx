"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X, FolderOpen, Package, ClipboardList, FileText, Bookmark, Star, Trash2, CalendarDays, ChevronDown, ChevronUp, SlidersHorizontal } from "lucide-react";
import { format, parseISO, isAfter, isBefore, startOfDay, endOfDay } from "date-fns";

import { useSearch, useDebouncedValue, type SearchHit, type SearchIndexResult } from "@/hooks/useSearch";
import { useSavedSearches, useCreateSavedSearch, useDeleteSavedSearch } from "@/hooks/useSavedSearches";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

// ─── Constants ──────────────────────────────────────────

const INDEX_META: Record<string, { label: string; icon: typeof FolderOpen }> = {
  all: { label: "All", icon: Search },
  cases: { label: "Cases", icon: FolderOpen },
  evidence: { label: "Evidence", icon: Package },
  tasks: { label: "Tasks", icon: ClipboardList },
  documents: { label: "Documents", icon: FileText },
};

const FACET_FIELDS: Record<string, string[]> = {
  cases: ["status", "caseType", "priority"],
  evidence: ["status", "type"],
  tasks: ["status", "priority"],
  documents: ["status"],
};

// ─── Advanced Search Options ───────────────────────────

const CASE_STATUS_OPTIONS = ["INTAKE", "OPEN", "ACTIVE", "UNDER_REVIEW", "PENDING_ACTION", "CLOSED", "ARCHIVED"];
const CASE_TYPE_OPTIONS = ["FRAUD", "WASTE", "ABUSE", "MISCONDUCT", "WHISTLEBLOWER", "COMPLIANCE", "OUTREACH", "BRIEFING", "OTHER"];
const PRIORITY_OPTIONS = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const EVIDENCE_TYPE_OPTIONS = ["DOCUMENT", "PHOTO", "VIDEO", "AUDIO", "DIGITAL", "PHYSICAL", "TESTIMONY", "OTHER"];
const EVIDENCE_STATUS_OPTIONS = ["COLLECTED", "IN_REVIEW", "VERIFIED", "DISPUTED", "ARCHIVED"];
const TASK_STATUS_OPTIONS = ["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED", "BLOCKED"];
const DOCUMENT_STATUS_OPTIONS = ["DRAFT", "UPLOADED", "REVIEWED", "APPROVED", "REDACTED", "ARCHIVED"];

interface AdvancedFilters {
  entityType: string;
  status: string;
  caseType: string;
  priority: string;
  evidenceType: string;
  titleContains: string;
  descriptionContains: string;
  createdFrom: string;
  createdTo: string;
}

const EMPTY_ADVANCED: AdvancedFilters = {
  entityType: "",
  status: "",
  caseType: "",
  priority: "",
  evidenceType: "",
  titleContains: "",
  descriptionContains: "",
  createdFrom: "",
  createdTo: "",
};

function buildAdvancedFilter(adv: AdvancedFilters): { index: string; filter: string; query: string } {
  const parts: string[] = [];
  let index = "all";

  if (adv.entityType === "Cases") index = "cases";
  else if (adv.entityType === "Evidence") index = "evidence";
  else if (adv.entityType === "Tasks") index = "tasks";
  else if (adv.entityType === "Documents") index = "documents";

  if (adv.status) {
    parts.push(`status = "${adv.status}"`);
  }
  if (adv.caseType && (index === "cases" || index === "all")) {
    parts.push(`caseType = "${adv.caseType}"`);
  }
  if (adv.priority && (index === "cases" || index === "tasks" || index === "all")) {
    parts.push(`priority = "${adv.priority}"`);
  }
  if (adv.evidenceType && (index === "evidence" || index === "all")) {
    parts.push(`type = "${adv.evidenceType}"`);
  }

  // Build text query from title/description contains
  const queryParts: string[] = [];
  if (adv.titleContains) queryParts.push(adv.titleContains);
  if (adv.descriptionContains) queryParts.push(adv.descriptionContains);

  return {
    index,
    filter: parts.join(" AND "),
    query: queryParts.join(" ") || "*",
  };
}

function enumLabel(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function hitUrl(hit: SearchHit, index: string): string {
  switch (index) {
    case "cases":
      return `/dashboard/cases/${hit.id}`;
    case "evidence":
      return `/dashboard/cases/${hit.caseId}/evidence`;
    case "tasks":
      return `/dashboard/tasks`;
    case "documents":
      return `/dashboard/cases/${hit.caseId}/documents`;
    default:
      return "/dashboard";
  }
}

// ─── Facet sidebar ──────────────────────────────────────

function FacetPanel({
  facetDistribution,
  activeFilters,
  onToggle,
}: {
  facetDistribution: Record<string, Record<string, number>>;
  activeFilters: Record<string, Set<string>>;
  onToggle: (field: string, value: string) => void;
}) {
  const fields = Object.keys(facetDistribution);
  if (fields.length === 0) return null;

  return (
    <div className="space-y-4">
      {fields.map((field) => {
        const values = facetDistribution[field];
        if (!values || Object.keys(values).length === 0) return null;

        return (
          <div key={field}>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {enumLabel(field)}
            </h4>
            <div className="space-y-1">
              {Object.entries(values)
                .sort(([, a], [, b]) => b - a)
                .map(([value, count]) => {
                  const isActive = activeFilters[field]?.has(value) ?? false;
                  return (
                    <label
                      key={value}
                      className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-sm hover:bg-muted"
                    >
                      <Checkbox
                        checked={isActive}
                        onCheckedChange={() => onToggle(field, value)}
                      />
                      <span className="flex-1 truncate">{enumLabel(value)}</span>
                      <span className="text-xs text-muted-foreground">{count}</span>
                    </label>
                  );
                })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Result card ────────────────────────────────────────

function ResultCard({
  hit,
  index,
  onClick,
}: {
  hit: SearchHit;
  index: string;
  onClick: () => void;
}) {
  const meta = INDEX_META[index];
  const Icon = meta?.icon ?? Search;

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-start gap-3 rounded-lg border border-border bg-card p-3 text-left transition-colors hover:bg-muted/50"
    >
      <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded bg-muted">
        <Icon className="size-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {hit.caseNumber && (
            <span className="font-mono text-xs text-muted-foreground">
              {hit.caseNumber}
            </span>
          )}
          <span className="truncate text-sm font-medium">
            {hit.title ?? hit.fileName ?? hit.id}
          </span>
        </div>
        {hit.description && (
          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
            {hit.description}
          </p>
        )}
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {hit.status && (
            <Badge variant="secondary" className="text-[10px]">
              {enumLabel(hit.status)}
            </Badge>
          )}
          {hit.priority && (
            <Badge variant="outline" className="text-[10px]">
              {hit.priority}
            </Badge>
          )}
          {hit.type && index === "evidence" && (
            <Badge variant="outline" className="text-[10px]">
              {enumLabel(hit.type)}
            </Badge>
          )}
        </div>
      </div>
    </button>
  );
}

// ─── Page component ─────────────────────────────────────

export default function SearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQ = searchParams.get("q") ?? "";

  const [query, setQuery] = useState(initialQ);
  const [activeIndex, setActiveIndex] = useState("all");
  const [activeFilters, setActiveFilters] = useState<Record<string, Set<string>>>({});
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [savedSearchName, setSavedSearchName] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>(EMPTY_ADVANCED);
  const [advancedActive, setAdvancedActive] = useState(false);

  const { data: savedSearchesData } = useSavedSearches();
  const createSavedSearch = useCreateSavedSearch();
  const deleteSavedSearch = useDeleteSavedSearch();
  const savedSearches = savedSearchesData?.data ?? [];
  const debouncedQuery = useDebouncedValue(query, 300);

  // Build MeiliSearch filter string from activeFilters
  const filterParts: string[] = [];
  for (const [field, values] of Object.entries(activeFilters)) {
    if (values.size > 0) {
      const valuesStr = [...values].map((v) => `"${v}"`).join(", ");
      filterParts.push(`${field} IN [${valuesStr}]`);
    }
  }

  // Merge advanced search filters when active
  const advancedResult = advancedActive ? buildAdvancedFilter(advancedFilters) : null;
  if (advancedResult?.filter) {
    filterParts.push(advancedResult.filter);
  }

  const filterStr = filterParts.join(" AND ") || undefined;

  // Determine search index - advanced can override
  const effectiveIndex = advancedActive && advancedResult?.index ? advancedResult.index : activeIndex;

  // Determine effective query - advanced can provide its own
  const effectiveQuery = advancedActive && advancedResult?.query && advancedResult.query !== "*"
    ? advancedResult.query
    : debouncedQuery;

  // Determine which facets to request
  const facetFields =
    effectiveIndex === "all"
      ? undefined
      : FACET_FIELDS[effectiveIndex]?.join(",");

  const { data, isLoading } = useSearch(
    {
      q: effectiveQuery,
      index: effectiveIndex,
      limit: 20,
      filter: filterStr,
      facets: facetFields,
    },
    effectiveQuery.length >= 1,
  );

  // Normalize results
  const results: SearchIndexResult[] = data?.results
    ? data.results
    : data?.hits
      ? [
          {
            index: data.index ?? activeIndex,
            hits: data.hits,
            estimatedTotalHits: data.estimatedTotalHits ?? 0,
            facetDistribution: data.facetDistribution,
          },
        ]
      : [];

  // Client-side date range filtering
  const filteredResults: SearchIndexResult[] = useMemo(() => {
    if (!dateFrom && !dateTo) return results;

    const fromDate = dateFrom ? startOfDay(parseISO(dateFrom)) : null;
    const toDate = dateTo ? endOfDay(parseISO(dateTo)) : null;

    return results.map((r) => {
      const filtered = r.hits.filter((hit) => {
        // Try common date fields: createdAt, openedAt, collectedAt, dueDate, date
        const dateStr =
          (hit.createdAt as string) ??
          (hit.openedAt as string) ??
          (hit.collectedAt as string) ??
          (hit.dueDate as string) ??
          (hit.date as string);
        if (!dateStr) return true; // keep items without a date field

        let hitDate: Date;
        try {
          hitDate = new Date(dateStr);
          if (isNaN(hitDate.getTime())) return true;
        } catch {
          return true;
        }

        if (fromDate && isBefore(hitDate, fromDate)) return false;
        if (toDate && isAfter(hitDate, toDate)) return false;
        return true;
      });
      return {
        ...r,
        hits: filtered,
        estimatedTotalHits: filtered.length,
      };
    });
  }, [results, dateFrom, dateTo]);

  const totalHits = filteredResults.reduce((sum, r) => sum + r.estimatedTotalHits, 0);

  // Merge facet distributions
  const mergedFacets: Record<string, Record<string, number>> = {};
  for (const r of filteredResults) {
    if (r.facetDistribution) {
      for (const [field, values] of Object.entries(r.facetDistribution)) {
        if (!mergedFacets[field]) mergedFacets[field] = {};
        for (const [val, count] of Object.entries(values)) {
          mergedFacets[field][val] = (mergedFacets[field][val] ?? 0) + count;
        }
      }
    }
  }

  const handleToggleFacet = useCallback((field: string, value: string) => {
    setActiveFilters((prev) => {
      const next = { ...prev };
      const set = new Set(prev[field] ?? []);
      if (set.has(value)) {
        set.delete(value);
      } else {
        set.add(value);
      }
      next[field] = set;
      return next;
    });
  }, []);

  const handleClearFilters = useCallback(() => {
    setActiveFilters({});
  }, []);

  const handleTabChange = useCallback((tab: string) => {
    setActiveIndex(tab);
    setActiveFilters({});
  }, []);

  const hasActiveFilters = Object.values(activeFilters).some((s) => s.size > 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Search</h1>
        <p className="text-sm text-muted-foreground">
          Search across cases, evidence, tasks, and documents
        </p>
      </div>

      {/* Search input */}
      <div className="flex items-center gap-2 max-w-2xl">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Type to search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9 pr-9"
            autoFocus
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setActiveFilters({});
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
        {query && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 shrink-0"
            onClick={() => {
              setSavedSearchName("");
              setSaveDialogOpen(true);
            }}
          >
            <Bookmark className="size-3.5" />
            Save Search
          </Button>
        )}
      </div>

      {/* RRS33: Wildcard search tip */}
      <p className="text-xs text-muted-foreground -mt-2">
        Tip: partial matches are automatic. Searching &quot;inv&quot; will find &quot;investigation&quot;, &quot;invoice&quot;, etc.
      </p>

      {/* Date Range Filters */}
      <div className="flex items-end gap-3 max-w-2xl">
        <div className="space-y-1">
          <label htmlFor="date-from" className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <CalendarDays className="size-3" />
            From
          </label>
          <Input
            id="date-from"
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="h-9 w-40"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="date-to" className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <CalendarDays className="size-3" />
            To
          </label>
          <Input
            id="date-to"
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="h-9 w-40"
          />
        </div>
        {(dateFrom || dateTo) && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9"
            onClick={() => {
              setDateFrom("");
              setDateTo("");
            }}
          >
            Clear dates
          </Button>
        )}
      </div>

      {/* Advanced Search Panel (RRS7) */}
      <div className="max-w-4xl">
        <button
          type="button"
          onClick={() => setAdvancedOpen(!advancedOpen)}
          className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <SlidersHorizontal className="size-4" />
          Advanced Search
          {advancedOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          {advancedActive && (
            <Badge variant="secondary" className="text-[10px] ml-1">Active</Badge>
          )}
        </button>
        {advancedOpen && (
          <Card className="mt-3">
            <CardContent className="pt-4 space-y-4">
              {/* Entity Type Selector */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Entity Type</label>
                  <select
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                    value={advancedFilters.entityType}
                    onChange={(e) => setAdvancedFilters((prev) => ({
                      ...prev,
                      entityType: e.target.value,
                      status: "",
                      caseType: "",
                      priority: "",
                      evidenceType: "",
                    }))}
                  >
                    <option value="">All Types</option>
                    <option value="Cases">Cases</option>
                    <option value="Evidence">Evidence</option>
                    <option value="Tasks">Tasks</option>
                    <option value="Documents">Documents</option>
                  </select>
                </div>

                {/* Status - varies by entity type */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Status</label>
                  <select
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                    value={advancedFilters.status}
                    onChange={(e) => setAdvancedFilters((prev) => ({ ...prev, status: e.target.value }))}
                  >
                    <option value="">Any Status</option>
                    {(advancedFilters.entityType === "Cases" ? CASE_STATUS_OPTIONS
                      : advancedFilters.entityType === "Evidence" ? EVIDENCE_STATUS_OPTIONS
                      : advancedFilters.entityType === "Tasks" ? TASK_STATUS_OPTIONS
                      : advancedFilters.entityType === "Documents" ? DOCUMENT_STATUS_OPTIONS
                      : CASE_STATUS_OPTIONS
                    ).map((s) => (
                      <option key={s} value={s}>{enumLabel(s)}</option>
                    ))}
                  </select>
                </div>

                {/* Case Type - for Cases */}
                {(!advancedFilters.entityType || advancedFilters.entityType === "Cases") && (
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Case Type</label>
                    <select
                      className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                      value={advancedFilters.caseType}
                      onChange={(e) => setAdvancedFilters((prev) => ({ ...prev, caseType: e.target.value }))}
                    >
                      <option value="">Any Type</option>
                      {CASE_TYPE_OPTIONS.map((t) => (
                        <option key={t} value={t}>{enumLabel(t)}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Priority - for Cases and Tasks */}
                {(!advancedFilters.entityType || advancedFilters.entityType === "Cases" || advancedFilters.entityType === "Tasks") && (
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Priority</label>
                    <select
                      className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                      value={advancedFilters.priority}
                      onChange={(e) => setAdvancedFilters((prev) => ({ ...prev, priority: e.target.value }))}
                    >
                      <option value="">Any Priority</option>
                      {PRIORITY_OPTIONS.map((p) => (
                        <option key={p} value={p}>{enumLabel(p)}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Evidence Type - for Evidence */}
                {advancedFilters.entityType === "Evidence" && (
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Evidence Type</label>
                    <select
                      className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                      value={advancedFilters.evidenceType}
                      onChange={(e) => setAdvancedFilters((prev) => ({ ...prev, evidenceType: e.target.value }))}
                    >
                      <option value="">Any Type</option>
                      {EVIDENCE_TYPE_OPTIONS.map((t) => (
                        <option key={t} value={t}>{enumLabel(t)}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Text search fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Title contains</label>
                  <Input
                    placeholder="Search in title..."
                    value={advancedFilters.titleContains}
                    onChange={(e) => setAdvancedFilters((prev) => ({ ...prev, titleContains: e.target.value }))}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Description contains</label>
                  <Input
                    placeholder="Search in description..."
                    value={advancedFilters.descriptionContains}
                    onChange={(e) => setAdvancedFilters((prev) => ({ ...prev, descriptionContains: e.target.value }))}
                    className="h-9"
                  />
                </div>
              </div>

              {/* Date range for created/opened */}
              <div className="flex items-end gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Created From</label>
                  <Input
                    type="date"
                    value={advancedFilters.createdFrom}
                    onChange={(e) => setAdvancedFilters((prev) => ({ ...prev, createdFrom: e.target.value }))}
                    className="h-9 w-40"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Created To</label>
                  <Input
                    type="date"
                    value={advancedFilters.createdTo}
                    onChange={(e) => setAdvancedFilters((prev) => ({ ...prev, createdTo: e.target.value }))}
                    className="h-9 w-40"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  onClick={() => {
                    const result = buildAdvancedFilter(advancedFilters);
                    if (result.index !== "all") {
                      setActiveIndex(result.index);
                    }
                    // Set query from title/description if main query is empty
                    if (!query && result.query !== "*") {
                      setQuery(result.query);
                    }
                    // Set date range from advanced
                    if (advancedFilters.createdFrom) setDateFrom(advancedFilters.createdFrom);
                    if (advancedFilters.createdTo) setDateTo(advancedFilters.createdTo);
                    setAdvancedActive(true);
                  }}
                >
                  <Search className="size-3.5 mr-1.5" />
                  Search
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setAdvancedFilters(EMPTY_ADVANCED);
                    setAdvancedActive(false);
                  }}
                >
                  Clear Advanced
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Saved Searches */}
      {savedSearches.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Saved Searches
          </h3>
          <div className="flex flex-wrap gap-2">
            {savedSearches.map((ss) => (
              <div key={ss.id} className="group flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => {
                    const q = (ss.query as Record<string, string>).q ?? "";
                    const index = (ss.query as Record<string, string>).index ?? "all";
                    setQuery(q);
                    setActiveIndex(index);
                    setActiveFilters({});
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full border bg-background px-3 py-1 text-xs font-medium hover:bg-muted transition-colors"
                >
                  {ss.isDefault && (
                    <Star className="size-3 fill-yellow-400 text-yellow-400" />
                  )}
                  {ss.name}
                </button>
                <button
                  type="button"
                  onClick={() => deleteSavedSearch.mutate(ss.id)}
                  className="opacity-0 group-hover:opacity-100 rounded p-0.5 text-muted-foreground hover:text-destructive transition-opacity"
                  title="Delete saved search"
                >
                  <Trash2 className="size-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeIndex} onValueChange={handleTabChange}>
        <TabsList>
          {Object.entries(INDEX_META).map(([key, { label, icon: Icon }]) => (
            <TabsTrigger key={key} value={key} className="gap-1.5">
              <Icon className="size-3.5" />
              {label}
              {debouncedQuery && key === "all" && totalHits > 0 && (
                <Badge variant="secondary" className="ml-1 text-[10px]">
                  {totalHits}
                </Badge>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Body: facets sidebar + results */}
      {debouncedQuery.length > 0 && (
        <div className="flex gap-6">
          {/* Facet sidebar (only for single-index view) */}
          {activeIndex !== "all" && Object.keys(mergedFacets).length > 0 && (
            <aside className="hidden w-56 shrink-0 lg:block">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Filters</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <FacetPanel
                    facetDistribution={mergedFacets}
                    activeFilters={activeFilters}
                    onToggle={handleToggleFacet}
                  />
                  {hasActiveFilters && (
                    <>
                      <Separator />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full"
                        onClick={handleClearFilters}
                      >
                        Clear all filters
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            </aside>
          )}

          {/* Results */}
          <div className="flex-1 space-y-2">
            {isLoading && (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full rounded-lg" />
                ))}
              </div>
            )}

            {!isLoading && filteredResults.length === 0 && (
              <p className="py-12 text-center text-sm text-muted-foreground">
                No results found for &quot;{debouncedQuery}&quot;
              </p>
            )}

            {!isLoading &&
              filteredResults.length > 0 &&
              totalHits === 0 && (
                <p className="py-12 text-center text-sm text-muted-foreground">
                  No results found for &quot;{debouncedQuery}&quot;
                </p>
              )}

            {!isLoading &&
              filteredResults.map((r) =>
                r.hits.length === 0 ? null : (
                  <div key={r.index} className="space-y-2">
                    {activeIndex === "all" && (
                      <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        {INDEX_META[r.index]?.label ?? r.index}
                        <Badge variant="secondary" className="text-[10px]">
                          {r.estimatedTotalHits}
                        </Badge>
                      </h3>
                    )}
                    {r.hits.map((hit) => (
                      <ResultCard
                        key={`${r.index}-${hit.id}`}
                        hit={hit}
                        index={r.index}
                        onClick={() =>
                          router.push(
                            hitUrl(hit, r.index),
                          )
                        }
                      />
                    ))}
                  </div>
                ),
              )}
          </div>
        </div>
      )}

      {/* Save Search Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Current Search</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label htmlFor="ss-name" className="text-sm font-medium">
                Name
              </label>
              <Input
                id="ss-name"
                placeholder="My saved search"
                value={savedSearchName}
                onChange={(e) => setSavedSearchName(e.target.value)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Query: &quot;{query}&quot; in {activeIndex}
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSaveDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!savedSearchName) return;
                createSavedSearch.mutate(
                  {
                    name: savedSearchName,
                    query: {
                      q: query,
                      index: activeIndex,
                    },
                  },
                  {
                    onSuccess: () => setSaveDialogOpen(false),
                  },
                );
              }}
              disabled={!savedSearchName || createSavedSearch.isPending}
            >
              {createSavedSearch.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
