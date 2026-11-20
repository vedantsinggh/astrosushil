# Reference Forensics: "Premium Personalised Kundli Report.pdf"

Source: `docs/referencerepots/Premium Personalised Kundli Report.pdf`. I extracted the full text with `pdftotext -layout`, which gives about 56,900 words including footers. I rendered 64 representative pages at 28 dpi on contact sheets, plus p1, p11 and p13 at 60 dpi.

## 1. Identity

| Item | Value |
|---|---|
| Title | "PREMIUM PERSONALIZED KUNDLI" (cover). The text calls it "Premium Personalised Kundli". |
| Pages | 295 (A4) |
| Producer | Chromium / Skia m145 (HTML-to-PDF) |
| Fonts | **Yeseva One** (display headings), **Merriweather Light** (body), Liberation Serif/Bold (tables, Devanagari fallback) |
| Language | English, with **Devanagari** in these places: |
| | • cover badge "53 साल का भरोसा, Since 1973–2026" (image) |
| | • **p91, where an entire Bhav Phal paragraph (11th lord placement) is in Hindi** ("जब आपके ग्यारहवें भाव का स्वामी पहले भाव में हो…"). This looks like a template-fallback bug. |
| | • p152 Shani Gayatri shloka ("ॐ शनैश्चराय विद्महे…") |
| | • p273–274 Rudraksha shloka (image/text) |
| | • p285 Ishtdev mantras ("ॐ नमो नारायणाय", "ॐ द्रां दत्तात्रेयाय नमः") |
| | • p291 "हरी मूंग दाल" |
| | • Hindi danda "।" leaking into English sentences (p117, p199, p211) |
| Scanned/image-only? | No. **21 pages have no text:** full-page AI cosmic/deity art dividers on pp. 10, 21, 37, 66, 94, 110, 127, 159, 167, 176, 187, 198, 209, 220, 231, 242, 253, 264, 278, 290, plus p273, a rasterised "Your Sacred Rudraksh Guidance" page. p295 is the back cover (logo only). |
| Brand | "Astro Arun Pandit Private Limited". **Footer on every content page:** "Astrology • Numerology • Occult Guidance • Gemstone • Tarot Reading • Consultation / +91-9818999037, +91-8604802202 / www.astroarunpandit.org, support@astroarunpandit.org". The cover says "1 Lakh+ consultation done" and has a signature. Remedies are sold through Gemsmantra. This is a third-party brand. |
| Sample client (reference data, p8) | **PUNEET KUMAR**, Male, DOB **28/12/1983 (Wednesday)**, TOB **04:45:00**, **Bulandshahr, Uttar Pradesh, India**, Lat **28.406963**, Long **77.8498292**, Zone 82:30 E, Ishta 53:49:2.8 |

## 2. Section inventory

The table of contents (p5–7) lists 17 chapters. Within each chapter, "divider" means a title-only page with a gold icon on a rust background.

### Front matter (p1–9)
- p1 Cover
- p2 DISCLAIMER
- p3 MESSAGE FROM THE AUTHOR
- p4 BEST WAY TO STUDY THE REPORT
- p5–7 TABLE OF CONTENTS
- **p8 Basic details plus AVAKAHADA CHAKRA:**
  - Latitude, Longitude, Zone, Local Time Correction, War Time Correction, Local Mean Time, Equation of Time ⚠ shows "-384.01.05 Hour", which is a garbage value
  - Sidereal Time, Sunrise, Sunset, Day Duration, Sun Ayana, Sun Gola, Season, Sun Degree, Ascendant Degree, Moon Sign, Ascendant–Lord, Rasi–Lord, Nakshatra–Charan, Nakshatra Lord
  - Yoga, Karana, Gana, Yoni, Nadi, Varna, Vashya, Varga, Yunja, Hansak, Name Alphabet ("Po"), Paya (Rasi–Nak), Western Sun Sign
- **p9 PANCHANG:**
  - CALENDAR table: Samvat, month and tithi for National, Punjabi, Bengali, Tamil, Kerala, Nepali, Chaitradi and Kartakadi calendars.
  - PANCHANG: Tithi at sunrise, Tithi ending time, Tithi at birth, Nakshatra at sunrise, Nakshatra end time, Yoga at birth, Yoga at sunrise, Yoga end time, Karana at sunrise, Karana end time, Karana at birth, Bhayat, Bhabhog, Balance of Dasa ("Mars 4 Y 11 M 22 D").
  - **GHATAK** (inauspicious factors): Month, Tithi, Day, Nakshatra, Yoga, Karan, Prahar, Lagna, and the sign for each planet.

### 01 Understanding Your Planetary Blueprint (p10–29)
- p11 BIRTH CHARTS: **LAGNA CHART (D1)** and **MOON CHART (Chandra lagna)**
- p12 **NAVAMSHA CHART (D9)**
- p13 LAGNA CHARTS & DASHA: **South-Indian D1 and North-Indian D1** side by side, plus a Vimshottari MD list (⚠ "Sun 21/12/2085" is listed twice)
- p14 **PLANETARY DEGREES & THEIR POSITIONS** table
- p15–19 **SHODASHVARGA CHARTS**: 20 charts, each with a purpose caption
  - Sun Chart "For Self"; Moon Chart "For Aptitude and Liking"
  - D3 Dreshkana "For Coborns"; D4 Chaturthamsa "For Fortunes"
  - D5 Panchamsa "Knowledge & Intellect"; D6 Shastamsa "Enemies"
  - D7 Saptamsa "Children"; D8 Ashtamsa "Longevity"
  - D9 Navamsa "Spouse"; D10 Dasamamsa "Power & Position"
  - D11 Ekadasamsa "Gains & Profits"; D12 Dwadasamsa "Parents"
  - D16 Shodasamsa "Conveyance"; D20 Vimsamsa "Prayer & Worship"
  - D24 Chaturvimsamsa "Education & Study"; D27 Saptavimsamsa "Strength & Stamina"
  - D30 Trimsamsa "Evil Effects"; D40 Khavedamsa "Well Being"
  - D45 Akshavedamsa "All Positions"; D60 Shastiamsa "All Positions"
- p20 **SHODASHVARGA TABLES**: sign of Asc and 9 planets in 19 vargas
  - ⚠ The D6 row is labelled "Shashtiamsha".
  - ⚠ The **Panchamsa row is identical to the Trimsamsa row**. I spot-checked D30 for Asc, Sun and Moon and it is correct, so D5 is probably mis-mapped.
  - D60 has no table row.
- p22 **VIMSHOTTARI DASHA**: Mahadasha plus **Antardasha** grid for all 9 MDs, 1981–2101 (END dates; a disclaimer explains this)
- p23–28 **VIMSHOTTARI DASHA, SUB-SUB PERIOD**: **Pratyantar dasha** for every MD-AD pair across the full 120 years (about 80 blocks)
- p29 **Ashtakvarga Table**: BAV of 7 planets by sign (Aries…Pisces) plus Total (SAV). Has the "3Lakh+" banner.

### 02 The Influence of Your Birth Chart (p30–65)
1. **YOUR PANCHANG DECODED** (p30–31): Vaar (Wednesday); Tithi (Krishna Navami, with lucky days and tithis); Karana (Taitil); Nakshatra (Chitra); Yog (Atiganda)
2. **THREE PILLARS OF THE SELF: CHANDRA, LAGNA & NAKSHATRA** (p32–36): intro; MOON SIGN Virgo (4 paragraphs); ASCENDENT/LAGNA Scorpio (3 paragraphs); NAKSHATRA Chitra (general); NAKSHATRA pada 2 (p36)
3. **YOUR PERSONAL PLANETARY PROFILE** (p38–65): divider, then INTRODUCTION (p39). For each planet: **AS PER PLACEMENT** (sign plus house) and **AS PER ASPECT** (one sub-block per aspect, about 1 page each):
   - SUN (p40–41; 7th aspect)
   - MOON (p42–43; 7th)
   - MERCURY (p44–45; 7th)
   - VENUS (p46–47; 7th)
   - MARS (p48–50; 8th, 4th, 7th)
   - JUPITER (p51–53; 7th, 9th, 5th)
   - SATURN (p54–56; 7th, 3rd, 10th)
   - RAHU (p57–59; 5th, 9th, 7th)
   - KETU (p60–62; 7th, 9th, 5th)
   - **URANUS** (p63), **PLUTO** (p64), **NEPTUNE** (p65): placement only, house-keyed, with Vedic deity mapping (Uranus = Arun Dev, Pluto = Yama/Shiva, Neptune = Varuna)

### 03 Bhavphal: Your Life Through the 12 Houses (p67–93)
- Divider (p67); INTRODUCTION (p68).
- **BHAV PHAL: SIGNIFICATORS OF EACH BHAV** table (p69).
- For each **HOUSE I–XII** there is one page with the house name in Sanskrit, **Attributes** (5 bullets), and a themed sign paragraph. The themes are: Persona Portal; The Treasure Vault; The Communication Bridge; The Emotional Sanctuary; The Creative Playground; The Healing Chamber; The Partnership Gateway; The Transformation Tunnel; The Wisdom Tower; The Achievement Summit; The Friendship Circle; The Mystical Void.
- This is followed by **PLACEMENT OF HOUSE LORD** (house-lord-in-house paragraph, 3–4 paragraphs). In total that is 24 pages, p70–93.
- ⚠ **p91 (11th lord) is in Hindi and says "11th lord in 1st house"**, but Mercury, the 11th lord, is in the 2nd.

### 04 When Energies Merge: Planetary Conjunctions (p95–100)
- Divider; INTRODUCTION.
- One page per conjunction group, each with HOUSE PLACEMENT and DEGREE OF CONJUNCT PLANETS: Moon & Mars (11th: 27°, 28°); Sun & Mercury & Jupiter (2nd); Venus & Ketu (1st).
- Uranus, Neptune and Pluto are excluded from conjunctions.

### 05 Astrological Snapshot: Love & Marriage (p101–105)
- "Love isn't just in the air…"; **WHAT IGNITES YOUR HEART?** (5th-house sign → "The Dreamy yet Intense Lover", combined with the lagna).
- **THE ONE MEANT FOR YOU: YOUR DARAKARAKA & SOULMATE CONNECTION** (DK Jupiter in the 2nd), with these sub-heads: Personality Traits of Your Spouse; What Kind of Partners Will You Be Attracted To?; Where Are You Likely to Meet Your Partner?; Things to Be Mindful Of; How Your Marriage Will Evolve Over Time; Remedies for a Harmonious Love and Married Life.
- **THE PERFECT TIME TO TIE THE KNOT** table (p105).

### 06 Your Career Calling Written in the Stars (p106–109)
- **SUNLIT PATHS** (Sun-based career).
- **SATURN'S STRATEGY…UNLOCKING YOUR CAREER PATH!**
- **DESTINY DECODED: YOUR BIRTH MAHADASHA & CAREER CALLING** ("The Fearless Achiever", Mars).
- **HOW YOUR AMATYAKARAKA SHAPES YOUR CAREER?** ("The Emotional Anchor", Moon).

### 07 Chara Karakas: The Planets Behind Your Purpose (p111–120)
- p112 has an explanatory table: Karaka | What it Represents | How to Find | What It Reveals.
- Then one block per karaka (7-karaka scheme), each with 4–6 themed sub-heads:
  - **ATMA KARAKA** Mars: The Group Activator; Books That Will Help You Grow; Daily Practices; Fasts, Temples & Remedies
  - **AMATYA KARAKA** Moon: Career & Professional Life; Wealth & Financial Stability
  - **BHRATRIKARAKA** Saturn: The Light That Guides You; Ideal Professions; Knowledge You Should Acquire; Remedies
  - **MATRU KARAKA** Mercury: How You Feel; Your Personal Battles; Growing Into Your Strength; Simple Steps Forward
  - **PUTRA KARAKA** Sun: What This Says About Your Parenting Style; How You Choose; Growth Path; Moving Forward
  - **GNATI KARAKA** Venus: Your Main Life Challenges; Relationship With Teachers; How You Create and Leave Your Mark; Simple Steps
  - **DARA KARAKA** Jupiter: Your Way of Handling Problems; Repeated Patterns You Can Break; Simple Daily Tips; How You Will Connect in Marriage; Money Matters in Your Marriage; Simple Steps for a Better Relationship
- The ⚠ title is misspelled "CHAKRA KARAKAS" on p112.

### 08 Rahu-Ketu Analysis: The Karmic Push and Pull (p121–126)
- **RAHU** (7th house, Taurus): The Hidden Pattern of This Placement; How This Placement Shapes Your Marriage; Your Unusual Approach to Business Deals; The Hidden Skill You Haven't Tapped Into; The Unexpected Life Lesson; The Secret Invitation from Life.
- **KETU** (1st house, Scorpio): The Invisible Theme; How This Placement Affects Your Aura; The Unusual Way You Approach This House's Themes; The Silent Superpower; The Most Unconventional Life Lesson; The "Hidden Invitation" from the Universe.
- **CONCLUSION**.

### 09 Born with Fire: Understanding the Mangalik Effect (p128–132)
- "CONGRATULATIONS! YOU ARE A MANGLIK!"; What is Mangalik Dosh?; When are you considered to be a Mangalik? (Mars in houses 1, 4, 7, 8 or 12).
- **Anshik Manglik Dosha** (partial).
- "Mars in 1st House in Virgo – The Perfectionist Warrior": Your Personality & Behavior; Your Marriage & Relationships; Your Career & Professional Life; Your Health & Physical Energy; Your Social & Family Life.
- ⚠ Mars is in the 11th from the lagna. The "1st house in Virgo" is **from the Moon** (Mars is conjunct the Moon), so the dosha is evaluated from the Chandra lagna and labelled "Anshik". The report never says this.
- ⚠ Chapter 12 then says "YOU HAVE NO DOSH PRESENT", which contradicts this chapter.

### 10 Your Sade Sati Journey: Challenge to Transformation (p133–152)
1. Importance in Vedic Astrology; Duration & Brief Understanding; Moon and Saturn (generic, then Virgo-specific with 5 bullets)
2. **CYCLES OF SADE SATI** table (p136)
3. **THREE PHASES OF SADE SATI** for a Virgo Moon (p137–140), covering Rising (Leo), Peak (Virgo) and Setting (Libra). Each phase has: Emotional & Psychological Shift; What's Under Saturn's Radar?; Body Part on Alert; Saturn Retrograde Impact; Lesson.
4. **PHASES OF EACH SADE SATI** (p141–149): 9 pages, one per cycle × phase, each with dates and about 220 words
5. CONCLUSION
6. **REMEDIES OF SADE SATI** (p150–152):
   - Rudraksha: 7, 14 and 17 Mukhi.
   - Daily Practices: 5 items.
   - Mantra Chanting: Shani Gayatri, with Devanagari shloka and pronunciation.
   - Each remedy page repeats the "focus on 2–3" disclaimer.

### 11 Raj Yogas: The Combinations of Fame & Fortune (p153–156)
- "IT'S TIME TO CELEBRATE AS YOU HAVE 7 RAJ YOGAS!"
- **Budh-Aditya, Pushkal, Saraswati, Laxmi Narayan, Gajkesri, Rajlakshman, Vaasi**: one generic paragraph each (about 100 words).

### 12 Astrological Doshas: Karmic Blocks & Planetary Lessons (p157–158)
- Intro, then "CONGRATULATIONS!! YOU HAVE NO DOSH PRESENT IN YOUR CHART!". The no-dosha variant is a single line.

### 13 When Planets Lead: A Journey Through Your Mahadashas (p160–263)
1. **Overview** (p161–166): all 9 MDs (Mars → Moon) with Time Frame and a house-of-MD-lord paragraph plus 6 bold-labelled themes. The first MD starts at the DOB.
2. For each MD, an **MD intro page** (about 370–430 words): "<Planet> Mahadasha: Your Time of…"; What You'll Experience (5 labelled paragraphs); **What NOT to Do** (7 bullets); closing. These are on pp. 168, 177, 188, 199, 210, 221, 232, 243, 254.
3. Each MD intro is followed by **ANTARDASHA PHAL: WHAT'S HAPPENING UNDERNEATH**: one page per AD with Time Frame, approximate duration and 4 paragraphs (theme / opportunity / watch-out / key). The number of ADs per MD:
   - Mars: 7 (from the birth AD Mars-Jupiter)
   - Rahu, Jupiter, Saturn, Mercury, Ketu, Venus, Sun, Moon: 9 each
   - That gives **79 AD pages**.
4. Divider pages separate the MDs.

### 14 Numerology: Digits of Divinity (p265–268)
- **MULANK** (1), **BHAGYANK** (Life Path 7), **SUCCESS NUMBER** (4), **CONNECTION NUMBER** (6). The last two each have the sub-heads Best Career Paths & Business Potential; Leadership, Creativity & Financial Growth; Personal Development.
- ⚠ The formulas for the Success and Connection numbers are not stated.

### 15 When the Soul Blooms: Charting Your Spiritual Potential (p269–270)
- YOUR SPIRITUAL GROWTH, with 5 practices: Vidya Aradhana; Panchagavya Purification; Dattatreya Worship; Sesame Oil Lamp; Aditya Hridayam.
- ⚠ The footer text overlaps the body on p270.

### 16 Remedies to Strengthen Your Chart (p271–291)
1. INTRODUCTION (p272)
2. **Your Sacred Rudraksh Guidance** (p273–277):
   - "based on your Janm Nakshatra": **3 Mukhi** (Mars/Chitra), plus **6 Mukhi** and **13 Mukhi** (Venus).
   - The Right Way to Wear & Maintain; Sacred Rituals (8 steps); Where to Find Authentic (Gemsmantra); How to Check Authenticity; Disclaimer.
3. **Gemstone to Empower Your Planetary Energies** (p279–284):
   - Warning; The Hidden Gem; Your Perfect Gemstone.
   - **Red Coral** (Mars, lagna lord), **Pearl** (Moon, 9th lord), **Yellow Sapphire** (Jupiter, 5th lord). These are the **trikona lords**. Each has Ruling Planet/Deity, Career Power, Health Boost and Love & Relationships.
   - **How to Wear Your Gemstone** table (p283).
   - Gemstone Dupes; **Wrist Wonders: Birth-Bracelets** (Mulank/Bhagyank-based: Sun Stone, Kambaba Jasper).
   - Disclaimer.
4. **MANTRA CHANTING RECOMMENDATIONS**: Beej Mantra "as per planet" (Jupiter: Om Graam Greem Graum Sah Gurave Namah). **ISHTDEV**: Lord Vishnu and Lord Dattatreya, with mantras (p285). ⚠ The Ishtdev derivation rule is not stated.
5. **YANTRA FOR BALANCING YOUR ENERGIES**: the heading says "Mahamrityunjay Yantra", ⚠ but the body describes the **Chandra Yantra**. Do's (p288) and Don'ts (p289).
6. **PURIFY, UPLIFT, TRANSFORM – THROUGH DONATIONS**: only **MERCURY** (likely the most afflicted planet: retrograde and combust), with 4 donation items. CONCLUSION (p292).

### 17 Charted by Stars, Powered by You! (p293–295)
- p293 "YOU NOW HOLD YOUR COSMIC BLUEPRINT": Gemsmantra plug, consultation and pooja CTAs, "3Lakh+" banner.
- p294 conclusion.
- p295 back cover with logo.

**Count:** 17 chapters plus front matter, about **330 headed topics**. Most of them are the 79 AD pages, 12 houses × 2, 12 planets × aspects, and 20 vargas.

## 3. Tables, charts, visuals

- **Charts:**
  - **North Indian (diamond) D1** (p11, with degrees as subscripts, including Ur/Ne/Pl), **Moon chart** (p11), **D9** (p12).
  - **South Indian (4×4 fixed-sign grid) D1** (p13, abbreviations only) next to the North Indian D1.
  - 20 small **North Indian varga charts** (p15–19).
  - Chart style: cream lines on a rust/brown gradient square with rounded ornamental corners. On the dark charts, the houses are drawn as curved (lotus/"petal") diamonds.
- **Tables:**
  - p8 birth/avakahada (2 × 2-column key–value)
  - p9 calendar, panchang and ghatak
  - p13 MD list
  - **p14 planetary table**, columns: Pl, R (retro), C (combust), Rasi, Degree (decimal), Speed, Nak, Pad, No. (sign number), RL (rasi lord), NL (nak lord), Sub, Dignity
    - ⚠ The Sub column is "Jup" in every row and Dignity is "--" in every row. These are placeholder bugs.
    - Legend: R = Retrograde | S = Stationary | C = Combust | D = Deep Combust.
  - p20 varga table (19 rows × Asc + 9 planets)
  - p22 MD/AD grid
  - p23–28 pratyantar grids
  - p29 ashtakavarga BAV/SAV
  - p69 bhav significators (House | Traditional Meaning | "Learn it with Ease" nickname)
  - p105 marriage timing (Start | End | Chances: Very Good/Good/Excellent)
  - p112 chara karaka explainer
  - p136 sade sati cycles (Phase | Saturn Rashi | Start | End × 3 cycles)
  - p283 gemstone wearing (Ascendant | Primary Gemstone | Best Day | Time (Muhurta/Hora) | Finger | Metal | Why this Finger)
- **Other visuals:**
  - About 20 AI-generated full-page cosmic/deity artworks: planets, galaxies, Vishnu on Shesha, Shiva meditating, a chakra figure.
  - Rust-brown chapter divider pages with gold line-art (hands, sun, Om/Rahu glyphs, mandalas).
  - Planet medallion images (Sun deity, Moon/Mars spheres).
  - Rudraksha and gemstone photos, yantra image.
  - The "3Lakh+ People saw positive change…" banner with the astrologer's photo (pp. 12, 29, 293).
  - Cover: zodiac wheel plus a North-Indian chart graphic with house significations, a "53 साल का भरोसा" laurel badge and a "1 Lakh+ Consultation Done" badge.

## 4. Required astrological data (precise)

- **Birth computation:** lat/long geocoding; timezone; LMT; sidereal time; sunrise/sunset; ayanamsa (not stated; values match Lahiri: Sun 12°00' Sag on 28 Dec 1983); ascendant degree.
- **Planets:** 9 grahas plus **Uranus, Neptune, Pluto**: sign, decimal degree, **speed**, retrograde, combust, nakshatra, pada, sign lord, nakshatra lord, KP sub-lord (column present but broken), dignity (column present but empty). Rahu and Ketu are marked R (mean or true node: not stated).
- **Panchang:** Vaar, tithi (at sunrise, at birth, end time), nakshatra (at sunrise, end time), yoga, karana, paksha, Bhayat/Bhabhog, ayana, gola, ritu, Samvat and month in 8 regional calendars, Ghatak chakra.
- **Avakahada:** Gana, Yoni, Nadi, Varna, Vashya, Varga, Yunja, Hansak, Paya, Name syllable.
- **Charts:** D1 (North and South), Moon chart, **D9** and **all vargas D3–D60** including the non-Parashari-16 D5, D6, D8 and D11. Varga signs of Asc and 9 planets.
- **Aspects:** full 7th aspect plus special aspects: Mars 4/8, Jupiter 5/9, Saturn 3/10, **Rahu/Ketu 5/7/9**.
- **Houses:** sign of each of the 12 houses; house-lord placement for all 12.
- **Conjunctions:** planets sharing a house, with degrees.
- **Jaimini:** **7 Chara Karakas** (AK Mars 28.86°, AmK Moon 27.18°, BK Saturn 19.96°, MK Mercury 19.66°, PK Sun 12.01°, GK Venus 1.44°, DK Jupiter 1.38°), each with house placement.
- **Vimshottari:** balance at birth; **MD, AD and Pratyantar (PD)** tables for 120 years. Interpretations are given at **MD level** (house of the MD lord plus a generic planet profile) and **AD level** (generic per MD-AD pair, personalised only by dates).
- **Doshas:** Mangal dosha (from Lagna and Moon; full or Anshik); a generic dosha engine (only the "none" output is seen; types not enumerated).
- **Yogas:** 7 listed (Budh-Aditya, Pushkal, Saraswati, Laxmi Narayan, Gajakesari, Rajlakshman, Vaasi). The evaluation rules are not stated.
- **Ashtakavarga:** BAV of 7 planets plus SAV. Table only, with no interpretation.
- **Transits:** Sade Sati cycles (Saturn transiting the 12th, 1st and 2nd from the Moon; 3 cycles; single contiguous dates with no retrograde re-entries).
  - ⚠ Saturn was in Libra (2nd from the Moon) at birth, so a sade sati phase was running at birth. The report omits it.
- **Marriage timing:** Jupiter-transit windows (same windows as the Love report, different grades).
- **Numerology:** Mulank (day), Bhagyank (full date), Success number and Connection number (formulas unknown).
- **Remedies:** Rudraksha by nakshatra lord (plus Venus beads, rule unknown); gemstones = trikona lords (1, 5, 9) for the lagna; Beej mantra (Jupiter: rule unknown); Ishtdev (rule unknown; classically the 12th from Karakamsha in D9); Yantra; donations for one afflicted planet.
- **Not used:** Shadbala/Bhava-bala, KP significators (beyond the broken sub column), Yogini/Char dasha, transits other than Saturn and Jupiter.

## 5. Content depth

| Chapter | Pages | Words (footers stripped) |
|---|---|---|
| Front matter (incl. avakahada and panchang) | 1–9 | 1,320 |
| 01 Blueprint (charts and tables) | 10–29 | 3,840 (mostly table data) |
| 02 Panchang, Pillars, Planet profile | 30–65 | 5,400 |
| 03 Bhav Phal | 67–93 | 4,290 |
| 04 Conjunctions | 95–100 | 600 |
| 05 Love & Marriage | 101–105 | 1,070 |
| 06 Career | 106–109 | 1,060 |
| 07 Chara Karakas | 111–120 | 3,260 |
| 08 Rahu-Ketu | 121–126 | 980 |
| 09 Mangalik | 128–132 | 840 |
| 10 Sade Sati | 133–152 | 3,770 |
| 11 Raj Yogas | 153–156 | 800 |
| 12 Doshas | 157–158 | 120 |
| 13 Mahadashas | 160–263 | **20,200 (about 40% of the report)** |
| 14 Numerology | 265–268 | 810 |
| 15 Spiritual | 269–270 | 450 |
| 16 Remedies | 271–292 | 3,670 |
| 17 Closing | 293–295 | 310 |

- Typical topic: one page of 150–250 words in 2–4 paragraphs (planet-by-placement, bhav, karaka, AD). Big items (MD intro, Chara karaka, Sade Sati phase) run 350–450 words.
- Proportions:
  - Computed data and tables: about **10%** (pp. 8–29, plus the dates scattered through the report).
  - Placement-selected lookup text (sign/house/nakshatra/karaka keyed): about **40%**.
  - Generic per-planet or static text (AD pair texts, MD intros, sade sati phases for the Moon sign, yogas, remedies how-to, chapter intros): about **50%**.
- Voice: very casual, "Gen-Z" ("Small talk? Snooze.", "mastermind", "cosmic cheat codes", "Your podcast gets meaningful engagement"), second person, frequent rhetorical questions.
- Excerpts:
  - p40: "With Sun in Sagittarius in the 2nd house, your finances are tied to freedom, adventure, and knowledge… Stability? Not your thing—you believe in abundance but may struggle with consistency."
  - p169: "During Mars-Jupiter Antardasha (about 11 months), your energy gains wisdom that could power a spiritual revolution. It's like your inner warrior enrolled in philosophy school…"
  - p30: "Born on a Wednesday! You're a walking genius. You don't just talk, you captivate. Ruled by Mercury, you're quick-witted, sharp, and always ten steps ahead."

## 6. Boilerplate and unique content

- **Shared with Career/Love:**
  - Disclaimer → Author message → Best way to study (product name swapped).
  - TOC.
  - 3Lakh+ banner.
  - Gemsmantra plug and consultation/pooja CTAs (p293 is the same wording as Love p22).
  - Remedy disclaimers ("1–2" here, "2–3" in Career and Sade Sati).
  - Darakaraka text (Love p14–15).
  - Marriage-timing windows (Love p20).
  - Ashtakavarga table (Career p101).
  - Amatyakaraka, Birth-MD career archetype and Sun/Saturn career (Career S4–S7).
  - Mulank/Bhagyank (Love p7 and p16).
  - Mantra 1,25,000 repetitions (Career p117).
- **Unique to Kundli:**
  - Avakahada/Panchang/Ghatak.
  - Shodashvarga set.
  - Full PD dasha tables.
  - Panchang decoded.
  - Three Pillars.
  - Per-planet aspect profile including the outer planets.
  - Bhav Phal × 12.
  - Conjunctions.
  - 7 Chara karakas.
  - Rahu-Ketu.
  - Mangalik.
  - Sade Sati.
  - Raj Yogas and doshas.
  - MD/AD phal for life.
  - Success and Connection numbers.
  - Spiritual growth.
  - Ishtdev, Yantra, donations.

## 7. Visual identity

- Two alternating page treatments:
  - (a) **Cream/ivory content pages** (about #FBF4E8) with a thin rust double-line border with notched corners.
  - (b) **Deep rust/terracotta gradient pages** (about #8E3B17 → #B4542A) used for chapter dividers and some content (planet profile, conjunctions, love, marriage table). These have a **gold** line frame and gold line-art icons.
- Headings: **Yeseva One**, dark rust/brown, uppercase. Some divider titles are gold on rust. Body: **Merriweather Light**, about 10 pt, justified, dark brown.
- Footer on every content page (4 lines, centred, rust): company name, services list, phones, web and email. **No page numbers. No running header.**
- Cover: parchment texture, bold red/maroon "PREMIUM PERSONALIZED KUNDLI" in a heavy sans display, a zodiac wheel with orange animals, the Astro Arun Pandit Om logo in a maroon oval, trust badges, signature.
- Back cover: dark gradient with a gold logo.
