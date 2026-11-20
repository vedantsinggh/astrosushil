# Interpretation Engine (engineering guide)

The interpretation engine turns calculated chart facts into **deterministic, cited conclusions** before any LLM sees them. It closes the gap between the specified data flow (`docs/report-spec.md`, AGENTS.md §1.4):

```
Calculations -> Deterministic Prediction Output -> LLM Natural Language Formatting
```

and the earlier flow, in which the LLM received raw facts and drew its own conclusions.

- **Methodology, rule statuses, conflict policy and open client questions:** [`decisions/interpretation.md`](decisions/interpretation.md). That file is normative. This guide explains how the code implements it.
- **ADR:** ADR-018 in [`../decisions.md`](../decisions.md).
- **Scope today:** the Career report (`specVersion` 1.1.0) is the only module that opts in. Every other report definition is unchanged, and so are its cache keys (a hard-coded digest test checks this).

---

## 1. Architecture and pipeline

```
ChartSnapshot (report-engine)                                         [unchanged]
   │
   ├─ EvidenceRegistry: core facts + module contributors + interpretation facts (facts.ts)
   │        │ FactView (read-only: has / get / resolve)
   ▼        ▼
prediction-engine/interpretation/pipeline.ts   runInterpretation(input, facts, pack, policy)
   S1 chart-validation      conventions, required vargas, birth time, boundary sensitivity
   S2 planet-condition      D1 compound dignity, D9/D10 sign dignity, combustion, retrogression,
                            vargottama, functional nature, Yogakaraka by ownership, dispositor, Shadbala
   S3 house-lordship        lord placement category, lord condition, occupants, aspects, SAV vs 28
   S4 yoga-assessment       formation, strength factors, modifiers, cancellations, class, activation
   S5 divisional-synthesis  D1 ↔ D9/D10 links (vargottama, the 10th lord in D10, same-lord agreement)
   S6 activation            MD/AD lords, MD–AD mutual position, Saturn-from-Moon phase,
                            Jupiter/Saturn over natal houses and lords; life-stage gating
   S7 conflict resolution   supporting vs contradicting codes → CRP precedence → strength class
   S8 results               the rule pack maps assessments to InterpretationResult[] (one per question)
   │
   ▼ report-engine/platform/interpretation/register.ts
registers each result as an `interp.*` evidence item (fail closed on an unknown chartRef)
   ▼
LLM narration (opted-in topics): INTERPRETATIONS prompt block; each judgement must cite an interp.* ID
   ▼
Validation: claim validator + editorial validator + interpretation validator (V1–V6 and others)
   ▼
Render (LaTeX → PDF, unchanged) + manifest (`interpretation` summary, per-topic `trace`)
```

S1–S8 are pure functions. The same input gives the same output, nothing reads the wall clock, and every ID is built from content. Each stage returns plain JSON and is tested on its own.

### File map

| Path | Role |
|---|---|
| `packages/prediction-engine/src/interpretation/types.ts`, `schema.ts` | Contracts (closed vocabularies, stage outputs, `InterpretationResult`) and strict zod schemas |
| `…/interpretation/input.ts` | `InterpretationInput` (the RE `ChartSnapshot` satisfies it structurally), `FactView`, life-stage helpers (`deriveLifeStage`, `ageAt`) |
| `…/interpretation/ids.ts` | Deterministic IDs (`buildInterpretationId`, `stageItemId`), `stableStringify`, `computeRulesetVersion` |
| `…/interpretation/stages.ts` | Stage, pack and pipeline function signatures |
| `…/interpretation/stages/chart-validation.ts` | S1 (`BOUNDARY_THRESHOLD_MINUTES = 5`) |
| `…/interpretation/stages/planet-condition.ts`, `functional-nature.ts` | S2 |
| `…/interpretation/stages/house-lordship.ts`, `util/count.ts` | S3 |
| `…/interpretation/stages/yoga-assessment.ts`, `rules/yoga-rules.ts` | S4 and its cited factor table and class procedure |
| `…/interpretation/stages/divisional.ts` | S5 (`keyCareerPlanets`) |
| `…/interpretation/stages/activation.ts` | S6 (`LIFE_STAGE_HORIZON_AGE = 60`) |
| `…/interpretation/conflict/policy.ts`, `resolve.ts` | CRP precedence rules (data) and the set-logic resolver |
| `…/interpretation/rules/catalogue.ts` | Pack-level rules (INT-H, INT-P, INT-CY, INT-D, INT-T, INT-C, INT-CAR, INT-F) |
| `…/interpretation/packs/career/{index,rules,templates}.ts` | Career rule pack: topic keys, result builders, fixed conclusion templates |
| `…/interpretation/pipeline.ts` | `runInterpretation`: runs S1–S6, filters rules by status, calls the pack builders, validates the set |
| `packages/report-engine/src/platform/interpretation/facts.ts` | New evidence facts (dispositor, functional nature, D9/D10 dignity, vargottama, age, life stage, MD–AD position, Saturn-from-Moon, transit "now", earnings window, SAV definition…) |
| `…/platform/interpretation/register.ts` | Precomputes the async extras (Shadbala, Sade Sati, birth-time sensitivity, formed-but-cancelled yogas), runs the pipeline, registers `interp.*` items |
| `…/platform/interpretation/scope.ts` | Topic opt-in (`isInterpretationTopic`, `topicAllowedEvidence`, `matchedInterpretations`, `interpretationFingerprint`) and life-stage variants (`applyTopicVariant`) |
| `…/platform/llm/prompts.ts`, `narrator.ts`, `topic-cache.ts` | INTERPRETATIONS block (`INTERPRETATION_PROMPT_VERSION`), interpretation temperature, optional cache-key parts |
| `…/platform/validation/interpretation-validator.ts`, `judgement-lexicon.ts`, `trace.ts` | V1–V6 and the audit checks; closed lexicons; statement → evidence → rule trace |
| `…/platform/validation/claim-validator.ts` | Transit assertions are now checked instead of skipped (V3, every topic) |
| `…/platform/validation/editorial-validator.ts` | Widened overstatement / invented-history lexicons; near-duplicate detection |
| `…/platform/reports/career/*` | Opted-in career definition, earnings window (`calc/career-calc.ts`), blocks |
| `packages/astrology-engine/src/yoga/yoga-assessment.ts`, `planets/functional-nature.ts`, `strength/kala-time-context.ts` | Engine additions the stages read (yoga formation/cancellation assessment, functional nature, real-sunrise Kala Bala context) |

**Dependency rule.** `interpretation/` imports only `@astro/astrology-engine` and its own files. It must never import report-engine (no cycle). It reads chart data through `InterpretationInput` and facts through `FactView`, so every `chartRef` in a result is an evidence ID that the LLM and the validators already know. Nothing is recomputed.

---

## 2. Rule evaluation methodology

1. **Condition codes.** Each stage classifies facts into codes from the closed `CONDITION_CODES` set (e.g. `OWN_SIGN`, `COMBUST`, `LORD_IN_DUSTHANA`, `SAV_BELOW_28`, `NEECHA_BHANGA`). Every code carries a direction: `supports`, `challenges` or `context`. It also links a `factId` and the `ruleId` that produced it.
2. **No weights.** A result's strength class comes from **set logic** over the standing codes (`decisions/interpretation.md` §2). The engine never sums, scores or weighs. Graded scales exist only where a classical text defines the grade: the dignity ladder, SAV vs 28, and Shadbala vs the required rupas.
3. **One result per question.** A pack builds exactly one `InterpretationResult` per question (e.g. `interp.career.service-orientation`). Every report topic that discusses the question cites the same ID, so two sections cannot reach different verdicts.
4. **Fixed templates.** `conclusion.code` comes from a closed set per rule, and `conclusion.text` and `explanation` come from fixed templates (`packs/career/templates.ts`). The codes are descriptive categories. Meanings beyond the category are client-supplied text (ADR-016).

### Rule statuses

| Status | Rendered? | Used by the conflict policy? | Example |
|---|---|---|---|
| `approved` | yes | yes | INT-H-001 (house category), INT-H-003 (SAV vs 28), INT-D-002 (vargottama), INT-T-002 (MD–AD position as a fact), INT-T-010 (transit house) |
| `provisional` | yes, marked `provisional: true` and qualified `PROVISIONAL_RULE` | yes | most pack rules (INT-CAR-001…009, INT-CY-*, INT-T-001/003/011), CRP-001…003, the S4 factor rows |
| `pending-client` | **no**: evaluated only when `includePendingClient` is set (tests) | **no** | INT-CAR-041/061/071, CRP-101…105, INT-YC-999 |

The pipeline drops any result that cites a pending-client rule, lists the rule in `InterpretationSet.rejected`, and also rejects a pack rule whose `requiredFacts` do not resolve. `rulesetVersion` (12 hex characters) hashes the enabled rules and the policy, so any status, version or source change produces a new version and a new cache key for opted-in topics.

---

## 3. Yogas: formation, strength, modification, cancellation, activation

S4 (`stages/yoga-assessment.ts`) keeps five ideas apart, which the old report blurred together:

| Concept | Meaning | Source in code |
|---|---|---|
| **Formation** | The engine's combination rule is satisfied: the conditions, the relation (conjunction, mutual aspect including special aspects, exchange, ownership, placement, distribution) and the key planets | engine `YogaResult` + `assessment`; `YogaFormationEvidence` |
| **Strength** | Factors on the key planets: dignity, house (dusthana), combustion, D9 dignity, vargottama, Shadbala ratio, paksha, avastha… Each factor has a direction (support / weaken) and a tier (major / minor) from a cited row of `rules/yoga-rules.ts` | `YogaStrengthFactor[]` |
| **Modification** | Changes the *kind* of result, never its class: benefic vs malefic occupants (Vesi/Vasi/Sunapha…), Viparita conditions, Raja-yoga dilution by 8th/11th co-lordship | `YogaModifier[]` |
| **Cancellation** | A classical bhanga is satisfied (e.g. Kemadruma cancelled by a kendra planet). Formed-but-cancelled yogas are kept and labelled "formed and cancelled" | `YogaCancellation[]`, `yoga.<slug>` facts |
| **Activation** | The Vimshottari MD/AD windows of the key planets (BPHS ch. 34 / Laghu Parashari ch. 3–4, to verify; provisional, Q-T-2) | `YogaActivationWindow[]` |

**Class procedure** (`YOGA_CLASS_PROCEDURE`, INT-Y-002, provisional, Q-Y-12). MW is the set of major weakening factors and MS the set of major supporting factors. Only non-pending rows take part.

1. **D1 cancelled:** the engine reports a cancellation, or a satisfied engine flag maps to a bhanga row.
2. **D2 weak:** |MW| ≥ 2 and MS = ∅.
3. **D3 strong:** MW = ∅, MS ≠ ∅, and every graha key planet has a known Shadbala that meets its BPHS ch. 27 requirement. An unknown Shadbala blocks "strong".
4. **D4 moderate:** everything else, including formation-only yogas that have no factor table.

`classTrace` records each decision step, so the class can be audited. Yogakaraka is assigned **by ownership** (a kendra and a trikona lord) and labelled as such. The unsourced "Dhana by single-planet ownership" was removed from the engine.

---

## 4. Divisional chart interpretation

| Dignity | Definition | Fact IDs |
|---|---|---|
| D1 | Compound dignity (BPHS ch. 3 ladder: exalted, moolatrikona, own, great friend … great enemy, debilitated), `definition: 'dignity.d1.compound'` | `planet.<p>.d1.dignity` |
| D9, D10 | **Sign dignity only**: `EXALTED`, `DEBILITATED`, `OWN_SIGN` or `NONE`; `definition: 'dignity.varga.sign'`; the nodes are always `NONE` | `planet.<p>.d9.dignity`, `planet.<p>.d10.dignity` |
| Vargottama | D1 sign = D9 sign | `planet.<p>.vargottama`, `fact.asc.vargottama` |

The two scales are never mixed. Labels say "by sign dignity, not the D1 compound dignity". The prompt forbids "neither exalted nor debilitated" as a meaningful statement (audit F18). S5 links the D1 10th lord's D10 house and D10 dignity, same-lord agreement, the D10 Lagna lord, and the D10 dignity of each **key career planet**: the D1 10th lord, the D10 Lagna lord, the D10 10th lord, the Amatyakaraka, the Sun, Saturn and Jupiter. Agreement between charts is a fact, never a score. Whether D10 should use compound dignity is open (Q-S-4).

---

## 5. Dasha / transit integration and life-stage gating

- **Dasha (S6, INT-T-001/002):** for each MD and AD lord, S6 lists the houses it rules, occupies and aspects, its D10 house, the yogas it activates, and its age at the start and end of the period. The MD–AD mutual position (`adFromMd`, `mdFromAd`) is a fact only: `not-assessed` until the client answers Q-T-1.
- **Transits (S6, INT-T-010/011):** Jupiter and Saturn over natal houses (from the Ascendant and the Moon) and over natal lords and planets, plus the Saturn-from-Moon phase (`twelfth / over-moon / second / fourth / eighth`). The Sade Sati is worded neutrally (D-006). There is **no double-transit rule** (user decision 4). Labels mark the transit position as "not the natal placement", and the claim validator checks transit assertions (audit F2).
- **Life stage:** `native.age` (completed years at the as-of date) and `native.life-stage` (bands below). Career topics carry an `early-career` variant: up to `EARLY_CAREER_MAX_AGE` the objective forbids seniority, retirement and track-record framing. The retirement topic is reframed as long-term stability up to `RETIREMENT_REFRAME_MAX_AGE`.
- **Gating:** periods that start after `LIFE_STAGE_HORIZON_AGE` (60) carry `LIFE_STAGE_GATED`. "First earnings" sees only MDs inside the earnings window (`EARNINGS_WINDOW`: start age ≤ 60 and end age ≥ 16), via `career.window.earnings.md.*` and `interp.career.period.earnings-window`.

All the age thresholds are **product defaults, not astrology**. They are listed as client/product questions in `decisions/interpretation.md` §8.

---

## 6. Cross-chart synthesis

The career pack answers the ten career dimensions from audit 05 §2, each as **one** result that combines D1, D10 and SAV conditions:

| Result | Combines |
|---|---|
| `interp.career.service-orientation` (INT-CAR-001) | 6th lord condition and placement, 6th SAV vs 28, Saturn, D10 6th lord's dignity; the 6-vs-7 SAV comparison only as `PRACTITIONER_HEURISTIC` context (INT-C-001) |
| `interp.career.enterprise` (INT-CAR-002) | 7th lord, 7th SAV, Mercury, D10 7th lord's dignity |
| `interp.career.leadership`, `.analytical`, `.financial-growth`, `.recognition`, `.stability`, `.obstacles`, `.transitions` (INT-CAR-003…009) | the factors in `rules/catalogue.ts`, each with its D10 dignity link where relevant |
| `interp.career.d1-d10.*` (INT-D-003) | agreement facts between D1 and D10 |
| `interp.career.fields` (INT-F-001) | the trine lords' conditions |

Absence is never a verdict. "No Sun–Saturn link" yields "no specific indicator" (`neutral`), not "not government" (audit F15), and the validator flags absence presented as an advantage (F11).

---

## 7. Conflict resolution

The rules are data in `conflict/policy.ts`, and the algorithm lives in `conflict/resolve.ts` (`runConflictResolution`). Per subject:

1. Collect the supporting, contradicting and context codes.
2. Apply a precedence rule `a > b` only if it is `approved` or `provisional`. The overridden code is set aside and recorded in `Resolution.applied`. Rules are validated as acyclic, so the outcome does not depend on rule order.
3. Classify what remains: `supported`, `challenged`, `mixed` (with `MIXED_INDICATORS`), `resolved-supported`, `resolved-challenged`, `neutral` or `not-assessed`.

**The default is to present both.** Only CRP-001 (neecha bhanga over debility), CRP-002 (Lagna lord not harmed by dusthana ownership) and CRP-003 (luminaries: no 8th-lord blemish) resolve conflicts, and all three are provisional. Known conflicts such as own sign vs combust stay `mixed` and are listed as client questions (CRP-101…105).

---

## 8. LLM responsibilities and validators

The LLM **only words given conclusions**. For an opted-in topic:

- the allowed evidence is `required ∪ optional ∪ interpretations ∪ chartRefs(matched results)`;
- the prompt adds an `INTERPRETATIONS` block (conclusion, class, timing, qualifications, supporting and contradicting IDs);
- every evaluative sentence must be a claim citing an `interp.*` ID, a `mixed` result must be described as mixed, and the model may add no judgement of its own;
- the temperature is `DEFAULT_INTERPRETATION_TEMPERATURE` (0.2), against the legacy 0.55;
- the output-token cap is `DEFAULT_INTERPRETATION_MAX_OUTPUT_TOKENS` (32000), against the legacy 16000. Gemini counts thinking tokens against the cap, and the first real golden run lost 7 opted-in topics to truncated JSON at 16000;
- the cache key gains `interpretationFingerprint` and `interpretationPromptVersion`. Both are `undefined` for legacy topics, so their keys are byte-identical.

| ID | Check (code) | Severity (opted-in / legacy) |
|---|---|---|
| V1 | Judgement lexicon: an evaluative term must sit in a verified claim whose cited `interp.*` class is compatible (`JUDGEMENT_CLASS_MISMATCH`, `UNSUPPORTED_JUDGEMENT`) | error / — |
| V2 | Mixed honesty: no one-sided intensifier on a `mixed` result (`MIXED_RESULT_OVERSTATED`, `MIXED_RESULT_NOT_ACKNOWLEDGED`) | error / — |
| V3 | Transit assertions checked against transit evidence, no longer skipped (`NARRATIVE_CONTRADICTS_TRANSIT`) | error on **all** topics |
| V4 | Derived terms (dispositor, Yogakaraka, vargottama, Sade Sati, exchange…) need a backing fact (`DERIVED_TERM_UNSUPPORTED`) | error / warning |
| V5 | Exact `interp.*` patterns must be cited (`REQUIRED_INTERPRETATION_NOT_CITED`) | error / — |
| V6 | Invented-rule phrasing ("classically requires…") without a cited interp (`INVENTED_RULE_PHRASING`) | warning |
| — | An unverifiable claim citing an interp (`INTERPRETATION_CLAIM_UNVERIFIABLE`) | error / — |
| — | Life stage: seniority framing below the early-career age (`LIFE_STAGE_MISMATCH`) | error / warning |
| — | Prose dates must fall within a dated evidence period, ±1 day (`DATE_OUTSIDE_EVIDENCE`) | error for day precision / warning |
| — | Absence spun as an advantage (`ABSENCE_PRESENTED_AS_ADVANTAGE`) | error / warning |
| — | Near-duplicate sentences of earlier topics, unigram ≥ 0.7 or bigram ≥ 0.6 over ≥ 6 tokens (`NEAR_DUPLICATE_ACROSS_TOPICS`) | error / report-level warning |
| — | Editorial: widened `GUARANTEE` / `OVERSTATEMENT` lexicon, `INVENTED_HISTORY`, `ASHTAKAVARGA_MISDEFINED` (SAV "from transiting planets") | per the editorial validator |

`trace.ts` derives statement → evidence IDs → interpretation IDs → rule IDs for every claim. The orchestrator writes this to `TopicManifestEntry.trace`, and the manifest carries `interpretation: { schemaVersion, rulesetVersion, resultCount }`.

---

## 9. Testing strategy

| Layer | File(s) | What it pins |
|---|---|---|
| Contracts | `prediction-engine/src/interpretation/__tests__/contracts.test.ts` | schemas, IDs, `rulesetVersion` (independently recomputed), life stage, barrel |
| Conflict policy | `…/__tests__/conflict.test.ts` | every class outcome, the seed rules, cycles, determinism |
| Stages | `…/__tests__/stages-natal.test.ts`, `stages-yoga-activation.test.ts` | S1–S6 on hand-checked charts (golden chart plus a textbook chart) |
| Pack / pipeline | `…/__tests__/pipeline-career.test.ts` | rule filtering by status, required facts, result shape |
| Engine fixes | `astrology-engine/tests/unit/engine-fixes-2026-11.test.ts`, `shadbala-kala-fixes.test.ts` | Arudha, shodhana, Moon moolatrikona, Raja relations, Shadbala Kala Bala |
| RE wiring | `report-engine/src/__tests__/platform-interpretation.test.ts` | new facts on the golden chart, fail-closed registration, scope, life-stage variants, earnings window, **byte-identical legacy keys** (hard-coded career keys; a sha256 digest over the 403 narrative topics of every other report) |
| Validation | `…/__tests__/platform-validation-interp.test.ts` | V1–V6, transit/date/life-stage checks, near-duplicates |
| **Golden** | `…/__tests__/golden-career.test.ts` + `fixtures/golden-career.subject.json`, `fixtures/golden-career.interpretation-set.json` | key evidence values for the golden subject at 2026-11-20 and the **full InterpretationSet** |

**Regenerating the golden fixture** after a *reviewed* rule change:

```bash
cd apps/api
UPDATE_GOLDEN=1 npx vitest run --root=../.. --config=vitest.config.ts packages/report-engine/src/__tests__/golden-career.test.ts
git diff packages/report-engine/src/__tests__/fixtures/golden-career.interpretation-set.json   # review every change
```

Run the suites with `npm run test:prediction` and `npm run test:report` (workspace `apps/api`). An end-to-end sample uses `packages/report-engine/src/scripts/generate-platform-report.ts --report career --provider gemini`. Note that `--provider offline` placeholder text fails the opted-in topics on `NEAR_DUPLICATE_ACROSS_TOPICS`, because every placeholder sentence is the same. Use offline runs for layout checks only.

---

## 10. Known limitations

- **No Rahu/Ketu transit activation.** S6 activates only Jupiter and Saturn transits. Node transits are facts (`fact.transit.rahu|ketu.now`) used by the legacy `transit-nodes` topic.
- **No pratyantardasha (PD) level.** The Vimshottari tree is built to `maxLevel: 2`, so activation covers MD and AD only.
- **Shadbala approximations (all provisional):** Cheshta Bala uses a speed heuristic, not the BPHS cheshta-kendra (Q-S-2); hora length is day/12 and night/12; Abda/Masa use the Kali-epoch Ahargana; combustion does not reduce Shadbala (Q-CRP-3). Without Shadbala, no yoga can be classed `strong`.
- **Provisional conventions:** the S4 factor tiers and class procedure, CRP-001…003, node exaltation, combustion orbs, the Arudha exceptions (BPHS ch. 29), and the life-stage and age thresholds. Several citations are marked "(verify)" against Santhanam's BPHS.
- **Pending-client rules** (never rendered): INT-CAR-041 (Mars–Saturn as technical context), INT-CAR-061 (Rahu in the 10th as recognition context), INT-CAR-071 (sign quality for stability), CRP-101…105, unknown engine yoga flags (INT-YC-999).
- **Birth-time sensitivity:** S1 flags `BIRTH_TIME_SENSITIVE` when the Ascendant (sign, nakshatra, D9, D10) or the Moon (nakshatra, pada) is within **5 minutes of birth time** of a boundary (`BOUNDARY_THRESHOLD_MINUTES`). The threshold is a product default, and a chart just outside it is reported as normal.
- **Gupta Nadi / BNN:** the rule-pack slot exists but is empty until the client supplies the documents (ADR-016 "still blocked"). The CAR-004 BNN facts stay legacy facts.
- **Interpretation meanings** beyond category templates are not written. They come from the client (ADR-016 §7).
- **The old PE `CareerEvidenceEngine` / `PredictionEngine`** is untouched and not used by reports.

---

## 11. Configuration and extension points

**Add a rule**
1. Add an `InterpretationRule` to `rules/catalogue.ts` (or a stage rule table) with an ID (`INT-…`), a semver version, a stage, a status, at least one source, `requiredFacts` and a description. A rule without a source must be `pending-client`.
2. Use it in a pack builder: emit `ConditionEntry`s, resolve with `ctx.resolve(toConflictInput(...))`, and build the result with a fixed template.
3. Add unit tests with hand-checked values, then regenerate the golden fixture and review the diff. `rulesetVersion` changes automatically.

**Add a pack**
1. Create `packs/<report>/` exporting an `InterpretationPack` `{ id, version, rules, topics }`, where each `PackTopic` has a topic key, rule IDs and a `ResultBuilder`.
2. Declare it on the report module: `ReportModule.interpretation = { pack }`.
3. Any new fact IDs the stages need must be registered by an evidence contributor. Unknown chartRefs fail closed.

**Add a precedence rule**
1. Add a `PrecedenceRule` to `PRECEDENCE_RULES` in `conflict/policy.ts`: `when: { a, b: [...] , sameSubject: true }`, outcome, a `source`, a status and any qualifications it adds.
2. `validateConflictPolicy` rejects duplicates, self-overrides, empty `b` and cycles.
3. Record it in `decisions/interpretation.md` §3, with its client question if it is not approved.

**Opt a report topic in**
1. Add `interpretations: ['interp.<topic-key>.*']` (or an exact ID, which makes the citation required under V5) to the topic in the report definition.
2. Expect the topic's cache key to change; legacy topics are unaffected.
3. Consider the `lifeStageAware` variant and remove legacy evidence that duplicates the results.
4. Bump the definition's `specVersion` once per migration wave.

**Thresholds** live in one place each. Change them only with a client or product decision, recorded in `decisions/interpretation.md` §8.

| Constant | File |
|---|---|
| `EARNINGS_WINDOW` | `reports/career/calc/career-calc.ts` |
| `EARLY_CAREER_MAX_AGE`, `RETIREMENT_REFRAME_MAX_AGE` | `reports/career/career.definition.ts` (variants); `EARLY_CAREER_MAX_AGE` again in `validation/interpretation-validator.ts` (see §8 of the decisions file) |
| `LIFE_STAGE_BANDS` | `interpretation/facts.ts` |
| `LIFE_STAGE_HORIZON_AGE` | `prediction-engine/…/stages/activation.ts` |
| `BOUNDARY_THRESHOLD_MINUTES` | `…/stages/chart-validation.ts` |
| `DEFAULT_REPETITION_OPTIONS` | `validation/editorial-validator.ts` |
| `DEFAULT_INTERPRETATION_TEMPERATURE`, `DEFAULT_INTERPRETATION_MAX_OUTPUT_TOKENS` | `llm/narrator.ts` |
| `keyCareerPlanets` | `…/stages/divisional.ts` |
