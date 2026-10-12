-- Migration: 20261011020000_consultation_booking_and_sessions
-- Phase 5: Online Consultations, Scheduling, Concurrency Locks & Live Sessions
-- Generated: 2026-10-11

-- CreateEnum
CREATE TYPE "ConsultationMode" AS ENUM ('AUDIO', 'VIDEO', 'IN_PERSON');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING_PAYMENT', 'CONFIRMED', 'RESCHEDULED', 'CANCELLED', 'COMPLETED', 'NO_SHOW', 'REFUNDED');

-- CreateEnum
CREATE TYPE "SlotStatus" AS ENUM ('AVAILABLE', 'RESERVED', 'BOOKED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "ObservationTag" AS ENUM ('IMPORTANT', 'FOLLOW_UP', 'DISCUSSED', 'REPORT_NEEDED');

-- AlterEnum
ALTER TYPE "FulfillmentStatus" ADD VALUE IF NOT EXISTS 'SCHEDULED';

-- CreateTable
CREATE TABLE "consultation_bookings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "birthProfileId" TEXT,
    "orderId" TEXT,
    "consultationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "mode" "ConsultationMode" NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "date" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "slotStartTimeUtc" TIMESTAMP(3) NOT NULL,
    "slotEndTimeUtc" TIMESTAMP(3) NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "practitionerId" TEXT NOT NULL DEFAULT 'astro-sushil',
    "practitionerName" TEXT NOT NULL DEFAULT 'Astro Sushil',
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT,
    "customerEmail" TEXT,
    "primaryQuestion" TEXT,
    "meetingLink" TEXT,
    "locationAddress" TEXT,
    "reservationExpiresAt" TIMESTAMP(3),
    "internalNotes" TEXT,
    "rescheduleReason" TEXT,
    "cancellationReason" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consultation_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointment_slots" (
    "id" TEXT NOT NULL,
    "practitionerId" TEXT NOT NULL DEFAULT 'astro-sushil',
    "date" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "startTimeUtc" TIMESTAMP(3) NOT NULL,
    "endTimeUtc" TIMESTAMP(3) NOT NULL,
    "status" "SlotStatus" NOT NULL DEFAULT 'AVAILABLE',
    "bookingId" TEXT,
    "lockedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointment_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consultation_sessions" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "adminEmail" TEXT,
    "userId" TEXT NOT NULL,
    "birthProfileId" TEXT NOT NULL,
    "bookingId" TEXT,
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
CREATE INDEX "consultation_bookings_userId_idx" ON "consultation_bookings"("userId");

-- CreateIndex
CREATE INDEX "consultation_bookings_date_status_idx" ON "consultation_bookings"("date", "status");

-- CreateIndex
CREATE INDEX "consultation_bookings_practitionerId_date_idx" ON "consultation_bookings"("practitionerId", "date");

-- CreateIndex
CREATE INDEX "consultation_bookings_orderId_idx" ON "consultation_bookings"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "appointment_slots_bookingId_key" ON "appointment_slots"("bookingId");

-- CreateIndex
CREATE INDEX "appointment_slots_date_status_idx" ON "appointment_slots"("date", "status");

-- CreateIndex
CREATE UNIQUE INDEX "appointment_slots_practitionerId_date_startTime_key" ON "appointment_slots"("practitionerId", "date", "startTime");

-- CreateIndex
CREATE INDEX "consultation_sessions_userId_idx" ON "consultation_sessions"("userId");

-- CreateIndex
CREATE INDEX "consultation_sessions_adminId_status_idx" ON "consultation_sessions"("adminId", "status");

-- CreateIndex
CREATE INDEX "consultation_sessions_bookingId_idx" ON "consultation_sessions"("bookingId");

-- CreateIndex
CREATE INDEX "consultation_notes_sessionId_idx" ON "consultation_notes"("sessionId");

-- CreateIndex
CREATE INDEX "session_observations_sessionId_idx" ON "session_observations"("sessionId");

-- AddForeignKey
ALTER TABLE "consultation_bookings" ADD CONSTRAINT "consultation_bookings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultation_bookings" ADD CONSTRAINT "consultation_bookings_birthProfileId_fkey" FOREIGN KEY ("birthProfileId") REFERENCES "birth_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultation_bookings" ADD CONSTRAINT "consultation_bookings_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_slots" ADD CONSTRAINT "appointment_slots_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "consultation_bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultation_sessions" ADD CONSTRAINT "consultation_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultation_sessions" ADD CONSTRAINT "consultation_sessions_birthProfileId_fkey" FOREIGN KEY ("birthProfileId") REFERENCES "birth_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultation_sessions" ADD CONSTRAINT "consultation_sessions_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "consultation_bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultation_notes" ADD CONSTRAINT "consultation_notes_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "consultation_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_observations" ADD CONSTRAINT "session_observations_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "consultation_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
