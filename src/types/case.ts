import type {
  Case,
  CaseAssignment,
  User,
  Task,
  CaseNote,
  Document,
  EvidenceItem,
} from "@/generated/prisma";
import type { CaseFilters, PaginatedResponse } from "@/types";

/** Case with eagerly loaded relations used in list views */
export type CaseWithAssignees = Case & {
  assignments: (CaseAssignment & {
    user: Pick<User, "id" | "firstName" | "lastName" | "email" | "role">;
  })[];
  createdBy: Pick<User, "id" | "firstName" | "lastName">;
  _count: {
    tasks: number;
    documents: number;
    evidenceItems: number;
    notes: number;
  };
};

/** Case with full relations used in detail views */
export type CaseDetail = Case & {
  assignments: (CaseAssignment & {
    user: Pick<User, "id" | "firstName" | "lastName" | "email" | "role">;
  })[];
  createdBy: Pick<User, "id" | "firstName" | "lastName">;
  tasks: Task[];
  notes: CaseNote[];
  documents: Document[];
  evidenceItems: EvidenceItem[];
};

/** Paginated case list response */
export type CaseListResponse = PaginatedResponse<CaseWithAssignees>;

/** Dashboard metrics summary */
export interface DashboardMetrics {
  totalCases: number;
  activeCases: number;
  closedCases: number;
  criticalCases: number;
  overdueTasks: number;
  upcomingDeadlines: number;
  unreadNotifications: number;
  casesByStatus: Record<string, number>;
  casesByType: Record<string, number>;
}

/** Upcoming deadline item for dashboard */
export interface DeadlineItem {
  id: string;
  title: string;
  caseNumber: string;
  caseId: string;
  dueDate: string;
  type: "case" | "task";
  priority: string;
}

/** Re-export filters for convenience */
export type { CaseFilters };
