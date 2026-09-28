/*
  Warnings:

  - You are about to drop the `consultation_notes` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `consultation_sessions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `session_observations` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "consultation_notes" DROP CONSTRAINT "consultation_notes_sessionId_fkey";

-- DropForeignKey
ALTER TABLE "session_observations" DROP CONSTRAINT "session_observations_sessionId_fkey";

-- DropTable
DROP TABLE "consultation_notes";

-- DropTable
DROP TABLE "consultation_sessions";

-- DropTable
DROP TABLE "session_observations";

-- DropEnum
DROP TYPE "ObservationTag";

-- DropEnum
DROP TYPE "SessionStatus";
