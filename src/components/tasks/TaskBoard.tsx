"use client";

import { useMemo } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PriorityBadge } from "@/components/cases/PriorityBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { TaskWithRelations } from "@/types/task";
import { TaskStatus } from "@/types";

interface TaskBoardProps {
  tasks: TaskWithRelations[];
  loading?: boolean;
  showCase?: boolean;
  onStatusChange?: (taskId: string, status: TaskStatus) => void;
}

const COLUMNS: { status: TaskStatus; label: string; color: string }[] = [
  { status: TaskStatus.PENDING, label: "Pending", color: "bg-slate-500" },
  { status: TaskStatus.IN_PROGRESS, label: "In Progress", color: "bg-blue-500" },
  { status: TaskStatus.BLOCKED, label: "Blocked", color: "bg-red-500" },
  { status: TaskStatus.COMPLETED, label: "Completed", color: "bg-emerald-500" },
];

export function TaskBoard({ tasks, loading, showCase, onStatusChange }: TaskBoardProps) {
  const grouped = useMemo(() => {
    const map = new Map<TaskStatus, TaskWithRelations[]>();
    for (const col of COLUMNS) {
      map.set(col.status, []);
    }
    for (const task of tasks) {
      const bucket = map.get(task.status);
      if (bucket) {
        bucket.push(task);
      } else {
        // CANCELLED tasks fall off the board
      }
    }
    return map;
  }, [tasks]);

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-4">
        {COLUMNS.map((col) => (
          <div key={col.status} className="space-y-3">
            <Skeleton className="h-6 w-24" />
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-lg" />
            ))}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-4">
      {COLUMNS.map((col) => {
        const items = grouped.get(col.status) ?? [];
        return (
          <div key={col.status} className="flex flex-col">
            <div className="mb-3 flex items-center gap-2">
              <div className={cn("size-2.5 rounded-full", col.color)} />
              <h3 className="text-sm font-semibold">{col.label}</h3>
              <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {items.length}
              </span>
            </div>

            <div className="flex-1 space-y-2 rounded-lg bg-muted/30 p-2 min-h-[200px]">
              {items.length === 0 ? (
                <p className="py-8 text-center text-xs text-muted-foreground">
                  No tasks
                </p>
              ) : (
                items.map((task) => (
                  <KanbanCard
                    key={task.id}
                    task={task}
                    showCase={showCase}
                    onStatusChange={onStatusChange}
                    columns={COLUMNS}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function KanbanCard({
  task,
  showCase,
  onStatusChange,
  columns,
}: {
  task: TaskWithRelations;
  showCase?: boolean;
  onStatusChange?: (taskId: string, status: TaskStatus) => void;
  columns: typeof COLUMNS;
}) {
  return (
    <Card className="shadow-sm">
      <CardContent className="p-3">
        <p className="text-sm font-medium leading-tight">{task.title}</p>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <PriorityBadge priority={task.priority} className="text-[10px]" />
          {showCase && (
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
              {task.case.caseNumber}
            </span>
          )}
        </div>
        <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
          {task.assignee && (
            <span>
              {task.assignee.firstName} {task.assignee.lastName}
            </span>
          )}
          {task.dueDate && (
            <span className="ml-auto">
              {format(new Date(task.dueDate), "MMM d")}
            </span>
          )}
        </div>

        {onStatusChange && (
          <div className="mt-2 flex gap-1">
            {columns
              .filter((c) => c.status !== task.status)
              .map((c) => (
                <button
                  key={c.status}
                  type="button"
                  onClick={() => onStatusChange(task.id, c.status)}
                  className="rounded px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  title={`Move to ${c.label}`}
                >
                  {c.label}
                </button>
              ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
