"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, X, SlidersHorizontal, LayoutGrid, List, ClipboardList, UserPlus } from "lucide-react";
import { format, differenceInDays, isPast } from "date-fns";

import { useTasks, useUpdateTask } from "@/hooks/useTasks";
import { TaskStatus, Priority } from "@/lib/enums";
import type { TaskFilters } from "@/types";
import type { TaskWithRelations } from "@/types/task";
import { DataTable, type ColumnDef, type SortState, type PaginationState } from "@/components/ui/DataTable";
import { TaskStatusBadge } from "@/components/tasks/TaskStatusBadge";
import { PriorityBadge } from "@/components/cases/PriorityBadge";
import { TaskBoard } from "@/components/tasks/TaskBoard";
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
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useUsers } from "@/hooks/useUsers";

// ─── Column definitions ───────────────────────────────────

const baseColumns: ColumnDef<TaskWithRelations>[] = [
  {
    id: "title",
    header: "Title",
    accessorKey: "title",
    sortable: true,
    cell: (row) => (
      <span className="font-medium truncate max-w-[280px] block">
        {row.title}
      </span>
    ),
  },
  {
    id: "case",
    header: "Case",
    sortable: false,
    className: "w-[140px]",
    cell: (row) => (
      <span className="text-xs font-mono text-muted-foreground">
        {row.case.caseNumber}
      </span>
    ),
  },
  {
    id: "status",
    header: "Status",
    accessorKey: "status",
    sortable: true,
    className: "w-[130px]",
    cell: (row) => <TaskStatusBadge status={row.status} />,
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
    id: "assignee",
    header: "Assignee",
    sortable: false,
    className: "w-[150px]",
    cell: (row) =>
      row.assignee ? (
        <span className="text-xs">
          {row.assignee.firstName} {row.assignee.lastName}
        </span>
      ) : (
        <span className="text-xs text-muted-foreground">Unassigned</span>
      ),
  },
  {
    id: "dueDate",
    header: "Due Date",
    accessorKey: "dueDate",
    sortable: true,
    className: "w-[110px]",
    cell: (row) => {
      if (!row.dueDate) {
        return <span className="text-xs text-muted-foreground">—</span>;
      }
      const due = new Date(row.dueDate);
      const isOverdue =
        isPast(due) &&
        row.status !== "COMPLETED" &&
        row.status !== "CANCELLED";
      const daysOverdue = isOverdue ? differenceInDays(new Date(), due) : 0;
      return (
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-muted-foreground">
            {format(due, "MMM d, yyyy")}
          </span>
          {isOverdue && (
            <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
              Overdue {daysOverdue}d
            </Badge>
          )}
        </div>
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
];

// ─── Filter label helpers ──────────────────────────────────

const statusOptions = Object.values(TaskStatus) as TaskStatus[];
const priorityOptions = Object.values(Priority) as Priority[];

function enumLabel(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Page component ────────────────────────────────────────

export default function TasksPage() {
  const router = useRouter();

  const [viewMode, setViewMode] = useState<"table" | "board">("table");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState<TaskStatus | undefined>();
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
  const [reassignTask, setReassignTask] = useState<TaskWithRelations | null>(null);
  const [reassignUserId, setReassignUserId] = useState<string>("");

  const [debounceTimer, setDebounceTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const updateTask = useUpdateTask();
  const { data: usersData } = useUsers({ pageSize: 100, isActive: "true" });

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

  const filters: TaskFilters = {
    page: viewMode === "board" ? 1 : pagination.page,
    pageSize: viewMode === "board" ? 100 : pagination.pageSize,
    sortBy: sort.column,
    sortOrder: sort.direction,
    ...(debouncedSearch && { search: debouncedSearch }),
    ...(status && { status }),
    ...(priority && { priority }),
  };

  const { data, isLoading } = useTasks(filters);

  const columns: ColumnDef<TaskWithRelations>[] = [
    ...baseColumns,
    {
      id: "actions",
      header: "",
      sortable: false,
      className: "w-[90px]",
      cell: (row) => (
        <Button
          variant="ghost"
          size="sm"
          className="gap-1 text-xs"
          title="Reassign"
          onClick={(e) => {
            e.stopPropagation();
            setReassignTask(row);
            setReassignUserId(row.assignee?.id ?? "");
          }}
        >
          <UserPlus className="size-3.5" />
          Reassign
        </Button>
      ),
    },
  ];

  const hasActiveFilters = !!status || !!priority;

  function clearFilters() {
    setStatus(undefined);
    setPriority(undefined);
    setPagination((prev) => ({ ...prev, page: 1 }));
  }

  function handleSortChange(newSort: SortState) {
    setSort(newSort);
    setPagination((prev) => ({ ...prev, page: 1 }));
  }

  function handleStatusChange(taskId: string, newStatus: TaskStatus) {
    updateTask.mutate({ taskId, status: newStatus });
  }

  function handleReassign() {
    if (!reassignTask || !reassignUserId) return;
    updateTask.mutate(
      { taskId: reassignTask.id, delegateTo: reassignUserId },
      {
        onSuccess: () => {
          setReassignTask(null);
          setReassignUserId("");
        },
      },
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ClipboardList className="size-5 text-muted-foreground" />
            <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            All tasks across investigation cases
          </p>
        </div>
      </div>

      {/* Search + filter toggle + view mode */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
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
              {[status, priority].filter(Boolean).length}
            </span>
          )}
        </Button>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear filters
          </Button>
        )}

        <div className="ml-auto flex rounded-md border">
          <Button
            variant={viewMode === "table" ? "secondary" : "ghost"}
            size="icon-xs"
            onClick={() => setViewMode("table")}
            className="rounded-r-none"
            title="Table view"
          >
            <List className="size-3.5" />
          </Button>
          <Button
            variant={viewMode === "board" ? "secondary" : "ghost"}
            size="icon-xs"
            onClick={() => setViewMode("board")}
            className="rounded-l-none"
            title="Kanban board"
          >
            <LayoutGrid className="size-3.5" />
          </Button>
        </div>
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
                  setStatus(val === "ALL" ? undefined : (val as TaskStatus));
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

      {/* Content */}
      {viewMode === "board" ? (
        <TaskBoard
          tasks={data?.data ?? []}
          loading={isLoading}
          showCase
          onStatusChange={handleStatusChange}
        />
      ) : (
        <DataTable<TaskWithRelations>
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
          onRowClick={(row) =>
            router.push(`/dashboard/cases/${row.case.id}/tasks`)
          }
          emptyMessage="No tasks match your filters."
          pageSizeOptions={[10, 25, 50, 100]}
        />
      )}

      {/* Reassign dialog */}
      <Dialog
        open={!!reassignTask}
        onOpenChange={(open) => {
          if (!open) {
            setReassignTask(null);
            setReassignUserId("");
          }
        }}
      >
        {reassignTask && (
          <DialogContent className="sm:max-w-[420px]">
            <DialogHeader>
              <DialogTitle>Reassign Task</DialogTitle>
              <DialogDescription>
                Reassign &ldquo;{reassignTask.title}&rdquo; to a different user.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="reassign-user">Assign To</Label>
                <Select
                  value={reassignUserId || "NONE"}
                  onValueChange={(val) =>
                    setReassignUserId(val === "NONE" ? "" : val ?? "")
                  }
                >
                  <SelectTrigger id="reassign-user">
                    <SelectValue placeholder="Select user" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">Select a user...</SelectItem>
                    {(usersData?.data ?? []).map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.firstName} {u.lastName} ({u.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setReassignTask(null);
                  setReassignUserId("");
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleReassign}
                disabled={!reassignUserId || updateTask.isPending}
              >
                {updateTask.isPending ? "Reassigning..." : "Reassign"}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
