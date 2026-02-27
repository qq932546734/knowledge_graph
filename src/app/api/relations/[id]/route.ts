import { ApiError, ERROR_CODES } from "@/lib/errors";
import { ok, withApiHandler } from "@/server/api/route-handler";
import { prisma } from "@/server/db";

interface Params {
  params: Promise<{ id: string }>;
}

export const DELETE = withApiHandler(
  async ({ requestId, userId }, context?: Params) => {
    const routeParams = await context?.params;
    const id = routeParams?.id;

    if (!id) {
      throw new ApiError(ERROR_CODES.VALIDATION_ERROR, "Missing relation id", 400);
    }

    const relation = await prisma.nodeRelation.findFirst({
      where: {
        id,
        userId: userId!,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!relation) {
      throw new ApiError(ERROR_CODES.NOT_FOUND, "Relation not found", 404);
    }

    const updated = await prisma.nodeRelation.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return ok(updated, requestId);
  },
  { requireAuth: true, requireCsrf: true },
);
