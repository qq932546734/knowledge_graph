import { z } from "zod";

export const createQuestionSchema = z.object({
  question: z.string().trim().min(1).max(1000),
  referenceAnswerMd: z.string().trim().min(1),
});

export const updateQuestionSchema = createQuestionSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, "At least one field is required");
