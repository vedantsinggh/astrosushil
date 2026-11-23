# Hindi reports and horoscope: design

**Status:** approved approach, build in progress on `staging`.
**Last updated:** 2026-11-24

## Why

The website sells each report in Hindi or English, chosen by the buyer. Today every report definition is fixed to one language and only the Fortune report is Hindi. Hindi is required on day one for all 14 report types and for the daily horoscope.

## Decisions (owner, 2026-11-24)

- All 14 report types in both languages.
- The model writes Hindi directly. Every Hindi sentence passes the same checks as English. There is no translate-after step.
- LLM cost of one Hindi report may be up to Rs 20. English stays under Rs 10.

## Approaches considered

| Approach | Trade-off | Outcome |
|---|---|---|
| Write Hindi directly, with the validators extended to Hindi | Most work; Hindi is checked as strictly as English | Chosen |
| Write and check English, then translate with a second model call | Fast to build; the translation is barely checked and cost roughly doubles | Rejected |
| A separate Hindi definition per report (as Fortune is today) | Two copies of every report drift apart | Rejected |

## Design

1. **Language is chosen per report request**, not per definition. A definition is built for a language: `definitionFor(id, language)`. Titles, subtitles, section intros and writing guidance come from a two-language helper, as the numerology reports already do.
2. **One Hindi glossary** for the fixed vocabulary: planets, signs, nakshatras, houses, weekdays, months, dignities, dasha names, table headings. Blocks and validators both read it, so a term is spelled one way everywhere.
3. **Blocks** (tables, charts, timelines) take the language and label themselves from the glossary. Numbers and calculations do not change.
4. **Deterministic text** (topics written by code) gets a Hindi form beside the English one.
5. **Evidence and claims stay in English.** The model receives the same evidence labels and must return each claim as the English label, exactly as now, so claims are audited identically. Only lead, paragraphs, bullets and takeaway are Hindi.
6. **Validators.** The claim validator already reads Hindi planet, house and sign statements. The judgement lexicon, the interpretation validator and the editorial validator get Hindi word lists and patterns equivalent to the English ones. A rule that cannot be expressed reliably in Hindi is listed here, never silently skipped.
7. **Cache and storage.** The topic cache key and the stored report carry the language.
8. **API.** A report request and a report order carry `language` (`en` or `hi`, default `en`).
9. **Daily horoscope.** Both languages are prepared each day; the request names the language. The deterministic fallback text gets a Hindi form.

No astrology rule changes. The LLM still only words what the engine computed.

## Order of work

1. Language plumbing, glossary, and Planetary Summary in Hindi (the smallest report). Generate once and record the real cost.
2. Kundli, and the shorter "basic" Kundli.
3. Couple Matching.
4. Fortune Plus (already bilingual in part).
5. The remaining reports.
6. Daily horoscope.

## Validator rules not yet covered in Hindi

None recorded yet. This list is filled in as each validator is extended.

## Measured cost

Not measured yet.
