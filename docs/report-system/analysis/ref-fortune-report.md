# Reference Report Forensics: "Fortune Report" (Hindi)

Source: `docs/referencerepots/Fortune Report.pdf`. Page numbers = PDF page index (printed footer number = PDF - 1 from p9 on).

## 0. Verdict: how it differs from "Personalised Fortune Report Plus"

**It is a separate, smaller product tier, not an older version of PLUS — and this sample is the Hindi edition.**

| Aspect | Fortune Report (this file) | Personalised Fortune Report Plus |
|---|---|---|
| Language | **Hindi (Devanagari)** body; English left only in data values (Sun, Ketu, Red colour, bank names, month names "April 2026:", "Challenge Cycle 1", "Current Name Grid", mantra problem labels) | English |
| Scope | **Numerology only** = sections 1-12 | Numerology 1-12 **+ astrology "Cosmic Pathway" 13-25** (charts, panchang, nakshatra, ascendant, planets in houses, Manglik, Sade Sati, yogas, marriage timing, career, gemstone/rudraksha/mantra remedies) |
| Pages / words | 112 pages, ~19,400 words (Hindi words) | 139 pages, ~27,400 words |
| Toolchain | Google Docs export ("Skia/PDF m149 Google Docs Renderer", title `Fortune_Report_Puneet_Kumar.pdf`) — hand-assembled doc | Chromium HTML-to-PDF (template engine) |
| Theme | Purple/gold, starry header band, parchment texture, "Astro" watermark, footer URL www.astroarunpandit.org | Beige/brown, line-art, footer "Astro Arun Pandit" |
| Index | 12 sections, rendered as images (p6-8, no text) | 25 sections, text |
| Same sample client | Puneet Kumar, 28/12/1983, male (no birth time/place shown — not needed) | adds 04:45 AM, Bulandshahr |
| Lucky Things table | adds **Lucky Rudraksha (Ganesh Rudraksha), Lucky Bracelet (Sun Stone, Kambaba Jasper)** as hyperlinks | no rudraksha/bracelet rows (bracelet appears in astro remedies p135) |
| Personalised mantra remedies | 3 **problem-specific** mantras: Relationship Issue/Breakup/Parents Not Accepting Relationship; Money Blockage; Career Issue (p107-108) | 1 problem: Health Issue (p72) => problem(s) are a client-selected input |
| Maturity number | **1** (p101) (= life path 7 + name 3 = 10 -> 1) | **4** (p69/70) — inconsistent between the two samples |
| Challenge cycle ranges | 0-29, **30-38, 39-47, 48-onwards** | 0-29, 29-38, 38-47, 47 onwards |
| Lucky email | "Puneet Kumar@gmail.com" (space bug) | puneet_kumar@gmail.com |
| Lucky bank | rendered as raw JSON array `["Bank of India","DCB Bank",...]` (template leak, p103) | clean comma list |
| Kua section | longer (p47-51, ~3 pages explanation incl. male/female special-case) | 2 pages |
| Divider pages | 5 purple dividers: Grid Analysis (34), Lucky Directions (45), Name Analysis (54), Fortune Trend "भाग्य प्रवृत्ति" (66), Are You on the Right Path (98) | 5 brown dividers equivalent |

Everything else (section order, sub-topics, numbers, monthly forecast window Apr 2026-Mar 2027, disclaimers, author letter, Gemsmantra promo, conclusion) is a translation of the PLUS numerology half. Conclusion: the product catalogue has **Fortune Report (numerology, available in Hindi/English)** and **Fortune Report Plus (numerology + Vedic astrology)**; PLUS = Fortune Report + Cosmic Pathway. Hindi localisation is a requirement for at least this product.

## 1. Identity

- Title (cover): "YOUR FORTUNE REPORT — BY ASTRO ARUN PANDIT", name in purple pill "Puneet Kumar"; top line "|| ॐ श्री गणेशाय नमः ||".
- 112 pages, A4 (596 x 842 pt). Real text layer (not scanned) but Hindi extraction has broken matras (e.g. "मल ु ांक") due to Google Docs font shaping — irrelevant to our render, but note we must embed a proper Devanagari font (e.g. Noto Sans Devanagari / Mukta) with correct shaping.
- Image-only/near-empty pages: index 6-8 (image), dividers 34/45/54/66/98, p41 blank, p36 grid only.
- Sample data (reference only): Puneet Kumar, पुरुष (male), DOB 28/12/1983, Sun sign मकर (Capricorn), Mulank 1 (Sun), Bhagyank 7 (Ketu), Kua 8, Name number 3, Soul urge 5, Personality 7, Success 4, Connection 6, Maturity 1; Lucky numbers 1,3,5,6; Avoid 4,7,8,2,9; Lo Shu missing 4,5,6.

## 2. Section inventory

| # | Section (Hindi heading — English gloss) | PDF pages | Ordered topics |
|---|---|---|---|
| - | Cover | 1 | |
| - | अस्वीकरण — Disclaimer | 2-3 | same text as PLUS |
| - | लेखक की ओर से संदेश — Message from Author | 4 | "प्रिय Puneet Kumar", signed एस्ट्रो अरुण पंडित |
| - | अपनी रिपोर्ट का अध्ययन करने का सर्वोत्तम तरीका — Best way to study | 5 | scroll+quill illustration |
| - | अनुक्रमणिका — Index | 6-8 | 12 sections (image) |
| 01 | परिचय — Introduction: आपकी भाग्यशाली चीज़ें (Lucky Things) | 9-10 | table (20 rows) |
| 02 | संख्यात्मक विश्लेषण — Numerological Analysis | 11-30 | मूलांक (1) विवरण: A. शासक ग्रह, B. व्यक्तिगत खासियतें, C. विशेष सलाह, D. अनुकूल अवधि, E. प्रतिकूल अवधि, F. भाग्यशाली रंग (11-14); भाग्यांक 7 विवरण (15-17); आपकी जन्म तिथि का विश्लेषण (18); आपके पास 1 और 7 का संयोजन है (19); आपकी राशि है "मकर" (20); आपका शासक देवता (21-22); उपवास (23); अन्य मूलांक से आपकी मित्रता: मूलांक 1 और 1 ... 1 और 9 (24-28); अन्य नंबरों के साथ रोमांस (29-30) |
| 03 | स्वास्थ्य को सशक्त बनाना — आपका स्वास्थ्य और इम्युनिटी का नक्शा | 31 | |
| 04 | संख्याशास्त्र और आपका भविष्य: करियर विकल्प — कैरियर के विकल्प | 32-33 | सामान्य लक्षण, कैरियर क्षेत्र, ताकत, चुनौतियाँ, व्यवसायों के उदाहरण (5) |
| 05 | आपकी किस्मत का विश्लेषण: भाग्य ग्रिड | 34(div)-44 | फॉर्च्यून ग्रिड क्या है? (35); client grid (36); ग्रिड विश्लेषण: यदि 1 तीन बार..., 2 दो बार, 3 एक बार, 7 एक बार, 8 दो बार, 9 एक बार (37-40); मिसिंग नम्बर (42); मिसिंग नम्बर का प्रभाव: 4 राहु, 5, 6 (43-44) |
| 06 | आपकी फेंग-शुई और दिशा संबंधी जानकारी | 45(div "आपकी भाग्यशाली दिशाएँ")-53 | नमूना ग्रिड with element names (46); कुआ नंबर: definition, formula (male/female), why not 5, example 1995 (47-49); जन्म वर्ष 1983 -> Kua 8, तत्व पृथ्वी, गुण, उपयोग, सक्रिय करना, भाग्यशाली दिशाएँ (50-51); आपके ग्रिड में मौजूद तत्व: जल, लकड़ी, अग्नि, पृथ्वी, धातु (52-53) |
| 07 | आपके नाम का विश्लेषण | 54(div)-65 | नाम संख्या जोड़ (55); आपका नाम क्रमांक है: 3 + पहला अक्षर: P (56-57); आत्मा आग्रह संख्या (58-59); व्यक्तित्व संख्या, अंक 7 (60-61); Current Name Grid + ज्ञान/शक्ति/भावनात्मक/आध्यात्मिक धरातल (62-64); निष्कर्ष (65) |
| 08 | आपकी किस्मत की प्रवृत्ति — Fortune Trend | 66(div)-90 | "अगले 12 महीनों के लिए माहवार भविष्यवाणी": April 2026 ... March 2027; each: व्यक्तिगत माह (theme), क्या उम्मीद करें?, विशेष सलाह |
| 09 | जीवन की चुनौतियाँ — Challenge of Life | 91-97 | Challenge Cycle 1-4: Range, Challenge Number, चुनौती के गुण, चरण 1-4 |
| 10 | क्या आप सही रास्ते पर हैं? | 98(div)-102 | सफलता संख्या 4 (गुण, चुनौतियाँ); संबंध संख्या 6 (सात में से एक, आठ में से दो, नौ में से तीन); परिपक्वता संख्या 1 |
| 11 | आपकी रोज़ाना की शुभ वस्तुएं — Everyday Lucky Items | 102-104 | भाग्यशाली ईमेल आईडी; भाग्यशाली बैंक; भाग्यशाली टैटू (मकर) with tattoo image |
| 12 | आपकी भलाई के लिए विशेष रूप से डिज़ाइन किए गए उपाय | 105-109 | लापता संख्याओं के लिए उपाय: मिसिंग नम्बर 4, 5, 6 (105-106); problem mantras ×3 (मंत्र/उच्चारण/निर्देश) (107-108); बेहतर स्वास्थ्य के लिए मंत्र: महामृत्युंजय (109) |
| - | अस्वीकरण (choose 3 remedies) | 110 | |
| - | क्रिस्टल्स और अधिक का जादू... — रत्न पत्थर (Gemsmantra coupon) | 111 | |
| - | Conclusion "भाग्य की रिपोर्ट एक ज्योति की किरण है..." | 112 | |

12 numbered sections; ~70 topics.

## 3. Tables / charts / visuals
- Lucky Things table (p9-10, gold-bordered 2-col): Name, Name number, DOB, Gender, Sun sign, Mulank, Mulank ruler, Bhagyank, Bhagyank ruler, Kua, Lucky numbers, Avoid numbers, Lucky colour, Lucky dates, Lucky years, Success number, Lucky Rudraksha (link), Lucky bracelet (links), Lucky yantra, Favourable mantra.
- Lo Shu client grid (p36) and sample grid with element labels (p46) — gold borders.
- Current Name Grid (p62) 4-plane table.
- **No astrological charts.** No dasha/planet tables.
- Visuals: cover pot-of-gold illustration; divider illustrations (Lo Shu numerals, compass, letter blocks, crystal ball, path with footprints); emoji used inline (🌟 😎 🤑 🎉 💎 🩺 ✌); number-block image (p105), "Om" gold seal (p109), clock (fasting p23), rudraksha mala (deity p21), Capricorn glyph (p20).

## 4. Required data
Numerology only: Mulank, Bhagyank, Chaldean name number / soul urge / personality, first letter, name planes, Lo Shu (DOB + Mulank + Bhagyank), missing numbers, Kua (gender), elements, personal month (12 months from generation date), 4 challenge/pinnacle cycles, success/connection/maturity numbers, Western sun sign, lucky lookups (colour, dates, years, yantra, mantra, rudraksha, bracelet, bank, tattoo, email), client-chosen problem areas for mantras. **No birth time/place needed.**

## 5. Content depth
Words (Hindi tokens): front 794 | lucky 111 | mulank 885 | bhagyank 860 | birth date+combo 282 | rashi 171 | deity+fasting 536 | friendship+romance 1,441 | health 267 | career 285 | grid+missing 1,874 | feng-shui/kua 1,198 | name 1,945 | **fortune trend 5,587** | challenge 1,343 | right path 826 | lucky items 311 | remedies 524 | closing 420.
Same template-block personalisation as PLUS (~75% key-selected, ~20% generic, <5% variable tokens).

Excerpts (verbatim):
- p11: "सूर्य आपको जन्म से ही एक मार्गदर्शक और नेता बनाता है । जहाँ भी आप जाते हैं, आपकी उपस्थिति का गहरा प्रभाव पड़ता है ।"
- p50: "क्योंकि आप पुरुष हैं, आपका कुआ नंबर है 8"
- p112: "यह भाग्य रिपोर्ट आपको बेहतर कल्याण और उज्जवल भविष्य की दिशा में मार्गदर्शन देने के लिए बड़े ही ध्यानपूर्वक तैयार की गई है ।"

## 6. Boilerplate vs unique
All boilerplate is shared with PLUS (translated). Unique: Hindi localisation; rudraksha/bracelet rows in lucky table; 3 problem-specific mantras; extended Kua explanation.

## 7. Visual identity
- Cover: deep purple-to-magenta gradient, gold ornamental frame and gold star ring, white serif title, gold pot of coins.
- Content pages: parchment texture background, top band of dark navy/purple night sky with gold constellation line-art and gold swoosh; large faint "Astro" + "Astro Arun Pandit" script watermark; bottom navy band with gold line and URL www.astroarunpandit.org; page number bottom-right small.
- Headings: Devanagari bold (Mukta/Hind-like) in dark navy/maroon; section numbers "01." in maroon; tables gold (#E6B800-ish) borders on cream.
- Divider pages: full purple with gold frame, "|| ॐ श्री गणेशाय नमः ||", "आपका/आपकी" small + big Hindi title in white.
