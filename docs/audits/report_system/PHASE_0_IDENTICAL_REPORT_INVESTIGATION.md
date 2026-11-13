# Astro Sushil: Phase 0 Identical Report Forensic Investigation

**Document Reference:** `docs/audits/report_system/PHASE_0_IDENTICAL_REPORT_INVESTIGATION.md`  
**Classification:** Root-Cause Forensic Audit  
**Date of Audit:** November 3, 2026  
**Status:** Definitively Established  

---

## 1. Triggering Issue & Objective

Two separately generated Career Reports in the Astro Sushil system were reportedly identical word-for-word. The objective of this forensic investigation was to determine whether this anomaly originates in the deterministic astrology engine, data pipeline, AI interpretation, caching, database queries, template compilation, or data mapper layer.

---

## 2. Forensic Trace of the Incident Artifacts

We located and inspected historical generated PDFs stored on the filesystem and in persistent storage:
1. `jhbib_new.pdf` (Generated Oct 5, 2026, 65 pages, Size: 1.2 MB)
2. `f068d80c-5684-40ae-bc41-6ae6f0dd5839.pdf` (Generated Nov 1, 2026, 65 pages, Size: 1.2 MB)
3. `vedant-singh.pdf` (Generated Sep 29, 2026, 87 pages, Size: 1.6 MB)
4. `narayan.pdf` (Generated Oct 13, 2026, 67 pages, Size: 1.2 MB)

Text was extracted from these PDF binaries using `pdftotext` into isolated scratch files (`jhbib.txt`, `f068d80c.txt`, `vedant.txt`, `narayan.txt`) and subjected to automated diffing and line-by-line comparative analysis.

### Findings from Direct Artifact Comparison:
Comparing `jhbib_new.pdf` and `f068d80c-5684-40ae-bc41-6ae6f0dd5839.pdf`:
- **Total substantive text lines:** 1,067
- **Identical lines:** 1,024
- **Identity Percentage:** **95.97% identical word-for-word!**
- The ONLY lines that differed between these two separate 65-page reports were:
  1. The Native's Name on the cover and headers ("jhbib" vs "Vedant Singh").
  2. The Place of Birth ("Jaunpur, India" vs "Delhi, India").
  3. Slight differences in Ascendant degree (Virgo 02° 36' vs Virgo 02° 13') caused by coordinate differences between Jaunpur (82.68°E, 25.74°N) and Delhi (77.20°E, 28.61°N).
  4. Every single paragraph of narrative advice, every career direction, every cautioned industry, every action roadmap, every relationship analysis, and every financial recommendation was **100% identical word-for-word!**

Even when comparing `jhbib.txt` (born 1998, Virgo Ascendant) with `narayan.txt` (born 2005, Scorpio Ascendant):
- **35.57% of all substantive lines across the entire 65+ page document were still 100% identical word-for-word!**

---

## 3. The 3 Root Causes of Identical Reports

Our forensic audit discovered three distinct, compounding root causes that caused this phenomenon:

### Root Cause 1: Database Birth Profile Duplication (Human/Client Input)
Querying the PostgreSQL database (`birth_profiles` table):
```sql
SELECT id, "userId", name, "dateOfBirth", "timeOfBirth", "placeName" 
FROM birth_profiles 
ORDER BY "createdAt" DESC;
```
Revealed that multiple different birth profiles were created with the exact same birth timestamp:
- `jhbib`: `1998-08-15 08:30:00` (Jaunpur, India)
- `Vedant Singh`: `1998-08-15 08:30:00` (New Delhi, India)
- `Apurv verma`: `1998-08-15 08:30:00` (New Delhi, India)
- `dcszx`: `1998-08-15 08:30:00` (New Delhi, India)
- `uyasgd`: `1998-08-15 08:30:00` (New Delhi, India)

Because the deterministic astrology engine produces identical planetary positions for identical birth timestamps, all planetary positions, rashis, nakshatras, and dasha periods were identical across these profiles.

### Root Cause 2: Hardcoded Static Arrays in `career-report.mapper.ts` (CRITICAL CODE DEFECT)
In `packages/report-engine/src/mappers/career-report.mapper.ts` (lines 1508–1804), the mapper constructs `careerAnalysisData`.

The code **completely hardcodes** massive arrays and objects without even referencing AI analysis or dynamic chart variables:

1. **Top Recommended Career Directions (Lines 1650–1693):**
   - **Rank 1 is ALWAYS:** `"Technology & Engineering Management / Systems Architecture"`
   - **Rank 2 is ALWAYS:** `"Corporate Strategy, Operations & Business Transformation"`
   - **Rank 3 is ALWAYS:** `"Data-Driven Financial Strategy & Risk Management"`
   - These are hardcoded directly into the JavaScript source as constant strings. Even if the native has an artist chart, a doctor chart, or a legal chart, their #1 career recommendation is *always* "Technology & Engineering Management / Systems Architecture"!
2. **Caution Career Directions (Lines 1694–1707):**
   - **Caution 1 is ALWAYS:** `"High-Frequency Speculative Trading without Quantitative Models"`
   - **Caution 2 is ALWAYS:** `"Pure Administrative Roles Lacking Strategic Ownership"`
3. **Money & Income Architecture (Lines 1708–1714):**
   - Completely static paragraphs: `"Progressive, compounding revenue growth with acceleration in mid-to-senior career phases."`, etc.
4. **Professional Relationships (Lines 1715–1721):**
   - Completely static advice: `"Partnerships succeed when founded on clear legal contracts..."`
5. **Career Obstacles (Lines 1727–1742):**
   - Static: `"Organizational Bureaucracy & Slow Approvals"` and `"Perfectionism Leading to Execution Bottlenecks"`.
6. **Executive Roadmaps (Lines 1765–1796):**
   - `roadmapThirtyDay`: Always `"Audit Current Operational Commitments & Establish Strategic Priorities"`.
   - `roadmapNinetyDay`: Always `"Execute High-Visibility Initiative & Solidify Stakeholder Rapport"`.
   - `roadmapOneYear`: Always `"Institutional Leadership Mandate & Capability Scaling"`.
   - `roadmapThreeYear`: Always `"Industry Authority, Enterprise Stewardship & Equity Value Creation"`.
7. **Decision Framework (Line 1797):**
   - Constant string: `"Evaluate prospective career opportunities against three non-negotiable criteria..."`.

### Root Cause 3: Silent AI Provider Fallback to Static Mock (SYSTEMIC FAILURE)
In `packages/prediction-engine/src/providers/openrouter-career-analysis.provider.ts`:
- The provider sends requests to OpenRouter using free models:
  ```typescript
  defaultModel = 'poolside/laguna-s-2.1:free';
  fallbackModels = ['nvidia/nemotron-3.5-lightning:free', 'qwen/qwen3.8-27b:free'];
  ```
- Free tier models on OpenRouter are notoriously subject to rate limiting (HTTP 429), timeouts, model outages, and strict token limits.
- In `openrouter-career-analysis.provider.ts` lines 117–121:
  ```typescript
  catch (error) {
    logger.warn('OpenRouter provider failed. Falling back to MockCareerAnalysisProvider');
    return new MockCareerAnalysisProvider().analyze(input);
  }
  ```
- When OpenRouter fails or times out, the error is caught and **silently swallowed**.
- The system returns `MockCareerAnalysisProvider().analyze(input)`.
- In `packages/prediction-engine/src/providers/mock-career-analysis.provider.ts`, every single method returns the **exact same pre-written paragraphs**:
  - `executiveCareerSummary`: "The astrological profile indicates a highly structured, strategic, and self-directed professional trajectory..."
  - `executiveDecisionThemes`: "1. Prioritize roles with clear mandate..."
  - `executiveRecommendations`: "1. Solidify deep technical and managerial expertise..."
  - `careerIdentity`: "The client's career identity is characterized by intellectual rigor..."
  - `naturalStrengths`: "Strategic planning, systems architecture, process optimization..."
- Therefore, whenever OpenRouter encounters network friction or token limits, the entire report reverts to the static mock, resulting in a 100% identical narrative for every customer.

---

## 4. Comprehensive Section-by-Section Personalisation Classification

We examined every section in the 65–85 page Career Report and classified them according to their actual personalization state:

| Section Name | TeX Macro / Mapper Key | Actual Personalization Classification | Explanation & Code Source |
| :--- | :--- | :--- | :--- |
| **Title Page & Client Header** | `\clientName`, `\birthDateFormatted` | **Customer-dependent** | Populated from `clientProfile` in `career-report.mapper.ts`. |
| **Panchanga & Birth Data Table**| `\tablePanchanga` | **Chart-dependent** | Computed deterministically by `astrology-engine`. |
| **Planetary Positions Table** | `\tablePlanetaryPositions` | **Chart-dependent** | Computed deterministically from Julian Day and ephemeris. |
| **House Cusps & Lords Table** | `\tableHouseCusps` | **Chart-dependent** | Computed from Ascendant and Whole Sign boundaries. |
| **Vimshottari Dasha Hierarchy** | `\tableDashaHierarchy` | **Chart-dependent** | Computed deterministically from natal Moon longitude. |
| **Sarvashtakavarga Matrix** | `\tableSAVMatrix` | **Chart-dependent** | Computed deterministically from planetary bindus. |
| **Executive Career Summary** | `executiveCareerSummary` | **Generic fallback / AI** | Uses AI if available, else static template in line 1511. |
| **Executive Decision Themes** | `executiveDecisionThemes` | **Generic fallback / AI** | Uses AI if available, else static text in line 1514. |
| **Executive Recommendations** | `executiveRecommendations` | **Generic fallback / AI** | Uses AI if available, else static text in line 1517. |
| **Career DNA Analysis** | `careerDNAAnalysis` | **Generic fallback / AI** | Uses AI if available, else static text in line 1531. |
| **Strength Matrix Dimensions** | `strengthMatrixDimensions` | **STATIC BY DESIGN** | Hardcoded 6 dimensions in line 1541; only 10th lord interpolated. |
| **Challenge Matrix Dimensions** | `challengeMatrixDimensions` | **STATIC BY DESIGN** | Hardcoded 3 dimensions in line 1585. |
| **Employment vs Entrepreneurship**| `employmentVsEntrepreneurship` | **STATIC BY DESIGN** | Hardcoded 9 fields in line 1605. |
| **Sector Comparisons** | `sectorComparisons` | **STATIC BY DESIGN** | Hardcoded 4 sectors (Tech, Consulting, Finance, Advisory). |
| **Top 3 Career Directions** | `careerDirections` | **STATIC BY DESIGN** | Hardcoded: 1. Tech, 2. Strategy, 3. Finance (lines 1650–1693). |
| **Caution Career Directions** | `cautionCareerDirections` | **STATIC BY DESIGN** | Hardcoded: Speculative Trading & Pure Admin (lines 1694–1707). |
| **Money & Income Architecture** | `moneyIncomeArchitecture` | **STATIC BY DESIGN** | Hardcoded 5 paragraphs (lines 1708–1714). |
| **Professional Relationships** | `professionalRelationships` | **STATIC BY DESIGN** | Hardcoded 5 paragraphs (lines 1715–1721). |
| **Career Sustainability** | `careerSustainability` | **STATIC BY DESIGN** | Hardcoded 3 paragraphs (lines 1722–1726). |
| **Career Obstacles & Mitigations**| `careerObstacles` | **STATIC BY DESIGN** | Hardcoded: Bureaucracy & Perfectionism (lines 1727–1742). |
| **Timeline Windows** | `timelineWindows` | **Transit-period-dependent** | Start/end dates derived from Dasha; advice text static. |
| **30-Day Action Roadmap** | `roadmapThirtyDay` | **STATIC BY DESIGN** | Hardcoded focus, skills, actions, experiments, metrics. |
| **90-Day Action Roadmap** | `roadmapNinetyDay` | **STATIC BY DESIGN** | Hardcoded focus, skills, actions, experiments, metrics. |
| **1-Year Action Roadmap** | `roadmapOneYear` | **STATIC BY DESIGN** | Hardcoded focus, skills, actions, experiments, metrics. |
| **3-Year Action Roadmap** | `roadmapThreeYear` | **STATIC BY DESIGN** | Hardcoded focus, skills, actions, experiments, metrics. |
| **Executive Decision Framework** | `decisionFramework` | **STATIC BY DESIGN** | Hardcoded 3-point rule (line 1797). |
| **Report Disclaimer & Methodology**| `disclaimerText` | **Static by design** | Standard legal disclaimer and BNN explanation. |

---

## 5. Summary Conclusion

The occurrence of two word-for-word identical reports was **not** a database query bug, not a cache key collision, and not a TeX compilation error. It was caused by:
1. **Identical Test Input:** Profiles sharing the exact same birth timestamp (`1998-08-15 08:30:00`).
2. **Hardcoded Code Logic:** Over 70% of the narrative and directional content in `career-report.mapper.ts` is physically hardcoded to constant text blocks that never change.
3. **Silent Fallback:** When OpenRouter fails or hits limits, the system silently defaults to `MockCareerAnalysisProvider`, ensuring that even the remaining 30% of narrative sections become completely identical.
