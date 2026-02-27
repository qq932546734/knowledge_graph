import { ApiError, ERROR_CODES } from "@/lib/errors";
import { ok, withApiHandler } from "@/server/api/route-handler";
import { consumeValidationToken } from "@/server/backup/token-store";
import { payloadHash, validateBackupPayload } from "@/server/backup/schema";
import { SCHEMA_VERSION } from "@/server/backup/types";
import { prisma } from "@/server/db";

export const POST = withApiHandler(
  async ({ requestId, request, userId }) => {
    const body = (await request.json()) as { validationToken?: string; payload?: unknown };
    const validationToken = body.validationToken;

    if (!validationToken || !body.payload) {
      throw new ApiError(
        ERROR_CODES.VALIDATION_ERROR,
        "validationToken and payload are required",
        400,
      );
    }

    const validated = validateBackupPayload(body.payload, SCHEMA_VERSION);
    const hash = payloadHash(validated);

    const tokenOk = await consumeValidationToken(validationToken, userId!, hash);
    if (!tokenOk) {
      throw new ApiError(ERROR_CODES.VALIDATION_ERROR, "Invalid or expired validationToken", 400);
    }

    await prisma.$transaction(async (tx) => {
      await tx.practiceEvent.deleteMany({ where: { userId: userId! } });
      await tx.reviewEvent.deleteMany({ where: { userId: userId! } });
      await tx.nodeRelation.deleteMany({ where: { userId: userId! } });
      await tx.interviewQuestion.deleteMany({ where: { userId: userId! } });
      await tx.knowledgeNode.deleteMany({ where: { userId: userId! } });

      if (validated.knowledgeNodes.length) {
        await tx.knowledgeNode.createMany({
          data: validated.knowledgeNodes.map((node) => ({
            id: node.id,
            userId: userId!,
            title: node.title,
            contentMd: node.contentMd,
            tags: node.tags,
            difficulty: node.difficulty,
            sourceUrl: node.sourceUrl,
            lastReviewedAt: node.lastReviewedAt ? new Date(node.lastReviewedAt) : null,
            nextReviewAt: node.nextReviewAt ? new Date(node.nextReviewAt) : null,
            sm2EF: node.sm2EF,
            sm2Repetition: node.sm2Repetition,
            sm2IntervalDays: node.sm2IntervalDays,
            deletedAt: node.deletedAt ? new Date(node.deletedAt) : null,
            createdAt: new Date(node.createdAt),
            updatedAt: new Date(node.updatedAt),
          })),
        });
      }

      if (validated.nodeRelations.length) {
        await tx.nodeRelation.createMany({
          data: validated.nodeRelations.map((relation) => ({
            id: relation.id,
            userId: userId!,
            fromNodeId: relation.fromNodeId,
            toNodeId: relation.toNodeId,
            relationType: relation.relationType,
            deletedAt: relation.deletedAt ? new Date(relation.deletedAt) : null,
            createdAt: new Date(relation.createdAt),
          })),
        });
      }

      if (validated.interviewQuestions.length) {
        await tx.interviewQuestion.createMany({
          data: validated.interviewQuestions.map((question) => ({
            id: question.id,
            userId: userId!,
            nodeId: question.nodeId,
            question: question.question,
            referenceAnswerMd: question.referenceAnswerMd,
            deletedAt: question.deletedAt ? new Date(question.deletedAt) : null,
            createdAt: new Date(question.createdAt),
            updatedAt: new Date(question.updatedAt),
          })),
        });
      }

      if (validated.reviewEvents.length) {
        await tx.reviewEvent.createMany({
          data: validated.reviewEvents.map((event) => ({
            id: event.id,
            userId: userId!,
            nodeId: event.nodeId,
            reviewedAt: new Date(event.reviewedAt),
            quality: event.quality,
            efBefore: event.efBefore,
            efAfter: event.efAfter,
            intervalBefore: event.intervalBefore,
            intervalAfter: event.intervalAfter,
            nextReviewAt: new Date(event.nextReviewAt),
          })),
        });
      }

      if (validated.practiceEvents.length) {
        await tx.practiceEvent.createMany({
          data: validated.practiceEvents.map((event) => ({
            id: event.id,
            userId: userId!,
            mode: event.mode,
            nodeId: event.nodeId,
            questionId: event.questionId,
            answeredAt: new Date(event.answeredAt),
            selfScore: event.selfScore,
            note: event.note,
          })),
        });
      }
    });

    return ok(
      {
        imported: true,
        counts: {
          knowledgeNodes: validated.knowledgeNodes.length,
          nodeRelations: validated.nodeRelations.length,
          interviewQuestions: validated.interviewQuestions.length,
          reviewEvents: validated.reviewEvents.length,
          practiceEvents: validated.practiceEvents.length,
        },
      },
      requestId,
    );
  },
  { requireAuth: true, requireCsrf: true },
);
