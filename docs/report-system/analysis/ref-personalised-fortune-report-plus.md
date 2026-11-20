# Reference Report Forensics: "Personalised Fortune Report Plus"

Source: `docs/referencerepots/Personalised Fortune Report Plus.pdf`
All page numbers below are **PDF page indices** (1-based). The printed footer page number is lower (front matter and full-bleed divider pages are unnumbered), e.g. PDF 29 = printed 26, PDF 77 = printed 70, PDF 110 = printed 103, PDF 139 = printed 131.

## 1. Identity

| Item | Value |
|---|---|
| Cover title | "YOUR FORTUNE REPORT **PLUS**" (PLUS in dark red) |
| Pages | 139 (A4, 595.92 x 842.88 pt) |
| Producer | Chromium / Skia PDF m145 (HTML-to-PDF render) — real text layer, NOT scanned. 5 full-bleed image-only divider pages (27, 35, 40, 45, 67) + 1 full-page ad (138) have 0 extractable words. |
| Words (text layer) | ~27,400 |
| Language | English. Devanagari appears only for mantras (Lucky Things p9 favourable mantra "ॐ ह्रां ह्रीं ह्रौं सः सूर्याय नमः", Mahamrityunjaya p72/75, Beej + Rashi mantras p133). |
| Author/brand | "Astro Arun Pandit" (signature on Message from Author p3; footer on every content page; diagonal handwritten-signature watermark). Partner brand **Gemsmantra** (coupon GEM15, p137-138). |
| Sample client (reference sample data only) | Puneet Kumar, Male, 28 December 1983, 04:45 AM, Bulandshahr, Uttar Pradesh |

Sample computed values shown (useful as test fixture expectations, but **must be re-verified** — not trusted):
- Numerology: Name number 3 (Chaldean: PUNEET KUMAR = 48 -> 12 -> 3), Soul Urge 5 (Chaldean vowels), Personality 7 (Chaldean consonants), Mulank 1 (28 -> 10 -> 1), Bhagyank 7 (2+8+1+2+1+9+8+3 = 34 -> 7), Kua 8 (male: 11 - (1+9+8+3 -> 21 -> 3) = 8), Sun sign Capricorn (Western tropical date range Dec 22-Jan 19), Success number 4, Connection number 6, Maturity number 4, Lucky numbers 1,3,5,6, Avoid 2,4,7,8,9, Lucky colour Red, Lucky dates 10/15/19/24, Lucky years 10,19,28,...,73 (ages), Lucky yantra Surya.
- Lo Shu grid (p36 "YOUR GRID"): 1 x3, 2 x2, 3 x1, 7 x1, 8 x2, 9 x1 (DOB digits + Mulank + Bhagyank appended); Missing 4, 5, 6.
- Life "Challenge" cycles 0-29 / 29-38 / 38-47 / 47+ with numbers 4, 4, 8, 6. NOTE: these are arithmetically the classic **Pinnacle** numbers (month+day=3+1=4, day+year=1+3=4, P1+P2=8, month+year=6) and the 36-minus-life-path(7)=29 pinnacle age boundary, though labelled "Challenge". Flag for client clarification.
- Personal month themes Apr 2026 = 9 ("endings"), May 2026 = 1 ("fresh starts") => Personal Year 2026 = 5 computed from calendar year.
- Astrology: Ascendant Scorpio; Moon in Virgo (11th house) with Mars; Sun, Mercury, Jupiter in 2nd (Sagittarius); Venus + Ketu in 1st (Scorpio); Rahu 7th (Taurus); Saturn 12th (Libra). Janma nakshatra Chitra (Mars-ruled) => "born in Mars Mahadasha" (p127). Panchang: Krishna Paksha, Wednesday, Ashtami tithi, Chitra, Saubhagya yoga, Balav karana, sunrise 7:13:17, sunset 17:25:27. Darakaraka = Jupiter (lowest degree). Manglik = Anshik (Mars in 1st from Moon only). Not currently in Sade Sati; three Sade Sati cycles listed.

## 2. Section inventory (ordered)

Index (p5-8) lists 25 numbered sections split into a Numerology half (1-12) and an Astrology half headed "COSMIC PATHWAY" (13-25).

| # | Section (as in index / page heading) | PDF pages | Ordered topics / subheadings |
|---|---|---|---|
| - | Cover | 1 | Name, DOB, time, place |
| - | Disclaimer | 2 | astrology+numerology disclaimer, no liability, remedies need faith/intent |
| - | Message from Author | 3 | "Dear <Name>, Welcome to Your Fortune Report" letter, signed Astro Arun Pandit |
| - | The Best Way to Study Your Report | 4 | read 3 times, calm mindset |
| - | Index | 5-8 | 25 sections |
| 1 | Introduction: Your Lucky Things / Personal Details | 9 | 2-col table (17 rows, see sec. 3) |
| 2 | Numerological Analysis | 10-24 | **What is your Psychic Number revealing about you?** (p10-13): Mulank box + Ruling Planet; Personality Traits (bullets); A Piece of Advice; Lucky Colour; Favourable Period (e.g. Mar 21-Aug 20); Unfavourable Period (Oct 15-Dec 25). **What is your Destiny Number revealing about you?** (p14-16): Effects of your Bhagyank (long bullet list). **Decoding Your Birth Date** (p17). **Insights from your Mulank 1 and Bhagyank 7 Combination** (p17). **Unveiling Your Zodiac Sign Traits** — Capricorn (Dec 22-Jan 19) (p18). **Ruling Deity** (p19). **Fasting** (p20). **Your Friendship with Other Mulank** (p20-23): Mulank 1 & 1 ... 1 & 9 (9 pair entries). **Romance with Other Numbers** (p24): compatible 1,2,3,5,6,9 with pair paragraphs |
| 3 | Empower Your Health -> "Your Health & Immunity Blueprint" | 25 | single page by Mulank |
| 4 | Numerology and Your Future -> "Career Options" | 26 | General Traits; Career Fields; Strengths; Challenges; Examples of Professions (5 numbered) — keyed to Mulank+Bhagyank |
| - | Divider "Your Grid Analysis" (image, Lo Shu 4-9-2 / 3-5-7 / 8-1-6 + turtle) | 27 | |
| 5 | Decoding Your Destiny: Fortune Grid Analysis | 28-34 | What is Your Fortune Grid (Lo Shu history, Importance in Numerology and Feng Shui); Grid Analysis: "Number N is present K times" for each present number (p29-31); Missing Numbers (definition, p32); Impact of Missing Numbers: Number 4 = Rahu, Number 5 = Mercury, Number 6 = Venus (p33-34) |
| - | Divider "Feng-Shui & Directional Insights" (yin-yang image) | 35 | |
| 6 | Feng-Shui & Directional Insights | 36-39 | Sample Grid with element icons (4 wood, 9 fire, 2 earth, 3 wood, 5 earth, 7 metal, 8 earth, 1 water, 6 metal); Your Grid (repeated digits e.g. 88, 111); element legend (Water/Wood/Fire/Earth/Metal); Kua Number (definition, Formula Male 11-sum / Female 4+sum, Note on why 5 excluded -> male 2, female 8, worked example 1995, Disclaimer: Kua ~20-25% influence on grid) (p37); Birth Year 1983 -> Kua 8, Element Earth, Attributes, Uses, Activating Your Kua Number, Lucky Directions (Success SW, Health NW, Relationships W, Wisdom NE) (p38); The Element Present in the Grid: Water/Fire/Earth/Metal/Wood each with Position + Characteristics (p39) |
| - | Divider "Your Name Analysis" (letter tiles) | 40 | |
| 7 | Your Name Analysis | 41-44 | Name Number Addition (with name as heading); Your Name Number is: 3; First Letter: P (p41); Soul Urge Number (incl. "Alert:" para); Personality Number (p42); Current Name Grid (4 planes table) (p43); Knowledge Plane; Strength Plane (p43); Emotional Plane; Spiritual Plane; Conclusion (p44) |
| - | Divider "Your Fortune Trend" (crystal ball) | 45 | |
| 8 | Your Fortune Trend (12 monthly forecasts) | 46-62 | April 2026 ... March 2027; each month: This Month's Theme / What to expect (8-12 bullets) / A Piece of Advice (4-8 bullets). Window starts at report month (sample generated ~Apr 2026) |
| 9 | Challenge of Life | 63-66 | Challenge Cycle 1-4, each: Range (in years), Challenge Number, Attributes of the Challenge, Phase N title (Laying the Groundwork / Reaping the Benefits of Effort / Sustained Success and the Value of Practical Relationships / Joy in Marriage and Later Life) |
| - | Divider "Are You on the Right Path?" | 67 | |
| 10 | Are You on the Right Path | 68-70 | Success Number: 4 (Qualities, Challenges); Connection Number: 6 (with "Seven minus 1", "Eight minus 2", "Nine minus 3" sub-paras — i.e. Bhagyank-Mulank difference variants); Maturity Number: 4 |
| 11 | Your Everyday Lucky Items | 71 | Your Lucky Email ID (name-based, with 0/9 padding note and rajeshkumar example); Your Lucky Bank is (5 banks); Your Lucky Tattoo (Capricorn tattoo) |
| 12 | Remedies Uniquely Designed for Your Well-being | 72-75 | Intro (face east/north/NE); Health Issue -> Mantra / Pronunciation / Hindi / When & How Many Times (p72); Remedies for Missing Numbers in the Lo-Shu Grid: Missing Number 6, 4, 5 (3 bullet remedies each) (p73); Disclaimer for Missing Numbers (pick one) (p74); Mantras for Better Health: Maha Mrityunjaya — Mantra / Chanting Instructions / Benefits (p75) |
| - | **The Cosmic Pathway: From Numbers to Stars** (bridge essay) | 76 | |
| 13 | Birth Charts -> "Kundali Charts" | 77 | 4 North-Indian charts: Lagna, Navamsa Chart, Chandra Kundali, Lal Kitab |
| 14 | Panchang -> "Birth Panchang" | 78 | table: Paksha, Vaara, Tithi, Nakshatra, Yoga, Karana, Sunrise, Sunset |
| 15 | Janm Nakshatra | 79-81 | generic definition (27 nakshatras, 13°20'); <Nakshatra> + epithet ("CHITRA — The Radiant Architect"); Key Traits & Details (5 titled traits); Ways to Harness Your Potential (5 titled tips) |
| 16 | Rashi Predictions | 82-83 | "Your Ascendant is Scorpio" + ~20 numbered everyday-trait statements |
| 17 | Planets and Their Attributes | 84-98 | For each of 9 grahas (order in sample: Sun, Moon, Jupiter, Rahu, Mercury, Venus, Ketu, Saturn, Mars): generic "What X Represents" (6-7 numbered karakatvas) + "<PLANET> IN THE <N>TH HOUSE" intro + ~8-10 numbered house-specific statements (Lal-Kitab-flavoured, e.g. "marriage ceremonies on Fridays might disrupt your fortunes") |
| 18 | Manglik Dosh -> "Manglik Dosh Analysis" | 99-102 | Verdict ("You have Anshik Manglik Dosh"), level definition, Disclaimer (Jupiter aspect on Mars softens), "Understanding Your Manglik Dosh with Mars in the 1st House", Your Strengths (6), Challenges You May Face (6, incl. "Tough Phase Around 28", "Marks on Your Face"), How to Harness Your Mars Energy (6, incl. Worship Lord Hanuman), Conclusion |
| 19 | Sade Sati | 103-110 | What is Sade Sati (keyed to Moon sign Virgo -> Leo/Virgo/Libra); Insights through all three phases: Rising (Saturn in Leo), Peak (Virgo), Setting (Libra) each with emotional/health/finance/family paras + "What You Can Do" lists; Remedies to Help You Through Sade Sati (7: Shani Beej / Shani Gayatri / Hanuman Chalisa / Vishnu mantra; Chaya Daan; Saturday fast; oil diya; serve underprivileged; humility; 7 Mukhi Rudraksha); **Sade Sati Period** status sentence + 3 phase tables (p110) |
| 20 | Yogas Formed in the Birth Chart | 111-123 | Generic yoga intro; then per yoga: Effects of the Yog (5-8 titled effects), The Dasha When It Will Show Its Effect (During Dasha: planet dashas; During Transit). Yogas in sample: **Gaj Kesari Raj Yog** (111-113), **Budh Aditya Yog** (113-116), **Saraswati Yog** (116-118), **Chandra Mangal Yog** (119-121), **Vasumati Yog** (121-123) |
| 21 | About Your Marriage | 124-126 | "Your Marriage and Spouse" — Darakaraka definition; Darakaraka planet + house paragraph; Personality Traits of Your Spouse; How You Are Likely to Meet Your Spouse; Your Spouse's Professional Life; Key Characteristics of Your Marriage; **Favorable Period for Marriage** table (p126) |
| 22 | Career Predictions ("CARER PREDICTIONS" typo) | 127 | 3 paragraphs: by 10th-house/lagna themes, by another factor, by birth Mahadasha ("Since you are born in Mars Mahadasha...") |
| 23 | Astrology Remedies | 128-135 | Methodology (Gemstones by 1st/5th/9th house lords; Rudraksha; Mantras; Simple Lifestyle Remedies; Numerology and Crystals; "Feeling unsure? A quick consultation can help ->" CTA) (p128); Gemstones (1/10 body weight in carats; Red Coral, Yellow Sapphire, Pearl) (p129); Planetary Lords & Metals & Gemstones table (p130); Planetary Lords & Substitutes table (p131); Rudraksh Suggestions (3 Mukhi + wearing link) (p132); Mantras: Beej Mantra, Rashi Mantra (Devanagari + transliteration); Remedies for Improving Lifestyle (6 numbered, e.g. wheat flour+jaggery to cow on Thursday) (p133-135); Lucky Bracelet (Sun Stone, Kambaba Jasper — from Mulank/Bhagyank) (p135) |
| - | Disclaimer (choose only 3 remedies) | 136 | |
| 24 | To Harness the Magic of Gems, Crystals and More... | 137 | Gemsmantra promo, coupon GEM15 (Rs 999 off on Rs 5000+) |
| - | Full-page ad "Gemsmantra — Gems that Empower" | 138 | image only |
| 25 | Conclusion: "The Fortune Report is a Spark - Let Your Actions be the Flame" | 139 | 4 paragraphs + promo banner |

Count: 25 numbered sections (+4 front-matter, 2 closing extras); approx **95 distinct topics/subheadings**.

## 3. Tables, charts, visuals

Tables
- p9 Your Lucky Things (key/value, 17 rows): Name, Name Number, DOB, Gender, Sun Sign, Mulank, Ruling planet of Mulank, Bhagyank, Ruling planet of Bhagyank, Kua Number, Lucky Number, Numbers You Should Avoid, Lucky Colour, Lucky Dates, Lucky Years, Success Number, Lucky Yantra, Favourable Mantra.
- p36 Lo Shu sample grid with element icons + client grid (3x3, digits repeated by count, e.g. "111", "88").
- p43 Current Name Grid: 4 columns KNOWLEDGE / STRENGTH / EMOTIONAL / SPIRITUAL, rows of letters with occurrence counts (A(1), E(2)...), totals row (3,3,2,3).
- p78 Birth Panchang (8 rows).
- p110 Sade Sati Period: 3 phase tables, columns Phase | Start | End | Rashi; rows Rising/Peak/Setting (dd/mm/yyyy) — sample: 2006-2014, 2036-2043, 2065-2073.
- p126 Favorable Period for Marriage: Start Date | End Date | Chances (Good / Fair / Very Good), 11 windows 2027-2037 (Jupiter transit on 7th house, 9th/"destiny" house and Darakaraka).
- p130 Planetary Lord | Metals | Gemstone (9 rows). p131 Planetary Lord | Substitutes | Gemstone (9 rows).

Astrological charts
- p77: four **North Indian** diamond charts, brown lines: Lagna (D1), Navamsa (D9), Chandra Kundali (Moon chart), Lal Kitab chart (Aries fixed in 1st house). Planet abbreviations Su, Mo, Ma, Me, Ju, Ve, Sa, Ra, Ke; sign numbers in houses. No South Indian chart. No degree table, no dasha table anywhere.

Other visuals
- Cover (p1): arch frame, sun face, zodiac wheel, crescent-moon faces, praying hands, stars — line-art in brown.
- Promo banner "3Lakh+ People saw positive change just after One Consultation" with author photo (p10, p25, p78, p66, p131, p139).
- Full-bleed brown divider pages with serif title + illustration (p27 Lo Shu+turtle, p35 yin-yang, p40 letter tiles, p45 crystal ball, p67 path/arrow), Gemsmantra ad (p138).
- Line-art spot illustrations (hands, scales, ruling deity sun, fasting clock, handshake icons for friendship).
- Mulank number in large decorative numeral (p10), Kua number in circle (p38), compass illustration (p38).

## 4. Required data per section

| Section | Inputs / calculations |
|---|---|
| Lucky Things | Name (Chaldean name number), DOB, gender; Mulank (day reduced), Bhagyank (full date reduced), ruling planets (1 Sun, 2 Moon, 3 Jupiter, 4 Rahu, 5 Mercury, 6 Venus, 7 Ketu, 8 Saturn, 9 Mars), Kua, Western Sun sign by date range, lookup tables for lucky number/colour/dates/years/yantra/mantra/success number |
| Psychic/Destiny/Combination | Mulank (1-9) text, Bhagyank (1-9) text, Mulank x Bhagyank combination (81 variants), birth-day text ("Decoding your birth date" — probably by day 1-31) |
| Zodiac, Deity, Fasting | Sun sign (12), Mulank deity + fasting day |
| Friendship/Romance | Mulank vs 1..9 compatibility tables |
| Health, Career | Mulank (+Bhagyank) lookup |
| Fortune Grid | Lo Shu: DOB digits (zeros ignored) + Mulank + Bhagyank; per-number-per-count texts (1..9 x 1..n), missing-number texts |
| Feng Shui | Kua (gender-dependent, 5 -> 2 male / 8 female), element, lucky directions by Kua; elements present in grid |
| Name Analysis | Chaldean letter values: name number, soul urge (vowels), personality (consonants), first letter text (A-Z), name grid planes (letter -> plane mapping with counts) |
| Fortune Trend | Personal Year (birth day+month+current year) -> Personal Month 1-9 for 12 months from generation date |
| Challenge of Life | 4 cycles: ages from 36 - life path, then +9; numbers from month/day/year (pinnacle formula) |
| Right Path | Success, Connection (Bhagyank-Mulank difference variants), Maturity numbers |
| Lucky Items | lucky email (name + lucky number padding), lucky bank (name-number match list), tattoo (Sun sign) |
| Remedies | missing-number remedies, problem-specific mantra (Health), Mahamrityunjaya |
| Kundali charts | Sidereal (Lahiri presumed) planetary longitudes + ascendant -> D1, D9, Moon chart, Lal Kitab chart |
| Panchang | tithi, paksha, vaara, nakshatra, yoga, karana, sunrise/sunset for birth place |
| Janm Nakshatra | Moon nakshatra (27 texts) |
| Rashi Predictions | Ascendant sign (12 texts) — heading says "Rashi" but keyed to Lagna |
| Planets | each planet's house from Lagna (9 x 12 texts) + generic karakatva block |
| Manglik | Mars in 1/4/7/8/12 from Lagna and from Moon -> None / Anshik / full; Jupiter aspect on Mars as mitigation; Mars house-specific text |
| Sade Sati | Moon sign; Saturn transit ingress/egress dates (ephemeris search) for past and future 3 cycles; current status |
| Yogas | rule detection: Gajakesari (Jupiter kendra from Moon), Budh-Aditya (Sun+Mercury conj.), Saraswati, Chandra-Mangal (Moon+Mars), Vasumati (benefics in upachayas) + dasha planets for each |
| Marriage | Chara Darakaraka (lowest degree planet, 7- or 8-karaka scheme unclear), its house; Jupiter transit windows over 7th house / 9th house / Darakaraka with quality grade |
| Career | 10th house/lagna themes + Vimshottari Mahadasha at birth |
| Astro Remedies | Lagna, 5th and 9th lords -> gemstones; rudraksha by Lagna lord; Beej + Rashi mantras; lifestyle remedies; bracelets by Mulank/Bhagyank |

Not present: Vimshottari dasha table, Ashtakavarga, divisional charts beyond D9, planetary degree table, Kaal Sarp, transit (Gochar) forecast other than Sade Sati and marriage windows.

## 5. Content depth

Words per section (text layer):
front 864 | lucky 90 | mulank 694 | bhagyank 713 | birth date + combo 187 | zodiac 128 | deity+fasting 544 | friendship+romance 816 | health 178 | career (num) 221 | Lo Shu grid 1,414 | feng-shui/kua 886 | name 1,334 | **fortune trend 4,100** | challenge 1,047 | right path 693 | lucky items 99 | num remedies 392 | cosmic intro 215 | charts+panchang 100 | nakshatra 759 | rashi 615 | **planets 3,732** | manglik 726 | sade sati 1,790 | **yogas 2,834** | marriage 538 | career (astro) 211 | astro remedies 1,114 | closing 394.

Typical topic: 150-350 words, 3-8 short paragraphs or 6-12 numbered/bulleted statements. Pages hold ~200-300 words.

Personalisation ratio: almost all text is **template blocks selected by a computed key** (Mulank, Bhagyank, Lo Shu count, Kua, name numbers, planet-in-house, ascendant, nakshatra, yoga, Manglik level, Moon sign). Truly variable tokens (name, numbers, dates, tables) are <5% of words. Pure generic education (definitions of Lo Shu, Kua, Nakshatra, Yoga, Sade Sati, Darakaraka, remedy methodology, disclaimers): ~20-25%. Key-selected "personalised" text: ~70-75%.

Style excerpts (verbatim):
- p10: "The Sun makes you a born leader. It makes your presence felt wherever you go and it won't be wrong to say that you're the life of the party."
- p86: "8) Participating in marriage ceremonies on Fridays might disrupt your fortunes. Choose your events wisely."
- p99: "Since Mars is placed in one of the key houses (1st, 4th, 7th, 8th, or 12th) in only one of your charts, either your Natal Chart (Kundali) or Moon Chart, you are considered Anshik Manglik (Low Manglik)."

Second-person, warm, motivational; numbered lists; occasional humour ("who took the last cookie"). Typos present ("Psychio Number", "Navmansa", "CARER PREDICTIONS", "Ascendent").

## 6. Boilerplate vs unique

Shared boilerplate (same text as Hindi "Fortune Report"; likely shared across Astro Arun Pandit numerology products): Disclaimer (p2), Message from Author (p3), Best Way to Study (p4), Lo Shu/Kua/Missing-number definitions, Lucky email instructions, remedy disclaimers (p74, p136), Gemsmantra GEM15 promo (p137), conclusion "spark/flame" (p139), "3Lakh+" consultation banner.

Unique to PLUS: the entire astrology half "Cosmic Pathway" (p76-135, sections 13-23: charts, panchang, nakshatra, ascendant predictions, planet-in-house, Manglik, Sade Sati, yogas, marriage + timing table, career, gemstone/rudraksha/mantra remedies, metals/substitute tables), plus Gemsmantra full-page ad (p138).

## 7. Visual identity

- Background: warm beige/parchment (~#F1E8DA) on every page; thin brown double-line ornamental frame with corner flourishes.
- Headings: serif display caps (Cinzel/Trajan-like) in dark brown/maroon (~#6B3A2A); body: geometric sans (Kanit/Poppins-like) dark grey-brown; bold labels.
- Full-bleed chocolate-brown (~#5A3A28) section dividers with large cream serif titles.
- Footer: centred page number + "Astro Arun Pandit" in light orange/brown; no header.
- Diagonal handwritten "Astro Arun Pandit" signature watermark (faint) across content pages.
- Tables: brown 1px borders, white/cream cells. Charts: brown lines.
- Accent dark red on "PLUS" on cover.
