import { z } from "zod";

export const createCaseSchema = z.object({
  title: z
    .string()
    .min(5, "Title must be at least 5 characters")
    .max(200, "Title must be under 200 characters"),
  description: z
    .string()
    .max(5000, "Description must be under 5000 characters")
    .optional()
    .or(z.literal("")),
  caseType: z.enum(
    ["FRAUD", "WASTE", "ABUSE", "MISCONDUCT", "WHISTLEBLOWER", "COMPLIANCE", "OTHER"],
    { message: "Case type is required" },
  ),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"], {
    message: "Priority is required",
  }),
  dueDate: z
    .string()
    .refine((val) => !val || !isNaN(Date.parse(val)), "Invalid date")
    .optional()
    .or(z.literal("")),
  organizationId: z.string().optional().or(z.literal("")),
  isDraft: z.boolean().optional(),
});

export type CreateCaseInput = z.infer<typeof createCaseSchema>;

export const createDraftCaseSchema = z.object({
  title: z
    .string()
    .max(200, "Title must be under 200 characters")
    .optional()
    .or(z.literal("")),
  description: z
    .string()
    .max(5000, "Description must be under 5000 characters")
    .optional()
    .or(z.literal("")),
  caseType: z.enum(
    ["FRAUD", "WASTE", "ABUSE", "MISCONDUCT", "WHISTLEBLOWER", "COMPLIANCE", "OTHER"],
  ).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  dueDate: z
    .string()
    .refine((val) => !val || !isNaN(Date.parse(val)), "Invalid date")
    .optional()
    .or(z.literal("")),
  organizationId: z.string().optional().or(z.literal("")),
  isDraft: z.literal(true),
});

export type CreateDraftCaseInput = z.infer<typeof createDraftCaseSchema>;

export const updateCaseSchema = z.object({
  title: z
    .string()
    .min(5, "Title must be at least 5 characters")
    .max(200, "Title must be under 200 characters")
    .optional(),
  description: z
    .string()
    .max(5000, "Description must be under 5000 characters")
    .optional()
    .nullable(),
  status: z
    .enum([
      "INTAKE",
      "OPEN",
      "ACTIVE",
      "UNDER_REVIEW",
      "PENDING_ACTION",
      "CLOSED",
      "ARCHIVED",
    ])
    .optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  caseType: z
    .enum([
      "FRAUD",
      "WASTE",
      "ABUSE",
      "MISCONDUCT",
      "WHISTLEBLOWER",
      "COMPLIANCE",
      "OTHER",
    ])
    .optional(),
  dueDate: z
    .string()
    .refine((val) => !val || !isNaN(Date.parse(val)), "Invalid date")
    .optional()
    .nullable(),
  closedAt: z
    .string()
    .refine((val) => !val || !isNaN(Date.parse(val)), "Invalid date")
    .optional()
    .nullable(),
  isLocked: z.boolean().optional(),
  reason: z.string().max(2000).optional(),
  complaintSource: z.string().max(100).optional().nullable(),
  crimeType: z.string().max(200).optional().nullable(),
  investigationApproach: z.string().max(100).optional().nullable(),
  affectedProgram: z.string().max(200).optional().nullable(),
  suspectType: z.string().max(100).optional().nullable(),
  // CM39: follow-up fields for closed cases
  hasPendingFollowUp: z.boolean().optional(),
  followUpDate: z
    .string()
    .refine((val) => !val || !isNaN(Date.parse(val)), "Invalid date")
    .optional()
    .nullable(),
  followUpNotes: z.string().max(5000).optional().nullable(),
  followUpStatus: z.string().max(100).optional().nullable(),
  // CM35: optional reassignment on status change
  routeTo: z.string().optional(),
});

export type UpdateCaseInput = z.infer<typeof updateCaseSchema>;
