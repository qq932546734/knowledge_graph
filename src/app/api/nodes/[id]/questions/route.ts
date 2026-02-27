import { ApiError, ERROR_CODES } from "@/lib/errors";
import { ok, withApiHandler } from "@/server/api/route-handler";
import { prisma } from "@/server/db";
import { createQuestionSchema } from "@/server/questions/schemas";

interface Params {
  params: Promise<{ id: string }>;
}

export const POST = withApiHandler(
  async ({ request, requestId, userId }, context?: Params) => {
    const routeParams = await context?.params;
    const nodeId = routeParams?.id;

    if (!nodeId) {
      throw new ApiError(ERROR_CODES.VALIDATION_ERROR, "Missing node id", 400);
    }

    const body = await request.json();
    const parsed = createQuestionSchema.safeParse(body);

    if (!parsed.success) {
      throw new ApiError(
        ERROR_CODES.VALIDATION_ERROR,
        "Invalid question payload",
        400,
        parsed.error.flatten(),
      );
    }

    const node = await prisma.knowledgeNode.findFirst({
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

    const question = await prisma.interviewQuestion.create({
      data: {
        userId: userId!,
        nodeId,
        question: parsed.data.question,
        referenceAnswerMd: parsed.data.referenceAnswerMd,
      },
    });

    return ok(question, requestId, 201);
  },
  { requireAuth: true, requireCsrf: true },
);
