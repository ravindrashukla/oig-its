import { z } from "zod";

export const createEvidenceSchema = z.object({
  title: z
    .string()
    .min(3, "Title must be at least 3 characters")
    .max(200, "Title must be under 200 characters"),
  description: z
    .string()
    .max(5000, "Description must be under 5000 characters")
    .optional()
    .or(z.literal("")),
  type: z.enum(
    ["DOCUMENT", "PHOTO", "VIDEO", "AUDIO", "DIGITAL", "PHYSICAL", "TESTIMONY", "OTHER"],
    { message: "Evidence type is required" },
  ),
  source: z
    .string()
    .max(500, "Source must be under 500 characters")
    .optional()
    .or(z.literal("")),
  collectedAt: z
    .string()
    .refine((val) => !val || !isNaN(Date.parse(val)), "Invalid date")
    .optional()
    .or(z.literal("")),
});

export type CreateEvidenceInput = z.infer<typeof createEvidenceSchema>;
