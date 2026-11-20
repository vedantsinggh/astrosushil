# Astrology Engine Extensions — Method Decisions (2026-11-18)

Scope: Yogini, Chara, Narayana and Kalachakra Dashas; Gochara Vedha and the Jupiter/Saturn ("Guru Peyarchi") summary; Prashna Karya Bhava and Karya lord; Ashtakavarga and Gochara convention entries.
Code: `packages/astrology-engine/src/dasha/{yogini,chara,narayana,kalachakra}-dasha-calculator.ts`, `dasha/jaimini-sign-dasha-utils.ts`, `dasha/period-tree-builder.ts`, `dasha/sign-dasha-tree.ts`, `transit/gochara-vedha.ts`, `prashna/prashna-karya.ts`, `metadata/convention-registry.ts`.
Tests: `packages/astrology-engine/tests/unit/extended-dashas.test.ts`, `tests/unit/gochara-vedha-prashna-karya.test.ts` (hand-derived worked examples, with the derivation next to each assertion).
API: `POST /api/v1/astrology/dashas/{yogini|chara|narayana|kalachakra}`; the same systems are also available through `POST /dasha` with `dashaSystem`. `POST /gochara` gains `transitToMoon[].vedha` and `majorTransits`. `POST /prashna` accepts `questionDomain`.

The product owner has no astrology background and delegated method choices to engineering. Every choice uses the best-established classical source available and is **provisional until the client signs off**, like [`../DECISIONS.md`](../DECISIONS.md) (D-001 … D-008 also apply). "Confidence" states how sure engineering is that the rule is the mainstream one. Medium or low means the client should check that rule against their own texts first.

## Common conventions

| ID | Topic | Decision | Basis | Alternatives considered |
|---|---|---|---|---|
| EXT-001 | Year length | 365.2425 days, the same as every existing engine dasha (`MS_PER_YEAR`) | Engine consistency; still open with the client (astrology-spec.md) | 365.25; 360-day savana year |
| EXT-002 | Pre-birth periods | Every parent lists its **complete** classical sequence of sub-periods. Periods that ended before birth are kept, flagged `isBeforeBirth: true`, given `durationYears: 0`, and never marked active. A period running at birth starts at birth, and its `nominal*` dates show the full span. | Lets the reader audit the whole sequence. The API contract requires all 8, 12 or 9 sub-periods. | Clip and drop pre-birth periods (what Vimshottari does) |
| EXT-003 | Active period | `currentPeriod` is returned only when `targetDate` is supplied. The server time is never used. | AGENTS.md §1.3 determinism | Default to "now" |
| EXT-004 | Depth | Mahadasha, Antardasha and Pratyantardasha (maxLevel 1–3) | The classical texts define these levels for all four systems | — |

## Yogini Dasha

| ID | Rule | Source | Confidence | Alternatives |
|---|---|---|---|---|
| YOG-001 | 8 Yoginis in fixed order, each ruling 1–8 years: Mangala (Moon) 1, Pingala (Sun) 2, Dhanya (Jupiter) 3, Bhramari (Mars) 4, Bhadrika (Mercury) 5, Ulka (Saturn) 6, Siddha (Venus) 7, Sankata (Rahu) 8. Total 36 years. | BPHS, Yogini Dasha chapter | High | — |
| YOG-002 | Starting Yogini = (Janma Nakshatra number + 3) mod 8; a remainder of 0 means Sankata | BPHS | High | — |
| YOG-003 | Balance = unelapsed fraction of the Moon's nakshatra × years of the starting Yogini | Standard nakshatra-dasha balance rule (same as Vimshottari) | High | — |
| YOG-004 | Antardasha and Pratyantardasha start with the parent's own Yogini and run through all 8; each lasts parent years × Yogini years / 36 | BPHS proportional rule | High | — |
| YOG-005 | Sankata is ruled by Rahu only (`nodeLordConvention: SANKATA_RAHU`). Ketu rules no Yogini. | BPHS lists 8 lords | Medium | Some modern schools give Sankata to both Rahu and Ketu |
| YOG-006 | `cycles` (1–4) controls how many 36-year cycles are listed. The default is 1. | API contract | — | — |

**Worked example (unit test).** Moon at 73.333°, the middle of Ardra (#6). (6 + 3) mod 8 = 1 gives Mangala, with a balance of 0.5 × 1 = 0.5 years. Pingala/Pingala lasts 2 × 2 / 36 years. API native (1990-05-15 14:30 IST, Delhi): Moon 271.904° in Uttara Ashadha (#21). (21 + 3) mod 8 = 0 gives Sankata. 5.237° of the nakshatra's 13.333° has elapsed, so the balance is (1 − 0.3928) × 8 = 4.858 years.

## Jaimini sign dashas: shared rules (Chara and Narayana)

| ID | Rule | Source | Confidence | Alternatives |
|---|---|---|---|---|
| JSD-001 | Co-lords: Scorpio = Mars + Ketu; Aquarius = Saturn + Rahu | Jaimini Sutras (standard) | High | Mars and Saturn only |
| JSD-002 | "Odd-footed" (savya) signs: Ar, Ta, Ge, Li, Sc, Sg. Even-footed: Cn, Le, Vi, Cp, Aq, Pi. | Jaimini / K.N. Rao | High | — |
| JSD-003 | Dasha years = inclusive count from the sign to its lord's sign, minus 1. The lord in the sign itself gives 12 years. Then +1 if the lord is exalted, −1 if debilitated. The own-sign case gets no adjustment and stays 12. | K.N. Rao (Chara); P.V.R. Narasimha Rao (Narayana) | High for the count; Medium for +1/−1 | Some schools omit the exaltation/debilitation adjustment |
| JSD-004 | Stronger co-lord, rules applied in order: (a) if one lord occupies the sign, use the other; if both do, own sign (12 years). (b) More planets conjoined. (c) Exalted. (d) Placed in a dual sign, then fixed, then movable. (e) Higher degree in sign (nodes measured as 30° − degree, because they move backwards). (f) Primary lord (Mars or Saturn). | K.N. Rao's co-lord rules; (e) and (f) are deterministic tie-breaks | Medium | Sanjay Rath's longer Rasi-bala list |
| JSD-005 | **Edge case:** if a debilitation adjustment brings the length to 0 (the lord sits in the next sign in counting order and is debilitated, e.g. Sagittarius with Jupiter in Capricorn), the length is floored at 1 year and `flooredAtOne` is set. | No classical statement found. This is an engineering guard. | **Low — needs the client to confirm** | Treat as 12 (modular arithmetic); skip the sign |
| JSD-006 | Second cycle (`cycles = 2`): each sign gets 12 − first-cycle years. Signs that come to 0 are skipped. | K.N. Rao | High | — |
| JSD-007 | Sign strength (Narayana start, Lagna vs 7th), rules applied in order: (1) more of the nine grahas occupy the sign; (2) more of Jupiter, Mercury and the sign's lord(s) conjoin or aspect it by Jaimini rashi drishti; (3) more exalted occupants; (4) natural strength, dual > fixed > movable; (5) the lord sits in a sign of different oddity; (6) the lord is more advanced in its sign; (7) a full tie keeps the Lagna. The full scorecard is returned in `startingSignEvidence`. | Jaimini Sutras 2.3 Rasi-bala sources, in the order given by P.V.R. Narasimha Rao | Medium (the order of rules 2 and 3 differs between authors) | Shoola's simpler 3-rule comparison (kept unchanged for Shoola) |
| JSD-008 | No birth balance: the first sign runs its full length from birth | Jaimini sign dashas (K.N. Rao, P.V.R. Narasimha Rao) | High | Lagna-degree balance (used by the engine's Sthira and Shoola, which are unchanged) |

## Chara Dasha (K.N. Rao method)

Competing methods: K.N. Rao ("Predicting through Jaimini's Chara Dasha") and P.V.R. Narasimha Rao / Sanjay Rath. **K.N. Rao's version is used**, as the most widely taught (Bharatiya Vidya Bhavan) and the default "Chara dasa" in common software.

| ID | Rule | Confidence |
|---|---|---|
| CHR-001 | Starts from the Lagna sign | High |
| CHR-002 | Direction: forward if the **9th from Lagna** is odd-footed, otherwise reverse | High |
| CHR-003 | Length: JSD-003, counting forward for odd-footed signs and in reverse for even-footed signs | High |
| CHR-004 | Antardashas: 12 equal parts. The first is the sign after the Mahadasha sign in the dasha direction; the Mahadasha sign's own Antardasha comes **last**. Pratyantardashas follow the same rule inside each Antardasha. | Medium. Alternative: the Antardasha direction follows the Mahadasha sign's own footing. |

**Worked example (unit test, chart A).** Lagna Aries. The 9th, Sagittarius, is odd-footed, so the order is Ar Ta … Pi. The years are 4, 11, 8, 12, 5, 5, 6, 1, 1, 4, 5, 1 (total 63). Each count is written out in the test, for example Ta→Venus in Pisces: 11 signs gives 10, plus 1 for exaltation, so 11. Sagittarius exercises JSD-005: Jupiter is debilitated in the next sign, 1 − 1 = 0, floored to 1. The Aries Antardashas run Ta … Pi, Ar.

## Narayana Dasha

| ID | Rule | Source | Confidence | Alternatives |
|---|---|---|---|---|
| NAR-001 | Starts from the stronger of Lagna and 7th (JSD-007) | Jaimini Sutras; P.V.R. Narasimha Rao; Sanjay Rath | High | — |
| NAR-002 | Direction: odd starting sign forward, even reverse. If Saturn is in the starting sign, the order is always forward. If Ketu is in it (and Saturn is not), the natural order is reversed. | P.V.R. Narasimha Rao | Medium (precedence when both Saturn and Ketu are in the sign is not stated; Saturn is given precedence) | — |
| NAR-003 | Progression by the starting sign's nature: movable → consecutive signs (`MOVABLE_REGULAR`); fixed → every 6th sign (`FIXED_SIXTH`); dual → trines 1, 5, 9, then 2, 6, 10, then 3, 7, 11, then 4, 8, 12 (`DUAL_TRINE`) | Jaimini "padakrama" as given by P.V.R. Narasimha Rao | Medium | Dual signs via kendras (1, 4, 7, 10 …), as some texts give |
| NAR-004 | Length: JSD-003, counting forward from odd signs and in reverse from even signs | P.V.R. Narasimha Rao | High | — |
| NAR-005 | Antardashas: 12 equal parts starting with the Mahadasha sign itself, in the same progression pattern and direction as the Mahadashas | Simplest documented variant | **Low — needs the client to confirm** | Sanjay Rath: start from the sign occupied by the dasha sign's lord (Paka rashi). Not implemented. |

**Worked example (unit test, chart A).** Aries (Sun) and Libra (Saturn) tie on occupants. On association, Mars in Leo aspects Aries, while nothing from Jupiter, Mercury or Venus reaches Libra, so Aries starts. Aries is odd with no Saturn or Ketu, so the order is forward and regular. The years are 4, 3, 8, 12, 9, 5, 6, 11, 1, 4, 9, 1 (total 73). Saturn and Ketu cases have their own tests.

## Kalachakra Dasha (BPHS)

| ID | Rule | Confidence |
|---|---|---|
| KCD-001 | Nakshatra triads from Ashwini. Triads 1, 3, 5, 7 and 9 are **Savya**: Ashwini, Punarvasu, Hasta, Moola and Purva Bhadrapada groups (15 nakshatras). Triads 2, 4, 6 and 8 are **Apasavya**: Rohini, Magha, Vishakha and Shravana groups (12 nakshatras). | High |
| KCD-002 | Pada sequences come from F = Ar…Pi and R = Sc Li Vi Cn Le Ge Ta Ar Pi Aq Cp Sg. Savya, 1st and 3rd nakshatra of a triad: F R F; savya middle nakshatra: R F R. Apasavya 1st and 3rd: rev(R) rev(F) rev(R); apasavya middle: rev(F) rev(R) rev(F). Each run of 36 signs is read 9 at a time for padas 1–4. This gives Ashwini 1 = Ar…Sg, Bharani 1 = Sc Li Vi Cn Le Ge Ta Ar Pi, Rohini 1 = Sg Cp Aq Pi Ar Ta Ge Le Cn and Mrigashira 1 = Pi Aq Cp Sg Sc Li Vi Le Cn. It also contains the gati jumps BPHS names (Manduka Vi→Cn, Markati Cn→Le, Simhavalokana Pi→Sc and Sg→Ar). The pada totals check against BPHS: **savya 100 / 85 / 83 / 86 and apasavya 86 / 83 / 85 / 100**, verified for all 108 padas in the unit test. | High for savya and the totals. **Medium for which apasavya nakshatra (Rohini or Mrigashira) takes which sequence**, reconstructed from memory of the BPHS table. The client should compare it with a printed table. |
| KCD-003 | Sign years by sign lord: Sun 5, Moon 21, Mars 7, Mercury 9, Jupiter 10, Venus 16, Saturn 4 | High |
| KCD-004 | Years elapsed at birth = the Moon's elapsed fraction of its pada × the pada's paramayus. Walking through the 9 signs gives the running sign and its balance. | High |
| KCD-005 | After the 9 signs of the birth pada, the dashas continue with the next pada's sequence. 9 Mahadashas are listed by default. | Medium. Some practitioners restart from the same pada. |
| KCD-006 | Antardashas: the 9 signs of the Mahadasha's own pada sequence, starting at the Mahadasha's position and wrapping round. Each lasts MD years × sign years / paramayus. Periods are keyed by **position**, because a sign can appear twice in one pada (e.g. Ashwini 3). | Medium |
| KCD-007 | Deha / Jeeva: in savya padas the first sign is Deha and the last is Jeeva. In apasavya padas they are **reversed** (`APASAVYA_REVERSED`). This is configurable via `dehaJeevaConvention: 'SAME_AS_SAVYA'`. | **Low–medium — needs the client to confirm** |
| KCD-008 | Gati effects (Manduka, Markati, Simhavalokana) are **not** reported | — (gap) |

**Worked example (unit test).** Moon 25% into Ashwini pada 1 (paramayus 100) gives 25 years elapsed. Ar 7 + Ta 16 = 23, so Gemini (9 years) is running with 2 years elapsed and a balance of 7. Deha is Aries and Jeeva is Sagittarius. The Cancer MD's Antardashas run Cn … Ge, with Cn = 21 × 21 / 100 = 4.41 years. API native: Moon 271.904° is Uttara Ashadha pada 2 (savya, Krittika-type). The sequence Cp Aq Pi Sc Li Vi Cn Le Ge totals 85. 57.1% elapsed is 48.55 years, which falls in Virgo with a balance of 1.447 years.

## Gochara Vedha and Guru Peyarchi (Phaladeepika ch. 26)

| ID | Rule | Confidence | Alternatives |
|---|---|---|---|
| GOC-001 | Houses are counted by whole sign from the **natal Moon sign** | High | — |
| GOC-002 | Favourable house / Vedha house pairs. Sun: 3/9, 6/12, 10/4, 11/5. Moon: 1/5, 3/9, 6/12, 7/2, 10/4, 11/8. Mars and Saturn: 3/12, 6/9, 11/5. Mercury: 2/5, 4/3, 6/9, 8/1, 10/8, 11/12. Jupiter: 2/12, 5/4, 7/3, 9/10, 11/8. Venus: 1/8, 2/7, 3/1, 4/10, 5/9, 8/5, 9/11, 11/6, 12/3. | High | — |
| GOC-003 | Rahu and Ketu use Saturn's table (`nodeModel: AS_SATURN`). `NONE` is available and leaves the nodes unevaluated. | Medium | No gochara results for the nodes |
| GOC-004 | Only the 7 classical grahas cause Vedha. There is no Vedha between Sun and Saturn, nor between Moon and Mercury. With the nodes on Saturn's table, the Sun does not obstruct them either. | High (exemptions); Medium (nodes do not obstruct) | — |
| GOC-005 | Vipareeta Vedha: a planet in an unfavourable house that is the Vedha point of a favourable house is relieved when another planet occupies that favourable house. It is reported separately (`isVipareetaVedha`). | Medium | Not reported |
| GOC-006 | `majorTransits.isGuruPeyarchiFavorable` = Jupiter in house 2, 5, 7, 9 or 11 from the natal Moon (the popular Guru Peyarchi reading). `isGuruPeyarchiFavorableAfterVedha` also requires Jupiter to be unobstructed. Saturn gets the same facts but no Sade Sati or Dhaiya label (that editorial policy is unchanged). | High | — |

## Prashna Karya

| ID | Rule | Confidence |
|---|---|---|
| PRS-001 | `questionDomain` maps to the Karya Bhava by BPHS ch. 11 bhava significations: SELF/HEALTH 1; WEALTH/FAMILY 2; SIBLINGS/COMMUNICATION/SHORT_JOURNEY 3; MOTHER/PROPERTY/VEHICLE 4; EDUCATION/CHILDREN 5; DISEASE/ENEMIES/LITIGATION/DEBT 6; MARRIAGE/PARTNERSHIP 7; LONGEVITY 8; FATHER/LONG_JOURNEY 9; CAREER 10; GAINS 11; EXPENSES/FOREIGN_RESIDENCE 12 | High, except EDUCATION (5th, vidya, per BPHS; some Prashna/KP schools use the 4th), Medium |
| PRS-002 | Karya house = that whole-sign house from the Prashna Lagna. Karya lord = its sign lord. Lagna lord = the Prashna Lagna sign's lord. | High |
| PRS-003 | Reported facts only: each lord's house, whether the lords' signs are in Tajika aspect, and the Tajika yogas between the two lords from the engine's existing Tajika calculator. **No yes/no verdict** (interpretation stays out of the engine). | — |
| PRS-004 | Lost-article, timing and Arudha-based Prashna techniques are not implemented | — (gap) |

## Convention registry

| ID | Decision |
|---|---|
| CNV-001 | New entries `ashtakavarga` and `gocharaTransit`, using the key names from the API contract. They describe the engine's existing behaviour: BPHS ch. 66–73 tables, BAV totals 48/49/39/54/56/52/39, Shodhana and Pinda, and the BAV ≥ 4 / SAV ≥ 28 transit thresholds. The Gochara entry adds the GOC rules. `getConvention()` lookups now ignore case and separators. |
| CNV-002 | Yogini, Chara, Narayana and Kalachakra moved from `pending` to `implemented`. Chara and Narayana report `totalCycleYears: 144`, the maximum of 12 signs × 12 years; the real cycle length depends on the chart. The old placeholder of 96 for Chara had no basis. |

## Open questions for the client

1. JSD-005: a dasha length that comes to 0 after debilitation (currently floored at 1).
2. NAR-005: the Narayana Antardasha start (the Mahadasha sign itself, or the Paka rashi).
3. KCD-002 and KCD-007: the apasavya sequence assignment, and Deha/Jeeva in apasavya padas.
4. CHR-004: the Chara Antardasha direction.
5. YOG-005: whether Ketu should co-rule Sankata.
