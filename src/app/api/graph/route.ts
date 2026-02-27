import { ok, withApiHandler } from "@/server/api/route-handler";
import { prisma } from "@/server/db";

export const GET = withApiHandler(
  async ({ requestId, userId }) => {
    const [nodes, relations] = await Promise.all([
      prisma.knowledgeNode.findMany({
        where: {
          userId: userId!,
          deletedAt: null,
        },
        select: {
          id: true,
          title: true,
          difficulty: true,
          tags: true,
          nextReviewAt: true,
        },
      }),
      prisma.nodeRelation.findMany({
        where: {
          userId: userId!,
          deletedAt: null,
          fromNode: { deletedAt: null },
          toNode: { deletedAt: null },
        },
        select: {
          id: true,
          relationType: true,
          fromNodeId: true,
          toNodeId: true,
        },
      }),
    ]);

    return ok(
      {
        nodes,
        relations,
      },
      requestId,
    );
  },
  { requireAuth: true },
);
