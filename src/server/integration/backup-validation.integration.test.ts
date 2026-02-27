import { describe, expect, it } from "vitest";

import { validateBackupPayload } from "@/server/backup/schema";
import { SCHEMA_VERSION } from "@/server/backup/types";

const basePayload = {
  schemaVersion: "1.0.0",
  exportedAt: new Date().toISOString(),
  user: {
    email: "admin@example.com",
    createdAt: new Date().toISOString(),
  },
  knowledgeNodes: [
    {
      id: "n1",
      title: "Graph",
      contentMd: "content",
      tags: ["graph"],
      difficulty: 3,
      sourceUrl: null,
      lastReviewedAt: null,
      nextReviewAt: null,
      sm2EF: 2.5,
      sm2Repetition: 0,
      sm2IntervalDays: 0,
      deletedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  nodeRelations: [],
  interviewQuestions: [],
  reviewEvents: [],
  practiceEvents: [],
};

describe("backup validation", () => {
  it("accepts matching schema major", () => {
    const result = validateBackupPayload(basePayload, SCHEMA_VERSION);
    expect(result.schemaVersion).toBe("1.0.0");
  });

  it("rejects incompatible schema major", () => {
    expect(() =>
      validateBackupPayload(
        {
          ...basePayload,
          schemaVersion: "2.0.0",
        },
        SCHEMA_VERSION,
      ),
    ).toThrow("schemaVersion major mismatch");
  });

  it("rejects broken references", () => {
    expect(() =>
      validateBackupPayload(
        {
          ...basePayload,
          nodeRelations: [
            {
              id: "r1",
              fromNodeId: "n1",
              toNodeId: "missing",
              relationType: "PARENT_CHILD",
              deletedAt: null,
              createdAt: new Date().toISOString(),
            },
          ],
        },
        SCHEMA_VERSION,
      ),
    ).toThrow("Backup reference validation failed");
  });

  it("rejects multiple active parents for one child", () => {
    expect(() =>
      validateBackupPayload(
        {
          ...basePayload,
          knowledgeNodes: [
            ...basePayload.knowledgeNodes,
            {
              ...basePayload.knowledgeNodes[0],
              id: "n2",
              title: "Parent B",
            },
            {
              ...basePayload.knowledgeNodes[0],
              id: "n3",
              title: "Child C",
            },
          ],
          nodeRelations: [
            {
              id: "r1",
              fromNodeId: "n1",
              toNodeId: "n3",
              relationType: "PARENT_CHILD",
              deletedAt: null,
              createdAt: new Date().toISOString(),
            },
            {
              id: "r2",
              fromNodeId: "n2",
              toNodeId: "n3",
              relationType: "PARENT_CHILD",
              deletedAt: null,
              createdAt: new Date().toISOString(),
            },
          ],
        },
        SCHEMA_VERSION,
      ),
    ).toThrow("Backup reference validation failed");
  });
});
