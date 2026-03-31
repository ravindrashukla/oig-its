"use client";

import { format } from "date-fns";
import { TaskStatusBadge } from "./TaskStatusBadge";
import { PriorityBadge } from "@/components/cases/PriorityBadge";
import { Skeleton } from "@/components/ui/skeleton";
import type { TaskWithRelations } from "@/types/task";
import type { TaskStatus } from "@/generated/prisma";

interface TaskListProps {
  tasks: TaskWithRelations[];
  loading?: boolean;
  showCase?: boolean;
  onStatusChange?: (taskId: string, status: TaskStatus) => void;
}

export function TaskList({ tasks, loading, showCase, onStatusChange }: TaskListProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-lg" />
        ))}
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
        <p className="text-sm font-medium text-muted-foreground">
          No tasks found
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Create a task to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {tasks.map((task) => (
        <div
          key={task.id}
          className="flex items-center gap-3 rounded-lg border bg-card p-3 transition-colors hover:bg-muted/50"
        >
          {onStatusChange && (
            <button
              type="button"
              onClick={() => {
                const next =
                  task.status === "COMPLETED"
                    ? "PENDING"
                    : task.status === "PENDING"
                      ? "IN_PROGRESS"
                      : "COMPLETED";
                onStatusChange(task.id, next as TaskStatus);
              }}
              className="flex size-5 shrink-0 items-center justify-center rounded-full border-2 border-muted-foreground/30 transition-colors hover:border-primary"
              title="Cycle status"
            >
              {task.status === "COMPLETED" && (
                <div className="size-3 rounded-full bg-emerald-500" />
              )}
              {task.status === "IN_PROGRESS" && (
                <div className="size-3 rounded-full bg-blue-500" />
              )}
            </button>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span
                className={`text-sm font-medium ${task.status === "COMPLETED" ? "line-through text-muted-foreground" : ""}`}
              >
                {task.title}
              </span>
              <TaskStatusBadge status={task.status} className="text-[10px]" />
              <PriorityBadge priority={task.priority} className="text-[10px]" />
            </div>
            <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
              {showCase && (
                <span className="font-mono">{task.case.caseNumber}</span>
              )}
              {task.assignee && (
                <span>
                  {task.assignee.firstName} {task.assignee.lastName}
                </span>
              )}
              {task.dueDate && (
                <span>Due {format(new Date(task.dueDate), "MMM d, yyyy")}</span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
