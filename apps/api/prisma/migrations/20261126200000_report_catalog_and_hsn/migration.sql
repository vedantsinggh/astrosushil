-- GST invoice (owner decision 2026-11-26): HSN/SAC code per product.
ALTER TABLE "products" ADD COLUMN "hsnSac" TEXT;

-- Admin-editable report catalogue (owner decision 2026-11-26).
CREATE TABLE "report_catalog_entries" (
    "catalogId" TEXT NOT NULL,
    "name" TEXT,
    "slug" TEXT,
    "shortDescription" TEXT,
    "description" TEXT,
    "coverImageUrl" TEXT,
    "coverImageKey" TEXT,
    "salePricePaise" INTEGER,
    "originalPricePaise" INTEGER,
    "gstRateBp" INTEGER,
    "isActive" BOOLEAN,
    "isPremium" BOOLEAN NOT NULL DEFAULT true,
    "benefits" JSONB NOT NULL DEFAULT '[]',
    "features" JSONB NOT NULL DEFAULT '[]',
    "faqs" JSONB NOT NULL DEFAULT '[]',
    "hsnSac" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "report_catalog_entries_pkey" PRIMARY KEY ("catalogId")
);

CREATE UNIQUE INDEX "report_catalog_entries_slug_key" ON "report_catalog_entries"("slug");
