# Astro Sushil: Phase 0 AI Interpretation & Prompt Architecture Audit

**Document Reference:** `docs/audits/report_system/PHASE_0_AI_INTERPRETATION_AUDIT.md`  
**Classification:** AI Gateway, Prompt Engineering & Groundedness Audit  
**Date of Audit:** November 3, 2026  
**Status:** Completed; Structural Disconnect Documented  

---

## 1. Executive Summary

This audit evaluated the artificial intelligence interpretation layer of Astro Sushil, focusing on prompt construction, provider orchestration, model selection, structured output schemas, error-handling fallbacks, and the downstream utilization of model responses.

The audit uncovered a **major architectural disconnect**: while the prediction engine constructs a comprehensive prompt requesting 41 structured interpretation fields, the downstream report generation engine **discards approximately 80% of the AI's response**, relying instead on hardcoded static text blocks. Furthermore, free-tier model routing and silent fallback mechanisms frequently bypass the AI entirely, substituting static mock data.

---

## 2. Model Routing & Provider Architecture

### 1. Active Providers & Configuration
- **Active Provider:** `OpenRouterCareerAnalysisProvider` (`packages/prediction-engine/src/providers/openrouter-career-analysis.provider.ts`)
- **Configured Model Hierarchy:**
  ```typescript
  defaultModel = 'poolside/laguna-s-2.1:free';
  fallbackModels = [
    'poolside/laguna-s-2.1:free',
    'nvidia/nemotron-3.5-lightning:free',
    'qwen/qwen3.8-27b:free'
  ];
  ```
- **Alternative Provider:** `GeminiCareerAnalysisProvider` (`gemini-career-analysis.provider.ts`), supporting `gemini-2.5-pro` and `gemini-2.5-flash`, selectable via environment variable `AI_PROVIDER=gemini`.

### 2. Flaws in Provider Selection & Infrastructure
1. **Reliance on Experimental Free Models:**
   - Free-tier endpoints on OpenRouter (`poolside/laguna-s-2.1:free`, `nvidia/nemotron-3.5-lightning:free`) are designated as experimental, community-tier endpoints.
   - They lack guaranteed Service Level Agreements (SLAs), have extreme concurrency throttles, enforce low maximum output token limits (often 2,048 or 4,096 tokens), and suffer frequent downtime and latency spikes.
2. **Schema Size vs. Output Token Limit:**
   - The requested JSON schema comprises **41 detailed multi-sentence fields**.
   - Generating 41 thorough, personalized career sections frequently exceeds 4,000 output tokens.
   - When a free model hits its token limit mid-generation, the resulting JSON is truncated, causing `JSON.parse()` to throw a syntax error.

---

## 3. The Silent Fallback Trap

In `openrouter-career-analysis.provider.ts` lines 117–121:
```typescript
catch (error) {
  logger.warn('OpenRouter provider failed. Falling back to MockCareerAnalysisProvider', {
    error: error instanceof Error ? error.message : String(error),
  });
  return new MockCareerAnalysisProvider().analyze(input);
}
```

### Forensic Analysis of the Trap:
1. When OpenRouter returns HTTP 429 (Rate Limit), HTTP 503 (Model Overloaded), a socket timeout (exceeding 30s), or a JSON parse error due to token truncation, the catch block catches the error.
2. Instead of flagging the job as failed or scheduling a retry with backoff, the provider **silently returns** `MockCareerAnalysisProvider().analyze(input)`.
3. In `MockCareerAnalysisProvider`, all 41 fields are populated with **static, pre-written paragraphs**:
   - `"The astrological profile indicates a highly structured, strategic, and self-directed professional trajectory..."`
   - `"1. Prioritize roles with clear mandate and operational autonomy..."`
   - `"Strategic planning, systems architecture, process optimization..."`
4. The background worker treats this as a successful AI execution, compiles the document, and delivers a completely non-personalized report to the customer without alerting administrators.

---

## 4. Input Groundedness & Prompt Construction

### 1. Evidence Extraction
- **Component:** `CareerEvidenceEngine` (`packages/prediction-engine/src/evidence/career-evidence.engine.ts`)
- **Chart Data Passed to AI:**
  - Ascendant, sign, and lord.
  - 10th house sign, 10th lord placement, and dignity.
  - 6th house sign and 6th lord placement.
  - Jaimini Karakas: Amatyakaraka (career significator) and Atmakaraka (soul significator).
  - D10 (Dashamsha) divisional placements for career.
  - Sarvashtakavarga (SAV) bindu scores for 10th and 11th houses.
  - Planetary strengths and retrograde states.

### 2. Prompt Directives
- **Prompt:** `CAREER_ANALYST_SYSTEM_PROMPT` (`packages/prediction-engine/src/prompts/career-analyst.prompt.ts`)
- **Strengths of Prompt:**
  - Explicitly instructs the LLM: *"You are an Executive Vedic Career Analyst... You must never calculate or infer planetary positions. Use only the deterministic evidence provided in the JSON payload."*
  - Enforces JSON-only output format.
  - Prevents the LLM from inventing astronomical coordinates.

---

## 5. The Downstream Disconnect: Wasted AI Output

The most severe finding regarding AI quality is that **the downstream mapper does not use the majority of what the AI generates**.

The prompt asks the LLM to generate:
- `careerFieldsAnalysis`: Detailed analysis of fields suited for the native.
- `topCareerDirections`: Top 3 recommended career directions.
- `cautionsInCareer`: Industries to avoid.
- `financialAnalysis`: Income patterns and wealth timing.
- `relationshipDynamics`: Professional networking and partnerships.
- `obstacleMitigation`: Specific career bottlenecks.
- `actionRoadmap`: 30-day, 90-day, 1-year, and 3-year execution plans.

**What `career-report.mapper.ts` actually does:**
- Completely ignores `analysis.topCareerDirections`.
- Completely ignores `analysis.cautionsInCareer`.
- Completely ignores `analysis.financialAnalysis`.
- Completely ignores `analysis.relationshipDynamics`.
- Completely ignores `analysis.obstacleMitigation`.
- Completely ignores `analysis.actionRoadmap`.
- Uses hardcoded static arrays in lines 1650–1798 instead!

### Impact on Astrological Integrity:
Because the mapper hardcodes the text of the career directions while interpolating only the 10th Lord name into the template string:
```typescript
astrologicalEvidence: `10th Lord in ${houseModels.houseTen.lordPlacement}, strong Mercury and D10 Dashamsha backing.`
```
The report makes **fraudulent astrological claims**:
- If a customer has a debilitated Mercury in Pisces in the 7th house, the report *still* claims they have "strong Mercury and D10 Dashamsha backing" for Systems Architecture!
- The report presents an artificial citation of astrological authority to justify a hardcoded generic career recommendation.

---

## 6. Report SKU Prompt Coverage

| Report SKU | Prompt Implementation | AI Provider | Findings |
| :--- | :--- | :--- | :--- |
| **CAREER** | `CAREER_ANALYST_SYSTEM_PROMPT` | OpenRouter / Gemini | Prompt requests 41 fields; ~80% discarded by mapper; falls back silently to mock. |
| **KUNDLI** | None | None | Uses static rule-based text strings in `ReportPdfService`. No LLM used. |
| **PLANETARY_SUMMARY** | None | None | Uses static rule-based text strings. Transits are hardcoded constants. |
| **CAREER_PROSITY** | None | None | Uses static rule-based text strings. |
| **MARRIAGE_COMPATIBILITY** | None | None | Uses static rule-based Koota lookup tables. |
| **Remaining 8 Reference SKUs** | None | None | SKUs do not exist in the codebase. |

---

## 7. Recommended AI Architecture Adjustments

1. **Retire Unreliable Free Tier Models:** Migrate production career analysis to dedicated, high-context enterprise endpoints (e.g., `gemini-2.5-pro` or Claude 3.5 Sonnet) with guaranteed uptime and large output token windows.
2. **Eliminate Silent Mock Fallback:** If an AI provider call fails after retries, fail the job explicitly or alert the operations queue. Never deliver mock text as a completed customer report.
3. **Connect Mapper to AI Schema:** Refactor `career-report.mapper.ts` so that every field requested from the AI in `CAREER_ANALYST_SYSTEM_PROMPT` is mapped directly to the LaTeX document model.
4. **Enforce Astrological Claim Verification:** Add pre-compilation validation to ensure that recommendations (e.g. "Systems Architecture") are only included if supporting astrological evidence (e.g. exalted/dignified Mercury/Mars) exists in the native's chart.
