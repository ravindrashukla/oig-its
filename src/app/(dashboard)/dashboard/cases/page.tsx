"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, X, SlidersHorizontal } from "lucide-react";
import { format } from "date-fns";

import { useCases } from "@/hooks/useCases";
import { CaseStatus, CaseType, Priority } from "@/lib/enums";
import type { CaseFilters } from "@/types";
import type { CaseWithAssignees } from "@/types/case";
import { DataTable, type ColumnDef, type SortState, type PaginationState } from "@/components/ui/DataTable";
import { CaseStatusBadge } from "@/components/cases/CaseStatusBadge";
import { PriorityBadge } from "@/components/cases/PriorityBadge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";

// ─── Column definitions ───────────────────────────────────

const columns: ColumnDef<CaseWithAssignees>[] = [
  {
    id: "caseNumber",
    header: "Case #",
    accessorKey: "caseNumber",
    sortable: true,
    className: "w-[120px]",
    cell: (row) => (
      <span className="font-mono text-xs">{row.caseNumber}</span>
    ),
  },
  {
    id: "title",
    header: "Title",
    accessorKey: "title",
    sortable: true,
    cell: (row) => (
      <span className="font-medium truncate max-w-[300px] block">
        {row.title}
      </span>
    ),
  },
  {
    id: "status",
    header: "Status",
    accessorKey: "status",
    sortable: true,
    className: "w-[140px]",
    cell: (row) => <CaseStatusBadge status={row.status} />,
  },
  {
    id: "priority",
    header: "Priority",
    accessorKey: "priority",
    sortable: true,
    className: "w-[110px]",
    cell: (row) => <PriorityBadge priority={row.priority} />,
  },
  {
    id: "caseType",
    header: "Type",
    accessorKey: "caseType",
    sortable: false,
    className: "w-[110px]",
    cell: (row) => (
      <span className="text-xs capitalize">
        {row.caseType.replace(/_/g, " ").toLowerCase()}
      </span>
    ),
  },
  {
    id: "assignees",
    header: "Assigned To",
    sortable: false,
    className: "w-[160px]",
    cell: (row) => {
      if (row.assignments.length === 0) {
        return <span className="text-xs text-muted-foreground">Unassigned</span>;
      }
      const first = row.assignments[0].user;
      const more = row.assignments.length - 1;
      return (
        <span className="text-xs">
          {first.firstName} {first.lastName}
          {more > 0 && (
            <span className="text-muted-foreground"> +{more}</span>
          )}
        </span>
      );
    },
  },
  {
    id: "createdAt",
    header: "Created",
    accessorKey: "createdAt",
    sortable: true,
    className: "w-[100px]",
    cell: (row) => (
      <span className="text-xs text-muted-foreground">
        {format(new Date(row.createdAt), "MMM d, yyyy")}
      </span>
    ),
  },
  {
    id: "dueDate",
    header: "Due Date",
    accessorKey: "dueDate",
    sortable: true,
    className: "w-[100px]",
    cell: (row) =>
      row.dueDate ? (
        <span className="text-xs text-muted-foreground">
          {format(new Date(row.dueDate), "MMM d, yyyy")}
        </span>
      ) : (
        <span className="text-xs text-muted-foreground">—</span>
      ),
  },
];

// ─── Filter label helpers ──────────────────────────────────

const statusOptions = Object.values(CaseStatus) as CaseStatus[];
const typeOptions = Object.values(CaseType) as CaseType[];
const priorityOptions = Object.values(Priority) as Priority[];

function enumLabel(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Page component ────────────────────────────────────────

export default function CasesPage() {
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState<CaseStatus | undefined>();
  const [caseType, setCaseType] = useState<CaseType | undefined>();
  const [priority, setPriority] = useState<Priority | undefined>();
  const [sort, setSort] = useState<SortState>({
    column: "createdAt",
    direction: "desc",
  });
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    pageSize: 25,
  });
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [debounceTimer, setDebounceTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearch(value);
      if (debounceTimer) clearTimeout(debounceTimer);
      const timer = setTimeout(() => {
        setDebouncedSearch(value);
        setPagination((prev) => ({ ...prev, page: 1 }));
      }, 300);
      setDebounceTimer(timer);
    },
    [debounceTimer],
  );

  const filters: CaseFilters = {
    page: pagination.page,
    pageSize: pagination.pageSize,
    sortBy: sort.column,
    sortOrder: sort.direction,
    ...(debouncedSearch && { search: debouncedSearch }),
    ...(status && { status }),
    ...(caseType && { caseType }),
    ...(priority && { priority }),
  };

  const { data, isLoading } = useCases(filters);

  const hasActiveFilters = !!status || !!caseType || !!priority;

  function clearFilters() {
    setStatus(undefined);
    setCaseType(undefined);
    setPriority(undefined);
    setPagination((prev) => ({ ...prev, page: 1 }));
  }

  function handleSortChange(newSort: SortState) {
    setSort(newSort);
    setPagination((prev) => ({ ...prev, page: 1 }));
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Cases</h1>
        <p className="text-sm text-muted-foreground">
          Manage and track investigation cases
        </p>
      </div>

      {/* Search + filter toggle */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search cases..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-8"
          />
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setDebouncedSearch("");
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        <Button
          variant={filtersOpen ? "secondary" : "outline"}
          size="sm"
          onClick={() => setFiltersOpen(!filtersOpen)}
          className="gap-1.5"
        >
          <SlidersHorizontal className="size-3.5" />
          Filters
          {hasActiveFilters && (
            <span className="flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {[status, caseType, priority].filter(Boolean).length}
            </span>
          )}
        </Button>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear filters
          </Button>
        )}
      </div>

      {/* Filter panel */}
      {filtersOpen && (
        <Card>
          <CardContent className="flex flex-wrap items-end gap-4 pt-4 pb-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Status
              </label>
              <Select
                value={status ?? "ALL"}
                onValueChange={(val) => {
                  setStatus(val === "ALL" ? undefined : (val as CaseStatus));
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All statuses</SelectItem>
                  {statusOptions.map((s) => (
                    <SelectItem key={s} value={s}>
                      {enumLabel(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Type
              </label>
              <Select
                value={caseType ?? "ALL"}
                onValueChange={(val) => {
                  setCaseType(val === "ALL" ? undefined : (val as CaseType));
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All types</SelectItem>
                  {typeOptions.map((t) => (
                    <SelectItem key={t} value={t}>
                      {enumLabel(t)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Priority
              </label>
              <Select
                value={priority ?? "ALL"}
                onValueChange={(val) => {
                  setPriority(val === "ALL" ? undefined : (val as Priority));
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="All priorities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All priorities</SelectItem>
                  {priorityOptions.map((p) => (
                    <SelectItem key={p} value={p}>
                      {enumLabel(p)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data table */}
      <DataTable<CaseWithAssignees>
        columns={columns}
        data={data?.data ?? []}
        total={data?.total}
        sort={sort}
        onSortChange={handleSortChange}
        pagination={pagination}
        onPaginationChange={setPagination}
        getRowId={(row) => row.id}
        loading={isLoading}
        skeletonRows={pagination.pageSize > 25 ? 25 : pagination.pageSize}
        onRowClick={(row) => router.push(`/dashboard/cases/${row.id}`)}
        emptyMessage="No cases match your filters."
        pageSizeOptions={[10, 25, 50, 100]}
      />
    </div>
  );
}
