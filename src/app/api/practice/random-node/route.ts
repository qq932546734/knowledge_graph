import { ApiError, ERROR_CODES } from "@/lib/errors";
import { ok, withApiHandler } from "@/server/api/route-handler";
import { prisma } from "@/server/db";

export const GET = withApiHandler(
  async ({ requestId, userId }) => {
    const total = await prisma.knowledgeNode.count({
      where: {
        userId: userId!,
        deletedAt: null,
      },
    });

    if (total === 0) {
      throw new ApiError(ERROR_CODES.NOT_FOUND, "No active knowledge nodes", 404);
    }

    const skip = Math.floor(Math.random() * total);
    const node = await prisma.knowledgeNode.findFirst({
      where: {
        userId: userId!,
        deletedAt: null,
      },
      skip,
      orderBy: {
        createdAt: "asc",
      },
    });

    if (!node) {
      throw new ApiError(ERROR_CODES.NOT_FOUND, "No active knowledge nodes", 404);
    }

    return ok(node, requestId);
  },
  { requireAuth: true },
);
