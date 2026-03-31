"use client";

import * as React from "react";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────

export interface ColumnDef<T> {
  id: string;
  header: string;
  accessorKey?: keyof T & string;
  accessorFn?: (row: T) => unknown;
  cell?: (row: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
}

export type SortDirection = "asc" | "desc";

export interface SortState {
  column: string;
  direction: SortDirection;
}

export interface PaginationState {
  page: number;
  pageSize: number;
}

export interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  total?: number;
  /** Controlled sort state */
  sort?: SortState | null;
  onSortChange?: (sort: SortState) => void;
  /** Controlled pagination */
  pagination?: PaginationState;
  onPaginationChange?: (pagination: PaginationState) => void;
  /** Row selection */
  selectable?: boolean;
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
  getRowId: (row: T) => string;
  /** Loading state */
  loading?: boolean;
  /** Number of skeleton rows to show */
  skeletonRows?: number;
  /** Page size options */
  pageSizeOptions?: number[];
  /** Empty state message */
  emptyMessage?: string;
  /** Row click handler */
  onRowClick?: (row: T) => void;
  className?: string;
}

// ─── Component ───────────────────────────────────────────

export function DataTable<T>({
  columns,
  data,
  total,
  sort,
  onSortChange,
  pagination,
  onPaginationChange,
  selectable = false,
  selectedIds,
  onSelectionChange,
  getRowId,
  loading = false,
  skeletonRows = 10,
  pageSizeOptions = [10, 25, 50, 100],
  emptyMessage = "No results found.",
  onRowClick,
  className,
}: DataTableProps<T>) {
  const totalRows = total ?? data.length;
  const totalPages = pagination
    ? Math.max(1, Math.ceil(totalRows / pagination.pageSize))
    : 1;

  const allRowIds = React.useMemo(() => data.map(getRowId), [data, getRowId]);

  const allSelected =
    selectable && allRowIds.length > 0 && selectedIds
      ? allRowIds.every((id) => selectedIds.has(id))
      : false;

  const someSelected =
    selectable && selectedIds
      ? allRowIds.some((id) => selectedIds.has(id)) && !allSelected
      : false;

  function handleToggleAll() {
    if (!onSelectionChange || !selectedIds) return;
    if (allSelected) {
      const next = new Set(selectedIds);
      for (const id of allRowIds) next.delete(id);
      onSelectionChange(next);
    } else {
      const next = new Set(selectedIds);
      for (const id of allRowIds) next.add(id);
      onSelectionChange(next);
    }
  }

  function handleToggleRow(id: string) {
    if (!onSelectionChange || !selectedIds) return;
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    onSelectionChange(next);
  }

  function handleSort(columnId: string) {
    if (!onSortChange) return;
    if (sort?.column === columnId) {
      onSortChange({
        column: columnId,
        direction: sort.direction === "asc" ? "desc" : "asc",
      });
    } else {
      onSortChange({ column: columnId, direction: "asc" });
    }
  }

  function getCellValue(row: T, col: ColumnDef<T>): React.ReactNode {
    if (col.cell) return col.cell(row);
    if (col.accessorFn) return String(col.accessorFn(row) ?? "");
    if (col.accessorKey) return String((row as Record<string, unknown>)[col.accessorKey] ?? "");
    return null;
  }

  function renderSortIcon(col: ColumnDef<T>) {
    if (!col.sortable) return null;
    if (sort?.column === col.id) {
      return sort.direction === "asc" ? (
        <ArrowUp className="size-3.5" />
      ) : (
        <ArrowDown className="size-3.5" />
      );
    }
    return <ArrowUpDown className="size-3.5 text-muted-foreground/50" />;
  }

  // ─── Skeleton rows ──────────────────────────────────────

  if (loading) {
    return (
      <div className={cn("space-y-4", className)}>
        <Table>
          <TableHeader>
            <TableRow>
              {selectable && (
                <TableHead className="w-10">
                  <Skeleton className="h-4 w-4" />
                </TableHead>
              )}
              {columns.map((col) => (
                <TableHead key={col.id} className={col.className}>
                  <Skeleton className="h-4 w-24" />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: skeletonRows }, (_, i) => (
              <TableRow key={i}>
                {selectable && (
                  <TableCell>
                    <Skeleton className="h-4 w-4" />
                  </TableCell>
                )}
                {columns.map((col) => (
                  <TableCell key={col.id} className={col.className}>
                    <Skeleton className="h-4 w-full max-w-[200px]" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {pagination && (
          <div className="flex items-center justify-between px-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-8 w-64" />
          </div>
        )}
      </div>
    );
  }

  // ─── Render ─────────────────────────────────────────────

  return (
    <div className={cn("space-y-4", className)}>
      <Table>
        <TableHeader>
          <TableRow>
            {selectable && (
              <TableHead className="w-10">
                <Checkbox
                  checked={allSelected}
                  indeterminate={someSelected}
                  onCheckedChange={handleToggleAll}
                  aria-label="Select all rows"
                />
              </TableHead>
            )}
            {columns.map((col) => (
              <TableHead key={col.id} className={col.className}>
                {col.sortable ? (
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 hover:text-foreground transition-colors -ml-1 px-1 py-0.5 rounded"
                    onClick={() => handleSort(col.id)}
                  >
                    {col.header}
                    {renderSortIcon(col)}
                  </button>
                ) : (
                  col.header
                )}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columns.length + (selectable ? 1 : 0)}
                className="h-24 text-center text-muted-foreground"
              >
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            data.map((row) => {
              const rowId = getRowId(row);
              const isSelected = selectedIds?.has(rowId) ?? false;
              return (
                <TableRow
                  key={rowId}
                  data-state={isSelected ? "selected" : undefined}
                  className={cn(onRowClick && "cursor-pointer")}
                  onClick={() => onRowClick?.(row)}
                >
                  {selectable && (
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handleToggleRow(rowId)}
                        aria-label={`Select row ${rowId}`}
                      />
                    </TableCell>
                  )}
                  {columns.map((col) => (
                    <TableCell key={col.id} className={col.className}>
                      {getCellValue(row, col)}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>

      {/* Pagination */}
      {pagination && onPaginationChange && (
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {selectable && selectedIds && selectedIds.size > 0 && (
              <span>{selectedIds.size} selected</span>
            )}
            <span>
              {totalRows} row{totalRows !== 1 ? "s" : ""} total
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Rows per page</span>
              <Select
                value={String(pagination.pageSize)}
                onValueChange={(val) =>
                  onPaginationChange({ page: 1, pageSize: Number(val) })
                }
              >
                <SelectTrigger size="sm" className="w-16">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {pageSizeOptions.map((size) => (
                    <SelectItem key={size} value={String(size)}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <span className="text-sm text-muted-foreground">
              Page {pagination.page} of {totalPages}
            </span>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon-xs"
                onClick={() =>
                  onPaginationChange({ ...pagination, page: 1 })
                }
                disabled={pagination.page <= 1}
                aria-label="First page"
              >
                <ChevronsLeft />
              </Button>
              <Button
                variant="outline"
                size="icon-xs"
                onClick={() =>
                  onPaginationChange({
                    ...pagination,
                    page: pagination.page - 1,
                  })
                }
                disabled={pagination.page <= 1}
                aria-label="Previous page"
              >
                <ChevronLeft />
              </Button>
              <Button
                variant="outline"
                size="icon-xs"
                onClick={() =>
                  onPaginationChange({
                    ...pagination,
                    page: pagination.page + 1,
                  })
                }
                disabled={pagination.page >= totalPages}
                aria-label="Next page"
              >
                <ChevronRight />
              </Button>
              <Button
                variant="outline"
                size="icon-xs"
                onClick={() =>
                  onPaginationChange({ ...pagination, page: totalPages })
                }
                disabled={pagination.page >= totalPages}
                aria-label="Last page"
              >
                <ChevronsRight />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
