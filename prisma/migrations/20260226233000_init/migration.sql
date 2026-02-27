-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "RelationType" AS ENUM ('PARENT_CHILD', 'RELATED');

-- CreateEnum
CREATE TYPE "PracticeMode" AS ENUM ('NODE_RECALL', 'QUESTION_ANSWER');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeNode" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "contentMd" TEXT NOT NULL,
    "tags" TEXT[],
    "difficulty" INTEGER NOT NULL,
    "sourceUrl" TEXT,
    "lastReviewedAt" TIMESTAMP(3),
    "nextReviewAt" TIMESTAMP(3),
    "sm2EF" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
    "sm2Repetition" INTEGER NOT NULL DEFAULT 0,
    "sm2IntervalDays" INTEGER NOT NULL DEFAULT 0,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KnowledgeNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NodeRelation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fromNodeId" TEXT NOT NULL,
    "toNodeId" TEXT NOT NULL,
    "relationType" "RelationType" NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NodeRelation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewQuestion" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "referenceAnswerMd" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InterviewQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "quality" INTEGER NOT NULL,
    "efBefore" DOUBLE PRECISION NOT NULL,
    "efAfter" DOUBLE PRECISION NOT NULL,
    "intervalBefore" INTEGER NOT NULL,
    "intervalAfter" INTEGER NOT NULL,
    "nextReviewAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReviewEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PracticeEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mode" "PracticeMode" NOT NULL,
    "nodeId" TEXT NOT NULL,
    "questionId" TEXT,
    "answeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "selfScore" INTEGER NOT NULL,
    "note" TEXT,

    CONSTRAINT "PracticeEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "KnowledgeNode_userId_deletedAt_idx" ON "KnowledgeNode"("userId", "deletedAt");

-- CreateIndex
CREATE INDEX "KnowledgeNode_userId_nextReviewAt_deletedAt_idx" ON "KnowledgeNode"("userId", "nextReviewAt", "deletedAt");

-- CreateIndex
CREATE INDEX "KnowledgeNode_userId_updatedAt_deletedAt_idx" ON "KnowledgeNode"("userId", "updatedAt", "deletedAt");

-- CreateIndex
CREATE INDEX "NodeRelation_userId_relationType_deletedAt_idx" ON "NodeRelation"("userId", "relationType", "deletedAt");

-- CreateIndex
CREATE INDEX "NodeRelation_userId_fromNodeId_toNodeId_relationType_idx" ON "NodeRelation"("userId", "fromNodeId", "toNodeId", "relationType");

-- CreateIndex
CREATE INDEX "NodeRelation_userId_deletedAt_idx" ON "NodeRelation"("userId", "deletedAt");

-- CreateIndex
CREATE INDEX "InterviewQuestion_userId_nodeId_deletedAt_idx" ON "InterviewQuestion"("userId", "nodeId", "deletedAt");

-- CreateIndex
CREATE INDEX "InterviewQuestion_userId_updatedAt_deletedAt_idx" ON "InterviewQuestion"("userId", "updatedAt", "deletedAt");

-- CreateIndex
CREATE INDEX "ReviewEvent_userId_reviewedAt_idx" ON "ReviewEvent"("userId", "reviewedAt");

-- CreateIndex
CREATE INDEX "ReviewEvent_userId_nodeId_reviewedAt_idx" ON "ReviewEvent"("userId", "nodeId", "reviewedAt");

-- CreateIndex
CREATE INDEX "PracticeEvent_userId_mode_answeredAt_idx" ON "PracticeEvent"("userId", "mode", "answeredAt");

-- CreateIndex
CREATE INDEX "PracticeEvent_userId_questionId_answeredAt_idx" ON "PracticeEvent"("userId", "questionId", "answeredAt");

-- CreateIndex
CREATE INDEX "PracticeEvent_userId_nodeId_answeredAt_idx" ON "PracticeEvent"("userId", "nodeId", "answeredAt");

-- AddForeignKey
ALTER TABLE "KnowledgeNode" ADD CONSTRAINT "KnowledgeNode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NodeRelation" ADD CONSTRAINT "NodeRelation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NodeRelation" ADD CONSTRAINT "NodeRelation_fromNodeId_fkey" FOREIGN KEY ("fromNodeId") REFERENCES "KnowledgeNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NodeRelation" ADD CONSTRAINT "NodeRelation_toNodeId_fkey" FOREIGN KEY ("toNodeId") REFERENCES "KnowledgeNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewQuestion" ADD CONSTRAINT "InterviewQuestion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewQuestion" ADD CONSTRAINT "InterviewQuestion_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "KnowledgeNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewEvent" ADD CONSTRAINT "ReviewEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewEvent" ADD CONSTRAINT "ReviewEvent_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "KnowledgeNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeEvent" ADD CONSTRAINT "PracticeEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeEvent" ADD CONSTRAINT "PracticeEvent_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "KnowledgeNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeEvent" ADD CONSTRAINT "PracticeEvent_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "InterviewQuestion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Additional constraints for relation integrity
ALTER TABLE "NodeRelation"
    ADD CONSTRAINT "NodeRelation_from_to_not_equal_chk"
    CHECK ("fromNodeId" <> "toNodeId");

ALTER TABLE "NodeRelation"
    ADD CONSTRAINT "NodeRelation_related_normalized_chk"
    CHECK ("relationType" <> 'RELATED' OR "fromNodeId" < "toNodeId");

CREATE UNIQUE INDEX "NodeRelation_active_unique_idx"
ON "NodeRelation" ("userId", "relationType", "fromNodeId", "toNodeId")
WHERE "deletedAt" IS NULL;
