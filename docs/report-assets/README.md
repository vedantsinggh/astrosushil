# Astro Sushil Report Assets v2

- `covers/print-a4/`: 13 separate JPEG covers, exactly 2480 × 3508 px, 300 DPI metadata.
- `covers/web-preview/`: 13 optimized WebP previews.
- `illustrations/reports/`: 13 report-specific SVG spot illustrations.
- `illustrations/shared/`: reusable divider, insight and timeline motifs.
- `brand_assets.json`: stable report-key mapping.
- `ANTIGRAVITY_PROMPT.md`: complete implementation brief.

## Source quality
The supplied source was a 1536 × 1024 collage, not 13 original high-resolution files. Each cover was individually cropped from that image, proportion-preserved, and placed on an A4 canvas with a softly extended background. The files have exact A4 pixel dimensions and 300-DPI metadata, but their underlying artwork detail is limited by the supplied collage resolution. They are appropriate for app/website previews and integration testing, not certified print masters. Replace the source artwork with original high-resolution cover files before commercial print production.

Use WebP for website/app previews and JPEG for PDF covers. Keep customer name, birth details, report dates, logo and contact information as live data/text in the renderer.
