"use client";

import { useState } from "react";
import { Search, Filter, LayoutGrid, List } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useEvidence } from "@/hooks/useEvidence";
import { EvidenceCard } from "./EvidenceCard";

interface EvidenceBrowserProps {
  caseId: string;
}

const TYPES = [
  { value: "", label: "All types" },
  { value: "DOCUMENT", label: "Document" },
  { value: "PHOTO", label: "Photo" },
  { value: "VIDEO", label: "Video" },
  { value: "AUDIO", label: "Audio" },
  { value: "DIGITAL", label: "Digital" },
  { value: "PHYSICAL", label: "Physical" },
  { value: "TESTIMONY", label: "Testimony" },
  { value: "OTHER", label: "Other" },
] as const;

const STATUSES = [
  { value: "", label: "All statuses" },
  { value: "COLLECTED", label: "Collected" },
  { value: "IN_REVIEW", label: "In Review" },
  { value: "VERIFIED", label: "Verified" },
  { value: "DISPUTED", label: "Disputed" },
  { value: "ARCHIVED", label: "Archived" },
] as const;

export function EvidenceBrowser({ caseId }: EvidenceBrowserProps) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const { data, isLoading } = useEvidence(caseId, {
    page,
    pageSize: 20,
    search: debouncedSearch || undefined,
    type: type || undefined,
    status: status || undefined,
  });

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
    const id = setTimeout(() => setDebouncedSearch(value), 300);
    return () => clearTimeout(id);
  };

  const evidence = data?.data ?? [];
  const totalPages = data?.totalPages ?? 1;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search evidence..."
            className="pl-9"
          />
        </div>
        <Button
          variant={showFilters ? "secondary" : "outline"}
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="mr-1.5 size-3.5" />
          Filter
        </Button>
        <div className="flex rounded-md border">
          <Button
            variant={viewMode === "grid" ? "secondary" : "ghost"}
            size="icon-xs"
            onClick={() => setViewMode("grid")}
            className="rounded-r-none"
          >
            <LayoutGrid className="size-3.5" />
          </Button>
          <Button
            variant={viewMode === "list" ? "secondary" : "ghost"}
            size="icon-xs"
            onClick={() => setViewMode("list")}
            className="rounded-l-none"
          >
            <List className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="flex items-center gap-3 rounded-md border bg-card p-3">
          <Select value={type} onValueChange={(v) => { setType(v ?? ""); setPage(1); }}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              {TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={(v) => { setStatus(v ?? ""); setPage(1); }}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Evidence items */}
      {isLoading ? (
        <div className={viewMode === "grid"
          ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          : "space-y-3"
        }>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-lg" />
          ))}
        </div>
      ) : evidence.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
          <p className="text-sm font-medium text-muted-foreground">
            No evidence items found
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Add evidence to this case to get started.
          </p>
        </div>
      ) : (
        <div
          className={
            viewMode === "grid"
              ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
              : "space-y-3"
          }
        >
          {evidence.map((item) => (
            <EvidenceCard key={item.id} evidence={item} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Page {page} of {totalPages} ({data?.total ?? 0} items)
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
