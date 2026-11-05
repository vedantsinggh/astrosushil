-- AlterTable
ALTER TABLE "birth_profiles" ADD COLUMN     "disambiguation" TEXT,
ADD COLUMN     "disambiguationRequired" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "timezoneOffsetSeconds" INTEGER,
ADD COLUMN     "utcDateTime" TIMESTAMP(3);
