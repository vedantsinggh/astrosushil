-- PDF report price entered GST-inclusive or GST-exclusive (owner request 2026-11-27).
ALTER TABLE "report_catalog_entries" ADD COLUMN "priceIncludesGst" BOOLEAN NOT NULL DEFAULT false;
