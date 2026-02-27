import { RelationType } from "@prisma/client";

import { ApiError, ERROR_CODES } from "@/lib/errors";
import { ok, withApiHandler } from "@/server/api/route-handler";
import { prisma } from "@/server/db";
import { ensureNoCycleOnRestore, ensureSingleParentOnRestore } from "@/server/graph/cycle";

interface Params {
  params: Promise<{ id: string }>;
}

export const POST = withApiHandler(
  async ({ requestId, userId }, context?: Params) => {
    const routeParams = await context?.params;
    const id = routeParams?.id;

    if (!id) {
      throw new ApiError(ERROR_CODES.VALIDATION_ERROR, "Missing node id", 400);
    }

    const restored = await prisma.$transaction(async (tx) => {
      const node = await tx.knowledgeNode.findFirst({
        where: {
          id,
          userId: userId!,
          deletedAt: { not: null },
        },
      });

      if (!node) {
        throw new ApiError(ERROR_CODES.NOT_FOUND, "Deleted node not found", 404);
      }

      await tx.knowledgeNode.update({
        where: { id },
        data: { deletedAt: null },
      });

      const relationsToRestore = await tx.nodeRelation.findMany({
        where: {
          userId: userId!,
          deletedAt: { not: null },
          OR: [{ fromNodeId: id }, { toNodeId: id }],
          fromNode: { deletedAt: null },
          toNode: { deletedAt: null },
        },
        select: {
          id: true,
          relationType: true,
          fromNodeId: true,
          toNodeId: true,
        },
      });

      const parentChildRelations = relationsToRestore
        .filter((relation) => relation.relationType === RelationType.PARENT_CHILD)
        .map((relation) => ({
          fromNodeId: relation.fromNodeId,
          toNodeId: relation.toNodeId,
        }));

      if (parentChildRelations.length > 0) {
        await ensureSingleParentOnRestore(tx, userId!, parentChildRelations);
        await ensureNoCycleOnRestore(tx, userId!, parentChildRelations);
      }

      await Promise.all([
        relationsToRestore.length
          ? tx.nodeRelation.updateMany({
              where: {
                id: { in: relationsToRestore.map((relation) => relation.id) },
              },
              data: { deletedAt: null },
            })
          : Promise.resolve(),
        tx.interviewQuestion.updateMany({
          where: {
            userId: userId!,
            nodeId: id,
            deletedAt: { not: null },
          },
          data: { deletedAt: null },
        }),
      ]);

      return {
        id,
        restoredRelationCount: relationsToRestore.length,
      };
    });

    return ok(restored, requestId);
  },
  { requireAuth: true, requireCsrf: true },
);
