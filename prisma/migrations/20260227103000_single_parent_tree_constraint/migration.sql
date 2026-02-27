-- Enforce single-parent tree constraint for active parent-child relations.
CREATE UNIQUE INDEX "NodeRelation_single_parent_active_idx"
ON "NodeRelation" ("userId", "toNodeId")
WHERE "relationType" = 'PARENT_CHILD' AND "deletedAt" IS NULL;
