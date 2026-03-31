"use client";

import { useState, useCallback } from "react";
import { Search, X, SlidersHorizontal } from "lucide-react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";

import { DataTable, type ColumnDef, type SortState, type PaginationState } from "@/components/ui/DataTable";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";

// ─── Types ──────────────────────────────────────────────

interface InventoryItemRow {
  id: string;
  type: string;
  name: string;
  description: string | null;
  serialNumber: string | null;
  barcode: string | null;
  status: string;
  location: string | null;
  region: string | null;
  condition: string | null;
  createdAt: string;
  assignedTo: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  case: {
    id: string;
    caseNumber: string;
    title: string;
  } | null;
}

interface InventoryListResponse {
  data: InventoryItemRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ─── Constants ──────────────────────────────────────────

const typeOptions = ["EVIDENCE", "EQUIPMENT", "PROPERTY"];
const statusOptions = ["AVAILABLE", "ASSIGNED", "IN_USE", "LOST", "RETIRED"];

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  AVAILABLE: "default",
  ASSIGNED: "secondary",
  IN_USE: "secondary",
  LOST: "destructive",
  RETIRED: "outline",
};

function enumLabel(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Column definitions ─────────────────────────────────

const columns: ColumnDef<InventoryItemRow>[] = [
  {
    id: "name",
    header: "Name",
    accessorKey: "name",
    sortable: true,
    cell: (row) => (
      <span className="font-medium truncate max-w-[200px] block">
        {row.name}
      </span>
    ),
  },
  {
    id: "type",
    header: "Type",
    accessorKey: "type",
    sortable: false,
    className: "w-[110px]",
    cell: (row) => (
      <span className="text-xs capitalize">
        {row.type.replace(/_/g, " ").toLowerCase()}
      </span>
    ),
  },
  {
    id: "serialNumber",
    header: "Serial Number",
    accessorKey: "serialNumber",
    sortable: false,
    className: "w-[140px]",
    cell: (row) => (
      <span className="font-mono text-xs">
        {row.serialNumber || <span className="text-muted-foreground">--</span>}
      </span>
    ),
  },
  {
    id: "status",
    header: "Status",
    accessorKey: "status",
    sortable: false,
    className: "w-[110px]",
    cell: (row) => (
      <Badge variant={statusVariant[row.status] || "outline"}>
        {enumLabel(row.status)}
      </Badge>
    ),
  },
  {
    id: "assignedTo",
    header: "Assigned To",
    sortable: false,
    className: "w-[160px]",
    cell: (row) => {
      if (!row.assignedTo) {
        return <span className="text-xs text-muted-foreground">Unassigned</span>;
      }
      return (
        <span className="text-xs">
          {row.assignedTo.firstName} {row.assignedTo.lastName}
        </span>
      );
    },
  },
  {
    id: "location",
    header: "Location",
    accessorKey: "location",
    sortable: false,
    className: "w-[140px]",
    cell: (row) => (
      <span className="text-xs text-muted-foreground">
        {row.location || "--"}
      </span>
    ),
  },
  {
    id: "case",
    header: "Case",
    sortable: false,
    className: "w-[130px]",
    cell: (row) => {
      if (!row.case) {
        return <span className="text-xs text-muted-foreground">--</span>;
      }
      return (
        <span className="font-mono text-xs">{row.case.caseNumber}</span>
      );
    },
  },
];

// ─── Page component ─────────────────────────────────────

export default function InventoryPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [type, setType] = useState<string | undefined>();
  const [status, setStatus] = useState<string | undefined>();
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

  const params = new URLSearchParams();
  params.set("page", String(pagination.page));
  params.set("pageSize", String(pagination.pageSize));
  if (debouncedSearch) params.set("search", debouncedSearch);
  if (type) params.set("type", type);
  if (status) params.set("status", status);
  const qs = params.toString();

  const { data, isLoading } = useQuery<InventoryListResponse>({
    queryKey: ["inventory", qs],
    queryFn: async () => {
      const res = await fetch(`/api/inventory?${qs}`);
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`${res.status}: ${body || res.statusText}`);
      }
      return res.json();
    },
    placeholderData: keepPreviousData,
  });

  const hasActiveFilters = !!type || !!status;

  function clearFilters() {
    setType(undefined);
    setStatus(undefined);
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
        <h1 className="text-2xl font-semibold tracking-tight">Inventory</h1>
        <p className="text-sm text-muted-foreground">
          Track evidence, equipment, and property items
        </p>
      </div>

      {/* Search + filter toggle */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, serial number, or barcode..."
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
              {[type, status].filter(Boolean).length}
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
                Type
              </label>
              <Select
                value={type ?? "ALL"}
                onValueChange={(val) => {
                  setType(!val || val === "ALL" ? undefined : val);
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
                Status
              </label>
              <Select
                value={status ?? "ALL"}
                onValueChange={(val) => {
                  setStatus(!val || val === "ALL" ? undefined : val);
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
          </CardContent>
        </Card>
      )}

      {/* Data table */}
      <DataTable<InventoryItemRow>
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
        emptyMessage="No inventory items match your filters."
        pageSizeOptions={[10, 25, 50, 100]}
      />
    </div>
  );
}
