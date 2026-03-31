export type {
  User,
  Session,
  Case,
  CaseSubject,
  Subject,
  CaseRelationship,
  CaseAssignment,
  CaseStatusHistory,
  CaseNote,
  Document,
  DocumentAccessLog,
  DocumentComment,
  EvidenceItem,
  ChainOfCustody,
  EvidenceFile,
  Task,
  WorkflowDefinition,
  WorkflowInstance,
  WorkflowStepAction,
  Notification,
  NotificationPreference,
  AuditLog,
  ReportDefinition,
  ReportRun,
  ReportSchedule,
  SavedSearch,
  SystemSetting,
  ReferenceData,
  Organization,
  Announcement,
  FeatureFlag,
  TrainingCourse,
  TrainingRecord,
  TrainingAssignment,
} from "@/generated/prisma";

export {
  UserRole,
  CaseStatus,
  CaseType,
  Priority,
  TaskStatus,
  DocumentStatus,
  EvidenceStatus,
  EvidenceType,
  WorkflowType,
  WorkflowStatus,
  SubjectType,
  SubjectRole,
  NotificationType,
  AuditAction,
} from "@/generated/prisma";

// ─── Utility types ───────────────────────────────────────

/** Entity with an id field */
export type WithId = { id: string };

/** Strip Prisma date fields for create payloads */
export type CreateInput<T> = Omit<T, "id" | "createdAt" | "updatedAt">;

/** Make all fields optional except id for update payloads */
export type UpdateInput<T extends WithId> = Partial<Omit<T, "id">> & Pick<T, "id">;

/** Paginated response wrapper */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** Common query filter params */
export interface QueryFilters {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  search?: string;
}

/** Case list filters */
export interface CaseFilters extends QueryFilters {
  status?: import("@/generated/prisma").CaseStatus;
  caseType?: import("@/generated/prisma").CaseType;
  priority?: import("@/generated/prisma").Priority;
  assigneeId?: string;
  organizationId?: string;
  dateFrom?: string;
  dateTo?: string;
}

/** Task list filters */
export interface TaskFilters extends QueryFilters {
  status?: import("@/generated/prisma").TaskStatus;
  priority?: import("@/generated/prisma").Priority;
  assigneeId?: string;
  caseId?: string;
}

/** Audit log filters */
export interface AuditLogFilters extends QueryFilters {
  action?: import("@/generated/prisma").AuditAction;
  entityType?: string;
  entityId?: string;
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
}

/** Session user (safe subset without passwordHash) */
export type SessionUser = Omit<
  import("@/generated/prisma").User,
  "passwordHash"
>;
