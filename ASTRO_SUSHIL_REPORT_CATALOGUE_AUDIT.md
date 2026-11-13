# ASTRO SUSHIL — REPORT CATALOGUE AUDIT

**Document Version:** 1.0.0  
**Audit Date:** November 5, 2026  
**Auditor:** DeepMind Agentic Coding Engineering Pair  
**Authorization Mode:** READ-ONLY SPECIFICATION AUDIT  
**Source of Truth:** 13 Reference PDF Reports located at `docs/reference repots/`  

---

## 1. Executive Summary & Catalogue Discrepancy Matrix

The Astro Sushil commercial report suite has been audited by directly extracting text, metadata, page hierarchies, table of contents, and disclaimers from the 13 reference PDFs committed to `docs/reference repots/`.

### Critical Finding: Implementation vs Reference Gap
| Reference PDF File | Actual Reference Pages | Product Type / Category | Current Status in Database / Catalog | Current Engine Generator | Gap / Divergence Summary |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1. Premium Personalised Kundli Report.pdf** | 295 pages | Vedic Life Dossier | Exists as `KUNDLI` (`report-kundli`, ₹299) | `generateKundliReport` (3 pages) | **Severe 292-page deficit**. 3-page toy summary vs 295-page multi-divisional life blueprint. Missing 12 Bhavphal chapters, conjunctions, full Shodashvargas, Dasha timelines. |
| **2. Career Report.pdf** | 138 pages | Vedic Vocational | Exists as `CAREER` (`report-career`, ₹499) | `careerReportService` + LaTeX (100–120 pages) | **Closest to reference**. LaTeX pipeline operational. Requires tuning of layperson prose, author message, and Whole Sign alignment. |
| **3. Couple Kundli Matching Report.pdf** | 96 pages | Synastry / Milan | Exists as `MARRIAGE_COMPATIBILITY` (`report-marriage`, ₹499) | `generateMatchmakingReport` (4 pages) | **Severe 92-page deficit**. 4-page summary vs 96-page comprehensive couples reading with dual-chart breakdowns, dasha coordination, and compatibility life areas. |
| **4. Personalised Fortune Report Plus.pdf** | 139 pages | Numerology & Life | Completely Missing from Schema & Catalog | **None (0 pages)** | **Completely unimplemented**. Comprehensive English numerology dossier (Mulank, Bhagyank, Lo Shu Fortune Grid, Career options, Health, Feng Shui). |
| **5. Fortune Report.pdf** | 112 pages | Hindi Numerology | Completely Missing from Schema & Catalog | **None (0 pages)** | **Completely unimplemented**. Complete Hindi edition of the Fortune Numerology Report. |
| **6. Varshphal Report.pdf** | 97 pages | Annual Tajika Solar Return | Completely Missing from Schema & Catalog | **None (0 pages)** | **Completely unimplemented**. Tajika annual chart, Muntha, Varsheshwara, Sahams, Mudda Dasha, and 12-month month-wise forecasts. |
| **7. Rahu Ketu Transit Report.pdf** | 90 pages | Nodal Cycle Analysis | Completely Missing from Schema & Catalog | **None (0 pages)** | **Completely unimplemented**. 18-month nodal transit analysis through signs and natal houses, karmic patterns, psychological tendencies. |
| **8. Saturn In Your Birth Chart Report.pdf** | 87 pages | Karma & Saturn Transits | Completely Missing from Schema & Catalog | **None (0 pages)** | **Completely unimplemented**. Natal Saturn, Gochara transits across houses, neutral astronomical analysis of Saturn relative to Moon, breakthrough timelines. |
| **9. Jupiter Transit Report.pdf** | 79 pages | Guru Gochara Transit | Completely Missing from Schema & Catalog | **None (0 pages)** | **Completely unimplemented**. 1-year Jupiter transit analysis through 12 houses from Moon/Lagna, career, spiritual growth, and prosperity timings. |
| **10. Personalised Horoscope Report.pdf** | 70 pages | Annual Transit Forecast | Exists as `CAREER_PROSITY` / `PLANETARY_SUMMARY` | `generateProHoroscopeReport` (4 pages) | **Severe 66-page deficit**. 4-page summary vs 70-page annual sign horoscope with monthly and quarterly breakdowns. |
| **11. Finance Report.pdf** | 32 pages | Dhana & Wealth Analysis | Completely Missing from Schema & Catalog | **None (0 pages)** | **Completely unimplemented**. 2nd, 11th, and 12th house wealth dynamics, Jupiter/Venus prosperity combinations, financial timing. |
| **12. Love Report.pdf** | 23 pages | Romance & Emotional Needs | Completely Missing from Schema & Catalog | **None (0 pages)** | **Completely unimplemented**. 5th and 7th house relationship psychology, Venus dynamics, romantic milestones, timing of partnership. |
| **13. Baby Name Report.pdf** | 15 pages | Child Numerology | Completely Missing from Schema & Catalog | **None (0 pages)** | **Completely unimplemented**. Child birth date numerology, Moon nakshatra syllable selection, auspicious letter vibrations, name meanings. |

---

## 2. Product-by-Product Detailed Audit

---

### Product 1: Premium Personalised Kundli Report (Reference: 295 Pages)

- **Exact Product Title:** `Premium Personalised Kundli Report`
- **Reference Document Metadata:** Title: `Premium Personalised Kundli_eng`, 295 pages.
- **Author Branding & Voice:** Astro Sushil / Sushil Kumar. Warm, empowering, spiritually grounded, non-fatalistic Vedic wisdom.
- **Dedicated Message from Author:**
  > "Welcome to Your Premium Personalised Kundli. Throughout my journey in the realm of astrology, I’ve had the privilege of helping individuals navigate life’s path with greater clarity and alignment. Each person’s journey is unique, but the quest for balance, success, and inner peace connects us all. This Kundli is not a deterministic script of unavoidable fate, but a cosmic compass—a tool designed to help you understand your strengths, navigate your challenges, and step into your highest potential."
- **Authoritative Disclaimer:**
  > "This Premium Personalised Kundli is crafted using the timeless wisdom of Vedic astrology, offering insights into how cosmic energies influence your life. Every recommendation is based on precise astrological calculations—no personal opinions, just cosmic alignment! Astrology is an interpretative science that provides guidance rather than fixed predictions. Remedies (gemstones, mantras, spiritual disciplines) complement but do not replace practical life decisions, medical advice, financial planning, or legal counsel. Results vary; the author bears no liability for decisions made based on this report."
- **Required Personalised Inputs:**
  - Full Name, Gender, Date of Birth, Exact Time of Birth, Place of Birth (City/Country), Resolved Timezone (IANA).
- **Calculation Engine Dependencies:**
  - `astronomy-engine` v2.1.19 (VSOP87/ELP2000-82), Sidereal Lahiri Ayanamsa, Whole Sign / Sripati Bhavas.
  - Planetary coordinates (Sun through Ketu), Ascendant, Panchang (Tithi, Vara, Nakshatra, Yoga, Karana).
  - Shodashvargas (16 divisional charts: D1, D2, D3, D4, D7, D9, D10, D12, D16, D20, D24, D27, D30, D40, D45, D60).
  - Vimshottari Dasha system (complete hierarchy: Mahadasha, Antardasha, Pratyantardasha).
  - Ashtakvarga (Bhinnashtakavarga for 7 classical planets and Sarvashtakavarga 337 points).
- **Table of Contents & Section Hierarchy:**
  - **Part 01: Understanding Your Planetary Blueprint** (Fundamental Details, Lagna, Moon & Navamsha Charts, Panchang Snapshot, Planetary Degrees & Positions Table, Shodashvarga Charts, Ashtakvarga Tables).
  - **Part 02: The Influence of Your Birth Chart** (Panchang Decoded, Three Pillars of the Self: Lagna, Chandra & Nakshatra, Personal Planetary Profiles for each planet, House Influences and Planetary Aspects).
  - **Part 03: Bhavphal — Your Life Through the 12 Houses** (Significance of each Bhava, detailed house-by-house analysis of Personality, Wealth, Siblings, Home/Mother, Intellect/Children, Work/Health, Marriage/Partnership, Transformation, Dharma/Fortune, Career/Status, Gains/Network, Subconscious/Spirituality).
  - **Part 04: When Energies Merge — Planetary Conjunctions & Yogas** (Major Dhana Yogas, Raja Yogas, and planetary combinations present in the chart).
  - **Part 05: The Flow of Time — Vimshottari Dasha Journey** (Major planetary periods, current dasha analysis, upcoming sub-period guidance).
  - **Part 06: Gochara — Planetary Transits & Life Dynamics** (Current and upcoming transits of Jupiter, Saturn, Rahu, and Ketu).
  - **Part 07: Core Life Domains Breakdown** (Career & Calling, Wealth & Financial Security, Love & Relationships, Vitality & Wellness).
  - **Part 08: Harmonizing Cosmic Energies** (Astronomical Gemstone recommendations with finger, metal, day/hora, and wearing guidelines; Lifestyle disciplines; Meditation and Mantra suggestions).
- **Layperson Concept Explanations Required:**
  - Explain *Lagna* (Ascendant) as the personal viewpoint/lens and vitality of the individual, not mystical jargon.
  - Explain *Nakshatra* as the nuanced mental temperament and subtle nature of the Moon.
  - Explain *Dasha* as the changing seasons of life, where different planetary themes take center stage.
  - Explain *Ashtakvarga* as an objective score of environmental support and energy flow.
- **Prohibited & Outdated Content to Eliminate:**
  - **DO NOT** include *Kaal Sarp Dosha*, *Pitra Dosha*, *Kemdrum Dosha*, or curse narratives.
  - **DO NOT** classify Manglik as an affliction or curse. Present Mars in houses (1, 4, 7, 8, 12) neutrally as high emotional energy, drive, and assertiveness in interpersonal relationships.
  - **DO NOT** sell *Prana Pratishtha* rituals, commercial energized items, or fear-based pujas.

---

### Product 2: Career Report (Reference: 138 Pages)

- **Exact Product Title:** `Career & Professional Life Dossier`
- **Reference Document Metadata:** Title: `Career Report Puneet Kumar`, 138 pages.
- **Author Branding & Voice:** Authoritative career strategist, encouraging, practical, corporate/entrepreneurial grounded.
- **Dedicated Message from Author:**
  > "Welcome to Your Personalized Career Report! Throughout my journey as an astrologer, I’ve had the privilege of guiding individuals in uncovering their professional potential through the wisdom of Vedic astrology. No two career paths are the same, yet the quest for success, stability, and fulfillment connects us all. This report is designed as a strategic roadmap—bridging your innate strengths with celestial timelines to navigate career choices, leadership inflection points, and professional growth."
- **Authoritative Disclaimer:**
  > "This report is based entirely on Vedic astrological calculations and interpretations, offering guidance on your professional journey without personal bias. Astrology provides guidance rather than fixed predictions, serving as a navigational tool for your career path. Astrological remedies complement, but do not replace, professional career counseling, medical advice, financial planning, or legal counsel. Approach this report with an open mind and proactive spirit: while astrology provides a roadmap, you ultimately hold the power to shape your career and destiny!"
- **Required Personalised Inputs:**
  - Full Name, Gender, Date of Birth, Exact Time of Birth, Place of Birth, Timezone, Career Aspirations/Field (optional).
- **Calculation Engine Dependencies:**
  - Lagna (D1) Ascendant, 10th House (Karma Bhava), 10th Lord placement, 6th House (Service/Competition), 7th House (Business/Partnership), 11th House (Income/Gains), 2nd House (Accumulated Wealth).
  - D-10 Dasamsa Divisional Chart (crucial for vocation and professional status).
  - D-9 Navamsha Chart (planetary dignity and sustained strength).
  - Saturn (Karma Karaka) and Jupiter (Jeeva Karaka / Expansion) placements and transits.
  - Vimshottari Dasha periods governing professional timelines.
- **Table of Contents & Section Hierarchy:**
  - **Chapter 1: Embarking on Your Career Quest** (Philosophy, How to Read the Report).
  - **Chapter 2: The Bridge Between Destiny and Desire** (Vedic Charts: Lagna D1, Moon, Navamsha D9, Dasamsa D10).
  - **Chapter 3: Mysteries of Lagna & Ascendant Secrets** (The guiding star of your career personality).
  - **Chapter 4: The Four Pillars of Vocational Success** (10th House Treasures: Growth & Status; 6th House: Employment & Problem Solving; 7th House: Business & Partnerships; 11th House: Financial Gains & Professional Network; 2nd House: Wealth Accumulation).
  - **Chapter 5: Magical Career Yogas** (Planetary combinations for authority, entrepreneurship, and specialized skills).
  - **Chapter 6: The Dasha Gateway** (Detailed career roadmap across current Mahadasha and Antardasha periods).
  - **Chapter 7: Planetary Influences on Career** (Sun: Leadership & Public Standing; Moon: Workplace Adaptability; Mars: Drive & Execution; Mercury: Communication & Analytical Skill; Jupiter: Wisdom & Expansion; Venus: Creativity & Client Relations; Saturn: Discipline & Long-term Mastery; Rahu/Ketu: Technological Aptitude & Breakthrough Windows).
  - **Chapter 8: Ashtakvarga in Professional Life** (SAV point distribution across work houses).
  - **Chapter 9: Strategic Career Remedies & Astronomical Gemstones** (Optimal work habits, timing for job transitions, neutral gemstone analysis).
- **Layperson Concept Explanations Required:**
  - Explain the 10th house simply as "Your Public Impact and Professional Legacy".
  - Explain D10 Dasamsa as "A High-Magnification Lens on Your Daily Work Style".
  - Explain Saturn not as a punisher, but as the "Architect of Professional Resilience".
- **Prohibited & Outdated Content to Eliminate:**
  - Eliminate all mentions of *Pitra Dosh* or career curses.
  - Never predict involuntary unemployment or permanent financial failure.

---

### Product 3: Couple Kundli Matching Report (Reference: 96 Pages)

- **Exact Product Title:** `Couple Kundli Matching & Relationship Compatibility Report`
- **Reference Document Metadata:** 96 pages.
- **Author Branding & Voice:** Compassionate counselor, relationship-building, non-judgmental, emphasizing mutual respect and communication.
- **Dedicated Message from Author:**
  > "Welcome to Your Couple Kundli Matching Report. Marriage is a sacred union of two distinct souls, journeys, and temperaments. Vedic compatibility analysis is not a binary verdict of approval or disapproval, nor should it ever be used to breed fear or mistrust. Instead, it offers profound insights into how your emotional rhythms, intellectual drives, and communication styles complement each other. Use this report as a compass for understanding, empathy, and conscious partnership."
- **Authoritative Disclaimer:**
  > "This report is based on Vedic astrological principles and comparative synastry calculations. Kundli Milan provides insights into energetic harmony, emotional alignment, and shared life goals. Astrological compatibility is a supportive guide, not a guarantee of marital bliss or a substitute for mutual commitment, love, and professional counseling. Results are unique to every couple; the author disclaims any liability for relationship decisions made based on this analysis."
- **Required Personalised Inputs:**
  - Partner A (Name, Gender, DOB, TOB, POB, Timezone).
  - Partner B (Name, Gender, DOB, TOB, POB, Timezone).
- **Calculation Engine Dependencies:**
  - Ashtakoota Guna Milan (36-point system: Varna 1, Vashya 2, Tara 3, Yoni 4, Graha Maitri 5, Gana 6, Bhakoot 7, Nadi 8).
  - Dashakoota extended scoring where applicable.
  - Comparative Lagna, Moon, Venus, and Mars positions for both partners.
  - 7th House (Partnership) and 7th Lord analysis in both D1 and D9 charts.
  - Dual-dasha timeline coordination (identifying overlapping harmonious vs stressful life periods).
- **Table of Contents & Section Hierarchy:**
  - **Section 01: Couple Profile & Planetary Blueprints** (Both birth charts, Moon signs, Nakshatra details).
  - **Section 02: The Ashtakoota 36-Guna Evaluation** (Detailed breakdown of all 8 Kootas with score, meaning, and practical implications).
  - **Section 03: Emotional Rhythms & Moon Sign Harmony** (Graha Maitri & Bhakoot decoded for daily emotional connection).
  - **Section 04: Communication, Temperament & Lifestyle Alignment** (Gana & Yoni analysis: navigating temperamental differences with empathy).
  - **Section 05: Dynamic Energy & Assertiveness Compatibility** (Neutral Mars/Venus analysis: constructive conflict resolution without dosha labeling).
  - **Section 06: Relationship Longevity & Shared Life Path** (7th and 8th house mutual aspects and supportive dasha periods).
  - **Section 07: Practical Relationship Advice & Cosmic Harmony** (Communication practices, shared values, joint spiritual and lifestyle tips).
- **Layperson Concept Explanations Required:**
  - Explain *Guna Milan* as an index of natural energetic resonance, where lower scores simply mean conscious communication is required, not incompatibility.
  - Explain *Bhakoot* as emotional perspective differences (e.g. 6-8 axis = different coping mechanisms during stress).
  - Explain *Nadi* neutrally as genetic and physiological vitality resonance.
- **Prohibited & Outdated Content to Eliminate:**
  - **STRICT PROHIBITION**: Do **NOT** declare marriage cancellation or predict divorce, widowhood, or illness on the basis of *Nadi Dosha*, *Bhakoot Dosha*, or *Manglik*.
  - **STRICT PROHIBITION**: Do **NOT** prescribe *Kumbha Vivaha* (mock wedding to an idol/tree), *Nadi Shanti* rituals, or fear-inducing mantras.

---

### Product 4: Personalised Fortune Report Plus (Reference: 139 Pages)

- **Exact Product Title:** `Personalised Fortune & Numerology Dossier Plus`
- **Reference Document Metadata:** 139 pages.
- **Author Branding & Voice:** Upbeat, empowering, structured numerological life guide.
- **Dedicated Message from Author:**
  > "Welcome to Your Personalised Fortune Report Plus. Numbers are the fundamental vibrational language of the universe. From your birth date to your name, numerical vibrations shape your natural instincts, hidden talents, and life opportunities. This report decodes your personal numbers into actionable wisdom, guiding you toward fulfillment, prosperity, and harmony."
- **Authoritative Disclaimer:**
  > "This report is entirely based on numerological and astrological calculations and interpretations. Numerology provides personal insights and self-awareness based on numerical symbolism. It is an interpretative practice and does not offer guaranteed outcomes. Recommendations (colors, numbers, directional energies) should be used as self-development tools and do not substitute for professional medical, legal, or financial advice."
- **Required Personalised Inputs:**
  - Full Name (and common name), Gender, Date of Birth.
- **Calculation Engine Dependencies:**
  - *Mulank* (Psychic / Driver Number, day of birth reduced 1–9).
  - *Bhagyank* (Destiny / Conductor Number, full date reduced 1–9).
  - *Namank* (Name Number via Cheiro / Pythagorean systems).
  - *Lo Shu Grid* (3x3 Fortune Grid matrix with 8 planes: Thought, Will, Action, Mental, Emotional, Practical, Golden, Silver).
  - Personal Year, Personal Month, and 9-year cycle calculations.
- **Table of Contents & Section Hierarchy:**
  - **1. Introduction** (Lucky Numbers, Lucky Colors, Lucky Days, Auspicious Directions).
  - **2. Numerological Analysis** (Mulank Deep Dive, Bhagyank Blueprint, Birth Date Breakdown, The 81 Mulank-Bhagyank Combination Matrix, Ruling Deity & Fasting Day).
  - **3. Interpersonal Vibrations** (Friendship, Romantic Compatibility, and Business Alignment with other Mulanks).
  - **4. Empower Your Health** (Elemental balance, dietary tendencies, and physical self-care).
  - **5. Numerology & Your Future** (Optimal vocational domains and career paths aligned with your numbers).
  - **6. Decoding Your Destiny: The Fortune Grid (Lo Shu Grid)** (Grid placement, Arrows of Strength, Arrows of Weakness, Missing Numbers and Practical Balancing Techniques).
  - **7. Feng Shui & Environmental Harmony** (Space harmonization, lucky charms, directional energies).
  - **8. Personal Year Cycles & Timelines** (Upcoming year forecasts and cyclical milestone planning).
- **Layperson Concept Explanations Required:**
  - Explain Mulank as "Your Daily Instinct and Personality Driver".
  - Explain Bhagyank as "Your Life Mission and Destiny Path".
  - Explain the Lo Shu Grid as "The Energy Matrix of Your Mind and Environment".
- **Prohibited & Outdated Content to Eliminate:**
  - Do not introduce superstition, ominous curses for missing numbers, or mandatory purchasing of expensive talismans.

---

### Product 5: Fortune Report (Hindi Edition) (Reference: 112 Pages)

- **Exact Product Title:** `फॉर्च्यून रिपोर्ट (Fortune Report - Hindi)`
- **Reference Document Metadata:** Title: `Fortune_Report_Puneet_Kumar.pdf`, 112 pages.
- **Author Branding & Voice:** Authentic Hindi vernacular, respectful, culturally rich yet modern and non-fatalistic.
- **Dedicated Message from Author (Hindi):**
  > "आपकी व्यक्तिगत फॉर्च्यून रिपोर्ट में आपका स्वागत है। अंकशास्त्र भारतीय ज्ञान-परंपरा और ब्रह्मांडीय ऊर्जा का एक अनूठा विज्ञान है। आपकी जन्मतिथि में केवल दिन और साल नहीं, बल्कि आपके जीवन का रहस्य और संभावनाएं छुपी हैं। यह रिपोर्ट आपके मूलांक, भाग्यांक और फॉर्च्यून ग्रिड के माध्यम से आपकी छिपी हुई क्षमताओं को उजागर करने और सही दिशा चुनने का एक मार्गदर्शक है।"
- **Authoritative Disclaimer (Hindi):**
  > "यह रिपोर्ट पूरी तरह से अंकज्योतिषीय गणनाओं और व्याख्याओं पर आधारित है। इसमें दिए गए सुझाव और भविष्यवाणियां केवल अंकज्योतिष के आधार पर हैं, जो आपके जीवन में अंकों के प्रभाव पर केंद्रित हैं। यह ध्यान देने योग्य है कि इस रिपोर्ट में दिए गए तथ्य लेखक के व्यक्तिगत विचार नहीं हैं बल्कि स्थापित सिद्धांतों पर आधारित हैं। यह रिपोर्ट किसी भी कानूनी, वित्तीय या चिकित्सीय परामर्श का विकल्प नहीं है।"
- **Required Personalised Inputs:**
  - नाम (Full Name), जन्मतिथि (Date of Birth), लिंग (Gender).
- **Calculation Engine Dependencies:**
  - Identical to Product 4 (Mulank, Bhagyank, Namank, Lo Shu Grid, 9-Year Cycles) rendered in clean Devanagari typography.
- **Table of Contents & Section Hierarchy:**
  - विषय सूची (अंक ज्योतिष का परिचय, आपका मूलांक एवं व्यक्तित्व, भाग्यांक और जीवन लक्ष्य, 81 संयोगों का विश्लेषण, अनुकूल अंक, रंग, दिन एवं दिशाएं, लो शू फॉर्च्यून ग्रिड विश्लेषण, स्वास्थ्य एवं आहार सुझाव, करियर एवं व्यवसाय मार्गदर्शन, आगामी वर्षों का भविष्यफल एवं सरल उपाय)।

---

### Product 6: Varshphal Report (Reference: 97 Pages)

- **Exact Product Title:** `Varshphal (Annual Solar Return) Report`
- **Reference Document Metadata:** Title: `Varshphal Report-Puneet Kumar`, 97 pages.
- **Author Branding & Voice:** Annual strategic advisor, reflective, inspiring, practical month-by-month planner.
- **Dedicated Message from Author:**
  > "Welcome to Your Annual Varshphal Report. In traditional Vedic astrology, every birthday marks a profound celestial rebirth—the exact moment the transiting Sun returns to the identical degree it occupied at your birth. The Varshphal chart captures the unique energetic blueprint for your year ahead. This report is your annual playbook: helping you recognize windows of opportunity, navigate slower quarters, and make informed choices across career, finances, and relationships."
- **Authoritative Disclaimer:**
  > "This report is based entirely on traditional astrology principles and Varshphal (annual horoscope) calculations, offering insights to support your journey without personal bias. The forecasts presented here are intended to guide and inspire rather than define fixed outcomes. Remedies (spiritual practices, lifestyle adjustments) are supplementary aids and not substitutes for practical life decisions or professional counsel."
- **Required Personalised Inputs:**
  - Natal Birth Details (Name, DOB, TOB, POB, Timezone).
  - Target Year (e.g. 2026–2027) and Current Residence / Birthday Location (Latitude, Longitude).
- **Calculation Engine Dependencies:**
  - Exact Solar Return Instant (Tajika system).
  - Varsha Lagna, Muntha position and Muntha Lord.
  - Varsheshwara (Lord of the Year) calculation via 5-fold Pancha-Adhikari strength.
  - Tajika Yogas (Iksala, Induvara, Ithasala, Esharpha, Nakta, Yamaya, etc.).
  - Mudda / Patyayini Dasha (annual planetary period timeline).
  - Tajika Sahams (Punya Saham, Vidya Saham, Karma Saham, etc.).
- **Table of Contents & Section Hierarchy:**
  - **1. Introduction to Varshphal & The Solar Return**
  - **2. Synopsis of Birth & Annual Chart Details** (Natal vs Varsha Lagna, Muntha placement, Varsheshwar).
  - **3. Effects of Transiting Planets in Annual Houses** (Sun through Ketu in the Varsha chart).
  - **4. Annual Overview & Core Themes** (Career, Finance, Family, Health).
  - **5. Month-Wise Predictions (Months 1 through 12)** (Detailed breakdown of every calendar month with key inflection dates).
  - **6. Personalised Monthly Guidance & Constructive Habits**
  - **7. Closing Reflections & Forward Strategy**
- **Layperson Concept Explanations Required:**
  - Explain *Muntha* as "The Moving Catalyst Point of Your Year".
  - Explain *Varsheshwar* as "Your Annual Guardian and Primary Guiding Planet".
  - Explain *Mudda Dasha* as "The 12-Month Micro-Timeline".

---

### Product 7: Rahu Ketu Transit Report (Reference: 90 Pages)

- **Exact Product Title:** `Rahu Ketu Transit & Karmic Evolution Report`
- **Reference Document Metadata:** Title: `Rahu Ketu Report`, 90 pages.
- **Author Branding & Voice:** Psychologically astute, transformative, grounded, removing superstition and taboo from the lunar nodes.
- **Dedicated Message from Author:**
  > "Welcome to Your Rahu Ketu Transit Report. In Vedic cosmology, Rahu and Ketu represent the cosmic axis of evolution—the intersection of worldly ambition and spiritual release. While often misunderstood as frightening shadows, they are actually our greatest catalysts for breakthrough and self-discovery. This report examines how their 18-month transit activates your birth chart, highlighting where you are called to expand and where you are guided to surrender."
- **Authoritative Disclaimer:**
  > "This report analyzes the astronomical transit of the lunar nodes (Rahu and Ketu) based on Vedic astrological traditions. The observations provided are designed for self-reflection and personal growth. Node transits symbolize psychological focus and life inflection points; they do not dictate unavoidable negative events. The author assumes no liability for actions taken based on this reading."
- **Required Personalised Inputs:**
  - Full Name, DOB, TOB, POB, Timezone.
- **Calculation Engine Dependencies:**
  - True Node vs Mean Node calculation (True Node standard).
  - Current sign and degree of transiting Rahu and Ketu.
  - Natal Moon Sign and Natal Ascendant house offsets.
  - Conjunctions and aspects of transiting nodes to natal planets.
- **Table of Contents & Section Hierarchy:**
  - **1. The Mystery of the Nodes: Rahu & Ketu Decoded** (Astronomy, Mythology & Psychological Reality).
  - **2. Natal Blueprint: Your Innate Karmic Axis** (Rahu & Ketu in your birth chart).
  - **3. The Current Transit: Sign & House Activation** (Where Rahu is pushing boundaries; where Ketu is demanding detachment).
  - **4. Impact on Core Life Pillars** (Career Ambition, Financial Security, Relationships, Mental Peace).
  - **5. Planetary Aspects & Contact Points** (When transiting nodes aspect your natal Sun, Moon, Venus, Saturn).
  - **6. 18-Month Timeline & Sub-Transit Milestones**
  - **7. Constructive Mindsets, Mindfulness & Balance Practices**
- **Layperson Concept Explanations Required:**
  - Explain Rahu as "The Hunger for Innovation, New Experiences, and Ambition".
  - Explain Ketu as "The Capacity for Detachment, Intuition, and Inner Mastery".
- **Prohibited & Outdated Content to Eliminate:**
  - **NO** *Kaal Sarp Dosha* categorization or fear-inducing rhetoric.
  - **NO** claims of generational curses, snake bites, or terminal ill-fortune.

---

### Product 8: Saturn In Your Birth Chart Report (Reference: 87 Pages)

- **Exact Product Title:** `Saturn In Your Birth Chart: Karma, Mastery & Breakthrough Timings`
- **Reference Document Metadata:** Title: `Puneet Kumar_eng - Saturn in your Birth Chart`, 87 pages.
- **Author Branding & Voice:** Wise mentor, stoic, deeply encouraging, framing struggle as the crucible of enduring achievement.
- **Dedicated Message from Author:**
  > "Welcome to Your Saturn Report. Saturn (Shani) is often revered and feared in equal measure, but in truth, Saturn is the great cosmic teacher. Saturn does not deny; Saturn delays to build capacity. Where Saturn sits in your birth chart is where life demands honesty, discipline, and sustained effort—and where your greatest, most unshakeable life mastery will be built. This report illuminates your Saturnian karma and shows you when your breakthrough cycles arrive."
- **Authoritative Disclaimer:**
  > "This report is based entirely on astrological calculations and interpretations specific to Saturn and its transits. Vedic astrology interprets Saturn's influence in relation to your natal Moon and Ascendant. Interpretations are intended to cultivate resilience and self-awareness, not fear. Astrological insights do not replace professional advice."
- **Required Personalised Inputs:**
  - Full Name, DOB, TOB, POB, Timezone.
- **Calculation Engine Dependencies:**
  - Natal Saturn sign, house, degree, retrograde status, and aspects (3rd, 7th, 10th aspects).
  - Ashtakvarga points for Saturn in natal houses.
  - Neutral Gochara transit of Saturn across the 12 houses from Moon and Lagna.
- **Table of Contents & Section Hierarchy:**
  - **1. The Story and Nature of Shani Dev** (Cosmic archetype of justice, discipline, and time).
  - **2. Vedic Charts Overview** (Lagna Chart, Moon Chart, Saturn Transit Chart).
  - **3. Saturn in Your Birth Chart** (Placement, Aspects, Benefic vs Challenging dynamics, Moon Sign Psyche Evolution, Ashtakvarga Support).
  - **4. Saturn's Transit Phases** (Neutral astronomical analysis of Saturn moving through the 12th, 1st, and 2nd houses from natal Moon).
  - **5. Transit Forecast** (Current 2.5-year cycle and upcoming 2.5-year cycle).
  - **6. Constructive Lifestyle Disciplines & Mental Focus** (Service, ethical integrity, physical structure, practical patience).
- **Layperson Concept Explanations Required:**
  - Explain Saturn as "The Personal Trainer of Character".
  - Explain transits near the Moon not as a "curse", but as "A Period of Emotional Maturation and Inner Fortitude".
- **Prohibited & Outdated Content to Eliminate:**
  - Do not use the term *Sade Sati* as an impending disaster or tragedy.
  - Do not prescribe fear-based black horse shoe rings or commercial appeasement rituals.

---

### Product 9: Jupiter Transit Report (Reference: 79 Pages)

- **Exact Product Title:** `Jupiter Transit & Cosmic Expansion Report`
- **Reference Document Metadata:** Title: `Jupiter Transit Report`, 79 pages.
- **Author Branding & Voice:** Uplifting, benevolent, expansive, focused on wisdom, ethics, and meaningful growth.
- **Dedicated Message from Author:**
  > "Welcome to Your Jupiter Transit Report. In Vedic wisdom, Jupiter (Guru) represents light, wisdom, grace, and expansion. Wherever Jupiter transits, it expands our horizons, brings teachers and mentors into our path, and illuminates solutions where we once saw only obstacles. This report reveals how Jupiter's current movement activates your chart and how to align with this window of grace."
- **Authoritative Disclaimer:**
  > "This Jupiter Transit Report is based on the principles of Vedic astrology, offering insights into Jupiter's movements and its potential influence on your personal horoscope. Astrology provides cosmic guidance and personal perspective, not guaranteed financial or material outcomes."
- **Required Personalised Inputs:**
  - Full Name, DOB, TOB, POB, Timezone.
- **Calculation Engine Dependencies:**
  - Transiting Jupiter sign, degree, and retrograde windows.
  - House transit from natal Moon and natal Lagna.
  - Jupiter's 5th, 7th, and 9th harmonic aspects to natal planets.
- **Table of Contents & Section Hierarchy:**
  - **1. Guru: The Archetype of Wisdom & Growth**
  - **2. Jupiter's Transit Across Your 12 Houses** (House-by-house analysis of opportunities).
  - **3. Impact on Career, Learning & Purpose**
  - **4. Impact on Relationships & Family Expansion**
  - **5. Wealth, Abundance & Dharmic Fortune**
  - **6. 12-Month Key Dates & Retrogression Windows**
  - **7. Harnessing Jupiter's Grace** (Cultivating gratitude, generosity, learning, and spiritual alignment).

---

### Product 10: Personalised Horoscope Report (Reference: 70 Pages)

- **Exact Product Title:** `Personalised Annual Horoscope Report`
- **Reference Document Metadata:** Title: `Virgo - Yearly Horoscope Report`, 70 pages.
- **Author Branding & Voice:** Annual strategic advisor, comprehensive, warm, organized.
- **Dedicated Message from Author:**
  > "Welcome to Your Personalised Yearly Horoscope Report. Every year brings its own celestial rhythm. By understanding the major transit movements of Jupiter, Saturn, and the Nodal axis in relation to your personal chart, you can plan your year with confidence, clarity, and peace of mind."
- **Authoritative Disclaimer:**
  > "The contents of this report are provided solely for informational, guidance, and self-awareness purposes. Astro Sushil disclaims liability for actions taken based on this report."
- **Required Personalised Inputs:**
  - Full Name, DOB, TOB, POB, Timezone, Target Year.
- **Calculation Engine Dependencies:**
  - Natal Ascendant and Moon sign.
  - Annual ephemeris transits for Sun, Mars, Jupiter, Saturn, Rahu, Ketu.
  - Vimshottari Dasha sub-periods active in the year.
- **Table of Contents & Section Hierarchy:**
  - **1. The Year at a Glance** (Major astrological highlights, overarching theme).
  - **2. Career & Professional Life** (Q1, Q2, Q3, Q4 breakdowns).
  - **3. Finances, Investments & Property**
  - **4. Love, Marriage & Family Dynamics**
  - **5. Health, Vitality & Emotional Well-Being**
  - **6. Detailed Month-by-Month Guide (January through December)**
  - **7. Annual Summary & Actionable Recommendations**

---

### Product 11: Finance Report (Reference: 32 Pages)

- **Exact Product Title:** `Wealth & Financial Prosperity Report`
- **Reference Document Metadata:** 32 pages.
- **Author Branding & Voice:** Pragmatic, financially responsible, disciplined, ethical wealth creation.
- **Dedicated Message from Author:**
  > "Welcome to Your Financial Prosperity Report. Wealth in Vedic tradition (Lakshmi) is not merely hoarding money; it is the energy of flow, purpose, and security. By analyzing your 2nd house of accumulated assets, 11th house of regular earnings, and 9th house of fortune, this report clarifies your financial aptitude, investment temperaments, and timing for wealth creation."
- **Authoritative Disclaimer:**
  > "This report provides astrological perspectives on financial aptitude and cosmic cycles. It does NOT constitute licensed financial advice, investment counseling, or tax planning. Always consult certified financial advisors for monetary decisions."
- **Required Personalised Inputs:**
  - Full Name, DOB, TOB, POB, Timezone.
- **Calculation Engine Dependencies:**
  - 2nd House (Dhana Bhava), 11th House (Labha Bhava), 9th House (Bhagya), 5th House (Speculative intellect), 12th House (Expenditure/Vyaya).
  - Dhana Yogas, Indu Lagna, Jupiter & Venus dignities.
  - Vimshottari dasha sub-periods governing wealth.
- **Table of Contents & Section Hierarchy:**
  - **1. Your Financial Blueprint: The Wealth Houses Decoded**
  - **2. Dhana Yogas & Prosperity Combinations**
  - **3. Expenditure Patterns & Wealth Preservation (12th House Analysis)**
  - **4. Ideal Investment Channels Aligned With Your Chart**
  - **5. Upcoming Financial Timelines & Growth Cycles**
  - **6. Practical Disciplines for Long-Term Prosperity**

---

### Product 12: Love Report (Reference: 23 Pages)

- **Exact Product Title:** `Love, Romance & Relationship Destiny Report`
- **Reference Document Metadata:** Title: `Love Report`, 23 pages.
- **Author Branding & Voice:** Empathetic, romantic, psychologically perceptive, uplifting.
- **Dedicated Message from Author:**
  > "Welcome to Your Love & Romance Report. Love is our most vulnerable and transformative experience. Your birth chart contains deep clues about your emotional needs, the kind of partner who truly resonates with your soul, and the timing of romantic breakthroughs. This report is crafted to help you understand your relationship patterns and open your heart with clarity."
- **Authoritative Disclaimer:**
  > "This report offers Vedic astrological perspectives on relationship tendencies and romantic timing. Astrology supports self-awareness and empathy; it does not dictate guaranteed outcomes."
- **Required Personalised Inputs:**
  - Full Name, Gender, DOB, TOB, POB, Timezone.
- **Calculation Engine Dependencies:**
  - 5th House (Romance), 7th House (Partnership), Venus (Karaka for Love), Moon (Emotional nature), Mars (Passion/Assertion), Upapada Lagna.
- **Table of Contents & Section Hierarchy:**
  - **1. Your Romantic Archetype & Emotional Needs**
  - **2. The 7th House: The Nature of Your Soul Partner**
  - **3. Love Yogas & Planetary Influences on Romance**
  - **4. Navigating Past Patterns & Communication Challenges**
  - **5. Upcoming Relationship Milestones & Favorable Windows**
  - **6. Cultivating Harmonious Love in Daily Life**

---

### Product 13: Baby Name Report (Reference: 15 Pages)

- **Exact Product Title:** `Baby Name & Auspicious Syllables Report`
- **Reference Document Metadata:** Title: `Puneet-Baby-Name-Report-1777459180491`, 15 pages.
- **Author Branding & Voice:** Joyous, gentle, culturally resonant, celebrating new life.
- **Dedicated Message from Author:**
  > "Congratulations on the arrival of your precious little one! A name is the very first gift and blessing you bestow upon your child. It is a vibrational signature that will echo throughout their life. This report combines ancient Vedic nakshatra sound principles with numerological harmony to present names that are beautiful, meaningful, and auspicious."
- **Authoritative Disclaimer:**
  > "This report provides name suggestions based on Vedic nakshatra sound principles and numerology. Name suggestions carry no legal or scientific guarantees. Parents hold ultimate responsibility for naming decisions."
- **Required Personalised Inputs:**
  - Baby's Gender, Exact Date of Birth, Exact Time of Birth, Place of Birth, Parental Names & Cultural Preferences (optional).
- **Calculation Engine Dependencies:**
  - Moon Nakshatra and exact Pada at the moment of birth.
  - Janma Nakshatra Nama-Akshara (auspicious starting syllables, e.g., Chu, Che, Cho, La).
  - Mulank & Bhagyank calculation of the birth date.
  - Name numerology harmonization (ensuring selected names yield favorable vibration sums).
- **Table of Contents & Section Hierarchy:**
  - **1. Welcome & Sacred Blessing for Your Newborn**
  - **2. The Birth Star (Janma Nakshatra) & Astrological Profile**
  - **3. Auspicious Starting Sounds & Sacred Syllables**
  - **4. Curated Name Catalogue (with Meaning, Origin, and Numerological Value)**
  - **5. Elemental Balance & Numerology Alignment of Candidate Names**
  - **6. Closing Blessings & Guidance for the Naming Ceremony (Namakarana)**

