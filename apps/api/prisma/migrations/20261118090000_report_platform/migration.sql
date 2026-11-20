-- Universal report platform: Baby Name report type and LLM topic cache.

-- AlterEnum
ALTER TYPE "ReportType" ADD VALUE 'BABY_NAME';

-- CreateTable
CREATE TABLE "report_topic_cache" (
    "key" TEXT NOT NULL,
    "subjectRef" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "definitionId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "generationId" TEXT NOT NULL,
    "parts" JSONB NOT NULL,
    "payload" JSONB NOT NULL,
    "tokens" JSONB NOT NULL,
    "latencyMs" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_topic_cache_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "report_topic_cache_subjectRef_idx" ON "report_topic_cache"("subjectRef");

-- CreateIndex
CREATE INDEX "report_topic_cache_definitionId_topicId_idx" ON "report_topic_cache"("definitionId", "topicId");
