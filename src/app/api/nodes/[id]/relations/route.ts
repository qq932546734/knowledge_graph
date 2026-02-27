import { RelationType } from "@prisma/client";

import { ApiError, ERROR_CODES } from "@/lib/errors";
import { ok, withApiHandler } from "@/server/api/route-handler";
import { prisma } from "@/server/db";
import {
  ensureNoCycleOnRelationCreate,
  ensureSingleParentOnRelationCreate,
  normalizeRelatedPair,
} from "@/server/graph/cycle";
import { createRelationSchema } from "@/server/relations/schemas";

interface Params {
  params: Promise<{ id: string }>;
}

export const POST = withApiHandler(
  async ({ request, requestId, userId }, context?: Params) => {
    const routeParams = await context?.params;
    const currentNodeId = routeParams?.id;

    if (!currentNodeId) {
      throw new ApiError(ERROR_CODES.VALIDATION_ERROR, "Missing node id", 400);
    }

    const body = await request.json();
    const parsed = createRelationSchema.safeParse(body);

    if (!parsed.success) {
      throw new ApiError(
        ERROR_CODES.VALIDATION_ERROR,
        "Invalid relation payload",
        400,
        parsed.error.flatten(),
      );
    }

    const { relationType, targetNodeId, currentNodeRole } = parsed.data;

    const relation = await prisma.$transaction(async (tx) => {
      const [currentNode, targetNode] = await Promise.all([
        tx.knowledgeNode.findFirst({
          where: {
            id: currentNodeId,
            userId: userId!,
            deletedAt: null,
          },
          select: { id: true },
        }),
        tx.knowledgeNode.findFirst({
          where: {
            id: targetNodeId,
            userId: userId!,
            deletedAt: null,
          },
          select: { id: true },
        }),
      ]);

      if (!currentNode || !targetNode) {
        throw new ApiError(
          ERROR_CODES.VALIDATION_ERROR,
          "Relation endpoints must both exist and belong to current user",
          400,
        );
      }

      let fromNodeId = currentNodeId;
      let toNodeId = targetNodeId;

      if (relationType === RelationType.RELATED) {
        const normalized = normalizeRelatedPair(currentNodeId, targetNodeId);
        fromNodeId = normalized.fromNodeId;
        toNodeId = normalized.toNodeId;
      } else if (currentNodeRole === "CHILD") {
        fromNodeId = targetNodeId;
        toNodeId = currentNodeId;
      }

      if (fromNodeId === toNodeId) {
        throw new ApiError(ERROR_CODES.VALIDATION_ERROR, "Cannot create self relation", 400);
      }

      if (relationType === RelationType.PARENT_CHILD) {
        await ensureSingleParentOnRelationCreate(tx, userId!, fromNodeId, toNodeId);
        await ensureNoCycleOnRelationCreate(tx, userId!, fromNodeId, toNodeId);
      }

      const existing = await tx.nodeRelation.findFirst({
        where: {
          userId: userId!,
          relationType,
          fromNodeId,
          toNodeId,
          deletedAt: null,
        },
      });

      if (existing) {
        throw new ApiError(ERROR_CODES.CONFLICT, "Relation already exists", 409);
      }

      const softDeleted = await tx.nodeRelation.findFirst({
        where: {
          userId: userId!,
          relationType,
          fromNodeId,
          toNodeId,
          deletedAt: { not: null },
        },
      });

      if (softDeleted) {
        return tx.nodeRelation.update({
          where: { id: softDeleted.id },
          data: { deletedAt: null },
        });
      }

      return tx.nodeRelation.create({
        data: {
          userId: userId!,
          relationType,
          fromNodeId,
          toNodeId,
        },
      });
    });

    return ok(relation, requestId, 201);
  },
  { requireAuth: true, requireCsrf: true },
);
