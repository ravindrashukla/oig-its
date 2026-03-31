"use client";

import { useState, useCallback, useMemo } from "react";
import { Search, X, SlidersHorizontal, Package, Box, Archive, UserCheck } from "lucide-react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

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
  const [activeTab, setActiveTab] = useState("all-items");
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

  // Fetch all items for summary (unfiltered, large page)
  const { data: summaryData } = useQuery<InventoryListResponse>({
    queryKey: ["inventory-summary"],
    queryFn: async () => {
      const res = await fetch("/api/inventory?page=1&pageSize=1000");
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`${res.status}: ${body || res.statusText}`);
      }
      return res.json();
    },
    placeholderData: keepPreviousData,
  });

  // CM48: Summary calculations
  const allItems = summaryData?.data ?? [];
  const totalItems = summaryData?.total ?? 0;

  const itemsByStatus = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of allItems) {
      counts[item.status] = (counts[item.status] || 0) + 1;
    }
    return counts;
  }, [allItems]);

  const itemsByType = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of allItems) {
      counts[item.type] = (counts[item.type] || 0) + 1;
    }
    return counts;
  }, [allItems]);

  // CM48: Group by agent for "By Agent" tab
  const itemsByAgent = useMemo(() => {
    const groups: Record<string, { agent: InventoryItemRow["assignedTo"]; items: InventoryItemRow[] }> = {};
    for (const item of allItems) {
      const key = item.assignedTo?.id ?? "__unassigned__";
      if (!groups[key]) {
        groups[key] = { agent: item.assignedTo, items: [] };
      }
      groups[key].items.push(item);
    }
    return Object.values(groups).sort((a, b) => {
      if (!a.agent) return 1;
      if (!b.agent) return -1;
      return `${a.agent.lastName}${a.agent.firstName}`.localeCompare(`${b.agent.lastName}${b.agent.firstName}`);
    });
  }, [allItems]);

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

      {/* CM48: Summary cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Package className="size-8 text-blue-600" />
            <div>
              <p className="text-2xl font-bold">{totalItems}</p>
              <p className="text-xs text-muted-foreground">Total Items</p>
            </div>
          </CardContent>
        </Card>
        {statusOptions.map((s) => (
          <Card key={s}>
            <CardContent className="flex items-center gap-3 p-4">
              <div>
                <p className="text-2xl font-bold">{itemsByStatus[s] || 0}</p>
                <p className="text-xs text-muted-foreground">{enumLabel(s)}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-3 max-w-md">
        {typeOptions.map((t) => (
          <Card key={t}>
            <CardContent className="p-3 text-center">
              <p className="text-xl font-bold">{itemsByType[t] || 0}</p>
              <p className="text-xs text-muted-foreground">{enumLabel(t)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs: All Items / By Agent */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all-items">All Items</TabsTrigger>
          <TabsTrigger value="by-agent" className="gap-1.5">
            <UserCheck className="size-3.5" />
            By Agent
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all-items" className="space-y-4">
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
        </TabsContent>

        {/* CM48: By Agent tab */}
        <TabsContent value="by-agent" className="space-y-4">
          {itemsByAgent.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No inventory items found.
              </CardContent>
            </Card>
          ) : (
            itemsByAgent.map((group) => (
              <Card key={group.agent?.id ?? "unassigned"}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="flex size-8 items-center justify-center rounded-full bg-muted text-xs font-medium">
                        {group.agent
                          ? `${group.agent.firstName[0]}${group.agent.lastName[0]}`
                          : "--"}
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {group.agent
                            ? `${group.agent.firstName} ${group.agent.lastName}`
                            : "Unassigned"}
                        </p>
                        {group.agent?.email && (
                          <p className="text-xs text-muted-foreground">
                            {group.agent.email}
                          </p>
                        )}
                      </div>
                    </div>
                    <Badge variant="secondary">{group.items.length} items</Badge>
                  </div>
                  <div className="space-y-1">
                    {group.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between rounded border px-3 py-2"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{item.name}</span>
                          <span className="text-xs text-muted-foreground capitalize">
                            {item.type.replace(/_/g, " ").toLowerCase()}
                          </span>
                        </div>
                        <Badge variant={statusVariant[item.status] || "outline"}>
                          {enumLabel(item.status)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
