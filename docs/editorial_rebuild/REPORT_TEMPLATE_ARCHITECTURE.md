# Architecture Specification: Modular Report-Engine LaTeX Architecture

**Document ID:** `REPORT_TEMPLATE_ARCHITECTURE`  
**Date:** November 17, 2026  
**Status:** COMPLETE (Phase 0 Audit Deliverable)  
**Target:** Report Engine Template Subsystem  
**Reference Benchmark:** `Career Report(3).pdf` (Astro Arun Pandit, 138 pages)

---

## 1. Current State Evaluation: The Monolithic Bottleneck

### 1.1 The Career Report Template (`main.tex`)
Currently, `packages/report-engine/templates/main.tex` is a single monolithic file spanning **1,860 lines of code**. It contains:
- Font declarations (TeX Gyre Pagella, Open Sans, DejaVu Sans).
- Package imports (`tcolorbox`, `tikz`, `geometry`, `fancyhdr`, `tabularx`, etc.).
- Color palettes and theme settings.
- Custom macro definitions (`\ReportPage`, `\TwoCol`, `\RenderNorthIndianKundli`, `\VargaSectionPage`).
- Document layout and structural markup across all 13 Parts.
- Hundreds of direct macro calls to `report_data.tex` variables.

#### Core Architectural Defects in `main.tex`:
1. **Zero Separation of Concerns:** Layout, styling, macros, business logic presentation, and content markup are welded together. Any layout adjustment requires editing an 1,860-line file.
2. **Unconditional Hard Page Breaks:** The macro `\ReportPage` executes `\clearpage` at the start of every page:
   ```latex
   \newcommand{\ReportPage}[3]{%
     \clearpage
     \CurrentSection{#1}%
     ...
   }
   ```
   If a section has 80 words of content, it takes up an entire A4 page, leaving the remaining 140–180mm of vertical height completely empty.
3. **Rigid Box Containment:** Narrative prose is trapped inside nested `tcolorbox` containers with fixed background tints (`Mist`, `PaleGold`, `PaleBurgundy`). This creates a disjointed "tile board" aesthetic rather than a flowing editorial publication.
4. **Tight Macro Coupling:** `report-data-tex.generator.ts` generates 755 lines of single-variable `\newcommand` bindings (`\HouseOneCareerInterpretation`, `\SunConstructiveExpression`, etc.). If a field is omitted or renamed, compilation fails or falls back to `\RenderUnavailable`.

### 1.2 The Other 11 Report Types (The PDF Writer Split)
The remaining 11 report types in Astro Sushil (`KUNDLI`, `PLANETARY_SUMMARY`, `HOROSCOPE`, `FINANCE`, `LOVE`, `FORTUNE`, `FORTUNE_PLUS`, `SATURN`, `JUPITER_TRANSIT`, `RAHU_KETU_TRANSIT`, `VARSHPHAL`) do **not** use LaTeX at all. 

Instead, they use a custom TypeScript programmatic vector PDF builder (`PdfWriter` in `packages/report-engine/src/pdf/pdf-writer.ts` and `report-pdf.service.ts`).
- `PdfWriter` manually calculates coordinate points `(x, y)` in PostScript points.
- It draws primitive rectangles (`pdf.drawRect`), text strings (`pdf.drawText`), and simple lines.
- It lacks hyphenation, microtypography, kerning, mathematical typography, text wrapping around figures, and professional book design capabilities.

This has resulted in an unhealthy two-tier codebase:
- `CAREER`: A heavy, rigid 68-page XeLaTeX document.
- Other Reports: Primitive, rudimentary 7–35 page canvas drawings lacking editorial polish.

---

## 2. Target Modular LaTeX Architecture

To support the Career Report pilot and establish an extensible foundation for subsequent reports (Marriage, Finance, Kundli, Varshphal, etc.), we introduce a **modular package-based LaTeX architecture**.

```
packages/report-engine/
├── latex/
│   ├── common/                  # Shared style packages across all report types
│   │   ├── astro-base.sty       # Core packages, geometry, hyperref, colors
│   │   ├── astro-typography.sty # Font definitions, type scale, drop caps, lead paragraphs
│   │   ├── astro-frames.sty     # Royal blue double-line page borders, corner flourishes
│   │   ├── astro-kundli.sty     # Parametric North & South Indian Kundli rendering
│   │   ├── astro-tables.sty     # High-readability tables, SAV matrices, dasha schedules
│   │   └── astro-callouts.sty   # Quotes, verse blocks (Devanagari/transliteration), notes
│   ├── assets/                  # Shared verified non-AI visual assets
│   │   ├── branding/            # Astro Sushil logo, stamp, signatures
│   │   ├── borders/             # High-resolution vector corner ornaments and dividers
│   │   ├── illustrations/       # Chapter-opening full-page and half-page art spreads
│   │   └── icons/               # Astrological glyphs, directional compasses, remedial symbols
│   └── templates/               # Report-specific master templates
│       ├── career/              # CAREER REPORT PILOT
│       │   ├── career_master.tex
│       │   ├── chapters/        # Modular chapter include files
│       │   │   ├── ch01_welcome.tex
│       │   │   ├── ch02_blueprint.tex
│       │   │   ├── ch03_d10_mastery.tex
│       │   │   ├── ch04_nadi_progression.tex
│       │   │   ├── ch05_career_voyage.tex
│       │   │   ├── ch06_government_enterprise.tex
│       │   │   ├── ch07_business_compass.tex
│       │   │   ├── ch08_cosmic_clock.tex
│       │   │   ├── ch09_remedial_alchemy.tex
│       │   │   └── ch10_roadmap.tex
│       │   └── career_data.tex  # Scoped data injected per job
│       ├── kundli/              # Future Kundli master template
│       ├── marriage/            # Future Marriage compatibility template
│       └── finance/             # Future Finance intelligence template
```

---

## 3. Detailed Component Specifications

### 3.1 `astro-frames.sty` (The Royal Blue Editorial Frame)
As demonstrated by the reference benchmark, every standard content page features an elegant, subtle double-line border with corner notches and header/footer integration:
- **Outer Rule:** 0.8pt Royal Blue (`#1A365D` or `#1E40AF`).
- **Inner Rule:** 0.4pt Sky Blue (`#60A5FA` or `#93C5FD`), spaced 1.5mm inside the outer rule.
- **Corner Notches:** Inset corner cut-outs or ornamental vector glyphs.
- **Top Header Integration:** Running chapter title subtly centered or pinstriped above the content area.
- **Bottom Footer Integration:** Elegant Astro Sushil logo / brand mark at bottom center, flanked by discreet folio page numbers (`Page X of Y`).

### 3.2 `astro-typography.sty` (Editorial Typography Hierarchy)
Replacing the cramped, bold-heavy software styling with a balanced editorial hierarchy:
- **Primary Serif:** TeX Gyre Pagella (classical, readable, dignified).
- **Secondary Sans:** Open Sans (clean, modern metadata, table headings, and data values).
- **Devanagari Font:** Lohit Devanagari or Noto Sans Devanagari for Sanskrit verses (Bhagavad Gita, Upanishads, classical slokas).
- **Scale:**
  - Document Title (Cover): 36pt / 44pt bold.
  - Chapter Title: 22pt / 28pt small caps with letterspacing.
  - Section Heading: 14pt / 18pt bold serif with subtle underline flourish.
  - Subsection / Theme: 11pt / 14pt bold sans.
  - Body Text: 9.5pt / 14.5pt (generous line leading for sustained reading comfort).
  - Quotes / Epigraphs: 10pt / 15pt italic with quotation bar.
  - Bullet Points: 9.2pt / 13.5pt with custom Unicode bullets (`✦`, `❖`, `✤`, `➤`, `✶`).

### 3.3 Natural Pagination Engine (`report-section-composer.ts`)
Instead of forcing a page break before every minor placement:
- Major Chapters start on a fresh page with a dedicated header banner or full-page art spread.
- Within chapters, sections flow naturally down the page.
- Page breaks occur only when vertical space is genuinely exhausted (`\vfill\break` or natural TeX penalty calculation), preventing awkward orphan headings (`\needspace{4.5cm}`).
- This immediately eliminates the "16 pages with 150mm empty whitespace" defect.

### 3.4 Decoupled Data Injection (`career_data.tex`)
Instead of 158 isolated one-sentence variables, the data injector provides:
1. **Deterministic Metrics Block:** Clean structured definitions for dates, planetary degrees, signs, houses, balas, and SAV scores.
2. **Editorial Content Ingestion:** Structured chapter-level blocks containing full narrative paragraphs generated by the editorial pipeline.

---

## 4. Report Type Specialization Matrix

| Report Type | Primary Focus | Visual Style Variant | Key Visual Components | Target Length |
| :--- | :--- | :--- | :--- | :--- |
| **Career (Pilot)** | Executive trajectory, D10, Nadi, Yogas, Timing | Royal Blue & Gold Corporate Editorial | North Indian D1/D10, SAV Matrix, Timeline, Career Roadmap | ~50–65 pages |
| **Kundli** | Exhaustive life blueprint, 16 Vargas, Ashtakavarga | Crimson & Deep Ochre Classical | Full Shodashvarga gallery, Bhava Bala charts, Tara Chakra | ~60–80 pages |
| **Marriage** | Synastry, Ashta Koota, Manglik, 7th house | Warm Rose & Saffron Heritage | Dual Kundli overlay, Koota score meters, Venus/Mars dynamics | ~30–45 pages |
| **Finance** | Wealth yogas, 2nd/11th houses, Dhana karakas | Emerald & Deep Navy Fiscal | SAV cash flow quadrant, Indu Lagna, D2 Hora deep-dive | ~35–50 pages |
| **Horoscope** | Annual Varshphal, Muntha, Solar Return | Lapis & Gold Celestial | Annual chart, Patyayini dasha, Month-by-month forecast | ~25–40 pages |

---

## 5. Architectural Non-Regressive Guarantees
1. `packages/report-engine/templates/main.tex` and `prototype_main.tex` remain intact during this audit and initial build.
2. Existing test suites for calculation logic, prompt mapping, and data validation continue to execute against their respective modules.
3. The new modular template directory structure (`packages/report-engine/latex/`) will be introduced cleanly alongside existing assets without breaking backward compatibility.

