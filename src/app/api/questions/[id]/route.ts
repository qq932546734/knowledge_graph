import { ApiError, ERROR_CODES } from "@/lib/errors";
import { ok, withApiHandler } from "@/server/api/route-handler";
import { prisma } from "@/server/db";
import { updateQuestionSchema } from "@/server/questions/schemas";

interface Params {
  params: Promise<{ id: string }>;
}

export const PUT = withApiHandler(
  async ({ request, requestId, userId }, context?: Params) => {
    const routeParams = await context?.params;
    const id = routeParams?.id;

    if (!id) {
      throw new ApiError(ERROR_CODES.VALIDATION_ERROR, "Missing question id", 400);
    }

    const body = await request.json();
    const parsed = updateQuestionSchema.safeParse(body);

    if (!parsed.success) {
      throw new ApiError(
        ERROR_CODES.VALIDATION_ERROR,
        "Invalid question payload",
        400,
        parsed.error.flatten(),
      );
    }

    const existing = await prisma.interviewQuestion.findFirst({
      where: {
        id,
        userId: userId!,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!existing) {
      throw new ApiError(ERROR_CODES.NOT_FOUND, "Question not found", 404);
    }

    const question = await prisma.interviewQuestion.update({
      where: { id },
      data: parsed.data,
    });

    return ok(question, requestId);
  },
  { requireAuth: true, requireCsrf: true },
);

export const DELETE = withApiHandler(
  async ({ requestId, userId }, context?: Params) => {
    const routeParams = await context?.params;
    const id = routeParams?.id;

    if (!id) {
      throw new ApiError(ERROR_CODES.VALIDATION_ERROR, "Missing question id", 400);
    }

    const existing = await prisma.interviewQuestion.findFirst({
      where: {
        id,
        userId: userId!,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!existing) {
      throw new ApiError(ERROR_CODES.NOT_FOUND, "Question not found", 404);
    }

    const question = await prisma.interviewQuestion.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return ok(question, requestId);
  },
  { requireAuth: true, requireCsrf: true },
);
