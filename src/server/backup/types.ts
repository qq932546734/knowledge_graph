export const SCHEMA_VERSION = "1.0.0";

export interface BackupPayload {
  schemaVersion: string;
  exportedAt: string;
  user: {
    email: string;
    createdAt: string;
  };
  knowledgeNodes: Array<{
    id: string;
    title: string;
    contentMd: string;
    tags: string[];
    difficulty: number;
    sourceUrl: string | null;
    lastReviewedAt: string | null;
    nextReviewAt: string | null;
    sm2EF: number;
    sm2Repetition: number;
    sm2IntervalDays: number;
    deletedAt: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
  nodeRelations: Array<{
    id: string;
    fromNodeId: string;
    toNodeId: string;
    relationType: "PARENT_CHILD" | "RELATED";
    deletedAt: string | null;
    createdAt: string;
  }>;
  interviewQuestions: Array<{
    id: string;
    nodeId: string;
    question: string;
    referenceAnswerMd: string;
    deletedAt: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
  reviewEvents: Array<{
    id: string;
    nodeId: string;
    reviewedAt: string;
    quality: number;
    efBefore: number;
    efAfter: number;
    intervalBefore: number;
    intervalAfter: number;
    nextReviewAt: string;
  }>;
  practiceEvents: Array<{
    id: string;
    mode: "NODE_RECALL" | "QUESTION_ANSWER";
    nodeId: string;
    questionId: string | null;
    answeredAt: string;
    selfScore: number;
    note: string | null;
  }>;
}
