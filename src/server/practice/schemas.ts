import { PracticeMode } from "@prisma/client";
import { z } from "zod";

export const submitPracticeSchema = z
  .object({
    mode: z.nativeEnum(PracticeMode),
    nodeId: z.string().min(1),
    questionId: z.string().min(1).optional().nullable(),
    selfScore: z.number().int().min(1).max(5),
    note: z.string().max(2000).optional().nullable(),
  })
  .superRefine((value, ctx) => {
    if (value.mode === PracticeMode.QUESTION_ANSWER && !value.questionId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["questionId"],
        message: "questionId is required when mode is QUESTION_ANSWER",
      });
    }
  });
