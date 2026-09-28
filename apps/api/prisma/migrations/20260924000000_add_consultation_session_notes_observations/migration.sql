-- Migration: add_consultation_session_notes_observations
-- Phase 3: Live Session / Consultation System
-- Generated: 2026-09-24

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "ObservationTag" AS ENUM ('IMPORTANT', 'FOLLOW_UP', 'DISCUSSED', 'REPORT_NEEDED');

-- CreateTable
CREATE TABLE "consultation_sessions" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "adminEmail" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "birthProfileId" TEXT NOT NULL,
    "status" "SessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "durationSeconds" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consultation_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consultation_notes" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "section" TEXT,
    "subject" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consultation_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_observations" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "tag" "ObservationTag" NOT NULL,
    "note" TEXT,
    "section" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "session_observations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "consultation_sessions_adminId_idx" ON "consultation_sessions"("adminId");

-- CreateIndex
CREATE INDEX "consultation_sessions_userId_idx" ON "consultation_sessions"("userId");

-- CreateIndex
CREATE INDEX "consultation_sessions_birthProfileId_idx" ON "consultation_sessions"("birthProfileId");

-- CreateIndex
CREATE INDEX "consultation_sessions_status_idx" ON "consultation_sessions"("status");

-- CreateIndex
CREATE INDEX "consultation_sessions_startedAt_idx" ON "consultation_sessions"("startedAt");

-- CreateIndex
CREATE INDEX "consultation_notes_sessionId_idx" ON "consultation_notes"("sessionId");

-- CreateIndex
CREATE INDEX "consultation_notes_adminId_idx" ON "consultation_notes"("adminId");

-- CreateIndex
CREATE INDEX "session_observations_sessionId_idx" ON "session_observations"("sessionId");

-- CreateIndex
CREATE INDEX "session_observations_adminId_idx" ON "session_observations"("adminId");

-- AddForeignKey
ALTER TABLE "consultation_notes" ADD CONSTRAINT "consultation_notes_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "consultation_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_observations" ADD CONSTRAINT "session_observations_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "consultation_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
