-- AlterEnum
ALTER TYPE "VerificationPurpose" ADD VALUE 'PHONE_VERIFICATION';
ALTER TYPE "VerificationPurpose" ADD VALUE 'PHONE_LOGIN';

-- AlterTable
ALTER TABLE "users" ADD COLUMN "googleId" TEXT,
ADD COLUMN "phoneVerifiedAt" TIMESTAMP(3),
ALTER COLUMN "email" DROP NOT NULL,
ALTER COLUMN "passwordHash" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "users_phoneNumber_key" ON "users"("phoneNumber");

-- CreateIndex
CREATE UNIQUE INDEX "users_googleId_key" ON "users"("googleId");

-- CreateIndex
CREATE INDEX "users_phoneNumber_idx" ON "users"("phoneNumber");

-- CreateIndex
CREATE INDEX "users_googleId_idx" ON "users"("googleId");
