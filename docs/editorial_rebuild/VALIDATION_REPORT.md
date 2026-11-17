# Phase 1G End-to-End Monograph Validation & Evidence Reconciliation Report

**Document ID:** `VALIDATION_REPORT`  
**Phase:** Phase 1G Deliverable (Final Schema Closure)  
**Date:** November 17, 2026  
**Status:** 100% VALIDATED, REPRODUCIBLE & SCRIPT-AUDITED (PHASE 1G CLOSURE)  
**Validator Script:** [`scripts/validate-sample-monograph.ts`](file:///home/pilot/Projects/astrosushil/scripts/validate-sample-monograph.ts)  
**Schema Definition:** [`CHAPTER_CONTENT_SCHEMA.ts`](file:///home/pilot/Projects/astrosushil/docs/editorial_rebuild/CHAPTER_CONTENT_SCHEMA.ts)  
**Master Evidence Registry:** [`EVIDENCE_ID_REGISTRY.md`](file:///home/pilot/Projects/astrosushil/docs/editorial_rebuild/EVIDENCE_ID_REGISTRY.md)  
**Sample Content Sections:** [`REVISED_SAMPLE_SECTIONS.md`](file:///home/pilot/Projects/astrosushil/docs/editorial_rebuild/REVISED_SAMPLE_SECTIONS.md)  
**Execution Command:** `npx tsx scripts/validate-sample-monograph.ts`  

---

## 1. Executive Summary & Verification Metrics

This report records the complete end-to-end execution of the strengthened TypeScript claim validator against the Astro Sushil sample monograph chapters (Chapters 2, 3, and 4), Chapter Epigraphs, and Structured Remedial Items. Every calculated fact, traditional shastric principle, modern vocational extrapolation, and interpretive synthesis strictly conforms to the typed domain schema and Master Evidence Registry without drift, tier mismatch, unvalidated text, or unstructured customer-facing remedy prose.

### Automated Heuristic Divergence Guard Clarification
The lexical concept overlap check ($\ge 0.25$ ratio) executed within paragraph and remedy validation is strictly an automated heuristic divergence filter designed to intercept egregious hallucination drift or placeholder prose. **It does NOT establish semantic equivalence, does NOT prove that every rendered sentence is fully supported, and CANNOT replace human editorial and domain review.**

### Monograph Validation Metrics Table

| Metric | Measured Value | Standard / Requirement | Compliance Status |
| :--- | :--- | :--- | :--- |
| **Execution Entry Point** | `scripts/validate-sample-monograph.ts` | Standalone TypeScript Executable | **VERIFIED** |
| **Active Registry Records Loaded** | **61** | Parsed directly from `EVIDENCE_ID_REGISTRY.md` | **VERIFIED** |
| **Tracked Deprecated / Rejected Records** | **5** | 1 deprecated compound ID + 4 rejected IDs | **VERIFIED** |
| **Total Tracked Registry Entries** | **66** | Reconciled across registry & change logs | **VERIFIED** |
| **Thematic Sections Validated** | **3** (Ch. 2, Ch. 3, Ch. 4) | Full sample monograph chapters | **VERIFIED** |
| **Chapter Epigraphs Validated** | **1** (Ch. 2 Epigraph) | Structured transliteration & translation claim | **VERIFIED** |
| **Structured Remedial Items Validated** | **1** (Ch. 2 Saturn Seva) | Fully claim-linked recommendations & protocol | **VERIFIED** |
| **Total Analytical Claims Processed** | **81** | Paragraphs, takeaways, cautions, notices, remedies & epigraph | **VERIFIED** |
| **Total Evidence Dependencies Checked** | **86** | Every dependency checked for existence & tier match | **VERIFIED** |
| **Tier Mismatches Count** | **0** | Strict 1:1 match between claim tier & canonical tier | **PASSED (0 errors)** |
| **Missing Classical Source Citations** | **0** | Mandates `source` and `chapterAndVerse` for `TRADITIONAL_SHASTRA` | **PASSED (0 errors)** |
| **Rejected Disputed Claims in Customer Copy**| **0** | `DISPUTED_OR_UNVERIFIED` barred from customer content | **PASSED (0 errors)** |
| **Rendered-Text Divergence Failures** | **0** | Substantive concept overlap $\ge 25\%$ (Heuristic Filter) | **PASSED (0 errors)** |
| **Unregistered Evidence IDs Count** | **0** | 100% IDs verified in active registry | **PASSED (0 errors)** |
| **Empty Evidence Dependencies Count** | **0** | Every claim declares $\ge 1$ dependencies | **PASSED (0 errors)** |
| **Remedy Prose Validation Failures** | **0** | Zero unstructured substantive remedy copy | **PASSED (0 errors)** |
| **Epigraph Provenance Failures** | **0** | Zero unverified translations or missing source verses | **PASSED (0 errors)** |
| **Title Assertion Failures** | **0** | Zero fatalistic/guarantee tokens in titles/labels | **PASSED (0 errors)** |
| **Final Canonical Validation Status** | `PASSED_ZERO_ERRORS` | Zero schema, registry, or consistency errors | **100% SUCCESS** |

---

## 2. Evidence Registry Count Reconciliation

All evidence records are parsed and categorized programmatically directly from `EVIDENCE_ID_REGISTRY.md`:

### 2.1 Primary Chart (D1 Rashi) Evidence Records: 37 Active Records
1. `d1-asc-scorpio-0906` (`CALCULATED_FACT`)
2. `d1-asc-scorpio-shastric` (`TRADITIONAL_SHASTRA`)
3. `d1-asc-scorpio-modern-extrapolation` (`MODERN_VOCATIONAL_EXTRAPOLATION`)
4. `d1-asc-nakshatra-anuradha-pada2-fact` (`CALCULATED_FACT`)
5. `d1-asc-nakshatra-anuradha-shastric` (`TRADITIONAL_SHASTRA`)
6. `d1-asc-nakshatra-anuradha-synthesis` (`INTERPRETIVE_SYNTHESIS`)
7. `d1-saturn-exalted-12th-fact` (`CALCULATED_FACT`)
8. `d1-saturn-12th-synthesis` (`INTERPRETIVE_SYNTHESIS`)
9. `d1-h1-venus-vishakha-fact` (`CALCULATED_FACT`)
10. `d1-h1-venus-vishakha-shastric` (`TRADITIONAL_SHASTRA`)
11. `d1-h1-ketu-jyeshtha-fact` (`CALCULATED_FACT`)
12. `d1-h1-ketu-jyeshtha-modern-extrapolation` (`MODERN_VOCATIONAL_EXTRAPOLATION`)
13. `d1-h1-ketu-jyeshtha-synthesis` (`INTERPRETIVE_SYNTHESIS`)
14. `d1-lagna-lord-mars-h11-fact` (`CALCULATED_FACT`)
15. `d1-lagna-lord-mars-h11-modern-extrapolation` (`MODERN_VOCATIONAL_EXTRAPOLATION`)
16. `d1-lagna-lord-mars-h11-synthesis` (`INTERPRETIVE_SYNTHESIS`)
17. `d1-chandra-mangal-11th-fact` (`CALCULATED_FACT`)
18. `d1-chandra-mangal-shastric` (`TRADITIONAL_SHASTRA`)
19. `d1-chandra-mangal-modern-extrapolation` (`MODERN_VOCATIONAL_EXTRAPOLATION`)
20. `d1-house-10-leo-shastric` (`TRADITIONAL_SHASTRA`)
21. `d1-house-10-leo-fact` (`CALCULATED_FACT`)
22. `d1-house-10-leo-modern-extrapolation` (`MODERN_VOCATIONAL_EXTRAPOLATION`)
23. `d1-house-10-empty-fact` (`CALCULATED_FACT`)
24. `d1-house-10-empty-shastric` (`TRADITIONAL_SHASTRA`)
25. `d1-house-10-empty-modern-extrapolation` (`MODERN_VOCATIONAL_EXTRAPOLATION`)
26. `d1-10th-lord-sun-h2-fact` (`CALCULATED_FACT`)
27. `d1-10th-lord-sun-h2-shastric` (`TRADITIONAL_SHASTRA`)
28. `d1-10th-lord-sun-h2-modern-extrapolation` (`MODERN_VOCATIONAL_EXTRAPOLATION`)
29. `d1-h2-sun-mercury-jupiter-fact` (`CALCULATED_FACT`)
30. `d1-h2-sun-mercury-jupiter-synthesis` (`INTERPRETIVE_SYNTHESIS`)
31. `d1-aspect-jupiter-to-10th-fact` (`CALCULATED_FACT`)
32. `d1-aspect-jupiter-to-10th-shastric` (`TRADITIONAL_SHASTRA`)
33. `d1-aspect-saturn-to-sun-fact` (`CALCULATED_FACT`)
34. `d1-aspect-saturn-to-sun-shastric` (`TRADITIONAL_SHASTRA`)
35. `d1-aspect-saturn-to-sun-synthesis` (`INTERPRETIVE_SYNTHESIS`)
36. `d1-aspect-mars-to-sun-fact` (`CALCULATED_FACT`)
37. `d1-aspect-mars-to-sun-synthesis` (`INTERPRETIVE_SYNTHESIS`)

### 2.2 Dedicated Career Chart (D10 Dashamsha) Evidence Records: 17 Active Records
1. `d10-asc-libra-birthtime-conditional` (`INTERPRETIVE_CONVENTION`)
2. `d10-chart-purpose-shastric` (`TRADITIONAL_SHASTRA`)
3. `d10-asc-libra-0104-fact` (`CALCULATED_FACT`)
4. `d10-asc-libra-modern-extrapolation` (`MODERN_VOCATIONAL_EXTRAPOLATION`)
5. `d10-lagnesh-venus-in-10th-fact` (`CALCULATED_FACT`)
6. `d10-lagnesh-venus-in-10th-shastric` (`TRADITIONAL_SHASTRA`)
7. `d10-lagnesh-venus-in-10th-modern-extrapolation` (`MODERN_VOCATIONAL_EXTRAPOLATION`)
8. `d10-7th-house-aries-fact` (`CALCULATED_FACT`)
9. `d10-sun-0005-aries-fact` (`CALCULATED_FACT`)
10. `d10-sun-0005-aries-modern-extrapolation` (`MODERN_VOCATIONAL_EXTRAPOLATION`)
11. `d10-saturn-1939-aries-fact` (`CALCULATED_FACT`)
12. `d10-saturn-1939-aries-disputed-neecha-bhanga` (`DISPUTED_OR_UNVERIFIED` — Active Disputed Registry Record)
13. `d10-saturn-1939-aries-modern-extrapolation` (`MODERN_VOCATIONAL_EXTRAPOLATION`)
14. `d10-7th-house-sun-saturn-cooccupancy-fact` (`CALCULATED_FACT`)
15. `d10-7th-house-sun-saturn-cooccupancy-convention` (`INTERPRETIVE_CONVENTION`)
16. `d10-7th-house-sun-saturn-synthesis` (`INTERPRETIVE_SYNTHESIS`)
17. `d1-d10-synthesis` (`INTERPRETIVE_SYNTHESIS`)

### 2.3 Epigraph & Structured Remedial Evidence Records: 7 Active Records
1. `epigraph-ch02-bphs-lagna-source` (`TRADITIONAL_SHASTRA`)
2. `epigraph-ch02-bphs-lagna-translation` (`TRADITIONAL_SHASTRA`)
3. `remedy-ch02-saturn-seva-shastric` (`TRADITIONAL_SHASTRA`)
4. `remedy-ch02-saturn-seva-modern-extrapolation` (`MODERN_VOCATIONAL_EXTRAPOLATION`)
5. `remedy-ch02-saturn-protocol-step1` (`MODERN_VOCATIONAL_EXTRAPOLATION`)
6. `remedy-ch02-saturn-protocol-step2` (`MODERN_VOCATIONAL_EXTRAPOLATION`)
7. `remedy-ethical-disclaimer-standard` (`INTERPRETIVE_CONVENTION`)

- **Subtotal Customer-Facing Active Records:** 37 (D1) + 16 (D10) + 7 (Epigraph/Remedy) = **60 records**
- **Subtotal Disputed Active Records:** 1 (D10) = **1 record**
- **Total Active Registry Records:** **61 records**

### 2.4 Formally Audited Deprecated & Rejected Records: 5 Tracked Records
1. `d1-house-10-empty` (`REPLACED BY ATOMIC TRIAD` — replaced by `d1-house-10-empty-fact`, `d1-house-10-empty-shastric`, `d1-house-10-empty-modern-extrapolation`)
2. `d1-asc-nakshatra-jyeshtha` (`REJECTED IN PHASE 1B` — factually refuted; 09°12' Scorpio is Anuradha Pada 2)
3. `d1-aspect-saturn-to-10th` (`REJECTED IN PHASE 1B` — astronomically refuted; Saturn in Libra does not aspect Leo)
4. `d10-saturn-neecha-bhanga` (`REJECTED IN PHASE 1C/1D` — shastrically disputed; engine does not evaluate varga cancellation)
5. `d10-sun-saturn-tight-conjunction` (`REJECTED IN PHASE 1C` — convention violation; 19°34' is wide co-occupancy, not conjunction)

- **Total Tracked Registry Records:** 61 Active + 5 Deprecated/Rejected = **66 total entries**.

---

## 3. Raw Machine-Readable Validator Output

Executing `npx tsx scripts/validate-sample-monograph.ts` generates the following machine-readable JSON summary and exits with code `0`:

```bash
$ npx tsx scripts/validate-sample-monograph.ts
=== ASTRO SUSHIL CLAIM VALIDATOR EXECUTION ===
{
  "totalSectionsValidated": 3,
  "totalEpigraphsValidated": 1,
  "totalRemediesValidated": 1,
  "activeRegistryRecordsLoaded": 61,
  "totalClaimsProcessed": 81,
  "totalEvidenceDependenciesChecked": 86,
  "tierMismatchesCount": 0,
  "missingSourceReferencesCount": 0,
  "rejectedDisputedClaimsCount": 0,
  "renderedTextConsistencyFailuresCount": 0,
  "unregisteredEvidenceIdsCount": 0,
  "remedyProseFailuresCount": 0,
  "epigraphFailuresCount": 0,
  "titleAssertionFailuresCount": 0,
  "validationStatus": "PASSED_ZERO_ERRORS"
}
>>> 100% CANONICAL MONOGRAPH VALIDATION SUCCESS: ZERO ERRORS DETECTED <<<

=== SYNTHETIC ADVERSARIAL VALIDATION HARNESS (NEGATIVE TESTS) ===
[
  {
    "testCase": "Reject unregistered evidence ID",
    "expectedErrorCode": "NONEXISTENT_EVIDENCE_ID",
    "detected": true,
    "actualError": "Claim \"test-nonexistent-id\" references non-existent evidence ID \"d1-nonexistent-fake-id\"."
  },
  {
    "testCase": "Reject tier mismatch between claim and registered canonical tier",
    "expectedErrorCode": "TIER_MISMATCH",
    "detected": true,
    "actualError": "Claim \"test-tier-mismatch\" tier (CALCULATED_FACT) does not match registered canonical tier (TRADITIONAL_SHASTRA) for evidence ID \"d1-asc-nakshatra-anuradha-shastric\"."
  },
  {
    "testCase": "Reject TRADITIONAL_SHASTRA without specific chapter and verse",
    "expectedErrorCode": "MISSING_TEXTUAL_PROVENANCE",
    "detected": true,
    "actualError": "Claim \"test-missing-provenance\" is classified as TRADITIONAL_SHASTRA but lacks specific chapterAndVerse citation."
  },
  {
    "testCase": "Reject DISPUTED_OR_UNVERIFIED claims in customer-facing content",
    "expectedErrorCode": "DISPUTED_CLAIM_PROHIBITED",
    "detected": true,
    "actualError": "Claim \"test-disputed-claim\" is classified as DISPUTED_OR_UNVERIFIED and cannot be presented as accepted customer-facing content."
  },
  {
    "testCase": "Reject empty evidence dependencies",
    "expectedErrorCode": "EMPTY_EVIDENCE_DEPENDENCIES",
    "detected": true,
    "actualError": "Claim \"test-empty-deps\" must declare at least one evidence dependency."
  },
  {
    "testCase": "Reject rendered text divergence from validated analytical claims (Heuristic)",
    "expectedErrorCode": "RENDERED_TEXT_DIVERGENCE",
    "detected": true,
    "actualError": "Claim \"test-divergent-claim\" concepts diverge from paragraph \"test-divergent-paragraph\" renderedText (overlap ratio 0.00 < 0.25)."
  },
  {
    "testCase": "Reject unsupported substantive remedy prose without valid claims",
    "expectedErrorCode": "UNSUPPORTED_REMEDY_PROSE",
    "detected": true,
    "actualError": "Remedy \"bad-remedy-no-claims\" specificRecommendation lacks valid analytical claims."
  },
  {
    "testCase": "Reject unverified epigraph translation without specific source location",
    "expectedErrorCode": "MISSING_TEXTUAL_PROVENANCE",
    "detected": true,
    "actualError": "Epigraph \"bad-epigraph-unverified\" lacks a specific chapterAndVerse location."
  },
  {
    "testCase": "Reject unsupported sentences attempting to bypass claim structure in protocol",
    "expectedErrorCode": "NONEXISTENT_EVIDENCE_ID",
    "detected": true,
    "actualError": "Claim \"unbacked-bypass-claim\" references non-existent evidence ID \"fake-unbacked-remedy-evidence-id\"."
  },
  {
    "testCase": "Reject fatalistic or unbacked assertions in remedy title",
    "expectedErrorCode": "UNSUPPORTED_ASSERTION_IN_TITLE",
    "detected": true,
    "actualError": "Remedy title \"Guaranteed 100% Career Success Miracle Sapphire\" contains prohibited/unsupported fatalistic token \"guaranteed\"."
  }
]
>>> 100% NEGATIVE TEST SUCCESS: ALL 10 VIOLATION TYPES CORRECTLY INTERCEPTED <<<
```

---

## 4. Adversarial Verification Harness (Negative Testing)

To guarantee that the validator actively enforces editorial, shastric, and remedial constraints rather than acting as a passive pass-through, the script executes ten synthetic negative tests targeting each specific failure mode:

1. **Unregistered Evidence ID Detection (`NONEXISTENT_EVIDENCE_ID`)**:
   - *Input*: Claim declaring dependency on `d1-nonexistent-fake-id`.
   - *Validator Action*: Intercepts unregistered ID and emits `NONEXISTENT_EVIDENCE_ID`.
   - *Result*: **100% Detected**.

2. **Epistemic Tier Drift Detection (`TIER_MISMATCH`)**:
   - *Input*: Claim asserting `d1-asc-nakshatra-anuradha-shastric` as `CALCULATED_FACT`.
   - *Validator Action*: Compares claim's tier with registry's `canonicalTier` (`TRADITIONAL_SHASTRA`) and rejects with `TIER_MISMATCH`.
   - *Result*: **100% Detected**.

3. **Textual Shastric Provenance Enforcement (`MISSING_TEXTUAL_PROVENANCE`)**:
   - *Input*: Claim tagged `TRADITIONAL_SHASTRA` referencing `BPHS` but omitting `chapterAndVerse`.
   - *Validator Action*: Intercepts missing chapter/verse and rejects with `MISSING_TEXTUAL_PROVENANCE`.
   - *Result*: **100% Detected**.

4. **Customer-Facing Disputed Claims Bar (`DISPUTED_CLAIM_PROHIBITED`)**:
   - *Input*: Customer-facing claim tagged `DISPUTED_OR_UNVERIFIED` (e.g. D10 Neecha Bhanga).
   - *Validator Action*: Rejects claim from entering customer-facing content and emits `DISPUTED_CLAIM_PROHIBITED`.
   - *Result*: **100% Detected**.

5. **Empty Evidence Dependency Enforcement (`EMPTY_EVIDENCE_DEPENDENCIES`)**:
   - *Input*: Claim with `evidenceDependencies: []`.
   - *Validator Action*: Rejects unbacked claim with `EMPTY_EVIDENCE_DEPENDENCIES`.
   - *Result*: **100% Detected**.

6. **Rendered Text Consistency Enforcement (`RENDERED_TEXT_DIVERGENCE`)**:
   - *Input*: Rendered paragraph text describing irrelevant topics (gardening/irrigation) while claiming planetary placements.
   - *Validator Action*: Computes substantive word overlap ratio ($0.00 < 0.25$) and rejects with `RENDERED_TEXT_DIVERGENCE`.
   - *Result*: **100% Detected**.

7. **Unsupported Substantive Remedy Prose Detection (`UNSUPPORTED_REMEDY_PROSE`)**:
   - *Input*: Remedy recommendation text with zero associated analytical claims.
   - *Validator Action*: Intercepts unbacked prose and rejects with `UNSUPPORTED_REMEDY_PROSE`.
   - *Result*: **100% Detected**.

8. **Unverified Epigraph Translation Interception (`MISSING_TEXTUAL_PROVENANCE`)**:
   - *Input*: Epigraph lacking specific `chapterAndVerse` citation in its editorial translation claim.
   - *Validator Action*: Intercepts missing classical locus and rejects with `MISSING_TEXTUAL_PROVENANCE`.
   - *Result*: **100% Detected**.

9. **Unbacked Sentences Bypassing Protocol Interception (`NONEXISTENT_EVIDENCE_ID`)**:
   - *Input*: Protocol step with unbacked claim referencing a fictitious evidence ID.
   - *Validator Action*: Intercepts invalid evidence ID and rejects with `NONEXISTENT_EVIDENCE_ID`.
   - *Result*: **100% Detected**.

10. **Fatalistic or Unbacked Title Assertion Interception (`UNSUPPORTED_ASSERTION_IN_TITLE`)**:
    - *Input*: Remedy title containing prohibited fatalistic/guarantee tokens (`"Guaranteed 100% Career Success Miracle Sapphire"`).
    - *Validator Action*: Intercepts forbidden vocabulary tokens and rejects with `UNSUPPORTED_ASSERTION_IN_TITLE`.
    - *Result*: **100% Detected**.

---

## 5. Audit Verdict & Conclusion

The Phase 1G validation execution demonstrates that:
1. Every active evidence ID in `EVIDENCE_ID_REGISTRY.md` is strictly accounted for (61 active, 5 deprecated/rejected, 66 total).
2. The claim validator (`CHAPTER_CONTENT_SCHEMA.ts`) enforces strict 1:1 tier matching, mandatory shastric citations, non-empty dependencies, customer-facing exclusion of disputed claims, rendered text consistency, structured remedial item validity, and epigraph provenance.
3. The lexical overlap check is accurately documented as an automated heuristic divergence guard, not semantic validation.
4. The sample monograph sections, epigraph, and remedial protocol pass all validation rules with **zero errors**.
5. Negative test suites confirm **100% detection rate** across all 10 failure modes.
