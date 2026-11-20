# Interpretation Layer — Methodology Decisions

Module: `packages/prediction-engine/src/interpretation/` (contracts, stages S1–S8, conflict policy, rule packs). Report-engine registers the results as `interp.*` evidence for opted-in topics. Global conventions (D-001 to D-008 in [`../DECISIONS.md`](../DECISIONS.md)) and ADR-015/016/017 ([`../../decisions.md`](../../decisions.md)) apply. Engineering guide (pipeline, file map, testing, extension points): [`../interpretation-engine.md`](../interpretation-engine.md). ADR: ADR-018.

**Status:** every rule and precedence rule here is **provisional – pending client review** unless it is marked `approved`.

## 1. Principles

1. **Rules decide; the LLM words it.** Data flow: calculations → deterministic interpretation results → LLM formatting (AGENTS.md §1.4, `docs/report-spec.md`). Each conclusion a reader sees ("supported", "mixed", "active now") comes from a rule with an ID, a citation and a status. The LLM may only paraphrase the conclusions it is given, and it must cite their `interp.*` IDs.
2. **No invented astrology** (AGENTS.md §2.4–2.5). A rule enters the catalogue only from:
   - an existing method decision (CAR-001…018, D-001…008, FIN-003, ADR-015/016/017);
   - a definitional classical category with a citation (kendra / trikona / dusthana / upachaya, the BPHS dignity order, the 28-bindu SAV average, the BPHS Shadbala required rupas).

   Anything else enters as `pending-client`.
3. **Interpretation texts come from the client.** The engine produces deterministic *categories* (conclusion codes with fixed templates), not invented meanings (ADR-016).
4. **Deterministic.** Stages are pure functions. No `Date.now()`. IDs are built from content (`ids.ts`). `rulesetVersion = sha256(stableStringify({rules sorted by id, policy}))[:12]`, so any rule or policy change produces a reviewable version change.

## 2. Strength by set logic (no weights)

There are **no numeric weights, scores or sums anywhere** (user decision, 2026-11-20). Each stage classifies chart facts into **condition codes**, a closed set (`CONDITION_CODES` in `types.ts`). Each code carries a role:
- `supports`;
- `challenges`;
- `context`: a neutral fact that may trigger a precedence rule but never counts for or against.

The class of a result comes from set logic over those codes:

| Class | When |
|---|---|
| `supported` | only supporting conditions apply |
| `challenged` | only contradicting conditions apply |
| `mixed` | both apply and no cited precedence rule settles them (carries `MIXED_INDICATORS`) |
| `resolved-supported` | both applied; a cited precedence rule set aside every contradiction |
| `resolved-challenged` | both applied; a cited precedence rule set aside every support |
| `neutral` | neither applies (e.g. an empty house, or everything set aside) |
| `not-assessed` | the rule is descriptive only; no strength claim |

Graded scales are used **only where a classical text defines the grade**:
- the dignity ladder (exalted … debilitated; BPHS ch. 3);
- SAV vs 28 (BPHS Ashtakavarga; above / at / below);
- Shadbala vs required rupas (BPHS ch. 27; meets / below; provisional while the engine's Shadbala defects are being fixed).

**Yogas** (S4) use the ordinal class `strong / moderate / weak / cancelled` from the decision procedure in audit 04 §5:
- each strength factor carries a direction (support / weaken) and a tier (major / minor) from a cited per-yoga rule table;
- the class follows from which factors are present, never from a count of points.

The procedure and the tier tables stay provisional until the client reviews them (Q-Y-12).

**Age gating.** Each run derives the native's age at the as-of date (`deriveLifeStage`: completed years from the birth date to the as-of calendar date). Packs use it to gate content: no retirement or board-level content for a 22-year-old, and "first earnings" never points at dashas that start after age 60. The exact age windows per topic are a client question (Q-G-3).

## 3. Conflict policy (CRP)

Files: `interpretation/conflict/policy.ts` (data), `interpretation/conflict/resolve.ts` (algorithm).

**Default: present both.** A conflict between supporting and contradicting conditions is **not** resolved unless a cited precedence rule exists. The reader is told the indicators are mixed. Example: the golden chart's Venus is in its own sign but combust and retrograde. Today the LLM settles that conflict on its own; under this policy it is reported as `mixed`.

**Algorithm** (per subject: a planet, a house, a yoga or a period):
1. Collect the supporting (S) and contradicting (C) codes, plus the context codes.
2. A precedence rule `a overrides b` applies when:
   - `a` is standing on one side (or is a context code);
   - a `b` code is on the opposite side (either side when `a` is context).

   The `b` code is set aside, and the rule is recorded in `Resolution.applied`.
   - A code that is itself set aside overrides nothing.
   - Rules must be acyclic (checked), so the result never depends on rule order.
   - Only `approved` and `provisional` rules apply. A `pending-client` rule never applies.
3. Classify what is left, as in the table above. An applied provisional rule adds `PROVISIONAL_RULE`. CRP-001 also adds `CANCELLATION_APPLIED`.

**Seed precedence rules** (the only ones that resolve conflicts; all `provisional`):

| ID | Rule | Codes | Source |
|---|---|---|---|
| CRP-001 | An engine-detected neecha bhanga sets aside the debility of the same planet | `NEECHA_BHANGA` > `DEBILITATED` | Phaladeepika ch. 7; BPHS neecha-bhanga verses (chapter and verse to verify against Santhanam) |
| CRP-002 | The Lagna lord is not made challenging by owning the 6th, 8th or 12th | `LAGNA_LORD` > `OWNS_6TH`, `OWNS_8TH`, `OWNS_12TH` | BPHS ch. 34 v. 9 (verify); Laghu Parashari 2.8 (verify) |
| CRP-003 | The Sun and the Moon incur no blemish from owning the 8th | `LUMINARY` (context) > `OWNS_8TH` | Laghu Parashari ch. 2 (verse to verify) |

**Known conflicts kept as `present-both`.** These are recorded in the policy as `pending-client` so the question is visible. They are never applied.

| ID | Conflict | Client question |
|---|---|---|
| CRP-101 | own sign vs combust | Q-CRP-1 |
| CRP-102 | exalted vs combust | Q-CRP-1 |
| CRP-103 | house SAV above 28 vs house lord in a dusthana | Q-CRP-2 |
| CRP-104 | Shadbala meets the requirement vs combust | Q-CRP-3 |
| CRP-105 | Yogakaraka by ownership vs placement in a dusthana | Q-CRP-4 |

**Cross-topic consistency.** A pack defines one result per question. Every report topic that discusses the same question cites the same `interp.*` ID, so two sections can never reach different verdicts on one question.

## 4. Decisions taken (user, 2026-11-20)

1. **Golden subject:** Apeksha Singh, 08 Jun 2004 08:30 IST, Akbarpur (Ambedkar Nagar) 26.4295 N 82.5343 E, Asia/Kolkata. The data may be committed as a test fixture. The PDF may not.
2. **Conflicts:** the default is to present both sides as `mixed`. Only CRP-001…003 resolve conflicts, and they are labelled provisional. No numeric weights.
3. **Arudha:** classical BPHS ch. 29. An Arudha cannot fall in the 1st or 7th from its house; in that case it shifts 10 signs. Scorpio and Aquarius use the stronger co-lord. Provisional.
4. **Career transits:**
   - the Saturn-from-Moon phase (Sade Sati), worded neutrally (D-006);
   - transits over natal houses and lords.

   There is **no double-transit rule**.
5. **Standing conventions** (ADR-015/016/017):
   - true Chitrapaksha Lahiri, mean node, whole-sign houses (Parashari), KP Placidus, KP New;
   - minor conventions use standard published defaults, cite their source, and are labelled "provisional – pending client review";
   - interpretation texts come from the client;
   - Sade Sati is shown on mobile and desktop.
6. **Routine fixes approved** (bugs vs classical rules, each with its source):
   - Trikona Shodhana zero cases; Ekadhipatya ignoring Rahu/Ketu;
   - Moon moolatrikona;
   - Raja-yoga relations: conjunction, mutual aspect (including special aspects) and sign exchange, plus the missing 7+5 pair;
   - Yogakaraka by ownership labelled as such; the unsourced "Dhana by single-planet ownership" removed;
   - wrong BPHS chapter citations corrected;
   - Shadbala defects: Ayana on the tropical longitude, Abda/Masa, proportional Nathonnata, real sunrise for Tribhaga/Hora, local weekday;
   - age-aware topic gating;
   - one canonical Sarvashtakavarga definition: natal bindu totals per sign; in transit use, the score of the sign a transiting planet occupies. Describing SAV as "support from transiting planets" is banned.
7. **Strength from set logic only** (§2).
8. **No invented rules:** anything without a source is `pending-client`: evaluated in tests, never rendered.

## 5. Rule status lifecycle

| Status | Meaning | Rendered to readers? | Applied by the conflict policy? |
|---|---|---|---|
| `approved` | The client has signed off, or the rule is definitional with a citation (e.g. house categories, the dignity ladder, SAV vs 28) | yes | yes |
| `provisional` | Cited standard default or engineering convention awaiting client review (ADR-016) | yes, with `provisional: true` and the `PROVISIONAL_RULE` qualification | yes |
| `pending-client` | No source, or the client must choose between conventions | **no**: the pipeline drops dependent results unless `includePendingClient` is set (tests only) | **no** |

Transitions:
- `pending-client → provisional`: a cited source is found, or the user approves a standard default.
- `provisional → approved`: the client signs off in writing. Record the date and the decision ID in this file.
- Any change to a rule's status, version, sources or required facts changes `rulesetVersion`, and with it the cache keys of opted-in topics.

## 6. Client questions (open)

Questions already answered by the user on 2026-11-20 (§4) are not repeated here. The IDs are stable, and rules refer to them.

**Conflict policy**
- **Q-CRP-0:** Confirm CRP-001…003 for promotion from provisional to approved, and confirm that every other conflict is shown as "mixed".
- **Q-CRP-1:** Own sign or exaltation vs combustion (CRP-101/102): present both, or does combustion prevail?
- **Q-CRP-2:** High house SAV vs a house lord in a dusthana (CRP-103).
- **Q-CRP-3:** Shadbala meeting the BPHS requirement vs combustion (CRP-104). The engine's Shadbala does not penalise combustion.
- **Q-CRP-4:** Yogakaraka by ownership placed in a dusthana (CRP-105; golden chart: Mars in the 12th with the 8th lord).
- **Q-CRP-5:** Retrogression: is it a support (cheshta bala), a challenge, or context only? The default is context only.

**Timing and activation**
- **Q-T-1:** Does an MD–AD mutual position (6/8, 2/12 …) carry any favourability? The default is to state it as a fact only (`not-assessed`).
- **Q-T-2:** Yoga activation: do yogas give results in the dashas and antardashas of the planets that form them (BPHS ch. 34 / Laghu Parashari ch. 3–4, verify)? The rule is provisional until confirmed.

**Strength**
- **Q-S-1:** Shadbala: should "meets / does not meet required rupas" (BPHS ch. 27) be a supporting or contradicting condition, or be left out?
- **Q-S-2:** Cheshta Bala: should the engine adopt the BPHS cheshta-kendra method (it currently uses a speed heuristic)? Shadbala stays provisional until then.
- **Q-S-3:** Combustion orbs: confirm the Surya Siddhanta values, and say whether a "deep combustion" tier exists.
- **Q-S-4:** D10 dignity: sign-only (CAR-002, current) or compound?

**Functional nature** (audit 03 A5, audit 04 §4)
- **Q-F-1:** A trikona lord that also rules the 3rd, 6th, 8th or 11th: is it "mixed" (current) or auspicious regardless (Laghu Parashari ch. 2)?
- **Q-F-2:** Should kendradhipati dosha be graded (strongest for Jupiter, then Venus, then Mercury)?
- **Q-F-3:** Should maraka lords (the 2nd and 7th) and Badhaka be flagged?
- **Q-F-4:** Should the 11th lord be grouped with the 3rd and 6th as "challenging", or treated more mildly?
- **Q-F-5:** Retire the separate Jupiter rule in `jupiter-calculator.ts:395`?

**Yogas** (audit 04 §6)
- **Q-Y-1 Gajakesari:** use the BPHS form (Lagna or Moon reference, benefic association, not debilitated, combust or in an enemy sign) or the Phaladeepika/Raman form? Is Moon strength a qualifier?
- **Q-Y-2 Budha-Aditya:** does Mercury's combustion cancel or weaken the yoga? Within what orb? Or is it ignored?
- **Q-Y-3 Vesi, Vasi, Ubhayachari, Sunapha, Anapha, Durudhara:** report the benefic and malefic forms separately?
- **Q-Y-4 Adhi:** how many benefics are needed? Must all of the 6th, 7th and 8th be occupied? Is the Lagna also a reference?
- **Q-Y-5 Viparita (Harsha / Sarala / Vimala):**
  - What are the strength and affliction conditions?
  - How is a dusthana lord that also owns a kendra treated?
  - Does association with kendra or trikona lords matter?
- **Q-Y-6 Raja yoga** (the remaining part; the relation types and 7+5 are approved):
  - Do one-way aspects count?
  - Does the Lagna count as both a kendra and a trikona?
  - Is the yoga diluted by 8th or 11th co-lordship?
  - Do Rahu and Ketu join?
- **Q-Y-7 Dhana:** the full pair list. Add 5+11 and 9+11?
- **Q-Y-8 Neecha Bhanga:** which bhanga routes count, and when is a cancellation a *Raja* yoga?
- **Q-Y-9 Mahapurusha:** use the Moon as an extra reference? Is the yoga weakened by conjunction with the Sun or Moon?
- **Q-Y-10 Kemadruma:** what is the full bhanga list? Should "formed and cancelled" be shown (this fits the no-dosha stance)?
- **Q-Y-11 Nabhasa:** should Sankhya yogas apply only when no Akriti or Ashraya yoga applies?
- **Q-Y-12 Yoga class procedure:** the strong / moderate / weak / cancelled decision steps and the per-yoga factor tiers (audit 04 §5).

**General**
- **Q-G-1:** Naming: "Bhrigu" or "Brihaspati" Nandi Nadi in the career section? May CAR-004 stay while the gupta-nadi rules are blocked?
- **Q-G-2:** Node exaltation (Taurus/Scorpio) is one published convention. Confirm it.
- **Q-G-3:** Age windows per topic: e.g. first earnings, retirement, seniority wording.
- **Q-G-4:** Vimshottari year length (365.2425 days; `docs/astrology-spec.md` lists it as pending).
- **Q-G-5:** Yoga-strength wording: may reports use intensifiers ("powerful", "royal") for any class, or only for `strong`?

## 7. Engineering notes

- **Contracts:** `types.ts`, `schema.ts` (zod; strict; drift is checked against the interfaces at compile time), `input.ts` (`InterpretationInput` is structurally satisfied by report-engine `ChartSnapshot`, and `FactView` by `EvidenceRegistry`), `ids.ts`, `stages.ts` (stage, pack and pipeline signatures).
- **Dependency:** `zod ^3.23.8` was added to prediction-engine. The result and policy schemas must be validated at the package boundary, and this is the same version report-engine already uses (MIT licence, already in the lockfile; no new package is downloaded).
- **Tests:** `interpretation/__tests__/conflict.test.ts` covers every class outcome, the seed rules, precedence mechanics, cycles and determinism. `contracts.test.ts` covers the schemas, IDs, `rulesetVersion` (recomputed independently), life stage and the barrel.

## 8. Product thresholds (client / product questions)

These values were introduced during implementation (2026-11-20) as **product defaults, not astrology**. None of them comes from a classical text. Each one is a question for the client or the product owner, and each must be confirmed or changed here before it is treated as approved. Changing a value changes the affected topics' prompts or evidence, and therefore their cache keys.

| ID | Threshold | Value | Where | Question |
|---|---|---|---|---|
| Q-P-1 | Earnings window: MDs considered for "first earnings" | start age ≤ **60** and end age ≥ **16** | `EARNINGS_WINDOW`, `reports/career/calc/career-calc.ts` | Is 16–60 the right working-age window? Should it be per topic (audit 05 V5 suggested "first earnings ≤ 35")? |
| Q-P-2 | Early-career age (seniority framing withheld) | up to and including age **29** (topic variants and validator) | `EARLY_CAREER_MAX_AGE`, `platform/life-stage.ts` (re-exported by `career.definition.ts` and `validation/interpretation-validator.ts`) | **Unified 2026-11-20; see below.** Is 29 right, or should it be 35 (audit 05 F4, "under-35s")? |
| Q-P-3 | Retirement topic reframed as "long-term stability" | up to age **39** | `RETIREMENT_REFRAME_MAX_AGE`, `career.definition.ts` | Is 39 right? Audit 05 F4 suggested under-35s. |
| Q-P-4 | Life-stage bands (`native.life-stage`) | early-career < 25; building 25–39; mid-career 40–54; late-career ≥ 55 | `LIFE_STAGE_BANDS`, `platform/interpretation/facts.ts` | Confirm the bands and their wording. |
| Q-P-5 | Life-stage horizon: dasha periods starting after this age are tagged `LIFE_STAGE_GATED` | **60** | `LIFE_STAGE_HORIZON_AGE`, `stages/activation.ts` | Is 60 right? Should it equal the earnings-window upper bound by definition? |
| Q-P-6 | Near-duplicate detection across topics (error for opted-in topics) | unigram overlap ≥ **0.7** or bigram overlap ≥ **0.6**, sentences of ≥ **6** tokens | `DEFAULT_REPETITION_OPTIONS`, `validation/editorial-validator.ts` | Are these too strict (regeneration cost) or too loose (repetition, audit F20)? |
| Q-P-7 | Birth-time boundary window (`BIRTH_TIME_SENSITIVE`) | **5 minutes** of birth time to a sign, nakshatra, pada, D9 or D10 boundary | `BOUNDARY_THRESHOLD_MINUTES`, `stages/chart-validation.ts` | Is 5 minutes right? Should it depend on how the birth time was recorded? |
| Q-P-8 | LLM temperature for opted-in topics | **0.2** (legacy topics: 0.55) | `DEFAULT_INTERPRETATION_TEMPERATURE`, `llm/narrator.ts` | Confirm. A lower temperature reduces paraphrase drift but can make the prose more repetitive. |
| Q-P-9 | Key career planets whose D10 dignity S5 always reports | D1 10th lord, D10 Lagna lord, D10 10th lord, Amatyakaraka, Sun, Saturn, Jupiter | `keyCareerPlanets`, `stages/divisional.ts` | Is this list right? Should the 6th, 7th and 11th lords, or Mercury, be added? |
| Q-P-10 | Output-token cap for opted-in topics (Gemini thinking tokens count against it) | **32000** (legacy: 16000) | `DEFAULT_INTERPRETATION_MAX_OUTPUT_TOKENS`, `llm/narrator.ts` | Engineering default after the first golden run truncated 7 topics at 16000. Confirm it against the cost budget. |

**Q-P-2 unified (2026-11-20).** There used to be two constants named `EARLY_CAREER_MAX_AGE`: **29** in the career definition, for the `early-career` topic variant, and **35** in the interpretation validator, for `LIFE_STAGE_MISMATCH`. For a native aged 30–34, the prompt therefore allowed seniority framing that the validator then rejected, which wasted a regeneration.
- There is now one constant, `EARLY_CAREER_MAX_AGE = 29`, in `platform/life-stage.ts`, and both modules import it.
- Both apply it inclusively (`age <= 29`, `isEarlyCareerAge`). The validator therefore always agrees with what the variant tells the model.
- 29 was chosen to match the variants already in use. If the client prefers 35 (audit 05 F4), change the one constant; career topic cache keys then change for natives aged 30–35.

