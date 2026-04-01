"use client";

import { useState, useEffect } from "react";
import { Search, X, Users } from "lucide-react";
import { format } from "date-fns";

import { useUsers, type UserEntry } from "@/hooks/useUsers";
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
import { Card, CardContent } from "@/components/ui/card";

// ─── Column definitions ───────────────────────────────────

const columns: ColumnDef<UserEntry>[] = [
  {
    id: "name",
    header: "Name",
    sortable: true,
    accessorKey: "lastName",
    cell: (row) => (
      <span className="font-medium">
        {row.firstName} {row.lastName}
      </span>
    ),
  },
  {
    id: "email",
    header: "Email",
    accessorKey: "email",
    sortable: true,
    cell: (row) => (
      <span className="text-xs text-muted-foreground">{row.email}</span>
    ),
  },
  {
    id: "role",
    header: "Role",
    accessorKey: "role",
    sortable: true,
    className: "w-[140px]",
    cell: (row) => (
      <Badge variant="outline" className="text-[10px]">
        {row.role.replace(/_/g, " ")}
      </Badge>
    ),
  },
  {
    id: "organization",
    header: "Division",
    sortable: false,
    className: "w-[180px]",
    cell: (row) => (
      <span className="text-xs text-muted-foreground">
        {row.organization?.name ?? "—"}
      </span>
    ),
  },
  {
    id: "status",
    header: "Status",
    sortable: false,
    className: "w-[100px]",
    cell: (row) => (
      <Badge variant={row.isActive ? "default" : "secondary"} className="text-[10px]">
        {row.isActive ? "Active" : "Inactive"}
      </Badge>
    ),
  },
  {
    id: "lastLogin",
    header: "Last Login",
    sortable: false,
    className: "w-[120px]",
    cell: (row) => (
      <span className="text-xs text-muted-foreground">
        {row.lastLoginAt
          ? format(new Date(row.lastLoginAt), "MMM d, yyyy")
          : "Never"}
      </span>
    ),
  },
];

// ─── Roles ────────────────────────────────────────────────

const ROLES = [
  "ADMIN",
  "INVESTIGATOR",
  "SUPERVISOR",
  "ANALYST",
  "AUDITOR",
  "VIEWER",
];

function enumLabel(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Page component ───────────────────────────────────────

export default function UsersPage() {
  useEffect(() => { document.title = "Users | OIG-ITS"; }, []);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [role, setRole] = useState<string | undefined>();
  const [sort, setSort] = useState<SortState>({
    column: "lastName",
    direction: "asc",
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

  const { data, isLoading } = useUsers({
    page: pagination.page,
    pageSize: pagination.pageSize,
    ...(debouncedSearch && { search: debouncedSearch }),
    ...(role && { role }),
  });

  function handleSortChange(newSort: SortState) {
    setSort(newSort);
    setPagination((prev) => ({ ...prev, page: 1 }));
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Users className="size-5 text-muted-foreground" />
          <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Manage user accounts and roles
        </p>
      </div>

      {/* Search + filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search users..."
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
          value={role ?? "ALL"}
          onValueChange={(val) => {
            setRole(val === "ALL" ? undefined : val ?? undefined);
            setPagination((prev) => ({ ...prev, page: 1 }));
          }}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All roles</SelectItem>
            {ROLES.map((r) => (
              <SelectItem key={r} value={r}>
                {enumLabel(r)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {role && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setRole(undefined);
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
          >
            Clear filter
          </Button>
        )}
      </div>

      {/* Table */}
      <DataTable<UserEntry>
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
        emptyMessage="No users match your filters."
        pageSizeOptions={[10, 25, 50]}
      />
    </div>
  );
}
