-- Daily Rashi Bhavishya: validated narrative per IST date, Moon sign, language and method version.

-- CreateTable
CREATE TABLE "rashi_daily_horoscopes" (
    "id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "rashiIndex" INTEGER NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'en',
    "methodVersion" TEXT NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "factsHash" TEXT NOT NULL,
    "facts" JSONB NOT NULL,
    "narrative" JSONB NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "generationId" TEXT NOT NULL,
    "tokens" JSONB NOT NULL,
    "latencyMs" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rashi_daily_horoscopes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "rashi_daily_horoscopes_date_rashiIndex_language_methodVersi_key" ON "rashi_daily_horoscopes"("date", "rashiIndex", "language", "methodVersion", "promptVersion");

-- CreateIndex
CREATE INDEX "rashi_daily_horoscopes_date_idx" ON "rashi_daily_horoscopes"("date");
