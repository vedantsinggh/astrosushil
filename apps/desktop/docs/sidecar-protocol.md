# Engine sidecar protocol (v1)

The Flutter app never computes astrology. It starts `astro-engine-sidecar` as a child process
(`Process.start`) and exchanges **newline-delimited JSON** over stdin/stdout. The sidecar
(`engine-sidecar/src`) imports `@astro/astrology-engine` and runs it locally, offline.

Source of truth for types: `engine-sidecar/src/protocol.ts` (TypeScript) and
`lib/src/engine/inputs.dart` / `models.dart` (Dart).

## Framing

- One JSON object per line, UTF-8, `\n` terminated. stderr carries diagnostics only.
- On start the sidecar emits `{"event":"ready","protocolVersion":1,"engineVersion":"0.2.0","sidecarVersion":"0.1.0"}`.
  The client refuses other protocol versions (`PROTOCOL_MISMATCH`).
- Request: `{"id": <int|string>, "method": "<name>", "params": {...}}`.
- Success: `{"id": ..., "ok": true, "result": ...}`. Failure: `{"id": ..., "ok": false, "error": {"code", "message", "reason"?}}`.
- Requests may be pipelined; responses are matched by `id` and may arrive in any order.
- Closing stdin ends the process after pending responses are flushed (exit code 0).
- Non-finite numbers are serialised as `null`.
- The desktop client decodes responses larger than 256 KB on a background isolate, so the UI thread never blocks.
- If the process exits unexpectedly the client restarts it automatically (up to 3 times in 2 minutes) and recomputes open sections.

Error codes: `PARSE_ERROR`, `INVALID_REQUEST`, `UNKNOWN_METHOD`, `INVALID_PARAMS`, `CALCULATION_ERROR`, `INTERNAL_ERROR`.

## Common inputs

`BirthInput` (also used for transit, panchang and prashna moments):
`{ name?, date: "YYYY-MM-DD", time: "HH:mm[:ss]", timezone: IANA, latitude: +N, longitude: +E, placeName? }`
Local civil time is converted to UTC by the engine's IANA timezone solver (DST/historical offsets included).

`LocationInput`: `{ latitude, longitude, timezone, placeName? }`.

All calculations use the engine's canonical configuration (`DEFAULT_ASTROLOGY_CONFIG`: sidereal,
true Chitrapaksha Lahiri, whole-sign, mean node, geocentric), the same as `apps/api`, unless the
request carries calculation options.

### Calculation options (`params.options`, engine 0.2.0, ADR-017)

Every method accepts an optional `options` object inside `params`. Omitted fields take the defaults.

| Field | Values | Default | Effect |
|---|---|---|---|
| `ayanamsa` | `LAHIRI` (true Chitrapaksha, ICRC / Indian Astronomical Ephemeris), `RAMAN`, `KRISHNAMURTI` (K.S. Krishnamurti's Reader table), `KP` (KP New, zero 291 CE), `FAGAN_BRADLEY` | `LAHIRI` | Sidereal offset for every chart-based result. Definitions and sources: `packages/astrology-engine/src/ayanamsa/ayanamsa.ts`. |
| `nodeType` | `MEAN_NODE`, `TRUE_NODE` (osculating node) | `MEAN_NODE` | Rahu/Ketu in every chart-based result. |
| `kpCuspSystem` | `PLACIDUS` | `PLACIDUS` | KP cusps (`kp.compute`). Only true Placidus is offered; the field is validated and echoed so the UI can show the cusp system. |

```
{"id":5,"method":"kp.compute","params":{"birth":{...},"options":{"ayanamsa":"KP","nodeType":"TRUE_NODE"}}}
```

- Invalid values return `INVALID_PARAMS` with the allowed list, e.g. `options.ayanamsa must be one of LAHIRI, RAMAN, KRISHNAMURTI, KP, FAGAN_BRADLEY`.
- Options are scoped to their request: pipelined requests with different options do not affect each other.
  The `dasha.subPeriods` cache is keyed on `ayanamsa` and `nodeType` too.
- `chart.compute` echoes the effective `options` (defaults filled in) and returns the `ayanamsa` actually applied
  (true ayanamsa, degrees); `config` reflects the options. `engine.info` lists the allowed values and defaults under `options`.
- Some extra modules keep the default ayanamsa whatever the option (they never took a configuration):
  `panchang.compute` / `dayDivisions.compute` / `eclipses.find` (panchanga Sun–Moon routine), the transit
  ingress solver behind `transitTimeline.compute`, and `prashna.compute`.
- `kp.compute` fails with `CALCULATION_ERROR` ("Placidus house cusps are undefined at latitude …") for
  |latitude| ≥ 90° − obliquity (about 66.56°): Placidus is undefined there and the engine never silently
  switches house system.
  The error carries `reason: "PLACIDUS_UNDEFINED_AT_LATITUDE"` (the engine's error code), so clients can
  show a plain-language message without parsing the text. Any `CALCULATION_ERROR` may carry such a `reason`.

## Methods

| Method | Params | Result (engine source) |
|---|---|---|
| `ping` | – | `{pong: true}` |
| `engine.info` | – | versions, config, `ConventionRegistry`, dasha registry |
| `chart.compute` | `{birth}` | `{utcIso, julianDayUT, timezoneOffsetMinutes, ayanamsa, config, options, rasi: NormalizedChart, navamsa: NormalizedChart, panchang, isDayBirth}` |
| `vargas.compute` | `{birth, vargas?: D-codes[]}` | `{vargas: {D1..D60: VargaChart}}` |
| `dasha.compute` | `{birth, system?, maxLevel? (1-5), targetDate?}` | `{system, utcOffsetMinutes, totalCycleYears, result: DashaRegistry.calculateDasha(...)}` |
| `dasha.subPeriods` | `{birth, system?, maxLevel?, targetDate?, path: int[]}` | `{system, utcOffsetMinutes, path, periods}`: sub-periods of the node at `path` (0-based indices into the engine period lists). The full result per (birth, system, maxLevel, targetDate) is computed once and kept in a 6-entry LRU cache, so the app fetches levels 4–5 lazily instead of receiving ~20 MB at once |
| `panchang.compute` | `{moment}` | `{utcOffsetMinutes, instant, daily, dayDivisions}` |
| `dayDivisions.compute` | `{date, location}` | `DayDivisionsReport` + `utcOffsetMinutes` |
| `ashtakavarga.compute` | `{birth}` | `AshtakavargaResult` (bav, sav, shodhana, pinda) |
| `strength.compute` | `{birth}` | `{shadbala, bhavaBala, ishtaKashta, vimshopaka}` |
| `transit.compute` | `{birth?, moment}` | `TransitSnapshot` + `utcOffsetMinutes` |
| `transitTimeline.compute` | `{startIso, endIso (≤3 y), timezone?}` | `TransitTimeline`; when `timezone` is given each event also carries `utcOffsetMinutes` (zone offset at that instant, from the engine timezone solver) so local times are correct across DST |
| `matchmaking.compute` | `{boy, girl}` | `CompatibilityResult` |
| `yogas.compute` | `{birth}` | `YogaEvaluationReport` |
| `kp.compute` | `{birth}` | KP report: `cuspSystem: "PLACIDUS"`, true Placidus cusps, planets placed between cusps, `ayanamsaType` / `ayanamsaValue` of the chart (`isDayBirth` derived from engine sunrise/sunset) |
| `jaimini.compute` | `{birth}` | `JaiminiReport` (7-karaka scheme) |
| `specialPoints.compute` | `{birth}` | `{specialPoints, planetaryIntelligence}` |
| `chartVariants.compute` | `{birth}` | `ChartVariantsCollection`; `bhavaSripati` is the Sripati Bhava Chalit from the real MC (madhya = `cuspLongitude`, sandhis = `startLongitude`/`endLongitude`, planets' `house` = bhava) |
| `avakhada.compute` | `{birth}` | `{avakhada, ghat, tara}` |
| `sudarshana.compute` | `{birth}` | `SudarshanaChakra` |
| `varshaphala.compute` | `{birth, targetYear, location?}` | `VarshaphalaChart` |
| `prashna.compute` | `{moment, questionNumber?, questionNumberSystem?}` | `PrashnaChart` |
| `eclipses.find` | `{startIso, endIso (≤25 y)}` | `{eclipses: EclipseEvent[]}` |
| `time.local` | `{timezone, utcIso?}` | `{utcIso, date, time, utcOffsetMinutes}` (default: now) |

## Example

```
$ printf '{"id":1,"method":"time.local","params":{"timezone":"Asia/Kolkata","utcIso":"1990-05-15T09:00:00Z"}}\n' | engine-sidecar/dist/astro-engine-sidecar
{"event":"ready","protocolVersion":1,"engineVersion":"0.2.0","sidecarVersion":"0.1.0"}
{"id":1,"ok":true,"result":{"utcIso":"1990-05-15T09:00:00.000Z","date":"1990-05-15","time":"14:30:00","utcOffsetMinutes":330}}
```

## Feature methods (desktop parity, ADR-016)

Served by `engine-sidecar/src/feature-handlers/<group>.ts` and listed in `engine.info` → `methods`.
Results marked *provisional* carry `provisional: true`, `source` and `conventionNotes`; the UI labels
them "provisional – pending client review". Large tables are paged (`page` is 0-based; responses
include `page`, `pageSize`, `pageCount`, `totalRows`, `rows`).

### Tables (`tables.ts`)

| Method | Params | Result |
|---|---|---|
| `ephemeris.table` | `{startDate, endDate (YYYY-MM-DD, ≤ 40 000 rows), step?: DAY\|WEEK\|MONTH, timezone, time?: "HH:mm[:ss]" \| sunrise?: true, location?: {latitude, longitude} (Lagna column; required for sunrise), zodiac?: SIDEREAL\|TROPICAL, includeOuterPlanets?, includeMagnitude?, page?, pageSize? (≤ 400, default 100)}` | `EphemerisTableResult` (`rows[]: {date, localTime, utcIso, utcOffsetMinutes, ayanamsa, bodies[]: {body, longitude, latitude, degreeInSign, rashiIndex, nakshatraName, pada, nakshatraLord, speed, isRetrograde, distanceAU, magnitude?}, ascendant?}`, `zodiac`, `notes[]`, `provisional` when outer planets are included) + paging |
| `ephemeris.positions` | `{moment: BirthInput, zodiac?, includeOuterPlanets?, includeMagnitude? (default true)}` | one `EphemerisRow` with the Lagna |
| `ascendant.rising` | `{date, location: LocationInput, span?: CIVIL_DAY\|SUNRISE_TO_SUNRISE}` | `{windowStartIso, windowEndIso, entries[]: {rashiIndex, rashiName, startIso, endIso, durationMinutes, clippedStart, clippedEnd}, notes[], utcOffsetMinutes}` (rejects \|lat\| ≥ 66°) |
| `combustion.periods` | `{startIso, endIso (≤ 5 y), planets?: MOON\|MARS\|MERCURY\|JUPITER\|VENUS\|SATURN[], timezone?}` | *provisional* `{periods[]: {planet, startIso, endIso, durationDays, startsBeforeRange, endsAfterRange, minSeparation, minSeparationIso, retrogradeAtClosest, orbAtStart, orbAtEnd, startOffsetMinutes?, endOffsetMinutes?}, orbs[], source, notes[]}` |
| `relationships.compute` | `{birth}` | `{planets[], signs, cells[]: {from, to, natural, temporal, compound}, source}` |
| `transit.tables` | `{startIso, endIso (≤ 730 d), timezone?, planets?, eventTypes?: SIGN_INGRESS\|NAKSHATRA_INGRESS\|RETROGRADE_STATION\|DIRECT_STATION[], page?, pageSize? (≤ 2000, default 500)}` | engine `TransitTimelineEvent`s (+ `utcOffsetMinutes`), paged |
| `sadeSati.periods` | `{birth, startIso? (default birth), endIso? \| years? (1–120, default 100)}` | `{natalMoonRashiIndex, cycles[]: {startIso, peakStartIso, peakEndIso, endIso, segments[]}, fourthAndEighth[], definition, source, utcOffsetMinutes, timezone}` (neutral table, no interpretation) |

### Print (`print.ts`)

| Method | Params | Result |
|---|---|---|
| `panchang.month` | `{year, month, location}` | `{year, month, daysInMonth, rows[]: {date, weekdayIndex, weekday, vara, utcOffsetMinutes, sunriseIso, sunsetIso, tithi{index,name,paksha,endIso}, nakshatra{index,name,pada,endIso}, yoga{…,endIso}, karana{…,endIso}, masa{amanta,purnimanta,isAdhika}, paksha, rahuKaala{startIso,endIso}}}` (values at local sunrise) |

### Lal Kitab (`lal-kitab.ts`), calculation only

| Method | Params | Result |
|---|---|---|
| `lalKitab.chart` | `{birth}` | *provisional* `{natalLagnaRashiIndex, planets[]: {planet, house, natalRashiIndex, longitude, isRetrograde}, houses[]: {house, fixedRashiIndex, planets[]}}` |
| `lalKitab.varshphal` | `{birth, age?: 1–120 \| targetYear?}` (exactly one) | *provisional* `{age, startsInYear, tableRowReconciled, houseMapping[], planets[]: {planet, natalHouse, annualHouse}, houses[], natal}` |

### Extra vargas and points (`vargas-extra.ts`)

| Method | Params | Result |
|---|---|---|
| `vargasExtra.compute` | `{birth, vargas?: D5\|D6\|D8\|D11\|D81\|D108\|D144\|D150[]}` | *provisional* `{vargas: {D5: ExtraVargaChart, …}}` (VargaChart shape; D150 adds `nadiamsaNumber`) |
| `pushkara.compute` | `{birth}` | *provisional* `{bodies[]: {body, navamsaNumber, inPushkaraNavamsa, pushkaraBhaga, distanceFromBhaga, inPushkaraBhaga, …}, table[]}` |
| `bhriguBindu.compute` | `{birth}` | *provisional* `{longitude, rashiIndex, nakshatra, pada, moonLongitude, rahuLongitude, arcRahuToMoon, shorterArcLongitude}` |

### South Indian matching (`matching-south.ts`)

| Method | Params | Result |
|---|---|---|
| `matching.porutham` | `{boy, girl}` | *provisional* `{boy, girl, kootas[10]: {key, name, matched, grade, dosha, rule, inputs}, matchedCount, totalKootas, rajjuDosha, vedhaDosha}` |
| `matching.dashakoota` | `{boy, girl}` | same shape, `system: 'DASHAKOOTA'`, `points: null` |

### Muhurta extras (`muhurta-extras.ts`)

| Method | Params | Result |
|---|---|---|
| `muhurta.extras` | `{date, location, varjyamTable?: PUBLISHED_PANCHANG\|PRASHNA_MARGA}` | *provisional* `{sunrise/sunset/nextSunrise, weekdayIndex, durmuhurta[], nakshatras[], varjyam[], amritKalam[], civilDayStartIso, civilDayEndIso, utcOffsetMinutes}` |
| `muhurta.gandmoolPanchakaAt` | `{instant}` | *provisional* `{moonLongitude, nakshatraIndex, pada, gandmool, gandantaJunctionPada, panchaka}` |
| `muhurta.gandmoolPanchaka` | `{startIso, endIso (≤ 366 d), timezone?, kinds?, page?, pageSize? (≤ 500)}` | *provisional* windows `{kind, startIso, endIso, durationHours, nakshatras[]}`, paged |

### Planetary dashas (`dashas-planetary.ts`)

| Method | Params | Result |
|---|---|---|
| `dashaExt.planetary.list` | `{}` | `{systems[]: {system, implemented, provisional, source, eligibilityNote, notImplementedReason?}}` (Moola: not implemented) |
| `dashaExt.planetary.compute` | `{birth, system: TRIBHAGI\|SHASTIHAYANI\|TARA, maxLevel? (1–3), targetDate?}` | *provisional* `{system, utcOffsetMinutes, result: {mahadashas[] → subPeriods, eligibility, currentPeriod, …}}` |
| `dashaExt.patyayini` | `{birth, targetYear, location?, maxLevel?, targetDate?}` | *provisional* `{solarReturnUtcIso, nextSolarReturnUtcIso, yearLengthDays, rows[]: {key, krishamsha, patyamsha, fraction}, periods[]}` |

### Tajika (`tajika.ts`)

| Method | Params | Result |
|---|---|---|
| `tajika.yogas` | `{birth, targetYear, location?, options?: {orbRule?: MUTUAL\|HALF_SUM, includeSemiSextile?, manahooByAspect?}}` | *provisional* `{solarReturnUtcIso, planets[7], yogas[16]: {id, name, present, occurrences[{planets, roles, variant?, evidence[], facts}], rule, source}}` |
| `tajika.panchaVargiya` | `{birth, targetYear?, location?, neutralScoring?: AS_ENEMY\|AS_FRIEND}` | *provisional* `{chartKind: ANNUAL\|NATAL, planets[7]: {kshetra, uchcha, hadda, drekkana, navamsha, total, vimshopaka, category}}` |
| `tajika.tithiPravesha` | `{birth, targetYear, location?}` | *provisional* `{natal{elongation, tithiIndex}, moment{utcIso, localIso, utcOffsetMinutes, elongationResidual, sunSignMatchesNatal}, candidates[], rasi}` |

### Sign dashas (`dashas-sign.ts`)

| Method | Params | Result |
|---|---|---|
| `dashaExt.list` | `{}` | `{systems[]: {group: SIGN\|PLANETARY, system, name, implemented, provisional, source, method, notImplementedReason?}}` (both groups) |
| `dashaExt.sign.compute` | `{birth, system: SUDASA\|DRIG\|NIRYANA_SHOOLA\|MANDOOKA\|TRIKONA\|KENDRADI, maxLevel? (1–3, default 2), targetDate?, page?, pageSize?}` | *provisional* `{system, maxLevel, utcOffsetMinutes, result: SignDashaExtTree}`; at level 3 the mahadashas are paged (`paging`) |
| `dashaExt.sign.subPeriods` | `{birth, system, path: [md] \| [md, ad], targetDate?}` | `{system, utcOffsetMinutes, path, periods}` (one level, lazy) |

### Chakras (`chakras.ts`)

| Method | Params | Result |
|---|---|---|
| `chakra.sarvatobhadra` | `{birth, moment?: BirthInput}` | *provisional* `{orientation: EAST_TOP, grid[81], natal{placements, vedhas}, transit?, natalReferences, referenceHits}` |
| `chakra.kota` | `{birth, moment?}` | *provisional* `{janmaNakshatra, kotaSwami, kotaPala, positions[28], natal[], transit?}` (ENTERING/EXITING) |
| `chakra.tripataki` | `{birth, targetYear}` | *provisional* `{completedYears, runningYear, solarReturnUtcIso, varshaLagna, placements[9], vedha: null}` (progression only) |

### Rectification aid (`tables.ts`)

| Method | Params | Result |
|---|---|---|
| `rectification.sensitivity` | `{birth, windowMinutes? (1–180, default 30)}` | `{birthUtcIso, ascendantLongitude, moonLongitude, margins[]: {key, part, minutesSincePrevious, minutesToNext}, changes[]: {key, instantIso, offsetMinutes, fromPart, toPart, boundary}, source, utcOffsetMinutes}` — Lagna sign / nakshatra / pada-D9 / D10 / D12 / D60 and Moon nakshatra / pada boundary crossings |
