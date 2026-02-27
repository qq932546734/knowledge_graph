import type { KnowledgeNode } from "@prisma/client";

import { overdueDays } from "@/lib/day";

export interface DueNode {
  node: KnowledgeNode;
  lastQuality: number;
}

export function sortDueNodes(input: DueNode[]): DueNode[] {
  return [...input].sort((a, b) => {
    const overdueDiff =
      overdueDays(b.node.nextReviewAt ?? b.node.createdAt) -
      overdueDays(a.node.nextReviewAt ?? a.node.createdAt);
    if (overdueDiff !== 0) {
      return overdueDiff;
    }

    if (a.lastQuality !== b.lastQuality) {
      return a.lastQuality - b.lastQuality;
    }

    const nextReviewTimeA = (a.node.nextReviewAt ?? a.node.createdAt).getTime();
    const nextReviewTimeB = (b.node.nextReviewAt ?? b.node.createdAt).getTime();
    if (nextReviewTimeA !== nextReviewTimeB) {
      return nextReviewTimeA - nextReviewTimeB;
    }

    return a.node.createdAt.getTime() - b.node.createdAt.getTime();
  });
}
