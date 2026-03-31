import type { Task, User, Case } from "@/generated/prisma";
import type { PaginatedResponse, TaskFilters } from "@/types";

/** Task with assignee and case info for list views */
export type TaskWithRelations = Task & {
  assignee: Pick<User, "id" | "firstName" | "lastName" | "email"> | null;
  case: Pick<Case, "id" | "caseNumber" | "title">;
};

/** Paginated task list response */
export type TaskListResponse = PaginatedResponse<TaskWithRelations>;

/** Re-export filters for convenience */
export type { TaskFilters };
