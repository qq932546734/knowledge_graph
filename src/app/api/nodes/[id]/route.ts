import { ApiError, ERROR_CODES } from "@/lib/errors";
import { prisma } from "@/server/db";
import { updateNodeSchema } from "@/server/nodes/schemas";
import { ok, withApiHandler } from "@/server/api/route-handler";

interface Params {
  params: Promise<{ id: string }>;
}

export const GET = withApiHandler(
  async ({ requestId, userId }, context?: Params) => {
    const routeParams = await context?.params;
    const id = routeParams?.id;

    if (!id) {
      throw new ApiError(ERROR_CODES.VALIDATION_ERROR, "Missing node id", 400);
    }

    const node = await prisma.knowledgeNode.findFirst({
      where: {
        id,
        userId: userId!,
      },
    });

    if (!node) {
      throw new ApiError(ERROR_CODES.NOT_FOUND, "Node not found", 404);
    }

    const [relations, questions] = await Promise.all([
      prisma.nodeRelation.findMany({
        where: {
          userId: userId!,
          deletedAt: null,
          OR: [{ fromNodeId: id }, { toNodeId: id }],
          fromNode: { deletedAt: null },
          toNode: { deletedAt: null },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.interviewQuestion.findMany({
        where: {
          userId: userId!,
          nodeId: id,
          deletedAt: null,
        },
        orderBy: { updatedAt: "desc" },
      }),
    ]);

    return ok(
      {
        node,
        relations,
        questions,
      },
      requestId,
    );
  },
  { requireAuth: true },
);

export const PUT = withApiHandler(
  async ({ request, requestId, userId }, context?: Params) => {
    const routeParams = await context?.params;
    const id = routeParams?.id;

    if (!id) {
      throw new ApiError(ERROR_CODES.VALIDATION_ERROR, "Missing node id", 400);
    }

    const body = await request.json();
    const parsed = updateNodeSchema.safeParse(body);

    if (!parsed.success) {
      throw new ApiError(
        ERROR_CODES.VALIDATION_ERROR,
        "Invalid node payload",
        400,
        parsed.error.flatten(),
      );
    }

    const existing = await prisma.knowledgeNode.findFirst({
      where: {
        id,
        userId: userId!,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!existing) {
      throw new ApiError(ERROR_CODES.NOT_FOUND, "Node not found", 404);
    }

    const node = await prisma.knowledgeNode.update({
      where: { id },
      data: {
        ...parsed.data,
        ...(parsed.data.tags ? { tags: [...new Set(parsed.data.tags)] } : {}),
      },
    });

    return ok(node, requestId);
  },
  { requireAuth: true, requireCsrf: true },
);

export const DELETE = withApiHandler(
  async ({ requestId, userId }, context?: Params) => {
    const routeParams = await context?.params;
    const id = routeParams?.id;

    if (!id) {
      throw new ApiError(ERROR_CODES.VALIDATION_ERROR, "Missing node id", 400);
    }

    const now = new Date();

    const result = await prisma.$transaction(async (tx) => {
      const node = await tx.knowledgeNode.findFirst({
        where: {
          id,
          userId: userId!,
          deletedAt: null,
        },
        select: { id: true },
      });

      if (!node) {
        throw new ApiError(ERROR_CODES.NOT_FOUND, "Node not found", 404);
      }

      await tx.knowledgeNode.update({
        where: { id },
        data: { deletedAt: now },
      });

      await Promise.all([
        tx.nodeRelation.updateMany({
          where: {
            userId: userId!,
            deletedAt: null,
            OR: [{ fromNodeId: id }, { toNodeId: id }],
          },
          data: { deletedAt: now },
        }),
        tx.interviewQuestion.updateMany({
          where: {
            userId: userId!,
            nodeId: id,
            deletedAt: null,
          },
          data: { deletedAt: now },
        }),
      ]);

      return { id, deletedAt: now };
    });

    return ok(result, requestId);
  },
  { requireAuth: true, requireCsrf: true },
);
