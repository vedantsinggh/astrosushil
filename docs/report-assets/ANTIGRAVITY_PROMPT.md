# Antigravity task: redesign all 13 Astro Sushil reports

Read this file, `README.md`, and `brand_assets.json` fully before editing. Work with parallel agents for independent audit, web, Flutter, PDF and QA tasks. Keep one integration owner responsible for shared components and final verification. Implement, do not stop at planning.

## Catalog (all 13 must appear on website and app)
- KUNDLI / report-kundli — Premium Personalised Kundli Report
- CAREER / report-career / CAREER_PROSITY — Career Report
- MARRIAGE_COMPATIBILITY / report-marriage — Couple Kundli Matching Report
- FINANCE / report-finance — Finance Report
- LOVE / report-love — Love Report
- FORTUNE / report-fortune — Fortune Report
- FORTUNE_PLUS / report-fortune-plus — Personalised Fortune Report Plus
- HOROSCOPE / report-horoscope / report-personalised-horoscope — Personalised Horoscope Report
- SATURN / report-saturn — Saturn In Your Birth Chart Report
- JUPITER_TRANSIT / report-jupiter-transit — Jupiter Transit Report
- RAHU_KETU_TRANSIT / report-rahu-ketu-transit — Rahu Ketu Transit Report
- VARSHPHAL / report-varshphal — Varshphal Report
- BABY_NAME / report-baby-name — Baby Name Report

Use `brand_assets.json` as the asset mapping, but reconcile with current backend IDs/routes and preserve legacy aliases.

## Visual design
Follow the supplied 13-cover reference: jewel-tone purple, teal, magenta, emerald, rose, amber, indigo and blue palettes; celestial line-art; gold/cream accents; ornamental borders; elegant serif headings; highly readable modern body type. Keep a common design system while giving every report a distinct visual motif.

## Assets
- Web/app previews: `covers/web-preview/<key>.webp`
- PDF covers: `covers/print-a4/<key>.jpg`
- Section spot art: `illustrations/reports/<key>.svg`
- Shared motifs: `illustrations/shared/`
Copy assets into the repository's normal asset location. Do not reference this extracted folder at runtime.

## Interior redesign for all 13
The current Career PDF demonstrates the issue: pages such as Career Houses (section 1), Career Yogas (section 5), and Transit tables (section 12) are dense tables followed by long text blocks. Make reports feel warm, personal and alive without deleting facts or changing astrological calculations.

Build reusable components:
- Branded section opener with section number, title, context line and report-specific illustration.
- At-a-glance insight cards, highlighted key findings, small callouts and pull quotes.
- Planet/sign/house/yoga/transit iconography and SVG illustrations beside relevant explanations.
- Break long interpretations into readable subheads and shorter visual blocks while retaining full text.
- Convert tables to visual summaries where useful, but retain precise underlying values in a table/detail view.
- Use timelines for dated dashas, transits, yearly forecasts and phases; use exact engine-provided dates.
- Add chart-driven diagrams, house maps, relationship/compatibility visuals, financial strength cards, career path visuals, yearly wheels and name/meaning cards as appropriate to the report.
- App: expandable insight cards, tabs, tappable planet/house explanations, filters for timelines and chart detail.
- PDF: static but visually rich, printable and accessible.
- Vary page composition; avoid repeating the same card grid on every page.

## Report-specific illustration language
- Kundli: kundli diamond, houses, signs, planet placements.
- Career: career path, strengths, professional phases, yogas, D10/Dashamsha references.
- Couple Matching: two-chart comparison, compatibility dimensions, relationship motifs.
- Finance: wealth indicators, earning/saving themes, finance-house diagrams.
- Love: relationship themes, Venus/Moon motifs, emotional/partnership callouts.
- Fortune: opportunity/luck motifs and supportive periods.
- Fortune Plus: richer multi-period opportunity map and premium summary.
- Horoscope: zodiac wheel, ascendant and planetary overview.
- Saturn: Saturn ringed planet, house transit and timeline.
- Jupiter Transit: Jupiter motif, sign/house movement and dated timeline.
- Rahu Ketu Transit: paired node motif, axis/house movement and timeline.
- Varshphal: annual chart, year wheel, month/period timeline.
- Baby Name: name cards, meaning/origin/pronunciation and shortlist presentation.

## Correctness and personalisation (non-negotiable)
All names, birth details, placements, yogas, scores, dates, periods, predictions, remedies, compatibility values and interpretations must come from existing report payloads and the astrology engine. Never hardcode sample customer data or invent astrological facts. Illustrations are decorative only; data-driven charts must use actual report data. Preserve calculation conventions, methodology notes, disclaimers and existing engine outputs. Handle missing data, long text and long names gracefully.

## Website
Audit why only four reports are currently shown (API/catalog/config/filter/feature flag). Fix the root source, not merely the UI. Show all 13 cards with correct title, preview image, description and existing pricing/availability; do not invent commercial data. Add responsive detail/preview views, SEO metadata and working CTAs.

## Flutter app
Show all 13 reports with image-led cards and consistent portrait preview ratios. Add detail screens with larger preview, report description, included sections from existing data and CTA. Replace old preview images, preserve routes/aliases, lazy-load/cache images and add accessibility labels.

## PDF
Update shared templates/components rather than making 13 unrelated implementations. Use A4 portrait pages; use supplied cover JPGs. Add SVG support where the renderer permits. Ensure tables repeat headers, no clipping/overflow, footnotes remain legible and long content paginates safely. Keep all customer-specific text dynamically rendered from report payloads.

## QA
- Test mapping for all 13 report keys and legacy aliases.
- Assert exactly 13 unique report cards in website and Flutter catalog.
- Generate a sample PDF for each report type from test fixtures.
- Check A4 dimensions, missing assets, page overflow, clipping, page numbering and long content.
- Run backend/frontend/Flutter tests, lint/type checks and production builds where configured.
- Review screenshots of all 13 covers and representative interior pages.
- Report changed files, commands/tests, build status, visual checks and remaining limitations.

Do not rewrite the astrology engine or unrelated flows. Implement the complete redesign and verify it.
