import { RelationType } from "@prisma/client";
import { z } from "zod";

export const createRelationSchema = z
  .object({
    relationType: z.nativeEnum(RelationType),
    targetNodeId: z.string().min(1),
    currentNodeRole: z.enum(["PARENT", "CHILD"]).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.relationType === RelationType.PARENT_CHILD && !value.currentNodeRole) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "currentNodeRole is required for PARENT_CHILD relation",
        path: ["currentNodeRole"],
      });
    }
  });
