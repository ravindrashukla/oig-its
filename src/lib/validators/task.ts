import { z } from "zod";

export const createTaskSchema = z.object({
  title: z
    .string()
    .min(3, "Title must be at least 3 characters")
    .max(200, "Title must be under 200 characters"),
  description: z
    .string()
    .max(5000, "Description must be under 5000 characters")
    .optional()
    .or(z.literal("")),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"], {
    message: "Priority is required",
  }),
  status: z
    .enum(["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED", "BLOCKED"])
    .optional(),
  assigneeId: z.string().optional().or(z.literal("")),
  dueDate: z
    .string()
    .refine((val) => !val || !isNaN(Date.parse(val)), "Invalid date")
    .optional()
    .or(z.literal("")),
});

export const updateTaskSchema = z.object({
  title: z
    .string()
    .min(3, "Title must be at least 3 characters")
    .max(200, "Title must be under 200 characters")
    .optional(),
  description: z
    .string()
    .max(5000, "Description must be under 5000 characters")
    .optional()
    .or(z.literal("")),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED", "BLOCKED"]).optional(),
  assigneeId: z.string().nullable().optional(),
  dueDate: z
    .string()
    .refine((val) => !val || !isNaN(Date.parse(val)), "Invalid date")
    .nullable()
    .optional(),
  delegateTo: z.string().optional(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
