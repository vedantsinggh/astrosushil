# Asset & Illustration Library Audit and Provenance Specification

**Document ID:** `ASSET_LIBRARY_AUDIT`  
**Date:** November 17, 2026  
**Status:** COMPLETE (Phase 0 Audit Deliverable)  
**Target:** Visual Asset Management Ecosystem  
**Reference Benchmark:** `Career Report(3).pdf` (Astro Arun Pandit, 138 pages)

---

## 1. Executive Summary

A core requirement of the Astro Sushil Editorial Rebuild is the elimination of raw, unadorned, software-like PDF pages and the establishment of a **curated, publication-grade, non-AI-generated visual asset library**.

The current audit reveals that `packages/report-engine` contains **zero visual assets**. Previous report builds relied 100% on bare TikZ line commands. In contrast, the reference benchmark (`Career Report(3).pdf`) utilizes 21 evocative chapter-opening art spreads, ornamental borders, and clean vector icons to create a visually engaging, publication-grade monograph.

This specification details the existing asset inventory across the repository, establishes strict non-AI licensing and provenance protocols, and outlines the curated asset manifest required for the Career Report pilot.

---

## 2. Forensic Audit of Existing Repository Assets

### 2.1 Report Engine Asset State (`packages/report-engine`)
- **Total Image Files:** 0.
- **Total Vector Files:** 0.
- **Graphic Assets Directory:** Does not exist.
- **Current Chart Rendering:** 100% generated inline via XeLaTeX `tikz` macros (`\RenderNorthIndianKundli`). While mathematically precise, these wireframes lack visual framing, background textures, or contextual illustration.

### 2.2 Mobile Application Asset State (`apps/mobile/assets/images`)
An audit of `apps/mobile/assets/images/` and `docs/assets-inventory.md` reveals:
- **System State Illustrations:** 8 files (`state_offline.png`, `state_server_error.png`, etc.) are **77-byte dummy text stubs** rather than real PNG images.
- **Planetary Emblems:** 6 planets exist (`planet_sun.png`, `planet_moon.png`, `planet_mars.png`, `planet_mercury.png`, `planet_jupiter.png`, `planet_venus.png`). However, **3 essential Vedic planets are missing**: `planet_saturn.png`, `planet_rahu.png`, and `planet_ketu.png`.
- **Zodiac Rashi Assets:** All 12 signs are missing (routed through text-based font fallbacks in mobile).
- **Vastu Assets:** All 7 room illustrations are missing.
- **Usable Print-Resolution Assets:** None. The mobile assets are 72 DPI screen raster graphics unsuitable for 300 DPI high-definition PDF printing.

---

## 3. Strict Asset Provenance & Compliance Directives

To preserve trust, respect copyright, and uphold editorial authenticity, the following directives are strictly enforced:

### 3.1 Prohibited Assets
1. **AI-Generated Decorative Imagery:** Absolutely no Midjourney, DALL-E, Stable Diffusion, or AI-generated fantasy artwork. AI-generated images frequently suffer from anatomical distortions, nonsensical astrological symbols, and generic digital artifice.
2. **Fabricated Astrological Data:** No fake planetary charts or simulated constellations masquerading as the client's actual birth data.
3. **Unlicensed Web Scraping:** No uncredited images downloaded from Pinterest, stock sites with watermarks, or competitor PDF reports.
4. **Context-Free Fillers:** No generic decorative images that have no thematic connection to the chapter content.

### 3.2 Permitted & Required Asset Categories
1. **Verified Public-Domain Historical Artwork:** Classical celestial engravings, antique astrolabes, 17th-century astronomical atlases (Johannes Hevelius, John Flamsteed), and traditional Indian astronomical diagrams from the public domain (pre-1928 or CC0).
2. **Original Vector Line Illustrations:** Clean, handcrafted SVG and PDF vector illustrations created specifically for Astro Sushil (e.g. executive path silhouettes, scales of justice, compasses, lamps, scrolls).
3. **Programmatically Generated Astrological Diagrams:** Vector charts generated strictly from the client's verified ephemeris coordinates (TikZ North/South Indian Kundlis, planetary aspect matrices, SAV heatmaps, Dasha progression timelines).
4. **Classical Sanskrit Typography:** Genuine Devanagari calligraphy for epigraphs and mantras with verified textual citations.

---

## 4. Visual Assets in Reference Benchmark (`Career Report(3).pdf`)

Inspection of the 138-page benchmark reveals the following visual taxonomy:

| Element | Benchmark Implementation | Astro Sushil Pilot Translation |
| :--- | :--- | :--- |
| **Cover Illustration** | Full-bleed royal blue night sky; businessman at fork in road between ancient temple and modern metropolis | High-resolution vector/engraving of professional journey under celestial constellations |
| **Page Border** | Elegant royal blue double-line border with corner cutouts | Scalable TikZ/vector double-line border in `astro-frames.sty` |
| **Chapter Openers** | 21 full-page art spreads introducing major themes (mountain summits, ladders, pathways, Saturn near Sun) | 10 dedicated full-page or half-page thematic art plates with chapter epigraphs |
| **Vector Flourishes** | Clean line-art icons at bottom of pages (paper airplane, puzzle pieces, target board, briefcase) | Curated minimalist SVG vector glyphs for callouts and page footers |
| **Watermark** | Subtle traditional mandala watermark on index pages | Elegant TikZ/vector sacred geometry background at 4% opacity |
| **Charts** | North Indian Kundli (D1 and D10) with crisp house numbers and planetary degree labels | Enhanced high-readability TikZ North Indian Kundli with clear house and lord tags |

---

## 5. Curated Asset Manifest for Career Report Pilot

The asset library will be located in `packages/report-engine/latex/assets/` and indexed in `packages/report-engine/latex/assets/asset-manifest.json`:

```json
{
  "manifestVersion": "1.0.0",
  "reportType": "CAREER",
  "assets": [
    {
      "id": "border-royal-double",
      "path": "borders/royal_double_frame.pdf",
      "category": "BORDER",
      "source": "Astro Sushil Vector Studio",
      "license": "Proprietary",
      "attribution": "Astro Sushil",
      "format": "PDF_VECTOR",
      "dpi": "VECTOR_SCALABLE",
      "intendedUsage": "Standard content page frame across all narrative sections"
    },
    {
      "id": "cover-career-path",
      "path": "illustrations/cover_career_voyage.pdf",
      "category": "COVER",
      "source": "Astro Sushil Vector Studio / Classical Celestial Engraving",
      "license": "Proprietary / CC0",
      "attribution": "Astro Sushil",
      "format": "PDF_VECTOR",
      "dpi": "VECTOR_SCALABLE",
      "intendedUsage": "Cover page visual centerpiece"
    },
    {
      "id": "plate-ch01-cosmic-blueprint",
      "path": "illustrations/plate_ch01_celestial_order.pdf",
      "category": "CHAPTER_PLATE",
      "source": "Johannes Hevelius (1690) Prodromus Astronomiae (Public Domain)",
      "license": "Public Domain / CC0",
      "attribution": "Public Domain",
      "format": "PDF_VECTOR",
      "dpi": "VECTOR_SCALABLE",
      "intendedUsage": "Chapter 1 full-page opening art spread"
    },
    {
      "id": "plate-ch03-d10-mastery",
      "path": "illustrations/plate_ch03_executive_hierarchy.pdf",
      "category": "CHAPTER_PLATE",
      "source": "Astro Sushil Vector Studio",
      "license": "Proprietary",
      "attribution": "Astro Sushil",
      "format": "PDF_VECTOR",
      "dpi": "VECTOR_SCALABLE",
      "intendedUsage": "Chapter 3 D10 Dashamsha opening art spread"
    },
    {
      "id": "plate-ch04-saturn-progression",
      "path": "illustrations/plate_ch04_shani_taskmaster.pdf",
      "category": "CHAPTER_PLATE",
      "source": "Astronomical Atlas (Public Domain)",
      "license": "Public Domain / CC0",
      "attribution": "Public Domain",
      "format": "PDF_VECTOR",
      "dpi": "VECTOR_SCALABLE",
      "intendedUsage": "Chapter 4 Bhrigu Nandi Nadi Saturn chain plate"
    },
    {
      "id": "plate-ch05-career-voyage",
      "path": "illustrations/plate_ch05_mountain_summit.pdf",
      "category": "CHAPTER_PLATE",
      "source": "Astro Sushil Vector Studio",
      "license": "Proprietary",
      "attribution": "Astro Sushil",
      "format": "PDF_VECTOR",
      "dpi": "VECTOR_SCALABLE",
      "intendedUsage": "Chapter 5 Life stages and career ascent plate"
    },
    {
      "id": "icon-rudraksha-mukhi",
      "path": "icons/rudraksha_sacred_bead.pdf",
      "category": "ICON",
      "source": "Astro Sushil Vector Studio",
      "license": "Proprietary",
      "attribution": "Astro Sushil",
      "format": "PDF_VECTOR",
      "dpi": "VECTOR_SCALABLE",
      "intendedUsage": "Chapter 9 Remedial section Rudraksha table"
    },
    {
      "id": "icon-vastu-compass",
      "path": "icons/vastu_directional_compass.pdf",
      "category": "ICON",
      "source": "Astro Sushil Vector Studio",
      "license": "Proprietary",
      "attribution": "Astro Sushil",
      "format": "PDF_VECTOR",
      "dpi": "VECTOR_SCALABLE",
      "intendedUsage": "Chapter 9 Astro-Vastu directional grid"
    }
  ]
}
```

---

## 6. Implementation & Verification Protocol
1. All raster illustrations must be high-resolution bitmaps (minimum 300 DPI at full A4 print size: $2480 \times 3508$ pixels) or clean vector PDFs.
2. Every asset in `asset-manifest.json` must have a verifiable licensing source record before inclusion in production builds.
3. The build validator `pdf-qa.validator.ts` will verify that all asset paths declared in templates resolve to physical files on disk before compilation begins.

