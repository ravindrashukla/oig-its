"use client";

import { useState } from "react";
import { Search, X, ScrollText } from "lucide-react";
import { format } from "date-fns";

import { useAuditLogs, type AuditLogEntry } from "@/hooks/useAuditLogs";
import {
  DataTable,
  type ColumnDef,
  type SortState,
  type PaginationState,
} from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ─── Column definitions ───────────────────────────────────

const columns: ColumnDef<AuditLogEntry>[] = [
  {
    id: "createdAt",
    header: "Timestamp",
    accessorKey: "createdAt",
    sortable: true,
    className: "w-[170px]",
    cell: (row) => (
      <span className="text-xs text-muted-foreground font-mono">
        {format(new Date(row.createdAt), "MMM d, yyyy HH:mm:ss")}
      </span>
    ),
  },
  {
    id: "user",
    header: "User",
    sortable: false,
    className: "w-[180px]",
    cell: (row) =>
      row.user ? (
        <div>
          <span className="text-xs font-medium">
            {row.user.firstName} {row.user.lastName}
          </span>
          <span className="block text-[10px] text-muted-foreground">
            {row.user.email}
          </span>
        </div>
      ) : (
        <span className="text-xs text-muted-foreground">System</span>
      ),
  },
  {
    id: "action",
    header: "Action",
    accessorKey: "action",
    sortable: true,
    className: "w-[160px]",
    cell: (row) => (
      <Badge variant="outline" className="text-[10px] font-mono">
        {row.action}
      </Badge>
    ),
  },
  {
    id: "entityType",
    header: "Entity Type",
    accessorKey: "entityType",
    sortable: true,
    className: "w-[130px]",
    cell: (row) => (
      <span className="text-xs text-muted-foreground">
        {row.entityType.replace(/_/g, " ")}
      </span>
    ),
  },
  {
    id: "entityId",
    header: "Entity ID",
    accessorKey: "entityId",
    sortable: false,
    className: "w-[200px]",
    cell: (row) => (
      <span className="text-xs font-mono text-muted-foreground truncate max-w-[180px] block">
        {row.entityId}
      </span>
    ),
  },
  {
    id: "ipAddress",
    header: "IP Address",
    sortable: false,
    className: "w-[120px]",
    cell: (row) => (
      <span className="text-xs text-muted-foreground font-mono">
        {row.ipAddress ?? "—"}
      </span>
    ),
  },
];

// ─── Entity type and action options ───────────────────────

const ENTITY_TYPES = [
  "Case",
  "Task",
  "Document",
  "EvidenceItem",
  "User",
  "WorkflowInstance",
  "Notification",
  "Setting",
];

const ACTIONS = [
  "CREATE",
  "UPDATE",
  "DELETE",
  "VIEW",
  "LOGIN",
  "LOGOUT",
  "APPROVE",
  "REJECT",
  "UPLOAD",
  "DOWNLOAD",
];

// ─── Page component ───────────────────────────────────────

export default function AuditLogPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [action, setAction] = useState<string | undefined>();
  const [entityType, setEntityType] = useState<string | undefined>();
  const [sort, setSort] = useState<SortState>({
    column: "createdAt",
    direction: "desc",
  });
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    pageSize: 25,
  });
  const [debounceTimer, setDebounceTimer] = useState<ReturnType<
    typeof setTimeout
  > | null>(null);

  function handleSearchChange(value: string) {
    setSearch(value);
    if (debounceTimer) clearTimeout(debounceTimer);
    const timer = setTimeout(() => {
      setDebouncedSearch(value);
      setPagination((prev) => ({ ...prev, page: 1 }));
    }, 300);
    setDebounceTimer(timer);
  }

  const hasActiveFilters = !!action || !!entityType;

  const { data, isLoading } = useAuditLogs({
    page: pagination.page,
    pageSize: pagination.pageSize,
    ...(debouncedSearch && { search: debouncedSearch }),
    ...(action && { action }),
    ...(entityType && { entityType }),
  });

  function handleSortChange(newSort: SortState) {
    setSort(newSort);
    setPagination((prev) => ({ ...prev, page: 1 }));
  }

  function clearFilters() {
    setAction(undefined);
    setEntityType(undefined);
    setPagination((prev) => ({ ...prev, page: 1 }));
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <ScrollText className="size-5 text-muted-foreground" />
          <h1 className="text-2xl font-semibold tracking-tight">Audit Log</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          System-wide audit trail of all user actions and events
        </p>
      </div>

      {/* Search + filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search audit logs..."
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

        <Select
          value={action ?? "ALL"}
          onValueChange={(val) => {
            setAction(val === "ALL" ? undefined : val ?? undefined);
            setPagination((prev) => ({ ...prev, page: 1 }));
          }}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All actions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All actions</SelectItem>
            {ACTIONS.map((a) => (
              <SelectItem key={a} value={a}>
                {a}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={entityType ?? "ALL"}
          onValueChange={(val) => {
            setEntityType(val === "ALL" ? undefined : val ?? undefined);
            setPagination((prev) => ({ ...prev, page: 1 }));
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All entity types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All entity types</SelectItem>
            {ENTITY_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear filters
          </Button>
        )}
      </div>

      {/* Table */}
      <DataTable<AuditLogEntry>
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
        emptyMessage="No audit log entries match your filters."
        pageSizeOptions={[10, 25, 50, 100]}
      />
    </div>
  );
}
