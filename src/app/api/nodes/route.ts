import { ApiError, ERROR_CODES } from "@/lib/errors";
import { prisma } from "@/server/db";
import { createNodeSchema, listNodesQuerySchema } from "@/server/nodes/schemas";
import { ok, withApiHandler } from "@/server/api/route-handler";

export const POST = withApiHandler(
  async ({ request, userId, requestId }) => {
    const body = await request.json();
    const parsed = createNodeSchema.safeParse(body);

    if (!parsed.success) {
      throw new ApiError(
        ERROR_CODES.VALIDATION_ERROR,
        "Invalid node payload",
        400,
        parsed.error.flatten(),
      );
    }

    const node = await prisma.knowledgeNode.create({
      data: {
        userId: userId!,
        title: parsed.data.title,
        contentMd: parsed.data.contentMd,
        tags: [...new Set(parsed.data.tags)],
        difficulty: parsed.data.difficulty,
        sourceUrl: parsed.data.sourceUrl ?? null,
        nextReviewAt: new Date(),
      },
    });

    return ok(node, requestId, 201);
  },
  { requireAuth: true, requireCsrf: true },
);

export const GET = withApiHandler(
  async ({ request, userId, requestId }) => {
    const query = Object.fromEntries(request.nextUrl.searchParams.entries());
    const parsed = listNodesQuerySchema.safeParse(query);

    if (!parsed.success) {
      throw new ApiError(
        ERROR_CODES.VALIDATION_ERROR,
        "Invalid query parameters",
        400,
        parsed.error.flatten(),
      );
    }

    const { page, pageSize, keyword, tags, difficulty, includeDeleted, sortBy, sortOrder } =
      parsed.data;
    const normalizedTags = tags
      ?.split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    const where = {
      userId: userId!,
      ...(includeDeleted ? {} : { deletedAt: null }),
      ...(keyword
        ? {
            OR: [
              {
                title: {
                  contains: keyword,
                  mode: "insensitive" as const,
                },
              },
              {
                contentMd: {
                  contains: keyword,
                  mode: "insensitive" as const,
                },
              },
            ],
          }
        : {}),
      ...(difficulty ? { difficulty } : {}),
      ...(normalizedTags?.length ? { tags: { hasSome: normalizedTags } } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.knowledgeNode.findMany({
        where,
        orderBy: {
          [sortBy]: sortOrder,
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.knowledgeNode.count({ where }),
    ]);

    return ok(
      {
        page,
        pageSize,
        total,
        items,
      },
      requestId,
    );
  },
  { requireAuth: true },
);
