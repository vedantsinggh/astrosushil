CREATE TABLE "staff_auth_attempts" (
    "id" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "windowStartedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedUntil" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "staff_auth_attempts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "staff_auth_attempts_lockedUntil_idx"
    ON "staff_auth_attempts"("lockedUntil");
