# Reference Report Forensics: "Finance Report"

Source: `docs/referencerepots/Finance Report.pdf`. Page numbers = PDF index (printed number in a circle matches).

## 1. Identity

| Item | Value |
|---|---|
| Title | No cover/title page. Header on every page: client name "Puneet Kumar" (magenta). Section titles only (e.g. "Finance - 2026"). Product name only known from filename. |
| Pages | 32 (595.44 x 819.36 pt — slightly shorter than A4) |
| Producer | **PDFsharp 1.31** — desktop astrology software export (layout/terminology and the sibling Couple report's "Model: MatchAnalysisDetailed / StNo" stamp match **Future Point LeoStar**-style output), re-branded with Astro Arun Pandit footer. |
| Text layer | Present but **garbled** (fonts AvantGarde Book/Demi BT with broken ToUnicode -> pdftotext yields "rrrr dddd"). Content had to be **OCR'd** (tesseract, 200 dpi). Not scanned images — vector text. |
| Words | ~12,900 (OCR, incl. ~30 footer words/page) |
| Language | English only (no Devanagari). |
| Sample client (reference only) | Puneet Kumar, 28/12/1983 04:45:00, Wednesday, Bulandshahr (28:25 N, 77:50 E, zone 82:30 E, local time corr -00:18:40), Lahiri ayanamsa 23:37:44 |

Sample computed values on p1 (LeoStar engine): Asc Scorpio 09:04:54 (Anuradha 2); Sun 12:00:22 Sag (Moola 4); Moon 27:11:00 Vir (Chitra 2); Mars 28:51:28 Vir; Mercury R C 19:40:28 Sag (P.Ashadha 2); Jupiter 01:22:26 Sag (Moola 1, Moolatrikona); Venus 01:26:02 Sco (Vishakha 4); Saturn 19:57:45 Lib (Swati 4, Exalted); Rahu R 21:06:47 Tau (mean); Ketu R 21:06:47 Sco. Vimshottari balance Mars 4Y11M22D; current MD Saturn 20/12/2022-19/12/2041. Yogini balance Mangla 0Y8M16D. Panchang: Tithi 9, Krishna, Pausa, Chitra, Yoga Atigand, Karan Gara, sunrise 07:09:20, sunset 17:29:39, Samvat 2040, Saka 1905.
NOTE: these panchang values **disagree** with the Fortune Report Plus sample (Ashtami / Saubhagya / Balav / sunrise 7:13:17) — the two products used different engines. Our deterministic engine must pick one convention and document it.

## 2. Section inventory

| # | Section | PDF pages | Ordered topics |
|---|---|---|---|
| 1 | Kundli summary (untitled one-page "birth data sheet") | 1 | Birth line (Date, Time, Day, Place, Lahiri Ayanamsa, Lat, Long, Zone, Loc Time Corr); **Panchang** block (Sidereal time, Eq. of time, Sunrise, Sunset, Ch. Samvat, Saka, Month, Paksh, Tithi, Nakshatra, Yoga, Karan); **Avakahada Chakra** (Gana, Yoni, Nadi, Varan, Vashya, Varga, Yunja, Hansak, Name Alpha, Paya (Ra-Nx), Hora, Chaugharia); **Vimshottari** (balance + MD list with end dates, current MD/AD); **Yogini** (balance + list); Planet table; 5 charts |
| 2 | Finance, Family, Eyes & Speech | 2 | 2nd-house sign + its lord reading (3 paras) + planet-in-2nd reading (Mercury in 2nd in Sagittarius) |
| 3 | Gem Selection | 3 | Methodology (benefic = lord/placed in lagna/trikona/kendra; malefic = 6/8/12 lords, badhaka lord by movable/fixed/dual lagna; >75% wear lifelong, 50-75% in friendly dashas, <50% ignore); Gem Power table + horizontal bar graph; Dasha-wise Gem Selection table |
| 4 | Personality Analysis | 4-5 | Lagna + Navamsa + Dreshkana + Lagna nakshatra-pada based text: foreign travel, public dealings, wealth, professions, family/spouse, compatible signs, spending, health, lucky days/numbers/colours |
| 5 | Rudraksha | 6-7 | Generic mythology/history/benefits (2 pages); "Significance of Rudrakshas at a Glance" 1-14 faced (each: planet, benefits) |
| 6 | Your Horoscope and Rudraksha | 8-9 | Lagna nature; lagna lord + 6/8/12 lords (trik bhava) analysis; planet in 12th; recommendation: **Rudraksha Kavach** (here 3,4,6,7 faced) + wearing procedure (white thread, Monday, Gangajal, Om Namah Shivay 108x); optional Shivkripa mala 1-14 |
| 7 | Finance - <Year> (5 consecutive years: 2026, 2027, 2028, 2029, 2030) | 10-29 | Per year (4 pages): annual overview (2 paras, transit-based, e.g. "combined aspectual effect of Jupiter and Saturn on Second House", "After June 02, Jupiter of Ninth House ...") + **"Prediction For <Month> <Year>"** x 12 (Jan-Dec), 2-3 paras each |
| 8 | Dasha Analysis | 30-32 | Major Period :- Saturn (20/12/2022-19/12/2041) with sub-headed effects: Health / Assets and Finance / Profession / Family Life / Education-Learning; then **Sub Period** blocks covering the report window: Saturn-Mercury (22/12/2025-01/09/2028), Saturn-Ketu (01/09/2028-10/10/2029), Saturn-Venus (10/10/2029-10/12/2032) — each: duration sentence, house placement + karakatwa of AD lord, aspect, effects, remedy (gem e.g. "Panna 6 1/4 ratti, middle finger, Wednesday"; Vedic mantra 8000 times; "tantrik toolbar" (sic) list) |

8 sections (+ no cover/closing), ~90 topics (60 monthly predictions + 5 annual + ~25 others). Window: generation year (2026) + 4 years.

## 3. Tables, charts, visuals

Tables
- p1 Planet table columns: Pl | R | C | Degree | Rasi | Nak | Pad | Lord (nakshatra lord) | Sub (KP sub lord) | Dignity (FrSign/EnSign/NuSign/Moltrikn/Exalted) | S-B (Shadbala ratio) | Char (Chara karaka: Atma, Amatya, Bhratra, Matra, Putra, Gyati, Kalatra) | Sthir (Sthira karaka: Pitra, Matra, Bhratra, ...) | Grah Tara (Janma, Sampat, Vipat, Saadhak, Vadha, Mitra, Atimitra, Pratyari).
- p1 Panchang, Avakahada Chakra, Vimshottari & Yogini lists.
- p3 Gem Power: Gems | Planet | Power % | Area (e.g. Y-Sapphire Jup 100% Wealth, Kids happiness; Emerald Mer 16% Financial loss...), plus coloured bar chart.
- p3 Dasha-wise Gem Selection: Dasha | Ending | Ruby | Pearl | Coral | Emerald | Y-Sapphire | Diamond | B-Sapphire | Gomed | Cat's eye (percent per MD, 9 rows).
Charts (all **North Indian**, coloured planet abbreviations with degree subscripts, R/combust markers)
- Lagna-Chalit (large), Moon Chart, Navamsa (D9), **Sarvashtakvarga** chart (SAV bindus per house), Dasamamsa (D10).
Visuals: gold paisley vertical border strips both sides, faint floral watermark, no photos, no icons, no logo image.

## 4. Required data

- Sidereal (Lahiri) longitudes for 9 grahas (+ Uranus/Neptune/Pluto appear in sibling report), retrograde/combust flags, Lagna; nakshatra, pada, nakshatra lord, KP sub lord.
- Dignity, Shadbala ratio, Chara (Jaimini 7-karaka) and Sthira karakas, Tara from Moon nakshatra.
- Panchang at birth incl. sidereal time, equation of time; Avakahada (gana, yoni, nadi, varna, vashya, varga, yunja, hansak, name syllable, paya, hora, chaughadia).
- Bhava Chalit, D9, D10, Sarvashtakavarga.
- Vimshottari MD/AD dates; Yogini dasha.
- Gem benefic scoring per planet and per dasha (functional benefic/malefic, badhaka).
- Annual finance: Jupiter/Saturn transits over 2nd/11th/9th houses with ingress dates; monthly finance text (probably monthly transit scoring -> one of N template paragraphs; many months reuse near-identical text).
- 2nd-house sign lord + occupants; trik-bhava lords for rudraksha kavach.
- No numerology, no doshas (Manglik / Sade Sati / Kaal Sarp absent), no yogas.

## 5. Content depth

Words: kundli page 460 (tabular) | 2nd house 225 | gem 430 | personality 460 | rudraksha generic 948 | your horoscope & rudraksha 626 | **finance yearly 7,705** (≈1,540/yr; month ≈ 90-130 words) | dasha 1,060.
Personalisation: ~60% of words are template text selected by transit/dasha/house key; ~20% purely generic (rudraksha essay, gem methodology); tables ~10%. Monthly paragraphs are generic "augury" phrases, frequently repetitive.

Excerpts (verbatim, OCR):
- p10: "First half of the year would be auspicious for economic perspective. You would succeed in having expected savings because of combined aspectual effect of Jupiter and Saturn on Second House."
- p12 (Feb 2026): "Nothing particularly encouraging about the augury from the stars in so far as your financial prospects are concerned."
- p31: "you are advised to wear a Panna weighing 6 ¼ ratti. It should be worn in middle finger of your right hand on Wednesday early morning after studded in a golden ring."

Quality issues observed: typos ("Soeech" is OCR, but "tantrik toolbar", "lagan", "tow years", "worm"), dated tone; Emerald recommended in Saturn-Mercury AD although Gem Power gives Emerald 16% (contradiction).

## 6. Boilerplate vs unique

Shared with Couple Kundli Matching report (same software family): page frame, footer, Gem Selection stone table style, Personality Analysis text (identical paragraphs for Puneet), "Finance, Family, Eyes & Speech" bhava text (identical to Couple p60), Dasha Analysis text (identical to Couple p82). Unique to Finance: year-by-year monthly finance forecasts (p10-29), Gem Power/dasha-wise gem tables, Rudraksha essay + Kavach. No disclaimer, no author message, no conclusion, no cover.

## 7. Visual identity
- White page, ornate **gold paisley border strips** left and right, faint cream damask watermark top-right / bottom-left.
- Header: client name centred in magenta/crimson (~#B0105A). Section titles crimson bold sans (Avant Garde Demi). Body: Avant Garde Book, black, justified, ~10pt.
- Footer (every page): "Astro Arun Pandit Private Limited" (bold) / "Astrology | Numerology | Palmistry | Tarrot Reading | OccultGurukul | Gemsmantra" / phone numbers in blue "+91-8604802202, +91-6391932456" / "www.astroarunpandit.org". Page number in small circle at right edge.
- Crop marks at corners (print-ready).
