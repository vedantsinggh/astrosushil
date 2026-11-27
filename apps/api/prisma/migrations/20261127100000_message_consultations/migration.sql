-- Website "WhatsApp Message" consultations (website 2026-11-25): no date or slot; a written answer.
ALTER TYPE "ConsultationMode" ADD VALUE IF NOT EXISTS 'MESSAGE';

ALTER TABLE "consultation_bookings" ALTER COLUMN "date" DROP NOT NULL;
ALTER TABLE "consultation_bookings" ALTER COLUMN "startTime" DROP NOT NULL;
ALTER TABLE "consultation_bookings" ALTER COLUMN "endTime" DROP NOT NULL;
ALTER TABLE "consultation_bookings" ALTER COLUMN "slotStartTimeUtc" DROP NOT NULL;
ALTER TABLE "consultation_bookings" ALTER COLUMN "slotEndTimeUtc" DROP NOT NULL;

ALTER TABLE "consultation_bookings" ADD COLUMN "responseText" TEXT;
ALTER TABLE "consultation_bookings" ADD COLUMN "respondedAt" TIMESTAMP(3);
ALTER TABLE "consultation_bookings" ADD COLUMN "respondedBy" TEXT;
