-- Admin notification campaigns (owner request 2026-11-27).
CREATE TABLE "notification_campaigns" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "link" TEXT,
    "channels" JSONB NOT NULL,
    "audience" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "recipients" INTEGER NOT NULL DEFAULT 0,
    "skippedNoConsent" INTEGER NOT NULL DEFAULT 0,
    "inApp" INTEGER NOT NULL DEFAULT 0,
    "pushSent" INTEGER NOT NULL DEFAULT 0,
    "pushFailed" INTEGER NOT NULL DEFAULT 0,
    "noDevice" INTEGER NOT NULL DEFAULT 0,
    "emailQueued" INTEGER NOT NULL DEFAULT 0,
    "smsQueued" INTEGER NOT NULL DEFAULT 0,
    "whatsappQueued" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "createdById" TEXT NOT NULL,
    "createdByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    CONSTRAINT "notification_campaigns_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "notification_campaigns_createdAt_idx" ON "notification_campaigns"("createdAt");
