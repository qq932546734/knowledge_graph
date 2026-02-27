import { z } from "zod";

export const createNodeSchema = z.object({
  title: z.string().trim().min(1).max(200),
  contentMd: z.string().trim().min(1),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
  difficulty: z.number().int().min(1).max(5),
  sourceUrl: z.string().url().nullable().optional(),
});

export const updateNodeSchema = createNodeSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, "At least one field is required");

export const listNodesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(20),
  keyword: z.string().trim().optional(),
  tags: z.string().optional(),
  difficulty: z.coerce.number().int().min(1).max(5).optional(),
  includeDeleted: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => value === "true"),
  sortBy: z.enum(["createdAt", "updatedAt", "nextReviewAt", "title"]).default("updatedAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});
