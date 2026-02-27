import { ok, withApiHandler } from "@/server/api/route-handler";
import { prisma } from "@/server/db";
import { SCHEMA_VERSION } from "@/server/backup/types";

export const GET = withApiHandler(
  async ({ requestId, userId }) => {
    const [user, knowledgeNodes, nodeRelations, interviewQuestions, reviewEvents, practiceEvents] =
      await Promise.all([
        prisma.user.findUniqueOrThrow({
          where: { id: userId! },
          select: {
            email: true,
            createdAt: true,
          },
        }),
        prisma.knowledgeNode.findMany({
          where: { userId: userId! },
          orderBy: { createdAt: "asc" },
        }),
        prisma.nodeRelation.findMany({ where: { userId: userId! }, orderBy: { createdAt: "asc" } }),
        prisma.interviewQuestion.findMany({
          where: { userId: userId! },
          orderBy: { createdAt: "asc" },
        }),
        prisma.reviewEvent.findMany({ where: { userId: userId! }, orderBy: { reviewedAt: "asc" } }),
        prisma.practiceEvent.findMany({
          where: { userId: userId! },
          orderBy: { answeredAt: "asc" },
        }),
      ]);

    return ok(
      {
        schemaVersion: SCHEMA_VERSION,
        exportedAt: new Date().toISOString(),
        user: {
          email: user.email,
          createdAt: user.createdAt.toISOString(),
        },
        knowledgeNodes: knowledgeNodes.map((node) => ({
          ...node,
          lastReviewedAt: node.lastReviewedAt?.toISOString() ?? null,
          nextReviewAt: node.nextReviewAt?.toISOString() ?? null,
          deletedAt: node.deletedAt?.toISOString() ?? null,
          createdAt: node.createdAt.toISOString(),
          updatedAt: node.updatedAt.toISOString(),
        })),
        nodeRelations: nodeRelations.map((relation) => ({
          ...relation,
          deletedAt: relation.deletedAt?.toISOString() ?? null,
          createdAt: relation.createdAt.toISOString(),
        })),
        interviewQuestions: interviewQuestions.map((question) => ({
          ...question,
          deletedAt: question.deletedAt?.toISOString() ?? null,
          createdAt: question.createdAt.toISOString(),
          updatedAt: question.updatedAt.toISOString(),
        })),
        reviewEvents: reviewEvents.map((event) => ({
          ...event,
          reviewedAt: event.reviewedAt.toISOString(),
          nextReviewAt: event.nextReviewAt.toISOString(),
        })),
        practiceEvents: practiceEvents.map((event) => ({
          ...event,
          answeredAt: event.answeredAt.toISOString(),
        })),
      },
      requestId,
    );
  },
  { requireAuth: true },
);
