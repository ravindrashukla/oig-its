"use client";

import { useState } from "react";
import Link from "next/link";
import { GitBranch, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import {
  useWorkflows,
  type WorkflowInstanceWithRelations,
} from "@/hooks/useWorkflows";
import {
  DataTable,
  type ColumnDef,
  type SortState,
  type PaginationState,
} from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

// ─── Status badge helper ──────────────────────────────────

const statusVariant: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  IN_PROGRESS: "default",
  COMPLETED: "secondary",
  CANCELLED: "destructive",
  PENDING: "outline",
};

// ─── Column definitions ───────────────────────────────────

const columns: ColumnDef<WorkflowInstanceWithRelations>[] = [
  {
    id: "workflow",
    header: "Workflow",
    sortable: false,
    cell: (row) => (
      <span className="font-medium truncate max-w-[220px] block">
        {row.definition.name}
      </span>
    ),
  },
  {
    id: "case",
    header: "Case",
    sortable: false,
    className: "w-[140px]",
    cell: (row) => (
      <Link
        href={`/dashboard/cases/${row.case.id}`}
        className="text-xs font-mono text-muted-foreground hover:text-foreground"
        onClick={(e) => e.stopPropagation()}
      >
        {row.case.caseNumber}
      </Link>
    ),
  },
  {
    id: "status",
    header: "Status",
    sortable: false,
    className: "w-[130px]",
    cell: (row) => (
      <Badge
        variant={statusVariant[row.status] ?? "outline"}
        className="text-[10px]"
      >
        {row.status.replace(/_/g, " ")}
      </Badge>
    ),
  },
  {
    id: "step",
    header: "Current Step",
    sortable: false,
    className: "w-[100px]",
    cell: (row) => {
      const steps = (row as any).definition?.steps;
      const total =
        Array.isArray(steps) ? steps.length : "?";
      return (
        <span className="text-xs text-muted-foreground">
          {row.currentStep + 1} / {total}
        </span>
      );
    },
  },
  {
    id: "started",
    header: "Started",
    sortable: false,
    className: "w-[140px]",
    cell: (row) => (
      <span className="text-xs text-muted-foreground">
        {formatDistanceToNow(new Date(row.startedAt), { addSuffix: true })}
      </span>
    ),
  },
  {
    id: "actions",
    header: "Actions",
    sortable: false,
    className: "w-[80px]",
    cell: (row) => (
      <span className="text-xs text-muted-foreground">
        {row.actions.length}
      </span>
    ),
  },
];

// ─── Workflow status options ──────────────────────────────

const STATUSES = ["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"];

// ─── Page component ───────────────────────────────────────

export default function WorkflowsPage() {
  const [status, setStatus] = useState<string | undefined>();
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    pageSize: 25,
  });

  const { data, isLoading } = useWorkflows({
    page: pagination.page,
    pageSize: pagination.pageSize,
    ...(status && { status }),
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <GitBranch className="size-5 text-muted-foreground" />
          <h1 className="text-2xl font-semibold tracking-tight">Workflows</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Track workflow instances and approval processes
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Select
          value={status ?? "ALL"}
          onValueChange={(val) => {
            setStatus(val === "ALL" ? undefined : val ?? undefined);
            setPagination((prev) => ({ ...prev, page: 1 }));
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s.replace(/_/g, " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {status && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setStatus(undefined);
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
          >
            Clear filter
          </Button>
        )}
      </div>

      {/* Table */}
      <DataTable<WorkflowInstanceWithRelations>
        columns={columns}
        data={data?.data ?? []}
        total={data?.total}
        pagination={pagination}
        onPaginationChange={setPagination}
        getRowId={(row) => row.id}
        loading={isLoading}
        skeletonRows={pagination.pageSize > 25 ? 25 : pagination.pageSize}
        emptyMessage="No workflow instances found."
        pageSizeOptions={[10, 25, 50]}
      />
    </div>
  );
}
