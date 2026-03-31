import { z } from "zod";

export const createInquirySchema = z.object({
  source: z.enum(
    ["HOTLINE", "WHISTLEBLOWER", "CARRIER", "CONGRESSIONAL", "WALK_IN", "EMAIL", "OTHER"],
    { message: "Source is required" },
  ),
  subject: z
    .string()
    .min(5, "Subject must be at least 5 characters")
    .max(300, "Subject must be under 300 characters"),
  description: z
    .string()
    .min(10, "Description must be at least 10 characters")
    .max(10000, "Description must be under 10000 characters"),
  complainantName: z.string().max(200).optional().or(z.literal("")),
  complainantEmail: z
    .string()
    .email("Invalid email address")
    .optional()
    .or(z.literal("")),
  complainantPhone: z.string().max(30).optional().or(z.literal("")),
  isAnonymous: z.boolean().optional(),
  category: z.string().max(100).optional().or(z.literal("")),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
});

export type CreateInquiryInput = z.infer<typeof createInquirySchema>;

export const updateInquirySchema = z.object({
  status: z.enum(["NEW", "UNDER_REVIEW", "CONVERTED", "CLOSED"]).optional(),
  assignedToId: z.string().optional().nullable(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  responseMessage: z.string().max(5000).optional().nullable(),
  convertedCaseId: z.string().optional().nullable(),
  category: z.string().max(100).optional().nullable(),
});

export type UpdateInquiryInput = z.infer<typeof updateInquirySchema>;

export const publicHotlineSchema = z.object({
  subject: z
    .string()
    .min(5, "Subject must be at least 5 characters")
    .max(300, "Subject must be under 300 characters"),
  description: z
    .string()
    .min(10, "Description must be at least 10 characters")
    .max(10000, "Description must be under 10000 characters"),
  complainantName: z.string().max(200).optional().or(z.literal("")),
  complainantEmail: z
    .string()
    .email("Invalid email address")
    .optional()
    .or(z.literal("")),
  complainantPhone: z.string().max(30).optional().or(z.literal("")),
  isAnonymous: z.boolean().optional(),
  category: z.string().max(100).optional().or(z.literal("")),
});

export type PublicHotlineInput = z.infer<typeof publicHotlineSchema>;
