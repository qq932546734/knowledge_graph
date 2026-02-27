import { createHash } from "crypto";

import { z } from "zod";

import { ApiError, ERROR_CODES } from "@/lib/errors";
import type { BackupPayload } from "@/server/backup/types";

const isoDate = z.string().datetime({ offset: true });

const backupSchema = z.object({
  schemaVersion: z.string(),
  exportedAt: isoDate,
  user: z.object({
    email: z.string().email(),
    createdAt: isoDate,
  }),
  knowledgeNodes: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      contentMd: z.string(),
      tags: z.array(z.string()),
      difficulty: z.number().int().min(1).max(5),
      sourceUrl: z.string().url().nullable(),
      lastReviewedAt: isoDate.nullable(),
      nextReviewAt: isoDate.nullable(),
      sm2EF: z.number(),
      sm2Repetition: z.number().int().min(0),
      sm2IntervalDays: z.number().int().min(0),
      deletedAt: isoDate.nullable(),
      createdAt: isoDate,
      updatedAt: isoDate,
    }),
  ),
  nodeRelations: z.array(
    z.object({
      id: z.string(),
      fromNodeId: z.string(),
      toNodeId: z.string(),
      relationType: z.enum(["PARENT_CHILD", "RELATED"]),
      deletedAt: isoDate.nullable(),
      createdAt: isoDate,
    }),
  ),
  interviewQuestions: z.array(
    z.object({
      id: z.string(),
      nodeId: z.string(),
      question: z.string(),
      referenceAnswerMd: z.string(),
      deletedAt: isoDate.nullable(),
      createdAt: isoDate,
      updatedAt: isoDate,
    }),
  ),
  reviewEvents: z.array(
    z.object({
      id: z.string(),
      nodeId: z.string(),
      reviewedAt: isoDate,
      quality: z.number().int().min(0).max(5),
      efBefore: z.number(),
      efAfter: z.number(),
      intervalBefore: z.number().int().min(0),
      intervalAfter: z.number().int().min(0),
      nextReviewAt: isoDate,
    }),
  ),
  practiceEvents: z.array(
    z.object({
      id: z.string(),
      mode: z.enum(["NODE_RECALL", "QUESTION_ANSWER"]),
      nodeId: z.string(),
      questionId: z.string().nullable(),
      answeredAt: isoDate,
      selfScore: z.number().int().min(1).max(5),
      note: z.string().nullable(),
    }),
  ),
});

function major(version: string): number {
  return Number(version.split(".")[0] ?? "0");
}

export function validateBackupPayload(
  payload: unknown,
  currentSchemaVersion: string,
): BackupPayload {
  const parsed = backupSchema.safeParse(payload);

  if (!parsed.success) {
    throw new ApiError(
      ERROR_CODES.VALIDATION_ERROR,
      "Invalid backup payload",
      400,
      parsed.error.flatten(),
    );
  }

  const incomingMajor = major(parsed.data.schemaVersion);
  const currentMajor = major(currentSchemaVersion);

  if (incomingMajor !== currentMajor) {
    throw new ApiError(
      ERROR_CODES.VALIDATION_ERROR,
      `schemaVersion major mismatch: expected ${currentMajor}.x.x`,
      400,
      {
        incoming: parsed.data.schemaVersion,
        expectedMajor: currentMajor,
      },
    );
  }

  const nodeIds = new Set(parsed.data.knowledgeNodes.map((node) => node.id));
  const questionIds = new Set(parsed.data.interviewQuestions.map((question) => question.id));

  const relationErrors = parsed.data.nodeRelations
    .map((relation) => {
      if (relation.fromNodeId === relation.toNodeId) {
        return { relationId: relation.id, reason: "self relation" };
      }

      if (!nodeIds.has(relation.fromNodeId) || !nodeIds.has(relation.toNodeId)) {
        return { relationId: relation.id, reason: "missing node reference" };
      }

      if (relation.relationType === "RELATED" && relation.fromNodeId >= relation.toNodeId) {
        return { relationId: relation.id, reason: "RELATED pair not normalized" };
      }

      return null;
    })
    .filter(Boolean);

  const singleParentErrors = Array.from(
    parsed.data.nodeRelations
      .filter((relation) => relation.relationType === "PARENT_CHILD" && relation.deletedAt === null)
      .reduce((map, relation) => {
        const parentSet = map.get(relation.toNodeId) ?? new Set<string>();
        parentSet.add(relation.fromNodeId);
        map.set(relation.toNodeId, parentSet);
        return map;
      }, new Map<string, Set<string>>())
      .entries(),
  )
    .filter(([, parentSet]) => parentSet.size > 1)
    .map(([childNodeId, parentSet]) => ({
      childNodeId,
      parentNodeIds: [...parentSet],
    }));

  const questionErrors = parsed.data.interviewQuestions
    .map((question) => {
      if (!nodeIds.has(question.nodeId)) {
        return { questionId: question.id, reason: "missing node reference" };
      }

      return null;
    })
    .filter(Boolean);

  const reviewErrors = parsed.data.reviewEvents
    .map((event) => {
      if (!nodeIds.has(event.nodeId)) {
        return { reviewEventId: event.id, reason: "missing node reference" };
      }

      return null;
    })
    .filter(Boolean);

  const practiceErrors = parsed.data.practiceEvents
    .map((event) => {
      if (!nodeIds.has(event.nodeId)) {
        return { practiceEventId: event.id, reason: "missing node reference" };
      }

      if (event.questionId && !questionIds.has(event.questionId)) {
        return { practiceEventId: event.id, reason: "missing question reference" };
      }

      return null;
    })
    .filter(Boolean);

  if (
    relationErrors.length ||
    singleParentErrors.length ||
    questionErrors.length ||
    reviewErrors.length ||
    practiceErrors.length
  ) {
    throw new ApiError(ERROR_CODES.VALIDATION_ERROR, "Backup reference validation failed", 400, {
      relationErrors,
      singleParentErrors,
      questionErrors,
      reviewErrors,
      practiceErrors,
    });
  }

  return parsed.data;
}

export function payloadHash(payload: unknown): string {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}
