# Astro Sushil - Astrology Calculation Capability Audit

Repo: /home/pilot/Projects/astrosushil (branch chore/ci-infra-pricing-mobile-updates, HEAD c969b68). Audit date 2026-11-18. Read-only.
Paths are relative to the repo root. AE = packages/astrology-engine/src, RE = packages/report-engine/src, PE = packages/prediction-engine/src.

Test runs (read-only):
- astrology-engine: 38 files / 382 tests all pass (`npx vitest run`).
- report-engine: 129/130 pass. The one failure is `phase2a-pdf-verification.test.ts` (local XeLaTeX compile, an environment issue, not a calculation failure). Side effect: the run wrote `phase2d_career_report_sample.pdf` into the repo root and into packages/report-engine. I deleted both afterwards. The root copy's timestamp (07:15) is earlier than this run started, so another process may have created that one.
- 14 of the 38 astrology-engine test files use `MockEphemerisProvider` (fixed, fabricated coordinates). Very few tests check real ephemeris output against an external reference.

---

## 1. Core conventions

| Item | Value | Evidence |
|---|---|---|
| Ephemeris | `astronomy-engine` 2.1.19 (Don Cross, **MIT**), VSOP87/ELP-based. Called as `GeoVector(body, t, aberration=true)` then `Ecliptic()`, which gives the true ecliptic of date. Speed comes from a 1-hour finite difference. | AE/ephemeris/astronomy-engine.adapter.ts:90-104; packages/astrology-engine/package.json; node_modules/astronomy-engine/package.json `"license":"MIT"` |
| Ayanamsa | **Lahiri, linear approximation** `23.85 + 0.01396 * yearsFromJ2000`. Any other configured ayanamsa (RAMAN/KP/KRISHNAMURTI) silently falls back to a **constant 23.85**. | AE/chart/chart-calculator.ts:36-45 |
| Zodiac | Sidereal (default) | AE/configuration/astrology-config.ts:46-55 |
| House system | **Whole Sign only.** `config.houseSystem` is accepted but ignored by ChartCalculator. EQUAL/PLACIDUS/SRI_PATI exist only as enum values. | AE/chart/chart-calculator.ts:121-134; config enum astrology-config.ts:13-18 |
| Nodes | **Mean node** (Meeus polynomial). Rahu/Ketu are always `isRetrograde:true` with a fixed speed of -0.05295. TRUE_NODE is accepted in config but never implemented. | astronomy-engine.adapter.ts:66-87 |
| Ascendant | GMST, longitude to LST, mean obliquity, standard atan2 formula. No nutation, so error is a few arcseconds. | chart-calculator.ts:97-114 |
| Year length (dasha) | 365.2425 days (Gregorian). This is an unconfirmed convention; many Indian packages use 365.25 or a 360-day savana year. | AE/dasha/dasha-calculator.ts:17 |
| Docs status | astrology-spec.md:273-275 lists ayanamsa, house system and mean vs true node as **unconfirmed by client** (unchecked boxes). Lines 377-378 nonetheless document Lahiri and Whole Sign as canonical. | docs/astrology-spec.md |

Empirical spot check of the real adapter (my own scratch test):
- J2000 noon UT gives Sun 256.519 (Dhanu), Moon 199.47, Rahu 101.195. These match standard Lahiri values to within about 0.01 degrees.
- The linear Lahiri formula is within about 30 arcseconds of true Lahiri for 1900-2100. That matters only at nakshatra/pada and D60 boundaries.

Inconsistencies between modules:
- ConventionRegistry claims KP uses `PLACIDUS` / `KP_NEW` (AE/metadata/convention-registry.ts:38-46). The KP calculator actually builds **equal 30-degree cusps from the Ascendant** and hard-codes `ayanamsaValue: 23.85` (AE/kp/kp-calculator.ts:28-35, 238).
- The Lahiri formula is copy-pasted in 7 places instead of living in one function: chart-calculator.ts:41, panchang-calculator.ts:145, solar-return.solver.ts:55, prashna-sphuta.calculator.ts:35, transit-ingress.solver.ts:42, matchmaking-calculator.ts:750-751, RE/mappers/career-report.mapper.ts:727.
- The report validator rejects any non-WHOLE_SIGN chart (RE/validation/report-evidence.validator.ts:168).

---

## 2. Capability inventory

Legend: Impl = implemented. Test = unit tests exist. Det = deterministic given an explicit time. "now" means the code defaults to `new Date()`.

| Capability | Impl | Where | Test | Notes |
|---|---|---|---|---|
| Planet longitude/sign/nakshatra/pada | Yes | chart-calculator.ts:56-90; AE/zodiac, AE/nakshatra | Yes (boundary tests) | Real ephemeris is accurate. The benchmark fixture is fake (see defect D1). |
| House placement / lords / occupants | Yes (Whole Sign) | chart-calculator.ts:121-134; AE/chart/chart-normalizer.ts | Yes | |
| Retrograde | Yes | adapter speed sign | Partial | Nodes are hard-coded retrograde. |
| Combustion | Yes | AE/planets/combustion.ts (Moon 12, Mars 17, Mercury 14/12 retro, Jupiter 11, Venus 10/8 retro, Saturn 15) | Yes | Classical orbs. |
| Dignity / relationships / avasthas / karakas / war | Yes | AE/planets/planetary-dignity.ts, planetary-relationships.ts, planetary-avasthas.ts, planetary-war.ts | Yes (planetary-intelligence.test) | |
| Graha drishti | Yes | AE/planets/planetary-aspects.ts:13-60 (7th for all; Mars 4/8, Jupiter 5/9, Saturn 3/10, Rahu/Ketu 5/9) | Yes (PE phase2b-planetary-aspects.test) | Giving Rahu/Ketu 5/9 aspects is a tradition choice that needs client confirmation. |
| Divisional charts | Yes: D1, D2, D3, D4, D7, D9, D10, D12, D16, D20, D24, D27, D30, D40, D45, D60 (Shodashavarga) | AE/varga/varga-calculator.ts:116-270 | Yes | I checked the formulas against BPHS and found them correct. No D5/D6/D8/D11. |
| Chart variants | Sun, Moon, Karakamsha, Sunrise, Equal-Bhava, Sripati | AE/chart/chart-variants.calculator.ts | 1 test (counts houses only) | Sripati is broken (D4). |
| Vimshottari | Yes, 5 levels (MD/AD/PD/Sookshma/Prana), default 3 | AE/dasha/dasha-calculator.ts:50-68 | Yes (20 tests) | |
| Other dashas | Ashtottari, Sthira, Shoola, Dwisaptati-Sama, Shatabdika, Chaturaseeti-Sama, Dwadashottari, Panchottari | AE/dasha/*.ts, dasha-registry.ts | Yes | |
| Yogini dasha | **No** (registered as `PENDING`) | AE/dasha/dasha-registry.ts:275-291 | - | Chara dasha is also pending. |
| Mudda dasha | Yes | AE/varshaphala/mudda-dasha-calculator.ts:40-100 | Yes | Starts from the annual-chart Moon nakshatra lord with no balance. Classical Mudda counts from the janma nakshatra plus completed years. The PDF builder itself says this is "not derived from the approved reference" (RE/pdf/varshphal-report-pdf.builder.ts:916). Needs client confirmation. |
| Tajik timing | Panchadhikari, Harsha Bala, Muntha | AE/varshaphala/* | Yes | |
| Yogas (~60 rules) | Yes. Mahapurusha (5); Chandra (Gajakesari, Sunapha, Anapha, Durudhara, Kemadruma + cancellation, Chandradhi, Chandra-Mangala, Amala); Surya (Budha-Aditya, Vesi, Vosi, Ubhayachari); Neecha-bhanga; Parivartana (Maha/Dainya/Khala); Viparita (Harsha/Sarala/Vimala); Raja/Dhana (kendra-trikona, Dharma-Karmadhipati, Lakshmi, Saraswati); Nabhasa (13) | AE/yoga/yoga-registry.ts, evaluators/*.ts | Yes (11 tests) | Neecha-bhanga is registered twice (yoga-registry.ts:37 and :42). The evaluator is deduplicated (registry.ts:81), so this is harmless. |
| Manglik | Yes (engine): Mars in 1/4/7/8/12 from Lagna, Moon and Venus, plus pairwise comparison | AE/matchmaking/matchmaking-calculator.ts:836-1000 | Yes | The house list excludes the 2nd house, which is a tradition choice. |
| Kaal Sarp | **No** | Only a type exists: RE/types/report.types.ts:146 | - | |
| Sade Sati | Point-in-time status only (12/1/2 from Moon, plus 4th/8th Dhaiyya) | AE/transit/sade-sati-calculator.ts:27-80 | Yes | There is **no lifetime Sade Sati period finder**. The Saturn calculator hard-codes dates (D2). |
| Ashtakavarga | Yes: BAV, SAV, Shodhana, Pinda | AE/ashtakavarga/* | Yes (18 tests) | |
| Shadbala | Yes: Sthana, Dig, Kala, Cheshta, Naisargika, Drik, plus Bhava Bala, Vimshopaka, Rashmi | AE/strength/* | Yes (23+13 tests) | |
| Transits | Generic ingress, nakshatra-ingress and station solver | AE/transit/transit-ingress.solver.ts:24-205; transit-calculator.ts | Yes (3 tests) | Only TransitCalculator uses the solver. Jupiter/Saturn/Rahu-Ketu modules use **hard-coded tables** instead (D2/D3). |
| Varshphal | Solar return solver, Varsha Lagna, Muntha (natal Lagna + completed years), Panchadhikari/Varsheshwar, Harsha Bala, 5 Tajik yogas (Ithasala, Isarpha, Kamboola, Nakta, Yamaya), 10 Sahams | AE/varshaphala/*.ts | Yes (13+6 tests) | Only 5 of the 16 Tajik yogas and 10 of roughly 50 Sahams are covered. |
| Matchmaking | Ashtakoota 36 guna with Bhakoot/Nadi cancellations, Manglik comparison, Moon-sign-change detection for unknown birth time | AE/matchmaking/* | Yes (~40 tests) | No Dashakoota. `tzOffsetMinutes` defaults to IST (matchmaking-calculator.ts:738). |
| Numerology | Mulank, Bhagyank, Chaldean name number, soul urge, personality, maturity, Lo Shu grid and planes, Kua | **report-engine generators**, not the engine (section 3) | fortune-plus-calculator.test only | |
| Baby name | Namakshara only: 108 syllables (27 nakshatras x 4 padas) | AE/panchang/avakhada-chakra.ts:25-186 | panchang-chakras.test | **No baby-name generator or name list.** |
| Panchang | Tithi, vara, nakshatra, yoga, karana, sunrise/sunset (astronomy-engine `SearchRiseSet`), Rahu Kala, Avakhada, Ghat and Tara chakras | AE/panchang/* | Yes (18+3) | The vara bug is D6. |
| Jaimini / KP / Prashna / special points | Yes | AE/jaimini, kp, prashna, special-points | Yes | The KP cusps are not Placidus. |
| Gupta Nadi / BNN | **No.** The whole package is a placeholder function. | packages/gupta-nadi-engine/src/index.ts:1-5 | None | docs/gupta-nadi-spec.md says rules await client BNN documentation. |
| Prediction engine | Three hand-written rules (10th lord, 2/11 Dhana, personality), plus career evidence packaging and the LLM career pipeline | PE/services/prediction.engine.ts | Career tests | IDs use `Date.now()` (prediction.engine.ts:41,60,76), so output is non-deterministic. |
| packages/shared | Only API/birth-detail DTOs. No astrology types. | packages/shared/src/index.ts | - | |

API (`apps/api/src/modules/astrology/astrology.routes.ts:69-423`) exposes chart, kundli, dasha(s), panchang, vargas, matchmaking, evidence, predictions, strength, ashtakavarga, varshaphala, prashna, gochara(+timeline), yogas, special-points, jaimini, kp, sade-sati, chart-variants, avakhada and vimshopaka. All of them delegate to the AE calculators (astrology.service.ts:89-105).

---

## 3. Duplicate or competing implementations

1. **Numerology: 4 separate `reduceToSingleDigit` and 3 separate mulank/bhagyank implementations**, and they behave differently.
   - RE/generators/fortune-report.generator.ts:80: 0 becomes 9.
   - kundli-report.generator.ts:389: returns 0.
   - pro-horoscope.generator.ts:1799: 0 becomes 9.
   - love-report.generator.ts:57-92 (`calculateMulank`/`calculateBhagyank`): 0 becomes 1.
   - kundli-report.generator.ts:399 (`calculateNumerology`).
   - pro-horoscope.generator.ts:1079-1085 (inline).
   - Canonical candidate: fortune-report.generator.ts (Chaldean, Kua, Lo Shu) together with love-report's mulank/bhagyank, which fortune and fortune-plus both import. All of this numerology lives in report-engine rather than in a calculation package, against AGENTS.md section 1.1.
2. **Manglik:** the engine (matchmaking-calculator.ts:856, Lagna/Moon/Venus) and a separate Lagna-only version in kundli-report.generator.ts:851-857. Its "cancellation" check is only "Mars in Aries" (line 885). The engine version is canonical.
3. **Transit timing:** the generic `TransitIngressSolver` (real ephemeris) competes with static tables in jupiter-calculator.ts:141-272, rahu-ketu-calculator.ts:185-223, saturn-calculator.ts:455-522 and love-report.generator.ts:532-544 (`JUPITER_GOCHARA_EPOCHS`). The solver should be canonical, but none of the per-planet report modules call it.
4. **Current-transit computation:** career-report.mapper.ts:722-737 builds its own adapter plus Lahiri, the Kundli generator hard-codes Saturn at 345 degrees (kundli-report.generator.ts:868), and planetary-report.generator.ts:194 falls back to 345.
5. **House systems:** Whole Sign in chart-calculator. Separate Equal/Sripati bhava builders in chart-variants. Equal-from-Ascendant cusps labelled "Placidus" in KP. Whole Sign is canonical.
6. **Vimshottari:** there is a single implementation (AE DashaCalculator) and no competing math. Callers feed it different birth instants, though (D5).

---

## 4. Demonstrable defects (not fixed)

- **D1. The "verified" benchmark fixture is fabricated.** tests/fixtures/reference-charts.ts:28-74 says "Verified Reference Chart Benchmark" for 1990-05-15 14:30 IST Delhi, with Sun 50.25 (Rohini) and Moon 282.12 (Shravana).
  - The real adapter with this engine's own conventions gives Sun 30.56 (Krittika 2) and Moon 271.90 (Uttara Ashadha 2). I verified this with a scratch test.
  - The fixture actually equals the `MockEphemerisProvider` defaults (mock-ephemeris.provider.ts:8-80). Determinism, jaimini, special-points, chart-variants and cross-subsystem tests therefore validate against mock data, not a reference chart. That violates the AGENTS.md section 2.3 requirement for verified reference fixtures.
  - **Status 2026-11-20: fixed.** Fixture and mock defaults now hold JPL Horizons positions (Meeus mean node, ICRC Lahiri ayanamsa); `tests/unit/reference-chart-verification.test.ts` checks them against the source.
- **D2. The Saturn module hard-codes one native's Sade Sati dates.** saturn-calculator.ts:455-505 returns fixed Leo/Virgo/Libra cycles (2006-2014, 2036-2043) with `isActive:false // For Virgo Moon`, whatever the native's Moon. The current transit sign is fixed to Pisces at line 521, and the interpretation string hard-codes "39 points total" at line 451.
- **D3. Static transit tables.**
  - Jupiter phases cover only 2025-2029 (jupiter-calculator.ts:141-272) and Rahu-Ketu only 2025-2030 (rahu-ketu-calculator.ts:185-223). The dates are plausible, but the code fails outside that window. The Rahu-Ketu report has year-named fields (`transit2025_2026`, RE/generators/rahu-ketu-report.generator.ts:148-235).
  - love-report `JUPITER_GOCHARA_EPOCHS` (lines 532-544) has wrong sign labels when checked against the real ephemeris:
    - "Cancer Nov 2027-Feb 2028": Jupiter is actually in Virgo.
    - "Leo Jul-Dec 2028": actually Virgo.
    - "Libra Jan-May 2030": actually Scorpio.
    - "Sagittarius Jun-Oct 2031": actually Scorpio.
    - "Aquarius Oct 2032-Mar 2033": actually Capricorn.
    - "Aries 2034-35": actually Pisces.
- **D4. Sripati bhava is wrong.** chart-variants.calculator.ts:200-235 sets MC = Asc + 270 (no real MC). That makes `portion1` 90 degrees, so the cusps are spaced 90 degrees apart, not about 30. Occupants are left empty but the houses are marked `status:'VERIFIED'`. The single test only checks that 12 houses exist (tests/unit/chart-variants.test.ts:27).
- **D5. Birth-instant handling in report generators.**
  - kundli-report.generator.ts:693 builds `new Date(dob + 'T' + tob + 'Z')`, which treats local time as UTC (5h30m off for IST). That instant feeds the dasha anchor (line 814) and panchang (lines 717-722).
  - finance-report.generator.ts:782 and career-report.generator.ts:563 pass `new Date(dateOfBirth)`, which is midnight UTC, so all dasha dates shift by the birth time.
  - The Kundli generator also falls back to `new Date()` when the date is invalid (line 694), and to Sun = 250 degrees (line 691).
- **D6. Panchang vara uses the UTC weekday.** panchang-calculator.ts:192 uses `getUTCDay()`, not a sunrise-to-sunrise local day. Sunrise is searched from UTC midnight (line 330). Results are wrong for western-hemisphere births and around the date boundary.
  - **Status 2026-11-20: sunrise part fixed.** Sunrise is searched from local midnight (shared `astronomy/solar-day.ts`); `calculateDailyPanchang` now reports the civil-date vara. `calculatePanchang(...)` for an arbitrary instant still uses `getUTCDay()` (unchanged; kundli `vedic-day.ts` recomputes it).
- **D7. Fabricated fallbacks.**
  - kundli-report.generator.ts:799-806 pushes "Budhaditya Yoga" when no yoga is detected.
  - The SAV defaults to a hard-coded 337-point table (lines 760-763).
  - Avakhada and panchang fall back to fixed values inside silent `catch {}` blocks (lines 700-716 and 735-748). There are 8 silent catches in total.
  - career-report.generator.ts:551-552 defaults to a Saturn/Mercury dasha.
  - Numerology defaults to the name 'Puneet Kumar' (fortune-report.generator.ts:483-485, fortune-plus:233-242, 289).
- **D8. Varshphal monthly predictions are static reference-PDF text**, the same for every user (RE/generators/varshphal-reference-months.ts and .json, used at varshphal-report.generator.ts:480). The reference date defaults to now (line 71).
- **D9. Unimplemented config options are silently ignored.** houseSystem, TRUE_NODE, TOPOCENTRIC and non-Lahiri ayanamsas give Whole Sign / mean / geocentric / 23.85 with no error. The `validateRequiredMethodology` guard only rejects the CLIENT_CONFIRMATION_REQUIRED placeholder.
- **D10. Output non-determinism.** `calculationTimestampIso: new Date()` in every chart (chart-calculator.ts:143). Prediction IDs use `Date.now()`. The active dasha and transits in generators use `new Date()` (kundli :815, career :564, career-mapper :722). The calculations themselves are deterministic; the outputs are not byte-identical.
- **D11. Universal Year is hard-coded to 1** for 2026 (pro-horoscope.generator.ts:1086). finance-report uses `refYear = 2026` (line 785) and literal 2028 window strings (lines 770-771).

---

## 5. Gaps against the 13 reference report types

| Report | Missing or unsound calculations |
|---|---|
| Kundli | Kaal Sarp dosha; real Sade Sati lifetime periods (today it is a hard-coded transit); proper Manglik (should use the engine); correct birth instant for dasha/panchang; Bhava Chalit (Sripati broken, Placidus absent). |
| Career | Dasha anchor bug (D5). Otherwise D10, Shadbala and dasha are available. |
| Baby Name | No generator, no name database, no syllable-to-name matching or numerology fit. Only namakshara syllables exist. |
| Love | Dynamic Jupiter transit periods (the table is wrong); Venus/7th-lord transit timing; marriage-timing dasha logic. |
| Fortune / Fortune Plus | Numerology exists but is duplicated and lives in report-engine. Lucky items, colours and gems are table lookups. Hard-coded name fallback. |
| Finance | Dasha anchor bug; static 2026/2028 windows; no computed Jupiter/Saturn transit windows over 2nd/11th houses. |
| Couple Matching | Ashtakoota and Manglik exist. No Dashakoota. Synastry overlays (named in report-spec.md section 2) are not implemented. |
| Jupiter / Rahu-Ketu / Saturn Transit | Ingress dates, retrograde/station periods, Sade Sati/Dhaiyya start-end dates and transit-over-natal-house timing must be computed per date range with the existing `TransitIngressSolver`. Today all three use static tables limited to 2025-2030, and Saturn's tables are specific to one native. Transit-over-BAV-bindu timing is partial. |
| Varshphal | 11 more Tajik yogas, fuller Sahams list, Mudda dasha methodology confirmation, computed (not static) monthly predictions, Tri-Pataki/Patyayini dasha if the reference uses them. |
| Personalised Horoscope | Computed monthly/annual transit windows (43 hard-coded year literals in pro-horoscope.generator.ts); Universal Year is hard-coded. |
| All / Gupta Nadi | The BNN engine is entirely absent (placeholder). The trine/2-12/3-11/7 relationship matrix, rule schema, transit overlay and audit trail in docs/gupta-nadi-spec.md are all unimplemented. Yogini dasha is also absent. |
| Methodology | Client confirmation is still outstanding for ayanamsa, house system, node type and year length (astrology-spec.md:273-275). |
