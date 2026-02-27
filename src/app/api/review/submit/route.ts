import { localDayRange } from "@/lib/day";
import { ApiError, ERROR_CODES } from "@/lib/errors";
import { ok, withApiHandler } from "@/server/api/route-handler";
import { prisma } from "@/server/db";
import { submitReviewSchema } from "@/server/review/schemas";
import { calculateSm2 } from "@/server/review/sm2";

export const POST = withApiHandler(
  async ({ request, requestId, userId }) => {
    const body = await request.json();
    const parsed = submitReviewSchema.safeParse(body);

    if (!parsed.success) {
      throw new ApiError(
        ERROR_CODES.VALIDATION_ERROR,
        "Invalid review payload",
        400,
        parsed.error.flatten(),
      );
    }

    const { nodeId, quality } = parsed.data;
    const now = new Date();

    const result = await prisma.$transaction(async (tx) => {
      const node = await tx.knowledgeNode.findFirst({
        where: {
          id: nodeId,
          userId: userId!,
          deletedAt: null,
        },
      });

      if (!node) {
        throw new ApiError(ERROR_CODES.NOT_FOUND, "Node not found", 404);
      }

      const { start, end } = localDayRange(now);
      const reviewedTodayCount = await tx.reviewEvent.count({
        where: {
          userId: userId!,
          nodeId,
          reviewedAt: {
            gte: start,
            lt: end,
          },
        },
      });

      const sm2Result = calculateSm2(
        {
          ef: node.sm2EF,
          repetition: node.sm2Repetition,
          intervalDays: node.sm2IntervalDays,
        },
        quality,
      );

      const nextReviewAt = new Date(now);
      if (quality < 3 && reviewedTodayCount === 0) {
        nextReviewAt.setHours(nextReviewAt.getHours() + 4);
      } else {
        nextReviewAt.setDate(nextReviewAt.getDate() + sm2Result.intervalDays);
      }

      const [updatedNode, reviewEvent] = await Promise.all([
        tx.knowledgeNode.update({
          where: { id: node.id },
          data: {
            lastReviewedAt: now,
            nextReviewAt,
            sm2EF: sm2Result.ef,
            sm2Repetition: sm2Result.repetition,
            sm2IntervalDays: sm2Result.intervalDays,
          },
        }),
        tx.reviewEvent.create({
          data: {
            userId: userId!,
            nodeId: node.id,
            reviewedAt: now,
            quality,
            efBefore: sm2Result.efBefore,
            efAfter: sm2Result.ef,
            intervalBefore: sm2Result.intervalDaysBefore,
            intervalAfter: sm2Result.intervalDays,
            nextReviewAt,
          },
        }),
      ]);

      return {
        node: updatedNode,
        reviewEvent,
      };
    });

    return ok(result, requestId);
  },
  { requireAuth: true, requireCsrf: true },
);
