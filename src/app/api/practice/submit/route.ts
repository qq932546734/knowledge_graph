import { PracticeMode } from "@prisma/client";

import { ApiError, ERROR_CODES } from "@/lib/errors";
import { ok, withApiHandler } from "@/server/api/route-handler";
import { prisma } from "@/server/db";
import { submitPracticeSchema } from "@/server/practice/schemas";

export const POST = withApiHandler(
  async ({ request, requestId, userId }) => {
    const body = await request.json();
    const parsed = submitPracticeSchema.safeParse(body);

    if (!parsed.success) {
      throw new ApiError(
        ERROR_CODES.VALIDATION_ERROR,
        "Invalid practice payload",
        400,
        parsed.error.flatten(),
      );
    }

    const { mode, nodeId, questionId, selfScore, note } = parsed.data;

    const practiceEvent = await prisma.$transaction(async (tx) => {
      const node = await tx.knowledgeNode.findFirst({
        where: {
          id: nodeId,
          userId: userId!,
          deletedAt: null,
        },
        select: { id: true },
      });

      if (!node) {
        throw new ApiError(ERROR_CODES.NOT_FOUND, "Node not found", 404);
      }

      if (mode === PracticeMode.QUESTION_ANSWER) {
        const question = await tx.interviewQuestion.findFirst({
          where: {
            id: questionId!,
            userId: userId!,
            nodeId,
            deletedAt: null,
          },
          select: { id: true },
        });

        if (!question) {
          throw new ApiError(ERROR_CODES.NOT_FOUND, "Question not found", 404);
        }
      }

      return tx.practiceEvent.create({
        data: {
          userId: userId!,
          mode,
          nodeId,
          questionId: mode === PracticeMode.QUESTION_ANSWER ? questionId : null,
          selfScore,
          note: note ?? null,
        },
      });
    });

    return ok(practiceEvent, requestId, 201);
  },
  { requireAuth: true, requireCsrf: true },
);
