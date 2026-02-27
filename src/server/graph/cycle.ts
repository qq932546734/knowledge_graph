import { RelationType, type PrismaClient, type Prisma } from "@prisma/client";

import { ApiError, ERROR_CODES } from "@/lib/errors";

type DbClient = PrismaClient | Prisma.TransactionClient;

interface ParentChildEdge {
  fromNodeId: string;
  toNodeId: string;
}

function assertSingleParent(edges: ParentChildEdge[], scopedChildNodeIds?: Set<string>): void {
  const childToParents = new Map<string, Set<string>>();

  for (const edge of edges) {
    if (scopedChildNodeIds && !scopedChildNodeIds.has(edge.toNodeId)) {
      continue;
    }

    const parentSet = childToParents.get(edge.toNodeId) ?? new Set<string>();
    parentSet.add(edge.fromNodeId);
    childToParents.set(edge.toNodeId, parentSet);
  }

  for (const [childNodeId, parentSet] of childToParents.entries()) {
    if (parentSet.size > 1) {
      throw new ApiError(ERROR_CODES.CONFLICT, "Child node can only have one parent", 409, {
        childNodeId,
        parentNodeIds: [...parentSet],
      });
    }
  }
}

function reachable(
  adjacency: Map<string, string[]>,
  startNodeId: string,
  targetNodeId: string,
): boolean {
  const visited = new Set<string>();
  const stack = [startNodeId];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || visited.has(current)) {
      continue;
    }

    if (current === targetNodeId) {
      return true;
    }

    visited.add(current);
    const neighbors = adjacency.get(current) ?? [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        stack.push(neighbor);
      }
    }
  }

  return false;
}

function assertDag(edges: ParentChildEdge[]): void {
  const adjacency = new Map<string, string[]>();
  const visiting = new Set<string>();
  const visited = new Set<string>();

  for (const edge of edges) {
    const list = adjacency.get(edge.fromNodeId) ?? [];
    list.push(edge.toNodeId);
    adjacency.set(edge.fromNodeId, list);
    if (!adjacency.has(edge.toNodeId)) {
      adjacency.set(edge.toNodeId, []);
    }
  }

  const dfs = (nodeId: string): boolean => {
    if (visiting.has(nodeId)) {
      return true;
    }

    if (visited.has(nodeId)) {
      return false;
    }

    visiting.add(nodeId);
    const neighbors = adjacency.get(nodeId) ?? [];
    for (const neighbor of neighbors) {
      if (dfs(neighbor)) {
        return true;
      }
    }

    visiting.delete(nodeId);
    visited.add(nodeId);
    return false;
  };

  for (const nodeId of adjacency.keys()) {
    if (dfs(nodeId)) {
      throw new ApiError(
        ERROR_CODES.RELATION_CYCLE_DETECTED,
        "Parent-child relation would create a cycle",
        409,
      );
    }
  }
}

export function normalizeRelatedPair(
  a: string,
  b: string,
): { fromNodeId: string; toNodeId: string } {
  return a < b ? { fromNodeId: a, toNodeId: b } : { fromNodeId: b, toNodeId: a };
}

export async function ensureNoCycleOnRelationCreate(
  db: DbClient,
  userId: string,
  fromNodeId: string,
  toNodeId: string,
): Promise<void> {
  if (fromNodeId === toNodeId) {
    throw new ApiError(
      ERROR_CODES.VALIDATION_ERROR,
      "fromNodeId and toNodeId must be different",
      400,
    );
  }

  const activeParentChildRelations = await db.nodeRelation.findMany({
    where: {
      userId,
      relationType: RelationType.PARENT_CHILD,
      deletedAt: null,
      fromNode: { deletedAt: null },
      toNode: { deletedAt: null },
    },
    select: {
      fromNodeId: true,
      toNodeId: true,
    },
  });

  const adjacency = new Map<string, string[]>();
  for (const edge of activeParentChildRelations) {
    const list = adjacency.get(edge.fromNodeId) ?? [];
    list.push(edge.toNodeId);
    adjacency.set(edge.fromNodeId, list);
  }

  if (reachable(adjacency, toNodeId, fromNodeId)) {
    throw new ApiError(
      ERROR_CODES.RELATION_CYCLE_DETECTED,
      "Parent-child relation would create a cycle",
      409,
    );
  }
}

export async function ensureSingleParentOnRelationCreate(
  db: DbClient,
  userId: string,
  fromNodeId: string,
  toNodeId: string,
): Promise<void> {
  const conflictingParentRelation = await db.nodeRelation.findFirst({
    where: {
      userId,
      relationType: RelationType.PARENT_CHILD,
      deletedAt: null,
      toNodeId,
      fromNodeId: { not: fromNodeId },
      fromNode: { deletedAt: null },
      toNode: { deletedAt: null },
    },
    select: {
      fromNodeId: true,
    },
  });

  if (conflictingParentRelation) {
    throw new ApiError(ERROR_CODES.CONFLICT, "Child node already has a parent", 409, {
      childNodeId: toNodeId,
      currentParentNodeId: conflictingParentRelation.fromNodeId,
    });
  }
}

export async function ensureNoCycleOnRestore(
  db: DbClient,
  userId: string,
  restoredRelations: ParentChildEdge[],
): Promise<void> {
  const activeRelations = await db.nodeRelation.findMany({
    where: {
      userId,
      relationType: RelationType.PARENT_CHILD,
      deletedAt: null,
      fromNode: { deletedAt: null },
      toNode: { deletedAt: null },
    },
    select: {
      fromNodeId: true,
      toNodeId: true,
    },
  });

  assertDag([...activeRelations, ...restoredRelations]);
}

export async function ensureSingleParentOnRestore(
  db: DbClient,
  userId: string,
  restoredRelations: ParentChildEdge[],
): Promise<void> {
  if (restoredRelations.length === 0) {
    return;
  }

  const scopedChildNodeIds = new Set(restoredRelations.map((relation) => relation.toNodeId));
  const activeRelations = await db.nodeRelation.findMany({
    where: {
      userId,
      relationType: RelationType.PARENT_CHILD,
      deletedAt: null,
      toNodeId: { in: [...scopedChildNodeIds] },
      fromNode: { deletedAt: null },
      toNode: { deletedAt: null },
    },
    select: {
      fromNodeId: true,
      toNodeId: true,
    },
  });

  assertSingleParent([...activeRelations, ...restoredRelations], scopedChildNodeIds);
}
