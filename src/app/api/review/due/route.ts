import { localDayRange } from "@/lib/day";
import { ok, withApiHandler } from "@/server/api/route-handler";
import { prisma } from "@/server/db";
import { sortDueNodes } from "@/server/review/due";

export const GET = withApiHandler(
  async ({ requestId, userId }) => {
    const now = new Date();
    const { end } = localDayRange(now);

    const dueNodes = await prisma.knowledgeNode.findMany({
      where: {
        userId: userId!,
        deletedAt: null,
        nextReviewAt: {
          not: null,
          lt: end,
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    if (dueNodes.length === 0) {
      return ok(
        {
          totalDueCount: 0,
          queue: [],
        },
        requestId,
      );
    }

    const latestEvents = await prisma.reviewEvent.findMany({
      where: {
        userId: userId!,
        nodeId: {
          in: dueNodes.map((node) => node.id),
        },
      },
      orderBy: [{ nodeId: "asc" }, { reviewedAt: "desc" }],
      distinct: ["nodeId"],
      select: {
        nodeId: true,
        quality: true,
      },
    });

    const lastQualityMap = new Map(latestEvents.map((event) => [event.nodeId, event.quality]));

    const ranked = sortDueNodes(
      dueNodes.map((node) => ({
        node,
        lastQuality: lastQualityMap.get(node.id) ?? -1,
      })),
    );

    return ok(
      {
        totalDueCount: ranked.length,
        queue: ranked.slice(0, 30).map(({ node, lastQuality }) => ({
          ...node,
          lastQuality,
        })),
      },
      requestId,
    );
  },
  { requireAuth: true },
);
