import { ApiError, ERROR_CODES } from "@/lib/errors";
import { ok, withApiHandler } from "@/server/api/route-handler";
import { prisma } from "@/server/db";
import { selectRandomQuestion } from "@/server/practice/random-question";

export const GET = withApiHandler(
  async ({ requestId, userId }) => {
    const questions = await prisma.interviewQuestion.findMany({
      where: {
        userId: userId!,
        deletedAt: null,
        node: {
          deletedAt: null,
        },
      },
      include: {
        practiceEvents: {
          where: {
            userId: userId!,
          },
          orderBy: {
            answeredAt: "desc",
          },
        },
      },
    });

    if (questions.length === 0) {
      throw new ApiError(ERROR_CODES.NOT_FOUND, "No active interview questions", 404);
    }

    const practicedQuestionCount = await prisma.practiceEvent.findMany({
      where: {
        userId: userId!,
        questionId: { in: questions.map((question) => question.id) },
      },
      distinct: ["questionId"],
      select: {
        questionId: true,
      },
    });

    const selection = selectRandomQuestion(
      questions.map((question) => ({
        question: {
          id: question.id,
          userId: question.userId,
          nodeId: question.nodeId,
          question: question.question,
          referenceAnswerMd: question.referenceAnswerMd,
          deletedAt: question.deletedAt,
          createdAt: question.createdAt,
          updatedAt: question.updatedAt,
        },
        recentPractice: question.practiceEvents,
      })),
      practicedQuestionCount.length,
    );

    return ok(
      {
        question: selection.selected,
        strategy: selection.strategy,
        coverageRatio: selection.coverageRatio,
      },
      requestId,
    );
  },
  { requireAuth: true },
);
