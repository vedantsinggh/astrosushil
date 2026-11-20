# Feature screens: integration steps

**Status: integrated (2026-11-20).** Registered in `lib/src/ui/sections.dart` / `section_body.dart`. Not registered as sections (overlap with the shell's own views): `dasha_timeline`, `ashtakavarga_reduction`; the Transit tables section omits its timeline graphic (`showTimeline: false`). Porutham/Dashakoota are a switch inside Matching. The table below is kept as the record.

Each folder under `lib/features/` is one self-contained feature (screen widgets + Dart models).
Screens only render engine results (no astrology in Dart) and call the sidecar through
`common/engine_call.dart`. They were built while the shell was being reworked, so they are not
yet registered. Steps to register each one:

| Feature folder | Screen widget | Inputs | Where to register |
|---|---|---|---|
| lib/features/strength_graph | `StrengthGraphScreen(birth:)` | BirthInput | Strength → "Strength graphs" (Shadbala total vs required, six components; Bhava Bala) |
| lib/features/ashtakavarga_reduction | `AshtakavargaReductionScreen(birth:)` | BirthInput | Ashtakavarga → "Shodhana & Pinda" |
| lib/features/dasha_timeline | `DashaTimelineScreen(birth:)` | BirthInput | Dashas → "Dasha timeline" (graphical, 13 systems) |
| lib/features/dasha_pravesh | `DashaPraveshScreen(birth:)` | BirthInput | Dashas → "Dasha Pravesh" (chart at period start) |
| lib/features/chart_notes | `ChartNotesPanel(notes:, onChanged:)` | active ChartFile.notes; onChanged → copyWith(notes:) + mark dirty | Chart → "Notes" |
| lib/features/horoscope_pdf | `HoroscopePdfScreen(birth:, initialStyle:)` | BirthInput + preferred ChartStyle | Reports / File → Print → "Horoscope PDF" (multi-page A4) |
| lib/features/panchang_month | `PanchangMonthScreen(location:)` | LocationInput (chart place or default) | Panchang → "Monthly panchang" (calendar + printable A4) |
| lib/features/lal_kitab | `LalKitabScreen(birth:)` | BirthInput | Systems → "Lal Kitab" (chart + 120-year Varshphal; calculation only) |
| lib/features/vargas_extra | `VargasExtraScreen(birth:)` | BirthInput | Chart → "Extra vargas & points" (D5–D150, Pushkara, Bhrigu Bindu; provisional) |
| lib/features/matching_south | `MatchingSouthScreen(boy:, girl:)` | two BirthInput | Matching → "Porutham / Dashakoota" (provisional) |
| lib/features/muhurta_extras | `MuhurtaExtrasScreen(initial:)` | BirthInput (date + place) | Panchang → "Durmuhurta, Varjyam & Gandmool" (provisional) |
| lib/features/ephemeris_tables | `EphemerisToolsScreen(initial:, initialTab: 0)` | BirthInput (now at chart place) | Tools → "Ephemeris" (tables daily/weekly/monthly, sidereal/tropical, sunrise/local, outer planets, magnitude; positions at a moment; Lagna rising table) |
| lib/features/combustion_periods | `CombustionPeriodsScreen(timezone:, initialYear:)` | chart time zone | Time → "Combustion periods" (provisional orbs) |
| lib/features/transit_tables | `TransitTablesScreen(place:, initialYear:)` | BirthInput (zone/place) | Time → "Transit tables" (ingress/station tables + yearly timeline graphic); may replace or sit beside the existing Transit timeline section |
| lib/features/relationships | `RelationshipsScreen(birth:)` | BirthInput | Chart → "Relationships" (natural / temporary / compound) |
| lib/features/sade_sati | `SadeSatiScreen(birth:)` | BirthInput | Time → "Sade Sati" (neutral periods table) |
| lib/features/dashas_extended | `DashasExtendedScreen(birth:)` (embeds `PlanetaryPatyayiniView`) | BirthInput | Dashas → "Extra dashas" (Sudasa, Drig, Niryana Shoola, Mandooka, Trikona, Kendradi, Tribhagi, Shastihayani, Tara, Patyayini; provisional); optionally Varshaphala → "Patyayini" with `PlanetaryPatyayiniView(birth:)` |
| lib/features/tajika | `TajikaScreen(birth:)` | BirthInput | Varshaphala → "Tajika" (16 yogas, Pancha-vargiya Bala, Tithi Pravesha; provisional) |
| lib/features/chart_wheel | `ChartWheelScreen(birth:)` | BirthInput | Chart → "Wheel" (circular Rasi chart); `ChartWheel` widget is reusable |
| lib/features/chakras | `ChakrasScreen(birth:)` (or SarvatobhadraScreen / KotaChakraScreen / TripatakiScreen) | BirthInput (+ optional transit moment, year) | Systems → "Chakras" (Sarvatobhadra, Kota, Tripataki progression; provisional) — beside the existing Avakhada/Ghat/Tara in Special |
| lib/features/rectification | `RectificationScreen(birth:)` | BirthInput | Tools → "Birth-time sensitivity" (rectification aid) |

## Notes for the integration pass

- **Overlaps with the reworked shell** (it now has its own versions): `dasha_timeline` overlaps the Dashas
  section's bar timeline; `ashtakavarga_reduction` overlaps the Ashtakavarga section's Shodhana/Pinda
  tables; `transit_tables` overlaps the Transit timeline section (it adds nakshatra/station tables, CSV/PDF
  and a yearly sign timeline). Prefer the shell's existing views and register only what they lack
  (or offer these as an extra tab). `dasha_pravesh` reuses `dasha_timeline_models.dart`, so keep that file.
- `ChartNotesPanel`: wire `onChanged` to update the active document's `notes` and mark it dirty.
- `HoroscopePdfScreen`: belongs with File → Print / Export; the Bhava Chalit page is included by default (engine 0.2.0, ADR-017).
- Screens that need "now at the chart's place" (`EphemerisToolsScreen`, `MuhurtaExtrasScreen`) should be
  given a `BirthInput` built from the active chart's place and the current local time (`time.local`).
- Every screen is a plain widget taking its inputs as constructor parameters; none reads shell state.
- Offscreen captures: `flutter test test/features/screenshots_test.dart --dart-define=SCREENSHOT_DIR=<abs dir>`.
