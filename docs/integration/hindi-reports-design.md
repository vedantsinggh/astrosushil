# Hindi reports and horoscope: design

**Status:** every report has a Hindi edition on `staging`; four have been generated with the real model.
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

## Validator rules not fully covered in Hindi

Every prose-reading rule has a Hindi form with the same code and severity. These are partial:

| Rule | Limit in Hindi |
|---|---|
| `UNSUPPORTED_JUDGEMENT`, `JUDGEMENT_CLASS_MISMATCH` | Backing by a restated claim compares only numbers, planets, signs, a closed glossary of chart words and yoga names; claims stay English. It fails closed: a judgement that cannot be matched is rejected. |
| `DERIVED_TERM_UNSUPPORTED` | Dispositor, kendra and exchange have no single unambiguous Hindi word; only the chart-specific forms are caught. |
| `INVENTED_RULE_PHRASING` (warning) | Hindi is verb-final, so the pattern is adverb then verb within one clause. |
| `AGE_NOT_IN_EVIDENCE` (warning) | Only explicit forms such as "N वर्ष की आयु". |
| `MEDICAL_CERTAINTY` | Named illnesses only; no general form for "diagnose". |
| `REFERENCE_IDENTITY_LEAK` | "पुनीत" is omitted because it is an ordinary adjective. |

"प्रदान करता है" ("grants") counts as an overstatement in Hindi, as in English; the Hindi prompt asks for "संकेत देता है".

## Known gaps

- Three report families keep their table labels in their own files and not in the shared glossary, so the same heading can be worded differently in two reports.
- The Hindi yoga tables in Kundli and Fortune Plus list the planets forming a yoga where English prints the engine's condition sentences, which exist in English only.
- The migration adding `reports.language` has not been applied to any database.
- The mobile app does not send a language yet.

## How to give a report a Hindi edition

1. Add `reports/<id>/<id>.hindi.ts` exporting a `HindiEdition` (`platform/i18n/hindi.ts`): Hindi title, subtitle, description, and Hindi text for every section (title, kicker, intro) and every topic (title, subtitle). Set it as `hindi` on the module. An incomplete edition is a startup error.
2. In the same file call `registerHindiLabels({...})` with the fixed labels of the report's blocks (table headings, captions, method notes), keyed by the English text.
3. In each block the report uses, take `const lang = blockLang(ctx)` and pass every printed word through the glossary: `label`, `planetLabel`, `signLabel`, `nakshatraLabel`, `dignityLabel`, `planetAbbr`, or `pick(lang, en, hi)` for a sentence built from values. Numbers, evidence ids and calculations must be identical in both languages.
4. Objectives, evidence ids and writing guidance stay in English: they are instructions to the model, and claims are audited in English.
5. Add tests: the edition is complete, each block's Hindi output has the same numbers and evidence ids as the English one and no English words, and an offline Hindi run of the report passes PDF QA.

## Measured cost

| Report | Language | Model calls | Tokens in / out | Estimated cost | Date |
|---|---|---|---|---|---|
| Planetary Summary (11 narrative topics, 17 pages) | Hindi | 5 | 10,865 / 3,711 | $0.0083 (about Rs 0.75) | 2026-11-24 |
| Basic Kundli (17 narrative topics, 34 pages) | Hindi | 9 | 22,673 / 8,447 | $0.0183 (about Rs 1.6) | 2026-11-24 |
| Couple Matching (54 narrative topics, 57 pages) | Hindi | 15 | 63,682 / 19,159 | $0.0447 (about Rs 4) | 2026-11-24 |
| Fortune Plus (72 narrative topics, 77 pages) | Hindi | 24 | 99,940 / 31,433 | $0.0769 (about Rs 7) | 2026-11-24 |

Estimates from list prices, not provider billing. All four completed with PDF QA passing and no failed topic. Fortune Plus needed one escalation to `gemini-3.8-flash` (one topic was rejected for an overstatement, then for answering in English). The other ten reports have only been run offline in Hindi.

## Defects found and fixed

- The model writes some nukta letters (ड़, ढ़) as single precomposed characters (U+0958 to U+095F). The Devanagari font switch did not recognise them and the page failed to compile. `tex()` now normalises text to NFC, which splits them into letter plus nukta.
- Without a glossary the model transliterated English dignity terms ("ग्रेट फ्रेंड"). The prompt for a Hindi edition now lists the Hindi chart vocabulary from the same glossary the tables use.
- Pictures are matched on English titles, so the Hindi edition is planned from the English definition and carries the same pictures.
