# Astro Sushil: Phase 1A AI Pipeline Field Trace & Fallback Audit

**Document Reference:** `docs/audits/report_system/phase_1a_verification/PHASE_1A_AI_PIPELINE_FIELD_TRACE.md`  
**Classification:** End-to-End AI Dataflow & Field-Level Consumption Audit  
**Date of Completion:** November 3, 2026  
**Auditor:** DeepMind Agentic Pair Programmer  
**Phase:** Phase 1A (Independent Verification and Evidence Reconciliation)  
**Target Code:** `packages/prediction-engine/src/prompts/career-analyst.prompt.ts`, `openrouter-career-analysis.provider.ts`, `packages/report-engine/src/mappers/career-report.mapper.ts`  

---

## 1. Executive Summary

We audited the entire dataflow of the Astro Sushil AI interpretation pipeline:
$$\text{Input Payload} \longrightarrow \text{System Prompt} \longrightarrow \text{OpenRouter API} \longrightarrow \text{Zod Validator} \longrightarrow \text{Report Mapper} \longrightarrow \text{LaTeX TeX Generator} \longrightarrow \text{XeLaTeX PDF}$$

### Key Findings:
1. **Field Waste & Architectural Disconnect:**  
   The LLM prompt strictly demands **42 structured JSON fields** from the AI provider. However, `career-report.mapper.ts` only consumes **11 of these fields (26.2%)**. Exactly **31 fields (73.8%)** are validated, parsed, and then completely discarded by the mapper, which substitutes hardcoded constants in their place.
2. **Silent Fallback to Mock Data:**  
   When OpenRouter rate limits (HTTP 429), times out, truncates output (`finishReason=length`), or encounters network errors, `OpenRouterCareerAnalysisProvider` silently swallows the error and invokes `MockCareerAnalysisProvider`.
3. **Ghost Successful Deliveries:**  
   BullMQ marks the job as `COMPLETED` (100% progress). The database record does not record any fallback flag in `metadata`. Customers receive a report containing static mock text without anyone being alerted.

---

## 2. Complete Field-Level Consumption Matrix (42 Prompt Fields)

| # | Requested Field Name in System Prompt | Emitted by AI Provider? | Validated by Schema? | Consumed by Mapper (`analysis.X`)? | Reaches LaTeX / PDF? | Status in Final Customer PDF |
| :-: | :--- | :---: | :---: | :---: | :---: | :--- |
| **1** | `executiveCareerSummary` | Yes | Yes | **YES** (Line 1510) | **YES** (`\ExecutiveCareerSummary`) | Dynamic (or Mock fallback) |
| **2** | `executiveDecisionThemes` | Yes | Yes | **YES** (Line 1513) | **YES** (`\ExecutiveDecisionThemes`) | Dynamic (or Mock fallback) |
| **3** | `executiveRecommendations` | Yes | Yes | **YES** (Line 1516) | **YES** (`\ExecutiveRecommendations`) | Dynamic (or Mock fallback) |
| **4** | `careerIdentity` | Yes | Yes | **YES** (Line 1519) | **YES** (`\CareerIdentity`) | Dynamic (or Mock fallback) |
| **5** | `professionalPersonality` | Yes | Yes | **YES** (Line 1522) | **YES** (`\ProfessionalPersonality`) | Dynamic (or Mock fallback) |
| **6** | `naturalStrengths` | Yes | Yes | **YES** (Line 1525) | **YES** (`\NaturalStrengths`) | Dynamic (or Mock fallback) |
| **7** | `professionalChallenges` | Yes | Yes | **YES** (Line 1528) | **YES** (`\ProfessionalChallenges`) | Dynamic (or Mock fallback) |
| **8** | `careerDNAAnalysis` | Yes | Yes | **YES** (Line 1531) | **YES** (`\CareerDNAAnalysis`) | Dynamic (or Mock fallback) |
| **9** | `planetarySynthesis` | Yes | Yes | **YES** (Line 1534) | **YES** (`\PlanetarySynthesis`) | Dynamic (or Mock fallback) |
| **10** | `yogaAnalysis` | Yes | Yes | **YES** (Line 1537) | **YES** (`\YogaAnalysisText`) | Dynamic (or Mock fallback) |
| **11** | `employmentEntrepreneurshipAnalysis` | Yes | Yes | **NO (Discarded)** | No | **Replaced by hardcoded static text** |
| **12** | `leadershipAnalysis` | Yes | Yes | **NO (Discarded)** | No | **Completely omitted from PDF** |
| **13** | `technicalAnalyticalAptitude` | Yes | Yes | **NO (Discarded)** | No | **Completely omitted from PDF** |
| **14** | `creativeCommunicationBusinessAptitude` | Yes | Yes | **NO (Discarded)** | No | **Completely omitted from PDF** |
| **15** | `researchPotential` | Yes | Yes | **NO (Discarded)** | No | **Completely omitted from PDF** |
| **16** | `sectorFit` | Yes | Yes | **NO (Discarded)** | No | **Replaced by hardcoded 4 sectors** |
| **17** | `internationalCareer` | Yes | Yes | **NO (Discarded)** | No | **Completely omitted from PDF** |
| **18** | `workEnvironment` | Yes | Yes | **NO (Discarded)** | No | **Completely omitted from PDF** |
| **19** | `careerFieldsAnalysis` | Yes | Yes | **NO (Discarded)** | No | **Completely omitted from PDF** |
| **20** | `topCareerDirections` | Yes | Yes | **NO (Discarded)** | No | **Replaced by hardcoded 3 directions** |
| **21** | `careerDirectionsCaution` | Yes | Yes | **NO (Discarded)** | No | **Replaced by hardcoded 2 cautions** |
| **22** | `moneyIncomePattern` | Yes | Yes | **NO (Discarded)** | No | **Replaced by hardcoded static money** |
| **23** | `relationshipsNetworking` | Yes | Yes | **NO (Discarded)** | No | **Replaced by hardcoded relationships** |
| **24** | `teamDynamics` | Yes | Yes | **NO (Discarded)** | No | **Replaced by hardcoded relationships** |
| **25** | `sustainabilityAnalysis` | Yes | Yes | **NO (Discarded)** | No | **Replaced by hardcoded sustainability** |
| **26** | `careerObstacles` | Yes | Yes | **NO (Discarded)** | No | **Replaced by hardcoded 2 obstacles** |
| **27** | `professionalGrowth` | Yes | Yes | **NO (Discarded)** | No | **Completely omitted from PDF** |
| **28** | `recommendations` | Yes | Yes | **NO (Discarded)** | No | **Completely omitted from PDF** |
| **29** | `professionalDevelopmentPriorities` | Yes | Yes | **NO (Discarded)** | No | **Completely omitted from PDF** |
| **30** | `decisionGuidance` | Yes | Yes | **NO (Discarded)** | No | **Replaced by hardcoded framework** |
| **31** | `actionPlanSummary` | Yes | Yes | **NO (Discarded)** | No | **Replaced by hardcoded roadmaps** |
| **32** | `finalSynthesis` | Yes | Yes | **YES** (Line 1800) | **YES** (`\FinalSynthesis`) | Dynamic (or Mock fallback) |
| **33** | `primaryProfessionalPriority` | Yes | Yes | **NO (Discarded)** | No | **Completely omitted from PDF** |
| **34** | `technicalSkillPriority` | Yes | Yes | **NO (Discarded)** | No | **Completely omitted from PDF** |
| **35** | `communicationSkillPriority` | Yes | Yes | **NO (Discarded)** | No | **Completely omitted from PDF** |
| **36** | `leadershipSkillPriority` | Yes | Yes | **NO (Discarded)** | No | **Completely omitted from PDF** |
| **37** | `networkSkillPriority` | Yes | Yes | **NO (Discarded)** | No | **Completely omitted from PDF** |
| **38** | `mistakeToAvoid` | Yes | Yes | **NO (Discarded)** | No | **Completely omitted from PDF** |
| **39** | `thirtyDayFocus` | Yes | Yes | **NO (Discarded)** | No | **Replaced by hardcoded 30-day map** |
| **40** | `ninetyDayFocus` | Yes | Yes | **NO (Discarded)** | No | **Replaced by hardcoded 90-day map** |
| **41** | `oneYearFocus` | Yes | Yes | **NO (Discarded)** | No | **Replaced by hardcoded 1-year map** |
| **42** | `threeYearDirection` | Yes | Yes | **NO (Discarded)** | No | **Replaced by hardcoded 3-year map** |

### Synthesis Metrics:
- **Total Requested Fields:** 42
- **Consumed by Data Mapper:** **11 (26.2%)**
- **Discarded / Replaced by Hardcoded Constants:** **31 (73.8%)**

---

## 3. Provider Fallback & BullMQ Worker Behavior

We inspected the exact error-handling paths in `openrouter-career-analysis.provider.ts`:

### A. Missing API Key (`lines 29–32`):
```typescript
if (!isApiKeyValid) {
  console.warn('[OpenRouterCareerAnalysisProvider] OPENROUTER_API_KEY not set. Using MockCareerAnalysisProvider.');
  return new MockCareerAnalysisProvider().analyze(input);
}
```
If `OPENROUTER_API_KEY` is empty, unconfigured, or set to `'mock-key-dev'`, the provider immediately routes to mock generation.

### B. Exhausted Retries / Length Error / Timeout (`lines 119–127`):
```typescript
const allowMockFallback =
  process.env.ALLOW_MOCK_FALLBACK === 'true' ||
  process.env.NODE_ENV !== 'production' ||
  process.env.LLM_PROVIDER === 'mock';

if (allowMockFallback) {
  console.warn(`[OpenRouterCareerAnalysisProvider] Retries exhausted or length error encountered. Falling back to deterministic MockCareerAnalysisProvider.`);
  return new MockCareerAnalysisProvider().analyze(input);
}
```
Because `NODE_ENV=development` in `.env`, `allowMockFallback` evaluates to `true`.
- Any network blip, 429 rate limit, or model timeout is caught by the `try/catch` loop.
- When retries are exhausted, it catches the error and returns `MockCareerAnalysisProvider().analyze(input)`.

### C. Worker Queue Execution (`report-worker.service.ts`):
- Because the provider returns a resolved promise with mock data, **no exception is thrown**.
- `pipelineResult = await careerReportService.generateCareerReportData(...)` completes normally.
- BullMQ proceeds through `RENDERING (60%)`, `COMPILING (75%)`, `VALIDATING (85%)`, `UPLOADING (95%)`, and `COMPLETED (100%)`.
- The database record status is set to `'COMPLETED'`, `progress: 100`.
- **Database Metadata Omission:** The database does **not** record that fallback occurred. `metadata` is not updated with `{ provider: 'MOCK' }`.
- **User Experience:** The user receives a push notification and downloads the PDF dossier, completely unaware that it was compiled using pre-written mock templates.

---

## 4. Verification Verdict

- **Previous Finding:** **100% CONFIRMED**.
- **Severity:** **CRITICAL**.
- **Practical Customer Impact:** 
  1. The AI generation is paying token costs or spending latency requesting 42 fields, while discarding nearly three-quarters of the returned analysis.
  2. The failure mode degrades silently to mock data without alerting developers or failing the job for retry.
