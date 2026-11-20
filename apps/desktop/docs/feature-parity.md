# Astro Sushil Desktop — Feature parity matrix

Reference: the capability areas of a classic Vedic desktop astrology package (as listed on the
public pages of Parashara's Light 9.0, parasharasoftware.com, fetched 2026-11-20, plus standard
features of that class of software). **Parity of capability only.** No name, artwork, screen
layout, colours, help, report or interpretation text from any vendor is used.

Legend:
- ✅ already in `packages/astrology-engine` (now surfaced in the desktop app unless noted)
- 🛠 implemented in this phase (engine addition with tests, or desktop feature)
- ❓ needs a client methodology decision (see "Questions for the client"); not implemented
- ⏳ well-defined but not done yet (or decided and assigned to the separate core-engine change)
- *(prov.)* built under ADR-016 §6 / §3: a standard published default, cited in the engine output and labelled "provisional – pending client review" in the UI

Feature screens added in this phase live in `lib/features/<feature>/` and are registered as sidebar sections (`lib/src/ui/sections.dart`; new groups "More systems" and "Tables and ephemeris", foldable). Porutham/Dashakoota sit in the Matching section; Patyayini in Extra dashas.

All calculations run in `packages/astrology-engine` through the engine sidecar; the Flutter UI only displays results.

## 1. Charts and positions

| Feature | Status | Where / notes |
|---|---|---|
| North Indian chart | 🛠 | `lib/src/charts/` CustomPainter + PDF |
| South Indian chart | 🛠 | same |
| East Indian chart | 🛠 | same |
| Circular (wheel) chart | 🛠 | `lib/features/chart_wheel` (Rasi wheel; also in Ephemeris → Positions) |
| Kerala chart style | ⏳ | same grid as South Indian with different marking; not built |
| Degree-in-cell chart | 🛠 | degrees shown in Rasi cells |
| Rasi + Navamsa main screen, planet table, houses, nakshatras | 🛠 | Chart section (engine ✅) |
| Shodashavarga D1–D60 (16 vargas) | ✅ | Vargas section (all 16, thumbnails + detail) |
| Further vargas (D5, D6, D8, D11, D81, D108 Ashtottaramsa, D144, D150) | 🛠 (prov.) | `varga-extended/`; `lib/features/vargas_extra`. Definitions per PVR / Jagannatha Hora defaults; D150 placement, D108/D144 scheme and D5/D11 tables need astrologer confirmation |
| Pushkara Navamsha / Bhaga | 🛠 (prov.) | `varga-extended/pushkara.ts`; standard published table (alternatives in conventionNotes) |
| Chandra / Surya / Karakamsha lagna charts | ✅ | Jaimini section → chart variants |
| Bhava Chalit (Sripati) | ✅ | Fixed in engine 0.2.0 (ADR-017): real MC and Lagna, quadrant trisection, sandhis at madhya midpoints, planets placed by sandhis; tested against Raman's worked example. The desktop horoscope PDF includes the page by default, and a Bhava Chalit screen (Chart group) shows madhya and sandhi |
| Sudarshana Chakra | 🛠 | `chart/sudarshana-chakra.ts`; Special section |
| Planet details: dignity, combustion, retrograde, speed, avasthas, aspects | ✅ | Chart / Special sections |
| Chara Karakas (7), 8-karaka scheme | ✅ | UI shows the 7-karaka scheme |
| Arudha padas / Bhavapada, Upapada | ✅ | Jaimini section |
| Upagrahas, Gulika/Mandi, Yogi/Avayogi, special lagnas (Hora, Ghati, Bhava, Indu) | ✅ | Special section |
| Mrityu Bhaga, 64th Navamsa, 22nd Drekkana, Rashmi | ✅ | Special section |
| Bhrigu Bindu | 🛠 (prov.) | `varga-extended/bhrigu-bindu.ts`: midpoint along the Rahu→Moon arc (shorter-arc value also returned) |
| Planetary magnitude | 🛠 | `ephemeris-tables` (`Illumination`), shown in Ephemeris → Positions; ±0.15 mag vs JPL Horizons |
| Ephemeris tables (sidereal daily/weekly/monthly, fixed time or sunrise, local with Lagna), positions calculator, CSV/PDF | 🛠 | `ephemeris-tables/`; `lib/features/ephemeris_tables`; ±0.02° vs JPL Horizons |
| Western tropical tables with Uranus, Neptune, Pluto | 🛠 (prov.) | same module, `zodiac: TROPICAL`, `includeOuterPlanets` |
| Planetary relationships (natural, temporary, compound) | 🛠 | `planetary-relationship-table/`; `lib/features/relationships` |
| Ayanamsa choice (True Chitrapaksha default, Raman, KP) | ✅ | Engine 0.2.0 (ADR-017): true Lahiri default; Raman, Krishnamurti (KSK), KP New, Fagan-Bradley selectable. Sidecar `params.options.ayanamsa`; chosen in Preferences → Calculation (with mean/true node). KP = KP New confirmed by client 2026-11-20 (KSK original stays selectable) |
| Mean / true node choice | ✅ | Engine 0.2.0 (ADR-017): mean node default (Meeus 47.7), true (osculating) node selectable; sidecar `params.options.nodeType`; Preferences UI is a follow-up |
| Classical yogas (84+) with evidence | ✅ | Yogas section |

## 2. Dashas

| Feature | Status | Notes |
|---|---|---|
| Vimshottari (5 levels) | ✅ | Dashas section, depth selector, active period highlighted |
| Ashtottari, Yogini, Kalachakra, Chara, Narayana, Sthira, Shoola | ✅ | Dashas section |
| Dwisaptati Sama, Shatabdika, Chaturaseeti Sama, Dwadashottari, Panchottari (conditional) | ✅ | eligibility from engine shown |
| Sudasa, Drig, Niryana Shoola, Mandooka, Trikona, Kendradi | 🛠 (prov.) | `dasha-sign-extended/` (BPHS ch. 46/51, PVR worked examples); `lib/features/dashas_extended` |
| Tribhagi, Shastihayani, Tara | 🛠 (prov.) | `dasha-planetary-extended/` (BPHS ch. 46; Tribhagi sourcing weaker; Tara "strongest" = Shadbala) |
| Moola, Brahma, Navamsa, Varnada, Padanadhamsa | ❓ | No consistent published rule found (reasons in `dashaExt.list`); Varnada also needs the Hora Lagna/sunrise convention |
| Mudda dasha | ✅ | Varshaphala section |
| Patyayini dasha | 🛠 (prov.) | PVR §30.3, Table 75 reproduced; Lagna + 7 grahas, nodes excluded, solar-return year |
| Dasha Pravesh chart | 🛠 | `lib/features/dasha_pravesh` (chart at the start of a chosen period, birth place) |
| Dasha timeline graphics | 🛠 | Dashas section: horizontal bar timeline (mahadasha → antardasha → pratyantardasha, age ticks, today marker); levels 4–5 load lazily (`dasha.subPeriods`) |

## 3. Strength

| Feature | Status | Notes |
|---|---|---|
| Shadbala (six components, rupas, ratio, rank) | ✅ | Strength section |
| Bhava Bala | ✅ | Strength section |
| Vimshopaka Bala (4 schemes) | ✅ | Strength section |
| Strength bar graphs (Shadbala, Bhava Bala) | 🛠 | `lib/features/strength_graph` |
| Ishta / Kashta Phala | 🛠 | `strength/ishta-kashta.ts` (BPHS formula); inherits engine Cheshta Bala (see Q16) |
| Avasthas, Rashmi | ✅ | Special section |

## 4. Ashtakavarga

| Feature | Status | Notes |
|---|---|---|
| BAV, SAV, Prastara | ✅ | Ashtakavarga section (table, SAV chart, prastara grid) |
| Trikona / Ekadhipatya Shodhana, Shodhya Pinda | ✅ | engine ✅; UI tables in the Ashtakavarga section (Trikona / Ekadhipatya toggle, Rashi / Graha / Shodhya Pinda) |
| Kakshya | ✅ | Transits section |

## 5. Transits and astronomy

| Feature | Status | Notes |
|---|---|---|
| Transit snapshot vs natal, houses from Lagna and Moon | ✅ | Transits section (moment selector) |
| Gochara Vedha, BAV bindus in transit | ✅ | Transits section |
| Sign/nakshatra ingress and station timeline | ✅ | engine + sidecar `transitTimeline.compute`; Transit timeline section (planet-in-sign bands, stations, filterable event table, local times with DST) |
| Animated / step-through transits, yearly transit views | 🛠 | Ephemeris → Positions (step by hour/day/week/month, play) with wheel; `lib/features/transit_tables` yearly timeline + ingress/nakshatra/station tables with CSV/PDF |
| Lagna (ascendant) rising table | 🛠 | `ascendant-rising/`; ±30 s vs independent rising-time computation |
| Combustion periods table | 🛠 (prov.) | `combustion-periods/`, engine's existing orbs (N8); ≤45 min vs JPL Horizons |
| Sade Sati (with 4th/8th Saturn) | 🛠 | Decided (ADR-016 §5): neutral period table, `sade-sati-periods/`, `lib/features/sade_sati`; ±1 day vs Horizons-derived ingresses |
| Solar and lunar eclipses | 🛠 | `eclipses/eclipse-calculator.ts`; Eclipses section |

## 6. Panchang and muhurta

| Feature | Status | Notes |
|---|---|---|
| Tithi, Vara, Nakshatra, Yoga, Karana with end times; masa; sunrise/sunset; Rahu Kala | ✅ | Panchang section |
| Kala Hora (planetary hours) | 🛠 | `muhurta/day-divisions.calculator.ts` |
| Choghadiya | 🛠 | same |
| Yamaganda, Gulika Kaala, Abhijit Muhurta | 🛠 | same |
| Durmuhurta, Varjyam, Amrit Kalam | 🛠 (prov.) | `muhurta-extended/`; `lib/features/muhurta_extras` |
| Gandmool and Panchaka flags and periods | 🛠 (prov.) | same; Moon ingresses within seconds of JPL Horizons. Weekday Panchaka type names ❓ (no consistent source) |
| Printable monthly panchang calendar | 🛠 | `lib/features/panchang_month` (`panchang.month`), A4 landscape |
| Printable yearly panchang | ⏳ | twelve monthly pages; not built |
| Muhurta search | ❓ | Q12 |
| Tithi Pravesha chart | 🛠 (prov.) | `tajika-extended/tithi-pravesha.ts` (same elongation, Sun in natal sign); 7.5 s vs JPL Horizons |

## 7. Matchmaking

| Feature | Status | Notes |
|---|---|---|
| Ashtakoota (36 guna) with per-koota detail | ✅ | Matching section (partner by form or file) |
| Mangal placement comparison | ✅ | shown as engine reports it |
| Porutham (10) and Dashakoota (South Indian) | 🛠 (prov.) | `matchmaking-south/`; Matching section → "South Indian" switch. Dashakoota points not published reliably (null) |
| Name matching (no birth time) | ❓ | N2: name→nakshatra mapping undecided |

## 8. KP, Jaimini, Tajika, Prashna

| Feature | Status | Notes |
|---|---|---|
| KP star/sub/sub-sub lords, significators, ruling planets | ✅ | KP section |
| KP true Placidus cusps | ✅ | Engine 0.2.0 (ADR-017): true Placidus cusps, planets placed between cusps; `kp.compute` returns `cuspSystem: "PLACIDUS"` and fails clearly above ~66.56° latitude |
| KP horary 1–249, Parashari 1–108 | ✅ | Prashna section |
| Jaimini karakas, arudhas, rashi drishti, argala, karakamsha | ✅ | Jaimini section |
| Varshaphala: solar return, Varsha Lagna, Muntha, Panchadhikari, Varshesha, Harsha Bala, Tajika yogas (5), Sahams (10) | ✅ | Varshaphala section (year stepper) |
| All 16 Tajika yogas, Pancha-vargiya Bala | 🛠 (prov.) | `tajika-extended/` (PVR ch. 28–29 rendering of Tajika Neelakanthi); `lib/features/tajika` |
| Tripataki Chakra | 🛠 (prov., partial) | progression built (Charak); the vedha lattice is ❓ (published lattices conflict) |
| Prashna chart, sphutas, Gulika, Karya bhava | ✅ | Prashna section |

## 9. Chakras

| Feature | Status | Notes |
|---|---|---|
| Avakhada, Ghat, Tara (Navatara) chakras | ✅ | Special section |
| Sudarshana Chakra | 🛠 | Special section |
| Sarvatobhadra, Kota chakras | 🛠 (prov.) | `chakras/`; `lib/features/chakras` |
| Sanghatta chakra | ❓ | no published construction rule found |

## 10. Application features

| Feature | Status | Notes |
|---|---|---|
| Fully offline operation | 🛠 | bundled engine sidecar; no network calls |
| New / Open / Save / Save As chart files (`.aschart` JSON), Recent charts | 🛠 | inputs only; results recomputed on open |
| Birth data entry with offline atlas (34k places, IANA zone) | 🛠 | GeoNames cities15000, CC BY 4.0, attributed |
| Historical time zones and DST | ✅ | engine IANA timezone solver (ICU in the sidecar) |
| Per-chart notes, gender (matching pre-fill) | 🛠 | notes also in a dedicated panel (`lib/features/chart_notes`) |
| Print and PDF export of a chart summary | 🛠 | `lib/src/print/chart_pdf.dart` (Rasi+Navamsa, positions, panchanga, Vimshottari) |
| Multi-page A4 horoscope PDF (D1, D9, D10, planets, houses, panchanga, Vimshottari + Yogini, Shadbala) | 🛠 | `lib/features/horoscope_pdf`; section and chart-style options |
| Custom print layouts (user-designed) | ⏳ | |
| Interpretive reports / text | ❓ | Decided (ADR-016 §7): none until the client supplies content; screens have an empty "Notes / interpretation" area |
| Chart database search and filtering | 🛠 | Chart database page: text search (name, place, notes, date), gender and birth-year filters, sorting, chart folders |
| Chart tagging | ⏳ | needs a tag field in `.aschart` |
| Birth-time rectification aid (sensitivity) | 🛠 | `birth-time-sensitivity/`; `lib/features/rectification` (Lagna/Moon boundary crossings near the birth time; ±30 s vs independent computation) |
| Customisable screens, multiple languages | ⏳ | |
| Desktop workstation UX: chart tabs, menu bar, shortcuts, preferences, dark theme, text size, CSV export, window state | 🛠 | `lib/src/ui/` (see README) |
| Lal Kitab chart and 120-year Varshphal | 🛠 (prov.) | calculation only (ADR-016 §1); `lal-kitab/`; table from two secondary transcriptions (6 rows reconciled). Pakka Ghar / soya planets ❓ |
| Numerology, Vaastu | ❓ | not in the client's decision |
| BNN / Gupta Nadi predictions | ❓ | blocked on the client's rule documents |

## Summary counts

| Status | Count |
|---|---|
| ✅ already in engine | 32 |
| 🛠 implemented (16 of them provisional, ADR-016) | 48 |
| ❓ client decision / no publishable rule | 8 |
| ⏳ not yet done, or decided and assigned to the core-engine change | 8 |
| **Total rows** | **96** |

Before this phase: ✅ 32 · 🛠 20 · ❓ 17 · ⏳ 9 (78 rows). Rows were split where a decision covered only part of a row.

(Counted per table row above. Rows marked ✅ are also wired into the desktop UI unless the note says otherwise. Questions 19–20 concern existing behaviour rather than a matrix row.)

## Questions for the client

> **Status (2026-11-20):** the client answered Q1–Q18 (see `docs/decisions.md` ADR-016). Q1, Q2, Q3 and Q19 go to a separate core-engine change. **Q1, Q2 and Q3 are done ✅ (engine 0.2.0, ADR-017).** The questions below are kept for the record; the open items are now listed under "Still open".

### Still open

- Moola, Brahma, Navamsa, Varnada and Padanadhamsa dashas: no consistent published rule; need the client's method.
- Sanghatta chakra construction and the Tripataki vedha lattice.
- Name matching (N2), "Yavan yoga" in prashna (N1), the transit "Direction" column (N3).
- Weekday Panchaka type names; Dashakoota points; Lal Kitab Pakka Ghar / soya planets; numerology and Vaastu scope; muhurta search rule set (Q12).
- Provisional conventions awaiting astrologer review, in particular: D150 placement, D108/D144 schemes, Tajika text-vs-example contradictions (Duphali-kuttha, Durupha, Nakta/Yamaya), Tara dasha "strongest planet", Tribhagi sourcing, and the 6 reconciled Lal Kitab Varshphal rows.
- BNN rules (`docs/client-questions.md` §2).

### Original questions

1. ✅ (ADR-017) **Ayanamsa.** The engine computes Lahiri as `23.85° + 0.01396°/yr × years since J2000`, a linear approximation. Should it be replaced by a true Chitrapaksha model, and should Raman / KP ayanamsas be offered? (This would change existing outputs, so it needs sign-off.) *Resolved: KP = KP New confirmed by client 2026-11-20; KSK original stays selectable.*
2. ✅ (ADR-017) **Nodes.** Mean node only today. Should true node be offered?
3. ✅ (ADR-017) **KP cusps / Bhava system.** The engine's KP cusps are not true Placidus. Should true Placidus (or KP's preferred house method) be implemented for KP? This is also needed for Bhava Chalit.
4. **Extra vargas.** Which definitions apply for D5, D6, D8, D11, D81, D108, D144 and D150? Sources differ, and BPHS defines only the 16.
5. **Pushkara Navamsha / Bhaga.** Which table should be used?
6. **Bhrigu Bindu.** Is it the midpoint of the Moon→Rahu arc, or of the shorter arc?
7. **Further dasha systems.** Which are wanted (Moola, Sudasa, Drig, Niryana Shoola, Tara, Brahma, Mandooka, Navamsa, Trikona, Kendradi, Varnada, Shastihayani, Tribhagi, Padanadhamsa), and which text or variant should each follow?
8. **Patyayini dasha.** Include the Lagna? Exclude the nodes? Which year length: 365.2425 days as in Mudda, or the actual solar-return year?
9. **Tripataki Chakra.** Which layout and vedha tradition?
10. **Sarvatobhadra / Kota / Sanghatta chakras.** Which letter placement and vedha rules?
11. **Durmuhurta / Varjyam / Amrit Kalam.** Which weekday and nakshatra tables?
12. **Muhurta search.** What is the rule set (event types, panchanga filters, lagna rules, exclusions)?
13. **Tithi Pravesha.** Is it the moment the natal Sun–Moon elongation recurs near the birthday, and in which month window?
14. **South Indian matching.** Should Dashakoota / Porutham be offered, and with which koota tables?
15. **Sade Sati.** The engine has a calculator, but the API decommissioned it under editorial policy. Should the desktop app show it?
16. **Cheshta Bala.** The engine uses a simplified speed-based scheme for Mars–Saturn, not the BPHS cheshta-kendra method. Ishta/Kashta inherit this. Should the classical method be adopted? (That changes existing Shadbala outputs.)
17. **Interpretive text.** Whose content should be used for interpretations? Vendor text cannot be used.
18. **Scope.** Should Lal Kitab, numerology and Vaastu be included at all?
19. **Sunrise definition.** The new day divisions use upper-limb sunrise with standard refraction (astronomy-engine). Should it be the Sun's centre (Hindu sunrise) instead?
20. **Sunrise date anchoring (existing engine behaviour).** `PanchangCalculator.calculateSunriseSunset` searches from UTC midnight. For zones east of UTC whose sunrise falls before 00:00 UTC (e.g. Delhi in summer, ~23:54 UTC), it returns the *next* local day's sunrise. The new `DayDivisionsCalculator` searches from local midnight instead. Should the existing panchang behaviour be fixed? That would change API outputs.

## Engine findings for the maintainers

- `tests/fixtures/reference-charts.ts` REF_CHART_001 lists planet longitudes (e.g. Sun 50.2541°) that do not match the sky for 1990-05-15 09:00 UT. The engine gives a sidereal Sun of 30.56°, consistent with Vrishabha Sankranti on 14/15 May 1990. No existing test compares them to the real ephemeris. They should not be used as reference values. *(Resolved: the fixture is now Horizons tropical minus the IAE true Lahiri ayanamsa, Sun 30.5498°.)*
- Question 20 above (sunrise anchored to UTC midnight).
- `chart/chart-variants.calculator.ts` `buildSripatiBhavaChart`: MC approximated as Asc + 270°, cusps end up 90° apart, and planets keep their whole-sign houses, so the Bhava Chalit equals D1 (found while building the horoscope PDF). Fix together with Q3. *(Fixed in engine 0.2.0, ADR-017.)*
- `transit-calculator.ts` caps timelines at 730 days while the sidecar's `transitTimeline.compute` accepts 3 years; ranges over 2 years fail with a calculation error (`transit.tables` caps at 730 days).
