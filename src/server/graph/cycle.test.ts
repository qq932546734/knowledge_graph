import { describe, expect, it } from "vitest";

import {
  ensureNoCycleOnRelationCreate,
  ensureNoCycleOnRestore,
  ensureSingleParentOnRelationCreate,
  ensureSingleParentOnRestore,
} from "@/server/graph/cycle";

function mockDb(edges: Array<{ fromNodeId: string; toNodeId: string }>) {
  return {
    nodeRelation: {
      findMany: async ({ where }: { where?: { toNodeId?: { in: string[] } } } = {}) => {
        const scopedChildIds = where?.toNodeId?.in;
        if (!scopedChildIds) {
          return edges;
        }

        return edges.filter((edge) => scopedChildIds.includes(edge.toNodeId));
      },
      findFirst: async ({
        where,
      }: {
        where?: { toNodeId?: string; fromNodeId?: { not?: string } };
      } = {}) => {
        return (
          edges.find(
            (edge) =>
              (!where?.toNodeId || edge.toNodeId === where.toNodeId) &&
              (!where?.fromNodeId?.not || edge.fromNodeId !== where.fromNodeId.not),
          ) ?? null
        );
      },
    },
  } as never;
}

describe("relation cycle checks", () => {
  it("detects cycle when creating parent-child edge", async () => {
    const db = mockDb([
      { fromNodeId: "A", toNodeId: "B" },
      { fromNodeId: "B", toNodeId: "C" },
    ]);

    await expect(ensureNoCycleOnRelationCreate(db, "u1", "C", "A")).rejects.toThrow(
      "Parent-child relation would create a cycle",
    );
  });

  it("allows acyclic parent-child edge", async () => {
    const db = mockDb([
      { fromNodeId: "A", toNodeId: "B" },
      { fromNodeId: "B", toNodeId: "C" },
    ]);

    await expect(ensureNoCycleOnRelationCreate(db, "u1", "A", "D")).resolves.toBeUndefined();
  });

  it("detects cycle during restore", async () => {
    const db = mockDb([
      { fromNodeId: "A", toNodeId: "B" },
      { fromNodeId: "B", toNodeId: "C" },
    ]);

    await expect(
      ensureNoCycleOnRestore(db, "u1", [{ fromNodeId: "C", toNodeId: "A" }]),
    ).rejects.toThrow("Parent-child relation would create a cycle");
  });

  it("rejects creating a second parent for the same child", async () => {
    const db = mockDb([{ fromNodeId: "A", toNodeId: "B" }]);

    await expect(ensureSingleParentOnRelationCreate(db, "u1", "C", "B")).rejects.toThrow(
      "Child node already has a parent",
    );
  });

  it("allows creating relation when child has no other parent", async () => {
    const db = mockDb([{ fromNodeId: "A", toNodeId: "B" }]);

    await expect(ensureSingleParentOnRelationCreate(db, "u1", "A", "B")).resolves.toBeUndefined();
    await expect(ensureSingleParentOnRelationCreate(db, "u1", "A", "C")).resolves.toBeUndefined();
  });

  it("rejects multi-parent restore for impacted children", async () => {
    const db = mockDb([{ fromNodeId: "A", toNodeId: "B" }]);

    await expect(
      ensureSingleParentOnRestore(db, "u1", [{ fromNodeId: "C", toNodeId: "B" }]),
    ).rejects.toThrow("Child node can only have one parent");
  });
});
