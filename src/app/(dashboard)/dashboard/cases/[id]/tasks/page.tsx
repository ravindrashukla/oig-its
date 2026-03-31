"use client";

import { use, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ClipboardList, Plus, LayoutGrid, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useCaseTasks, useCreateTask, useUpdateTask } from "@/hooks/useTasks";
import { TaskBoard } from "@/components/tasks/TaskBoard";
import { TaskList } from "@/components/tasks/TaskList";
import { TaskForm } from "@/components/tasks/TaskForm";
import type { TaskStatus } from "@/generated/prisma";

export default function CaseTasksPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: caseId } = use(params);
  const [viewMode, setViewMode] = useState<"board" | "list">("board");
  const [formOpen, setFormOpen] = useState(false);

  const { data, isLoading } = useCaseTasks(caseId);
  const createTask = useCreateTask(caseId);
  const updateTask = useUpdateTask();

  const tasks = data?.data ?? [];

  function handleStatusChange(taskId: string, status: TaskStatus) {
    updateTask.mutate({ taskId, status });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/dashboard/cases/${caseId}`}>
            <Button variant="ghost" size="icon-sm">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <ClipboardList className="size-5 text-muted-foreground" />
            <h1 className="text-xl font-semibold tracking-tight">
              Case Tasks
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-md border">
            <Button
              variant={viewMode === "board" ? "secondary" : "ghost"}
              size="icon-xs"
              onClick={() => setViewMode("board")}
              className="rounded-r-none"
              title="Kanban board"
            >
              <LayoutGrid className="size-3.5" />
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="icon-xs"
              onClick={() => setViewMode("list")}
              className="rounded-l-none"
              title="List view"
            >
              <List className="size-3.5" />
            </Button>
          </div>

          <Button size="sm" className="gap-1.5" onClick={() => setFormOpen(true)}>
            <Plus className="size-3.5" />
            New Task
          </Button>
        </div>
      </div>

      <Separator />

      {/* Content */}
      {viewMode === "board" ? (
        <TaskBoard
          tasks={tasks}
          loading={isLoading}
          onStatusChange={handleStatusChange}
        />
      ) : (
        <TaskList
          tasks={tasks}
          loading={isLoading}
          onStatusChange={handleStatusChange}
        />
      )}

      {/* Create task dialog */}
      <TaskForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={(input) => {
          createTask.mutate(input, {
            onSuccess: () => setFormOpen(false),
          });
        }}
        loading={createTask.isPending}
      />
    </div>
  );
}
