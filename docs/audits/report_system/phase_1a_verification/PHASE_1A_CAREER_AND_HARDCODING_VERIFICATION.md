# Astro Sushil: Phase 1A Career Report Hardcoding & Personalisation Verification

**Document Reference:** `docs/audits/report_system/phase_1a_verification/PHASE_1A_CAREER_AND_HARDCODING_VERIFICATION.md`  
**Classification:** Empirical Code & Narrative Personalisation Audit  
**Date of Completion:** November 3, 2026  
**Auditor:** DeepMind Agentic Pair Programmer  
**Phase:** Phase 1A (Independent Verification and Evidence Reconciliation)  
**Target Code:** `packages/report-engine/src/mappers/career-report.mapper.ts` (Lines 1508–1804)  

---

## 1. Executive Summary

Phase 0 identified that over 70% of the narrative sections in the Career Report were physically hardcoded in `career-report.mapper.ts`.

To independently verify this finding without relying on previous claims, we tested three contrasting chart fixtures representing radically different life archetypes:
1. **Fixture 1 (Tech Engineer / Analytical):** Born Aug 15, 1998, 08:30 IST, Delhi (Virgo Lagna, Mercury in 12th/Leo, Mars in Cancer).
2. **Fixture 2 (Creative Artist / Designer):** Born May 10, 1985, 14:30 IST, Mumbai (Leo Lagna, Exalted Venus in Pisces in 8th house, Moon in Sagittarius).
3. **Fixture 3 (Senior Corporate / Legal):** Born Nov 20, 1970, 22:15 IST, Kolkata (Cancer Lagna, Jupiter in Libra, Saturn debilitated in Aries in 10th house).

We compared raw mapper output, structured input evidence, and final rendered LaTeX/PDF text.

---

## 2. Hardcoded Sections Register (`career-report.mapper.ts`)

| Report Section | Mapper Model Key | Source Lines | Nature of Content | Did Content Change Between Fixture 1, 2, and 3? |
| :--- | :--- | :--- | :--- | :---: |
| **Top 3 Recommended Career Directions** | `careerDirections` | Lines 1650–1693 | 3 Hardcoded Career Directions:<br>1. *Tech & Engineering Management*<br>2. *Corporate Strategy & Transformation*<br>3. *Data-Driven Financial Strategy* | **NO** (Rank 1, 2, 3 titles, categories, environments, and experiments are 100% identical) |
| **Caution Career Directions** | `cautionCareerDirections` | Lines 1694–1707 | 2 Hardcoded Caution Sectors:<br>1. *High-Frequency Speculative Trading*<br>2. *Pure Administrative Roles* | **NO (100% Identical word-for-word)** |
| **Money & Income Architecture** | `moneyIncomeArchitecture` | Lines 1708–1714 | 5 Static Paragraphs:<br>Earning pattern, income modes, stability, wealth accumulation, risk mitigation. | **NO (100% Identical word-for-word)** |
| **Professional Relationships** | `professionalRelationships` | Lines 1715–1721 | 5 Static Advice Blocks:<br>Partnership viability, client dynamics, networking strategy, mentor alliances, team dynamics. | **NO (100% Identical word-for-word)** |
| **Career Sustainability** | `careerSustainability` | Lines 1722–1726 | 3 Static Blocks:<br>Work-life balance, stress vulnerabilities, endurance tactics. | **NO (100% Identical word-for-word)** |
| **Career Obstacles & Mitigations** | `careerObstacles` | Lines 1727–1742 | 2 Static Obstacles:<br>1. *Organizational Bureaucracy*<br>2. *Perfectionism Leading to Bottlenecks* | **NO (100% Identical word-for-word)** |
| **30-Day Action Roadmap** | `roadmapThirtyDay` | Lines 1765–1772 | Static Action Matrix:<br>Focus, skills, immediate actions, experiments, risks, metrics. | **NO (100% Identical word-for-word)** |
| **90-Day Action Roadmap** | `roadmapNinetyDay` | Lines 1773–1780 | Static Action Matrix:<br>Focus, skills, immediate actions, experiments, risks, metrics. | **NO (100% Identical word-for-word)** |
| **1-Year Action Roadmap** | `roadmapOneYear` | Lines 1781–1788 | Static Action Matrix:<br>Focus, skills, immediate actions, experiments, risks, metrics. | **NO (100% Identical word-for-word)** |
| **3-Year Action Roadmap** | `roadmapThreeYear` | Lines 1789–1796 | Static Action Matrix:<br>Focus, skills, immediate actions, experiments, risks, metrics. | **NO (100% Identical word-for-word)** |
| **Executive Decision Framework** | `decisionFramework` | Lines 1797–1798 | Static Non-Negotiable Rule (1 paragraph). | **NO (100% Identical word-for-word)** |
| **Employment vs Entrepreneurship** | `employmentVsEntrepreneurship` | Lines 1605–1615 | 9 Static Analysis Fields:<br>Support, strengths, risks, environment, model, synthesis. | **NO (100% Identical word-for-word)** |
| **Sector Comparisons** | `sectorComparisons` | Lines 1616–1649 | 4 Hardcoded Sectors:<br>Enterprise Tech, Corporate Strategy, Financial Services, Independent Advisory. | **NO (100% Identical word-for-word)** |

---

## 3. Empirical Content Comparison Across Contrasting Fixtures

### Comparison Methodology & Denominator
To quantify identical content rigorously without confusing boilerplate templates with substantive advice:
- **Denominator:** All substantive, domain-specific guidance fields in `CareerAnalysisModel` (excluding chart metadata, disclaimers, and mathematical tables).
- **Substantive Fields Audited:** 54 discrete text fields across 13 analytical subsections.

### Results:
1. **100% Identical Fields:** **48 out of 54 fields (88.9%)** are verbatim identical strings across Fixture 1 (Tech), Fixture 2 (Creative Artist), and Fixture 3 (Corporate Legal).
2. **Partially Dynamic Fields:** **6 out of 54 fields (11.1%)** contain simple template-string variable interpolation (e.g., `clientName`, `chart.ascendant.sign`, `houseTen.lord`, `houseTen.lordPlacement`).
3. **Fields Derived from AI Analysis in Default Mapper:** **0 fields** in sections 1650–1798.
   - The mapper does not even reference `analysis?.careerDirections`, `analysis?.cautions`, or `analysis?.roadmaps`.
   - The object literals in lines 1650–1798 are unconditional constant definitions.

### Absurdity in Practical Customer Delivery:
- **Fixture 2 (The Creative Artist):** Born with exalted Venus in the 8th house and strong 5th house creative significators receives:
  - **Rank 1 Career:** *"Technology & Engineering Management / Systems Architecture"*.
  - **Recommended Experiment:** *"Lead a cross-functional technical modernization initiative with measurable metrics."*
  - **30-Day Focus:** *"Test a 2-hour daily deep-work block dedicated exclusively to high-value architecture."*
- **Fixture 3 (The Corporate Legal Native):** Born with Cancer Lagna and debilitated Saturn in 10th house receives the exact same engineering advice, speculative trading caution, and bureaucracy obstacle.

---

## 4. Legitimate Constants vs Illegitimate Hardcoding

To maintain objective forensic standards, we distinguish sections that legitimately remain constant from sections that must be dynamic:

| Category | Legitimate Constant? | Rationale |
| :--- | :---: | :--- |
| **Legal Disclaimer** (`disclaimerText`) | **YES** | Standard legal liability language should be identical for all customers. |
| **Methodology Explanations** | **YES** | Educational explanations of BNN, Vimshottari Dasha, or Ashtakavarga principles legitimately remain constant. |
| **Career Directions & Rankings** | **NO (CRITICAL DEFECT)** | Must be derived dynamically from Amatyakaraka, 10th lord, D10 Dashamsha, and AI synthesis. |
| **Cautionary Industries** | **NO (CRITICAL DEFECT)** | Cautionary sectors must reflect afflicted houses or malefic associations, not a universal warning against algorithmic trading. |
| **Action Roadmaps (30d/90d/1y/3y)** | **NO (CRITICAL DEFECT)** | Timelines and strategic actions must align with current running Dasha periods and transit triggers. |
| **Financial & Relationship Advice** | **NO (CRITICAL DEFECT)** | Must reflect the native's 2nd/11th and 7th house configurations. |

---

## 5. Verification Verdict

- **Previous Finding:** **100% CONFIRMED**.
- **Severity:** **CRITICAL**.
- **Practical Customer Impact:** The flagship 65–85 page Career Report is a static pseudo-personalized document. While the astronomical chart tables and planetary positions at the beginning of the dossier reflect the user's birth data, the entirety of the actionable career recommendations, strategic roadmaps, and career rankings are universal constant text.
