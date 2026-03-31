// Browser-safe enum re-exports for "use client" components.
// This file avoids importing from the Prisma runtime (which requires node:fs).
// Values are duplicated from the Prisma schema to stay client-safe.

export const UserRole = {
  ADMIN: "ADMIN",
  INVESTIGATOR: "INVESTIGATOR",
  SUPERVISOR: "SUPERVISOR",
  ANALYST: "ANALYST",
  AUDITOR: "AUDITOR",
  READONLY: "READONLY",
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const CaseStatus = {
  INTAKE: "INTAKE",
  OPEN: "OPEN",
  ACTIVE: "ACTIVE",
  UNDER_REVIEW: "UNDER_REVIEW",
  PENDING_ACTION: "PENDING_ACTION",
  CLOSED: "CLOSED",
  ARCHIVED: "ARCHIVED",
} as const;
export type CaseStatus = (typeof CaseStatus)[keyof typeof CaseStatus];

export const CaseType = {
  FRAUD: "FRAUD",
  WASTE: "WASTE",
  ABUSE: "ABUSE",
  MISCONDUCT: "MISCONDUCT",
  WHISTLEBLOWER: "WHISTLEBLOWER",
  COMPLIANCE: "COMPLIANCE",
  OUTREACH: "OUTREACH",
  BRIEFING: "BRIEFING",
  OTHER: "OTHER",
} as const;
export type CaseType = (typeof CaseType)[keyof typeof CaseType];

export const Priority = {
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
  CRITICAL: "CRITICAL",
} as const;
export type Priority = (typeof Priority)[keyof typeof Priority];

export const TaskStatus = {
  PENDING: "PENDING",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
  BLOCKED: "BLOCKED",
} as const;
export type TaskStatus = (typeof TaskStatus)[keyof typeof TaskStatus];

export const DocumentStatus = {
  DRAFT: "DRAFT",
  UPLOADED: "UPLOADED",
  REVIEWED: "REVIEWED",
  APPROVED: "APPROVED",
  REDACTED: "REDACTED",
  ARCHIVED: "ARCHIVED",
} as const;
export type DocumentStatus = (typeof DocumentStatus)[keyof typeof DocumentStatus];

export const EvidenceStatus = {
  COLLECTED: "COLLECTED",
  IN_REVIEW: "IN_REVIEW",
  VERIFIED: "VERIFIED",
  DISPUTED: "DISPUTED",
  ARCHIVED: "ARCHIVED",
} as const;
export type EvidenceStatus = (typeof EvidenceStatus)[keyof typeof EvidenceStatus];

export const EvidenceType = {
  DOCUMENT: "DOCUMENT",
  PHOTO: "PHOTO",
  VIDEO: "VIDEO",
  AUDIO: "AUDIO",
  DIGITAL: "DIGITAL",
  PHYSICAL: "PHYSICAL",
  TESTIMONY: "TESTIMONY",
  OTHER: "OTHER",
} as const;
export type EvidenceType = (typeof EvidenceType)[keyof typeof EvidenceType];

export const WorkflowType = {
  CASE_INTAKE: "CASE_INTAKE",
  INVESTIGATION: "INVESTIGATION",
  REVIEW: "REVIEW",
  CLOSURE: "CLOSURE",
  CUSTOM: "CUSTOM",
} as const;
export type WorkflowType = (typeof WorkflowType)[keyof typeof WorkflowType];

export const WorkflowStatus = {
  DRAFT: "DRAFT",
  ACTIVE: "ACTIVE",
  PAUSED: "PAUSED",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
} as const;
export type WorkflowStatus = (typeof WorkflowStatus)[keyof typeof WorkflowStatus];

export const SubjectType = {
  INDIVIDUAL: "INDIVIDUAL",
  ORGANIZATION: "ORGANIZATION",
  DEPARTMENT: "DEPARTMENT",
  VENDOR: "VENDOR",
  OTHER: "OTHER",
} as const;
export type SubjectType = (typeof SubjectType)[keyof typeof SubjectType];

export const SubjectRole = {
  COMPLAINANT: "COMPLAINANT",
  RESPONDENT: "RESPONDENT",
  WITNESS: "WITNESS",
  SUBJECT_OF_INTEREST: "SUBJECT_OF_INTEREST",
  INFORMANT: "INFORMANT",
  OTHER: "OTHER",
} as const;
export type SubjectRole = (typeof SubjectRole)[keyof typeof SubjectRole];

export const NotificationType = {
  CASE_ASSIGNED: "CASE_ASSIGNED",
  CASE_UPDATED: "CASE_UPDATED",
  TASK_ASSIGNED: "TASK_ASSIGNED",
  TASK_DUE: "TASK_DUE",
  DOCUMENT_UPLOADED: "DOCUMENT_UPLOADED",
  EVIDENCE_ADDED: "EVIDENCE_ADDED",
  WORKFLOW_ACTION: "WORKFLOW_ACTION",
  SYSTEM_ALERT: "SYSTEM_ALERT",
  ANNOUNCEMENT: "ANNOUNCEMENT",
} as const;
export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];

export const AuditAction = {
  CREATE: "CREATE",
  READ: "READ",
  UPDATE: "UPDATE",
  DELETE: "DELETE",
  LOGIN: "LOGIN",
  LOGOUT: "LOGOUT",
  EXPORT: "EXPORT",
  ASSIGN: "ASSIGN",
  STATUS_CHANGE: "STATUS_CHANGE",
  ACCESS_DENIED: "ACCESS_DENIED",
} as const;
export type AuditAction = (typeof AuditAction)[keyof typeof AuditAction];
