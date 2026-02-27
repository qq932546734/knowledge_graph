import { z } from "zod";

export const submitReviewSchema = z.object({
  nodeId: z.string().min(1),
  quality: z.number().int().min(0).max(5),
});
