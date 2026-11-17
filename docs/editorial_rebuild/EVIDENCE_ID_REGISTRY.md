# Master Evidence-ID Registry: Separated Provenance & Atomic Epistemic Mapping

**Document ID:** `EVIDENCE_ID_REGISTRY`  
**Phase:** Phase 1F Deliverable 2  
**Status:** ATOMICALLY SEPARATED, AUDITED & REPRODUCIBLE (PHASE 1F FINAL)  
**Subject:** Canonical Reference Profile (Puneet Kumar; DOB: Dec 28, 1983, 04:45 IST; Bulandshahr, India)  
**Calculation Engine Version:** `@astro/astrology-engine v1.0.0`  
**Ephemeris Backend:** Swiss Ephemeris (`sweph`) via `@astro/astrology-engine`  
**Ayanamsa:** Lahiri Sidereal (Ayanamsa value at epoch: 23° 37' 42.14")  
**Coordinate System:** Geocentric Sidereal, Whole Sign House System (*Rashi-Bhava Samatva*)

---

## 1. Registry Architecture & Atomic Separation Directives

To enforce absolute claim-level provenance and eliminate tier mismatches during schema validation:
- **No compound records:** A single evidence record must never bundle an astronomical fact, a classical shastric text, and a modern vocational extrapolation under one generic ID.
- **Strict 1:1 Epistemic Fidelity:** Each record supports only claims matching its exact `EpistemicTier`.
- **Seven Canonical Tiers Only:** Every record must be classified as one of `CALCULATED_FACT`, `TRADITIONAL_SHASTRA`, `NADI_PROGRESSION`, `MODERN_VOCATIONAL_EXTRAPOLATION`, `INTERPRETIVE_SYNTHESIS`, `INTERPRETIVE_CONVENTION`, or `DISPUTED_OR_UNVERIFIED`.

---

## 2. Active Master Evidence Registry

### 2.1 Natal Chart (D1 Rashi) Evidence Records (37 Active Records)

| Evidence ID | Description & Scope | Source / Citation / Calculation Output | Engine / Version | Canonical Epistemic Tier |
| :--- | :--- | :--- | :--- | :--- |
| `d1-asc-scorpio-0906` | Ascendant ecliptic longitude at 219.1059° (09° 06' 21" Scorpio). Rashi index 8. | `@astro/astrology-engine`: `chart.ascendant = { sign: "Scorpio", degree: 9.1059 }` | `@astro/astrology-engine v1.0.0` | `CALCULATED_FACT` |
| `d1-asc-scorpio-shastric` | Classical shastric archetype of Scorpio (*Vrishchika*) as a fixed water sign ruled by Mars, signifying depth, emotional courage, and strategic reserve. | *BPHS* Ch. 4 (Rashi Svarupa), Slokas 14–15; *Saravali* Ch. 4, Sloka 21. | Classical Shastra | `TRADITIONAL_SHASTRA` |
| `d1-asc-scorpio-modern-extrapolation` | Modern vocational extrapolation of Scorpio as root-cause diagnostic inquiry, organizational reserve, and persistent systems debugging. | Modern vocational synthesis. | Editorial Synthesis | `MODERN_VOCATIONAL_EXTRAPOLATION` |
| `d1-asc-nakshatra-anuradha-pada2-fact` | Ascendant degree (09° 06' 21" Scorpio) falls in Anuradha Nakshatra (index 17, 03°20'–16°40' Scorpio), Pada 2 (06°40'–10°00' Scorpio, Capricorn Navamsha), ruled by Saturn. | `@astro/astrology-engine`: `ascendant.nakshatra = "Anuradha"`, `pada = 2`, `nakshatraLord = "Saturn"` | `@astro/astrology-engine v1.0.0` | `CALCULATED_FACT` |
| `d1-asc-nakshatra-anuradha-shastric` | Classical principle of Anuradha Nakshatra: presided over by solar deity *Mitra* (lord of friendship, alliances, contracts), symbolized by the resilient lotus. | *Taittiriya Brahmana* 1.5.2; *BPHS* Ch. 3 (Graha Guna Swarupa). | Classical Shastra | `TRADITIONAL_SHASTRA` |
| `d1-asc-nakshatra-anuradha-synthesis` | Interpretive synthesis of Anuradha patience, diplomatic tact, and alliance-building refining Scorpio's martial intensity. | Astrological synthesis doctrine. | Editorial Synthesis | `INTERPRETIVE_SYNTHESIS` |
| `d1-saturn-exalted-12th-fact` | Saturn at 199.9614° (19° 57' 41" Libra) in 12th house in Swati Nakshatra Pada 4, occupying its exaltation sign (*Uchcha Kshetra*). | `@astro/astrology-engine`: `planets.Saturn = { sign: "Libra", house: 12, degree: 19.9614, dignity: "EXALTED" }` | `@astro/astrology-engine v1.0.0` | `CALCULATED_FACT` |
| `d1-saturn-12th-synthesis` | Interpretive synthesis of exalted 12th-house Nakshatra lord drawing professional foundation from quiet mastery, contemplative discipline, and behind-the-scenes preparation. | Astrological synthesis doctrine. | Editorial Synthesis | `INTERPRETIVE_SYNTHESIS` |
| `d1-h1-venus-vishakha-fact` | Venus at 211.4412° (01° 26' 28" Scorpio) in 1st house in Vishakha Nakshatra Pada 4. | `@astro/astrology-engine`: `planets.Venus = { sign: "Scorpio", house: 1, degree: 1.4412, nakshatra: "Vishakha", pada: 4 }` | `@astro/astrology-engine v1.0.0` | `CALCULATED_FACT` |
| `d1-h1-venus-vishakha-shastric` | Classical principle that a natural benefic in the Ascendant confers social poise, aesthetic discernment, and diplomatic charm. | *Phaladeepika* Ch. 8, Sloka 16; *BPHS* Ch. 24. | Classical Shastra | `TRADITIONAL_SHASTRA` |
| `d1-h1-ketu-jyeshtha-fact` | Ketu at 231.1214° (21° 07' 17" Scorpio) in 1st house in Jyeshtha Nakshatra Pada 2. | `@astro/astrology-engine`: `planets.Ketu = { sign: "Scorpio", house: 1, degree: 21.1214, nakshatra: "Jyeshtha", pada: 2 }` | `@astro/astrology-engine v1.0.0` | `CALCULATED_FACT` |
| `d1-h1-ketu-jyeshtha-modern-extrapolation` | Modern vocational extrapolation of Ketu in 1st house fostering psychological detachment from office politics and calm self-containment. | Modern vocational synthesis. | Editorial Synthesis | `MODERN_VOCATIONAL_EXTRAPOLATION` |
| `d1-h1-ketu-jyeshtha-synthesis` | Interpretive synthesis of Ketu in 1st house allowing the native to engage warmly with peers while internally preserving observant sovereignty. | Astrological synthesis doctrine. | Editorial Synthesis | `INTERPRETIVE_SYNTHESIS` |
| `d1-lagna-lord-mars-h11-fact` | Lagna Lord Mars at 178.8612° (28° 51' 40" Virgo) in the 11th house (*Labha Bhava*). | `@astro/astrology-engine`: `planets.Mars = { sign: "Virgo", house: 11, degree: 28.8612, isLagnaLord: true }` | `@astro/astrology-engine v1.0.0` | `CALCULATED_FACT` |
| `d1-lagna-lord-mars-h11-modern-extrapolation` | Modern vocational extrapolation of Lagna lord in 11th directing drive toward enterprise networks, commercial scaling, and cross-functional programs. | Modern vocational synthesis; *BPHS* Ch. 24 (Bhaveshaphala). | Editorial Synthesis | `MODERN_VOCATIONAL_EXTRAPOLATION` |
| `d1-lagna-lord-mars-h11-synthesis` | Interpretive synthesis of personal willpower accelerating when deployed within structured professional teams and measurable business deliverables. | Astrological synthesis doctrine. | Editorial Synthesis | `INTERPRETIVE_SYNTHESIS` |
| `d1-chandra-mangal-11th-fact` | Moon at 177.1948° (27° 11' 41" Virgo) and Mars at 178.8612° (28° 51' 40" Virgo) in 11th house, forming a close degree conjunction separated by 01° 40' 00" in Chitra Pada 2. | `@astro/astrology-engine`: `separation = 1.6664°`, `yoga: "Chandra-Mangal"` | `@astro/astrology-engine v1.0.0` | `CALCULATED_FACT` |
| `d1-chandra-mangal-shastric` | Classical shastric principle of *Chandra-Mangal Yoga* driving commercial enterprise and resource accumulation. | *Saravali* Ch. 15, Slokas 20–21; *Jataka Parijata* Ch. 7. | Classical Shastra | `TRADITIONAL_SHASTRA` |
| `d1-chandra-mangal-modern-extrapolation` | Modern vocational extrapolation of Chandra-Mangal Yoga in Virgo translating to process optimization, analytical troubleshooting, and structured milestone delivery. | Modern vocational synthesis. | Editorial Synthesis | `MODERN_VOCATIONAL_EXTRAPOLATION` |
| `d1-house-10-leo-fact` | 10th house falls in Leo (*Simha*, sign index 5). | `@astro/astrology-engine`: `houses[10] = { sign: "Leo", signIndex: 5 }` | `@astro/astrology-engine v1.0.0` | `CALCULATED_FACT` |
| `d1-house-10-leo-shastric` | Classical principle that Leo on the 10th house represents royal governance, administrative dignity, and executive responsibility. | *BPHS* Ch. 11, Sloka 10; *Phaladeepika* Ch. 1, Sloka 42. | Classical Shastra | `TRADITIONAL_SHASTRA` |
| `d1-house-10-leo-modern-extrapolation` | Modern vocational extrapolation of 10th house Leo encouraging leadership roles centered on transparent ownership and institutional visibility. | Modern vocational synthesis. | Editorial Synthesis | `MODERN_VOCATIONAL_EXTRAPOLATION` |
| `d1-house-10-empty-fact` | 10th house has zero physical planetary occupants. | `@astro/astrology-engine`: `houses[10].occupants = []` | `@astro/astrology-engine v1.0.0` | `CALCULATED_FACT` |
| `d1-house-10-empty-shastric` | Classical doctrine of unoccupied houses (*Graha-Shoonya Bhava*): results are directed entirely through the house lord, dispositor, and incoming aspects without inherent deficiency. | *Phaladeepika* Ch. 15 (Bhava Vichara), Slokas 1–3. | Classical Shastra | `TRADITIONAL_SHASTRA` |
| `d1-house-10-empty-modern-extrapolation` | Modern vocational extrapolation interpreting the absence of a single overriding planetary archetype as an indication of functional versatility and adaptability across management, advisory, and governance tracks. | Modern vocational synthesis. | Editorial Synthesis | `MODERN_VOCATIONAL_EXTRAPOLATION` |
| `d1-10th-lord-sun-h2-fact` | 10th lord Sun placed at 252.0084° (12° 00' 30" Sagittarius) in 2nd house (*Dhana Bhava*). | `@astro/astrology-engine`: `planets.Sun = { sign: "Sagittarius", house: 2, degree: 12.0084, isLordOf: [10] }` | `@astro/astrology-engine v1.0.0` | `CALCULATED_FACT` |
| `d1-10th-lord-sun-h2-shastric` | Classical principle that 10th lord in 2nd house links executive authority to articulate counsel, institutional speech, and financial stewardship. | *BPHS* Ch. 24, Sloka 110. | Classical Shastra | `TRADITIONAL_SHASTRA` |
| `d1-10th-lord-sun-h2-modern-extrapolation` | Modern vocational extrapolation of 10th lord in 2nd house indicating effectiveness in executive advisory, regulatory compliance, and fiscal governance. | Modern vocational synthesis. | Editorial Synthesis | `MODERN_VOCATIONAL_EXTRAPOLATION` |
| `d1-h2-sun-mercury-jupiter-fact` | Sun (12°01'), Mercury (19°41'), and Jupiter (01°23' Moolatrikona) co-occupy Sagittarius in 2nd house, forming Budha-Aditya Yoga with Jupiterian strength. | `@astro/astrology-engine`: `house[2].planets = ["Sun", "Mercury", "Jupiter"]`, `Jupiter.dignity = "MOOLATRIKONA"` | `@astro/astrology-engine v1.0.0` | `CALCULATED_FACT` |
| `d1-h2-sun-mercury-jupiter-synthesis` | Interpretive synthesis linking the 2nd house assembly to articulate counsel, ethical domain expertise, and strategic advisory. | Astrological synthesis doctrine. | Editorial Synthesis | `INTERPRETIVE_SYNTHESIS` |
| `d1-aspect-jupiter-to-10th-fact` | Jupiter at 01° 23' Sagittarius in House 2 casts its 9th trinal aspect onto 10th house Leo ($2 + 9 - 1 = 10$). | `@astro/astrology-engine`: `aspects = { aspectingPlanet: "Jupiter", aspectType: "9th Trine", targetHouse: 10 }` | `@astro/astrology-engine v1.0.0` | `CALCULATED_FACT` |
| `d1-aspect-jupiter-to-10th-shastric` | Classical principle that Jupiter’s trinal aspect on the 10th house is a supportive benefic influence that traditionally reinforces professional standing and senior goodwill. | *BPHS* Ch. 26, Slokas 2–5. | Classical Shastra | `TRADITIONAL_SHASTRA` |
| `d1-aspect-saturn-to-sun-fact` | Saturn at 19° 58' Libra in House 12 casts its special 3rd aspect onto 10th Lord Sun in House 2 Sagittarius ($12 + 3 - 1 = 14 \equiv 2$). | `@astro/astrology-engine`: `aspects = { aspectingPlanet: "Saturn", aspectType: "3rd Special", targetPlanet: "Sun" }` | `@astro/astrology-engine v1.0.0` | `CALCULATED_FACT` |
| `d1-aspect-saturn-to-sun-shastric` | Classical principle that Saturn's 3rd aspect on the 10th lord indicates delayed recognition, persistent labor, and structural discipline in leadership development. | *BPHS* Ch. 26, Sloka 3. | Classical Shastra | `TRADITIONAL_SHASTRA` |
| `d1-aspect-saturn-to-sun-synthesis` | Interpretive synthesis of Saturn's 3rd aspect on 10th lord Sun, emphasizing patient mastery over hasty ambition and encouraging demonstrated competence. | Astrological synthesis doctrine. | Editorial Synthesis | `INTERPRETIVE_SYNTHESIS` |
| `d1-aspect-mars-to-sun-fact` | Mars at 28° 52' Virgo in House 11 casts its special 4th aspect onto 10th Lord Sun in House 2 Sagittarius ($11 + 4 - 1 = 14 \equiv 2$). | `@astro/astrology-engine`: `aspects = { aspectingPlanet: "Mars", aspectType: "4th Special", targetPlanet: "Sun" }` | `@astro/astrology-engine v1.0.0` | `CALCULATED_FACT` |
| `d1-aspect-mars-to-sun-synthesis` | Interpretive synthesis of Mars casting its 4th aspect on the 10th lord, introducing competitive drive, tactical urgency, and decisive execution into leadership. | Astrological synthesis doctrine. | Editorial Synthesis | `INTERPRETIVE_SYNTHESIS` |

---

### 2.2 Dedicated Career Chart (D10 Dashamsha) Evidence Records (17 Active Records)

| Evidence ID | Description & Scope | Source / Citation / Calculation Output | Engine / Version | Canonical Epistemic Tier |
| :--- | :--- | :--- | :--- | :--- |
| `d10-chart-purpose-shastric` | Classical principle that the Dashamsha (D10) harmonic division serves as a supplementary lens for evaluating vocational status, institutional karma, and public demeanor. | *BPHS* Ch. 6 (Shodashavarga), Slokas 1–6, 25; *Phaladeepika* Ch. 3, Sloka 11. | Classical Shastra | `TRADITIONAL_SHASTRA` |
| `d10-asc-libra-0104-fact` | D10 Ascendant is Libra (*Tula*) at 01° 03' 34" (01° 04') for the recorded birth time of 04:45:00 IST. | `@astro/astrology-engine`: `d10.ascendant = { sign: "Libra", degree: 1.059 }` | `@astro/astrology-engine v1.0.0` | `CALCULATED_FACT` |
| `d10-asc-libra-birthtime-conditional` | Interpretive convention and empirical sensitivity disclosure noting that D10 Ascendant transitioned from Virgo to Libra in the interval 04:44:30 to 04:44:31 IST (less than 30 seconds prior to 04:45 IST); therefore, all D10 interpretations are strictly conditional on the recorded birth time. | Empirical boundary calculation: 04:44:30 IST is Virgo 29°59', 04:44:31 IST is Libra 00°01'. [`UNRESOLVED_QUESTIONS_AND_LIMITATIONS.md`](file:///home/pilot/Projects/astrosushil/docs/editorial_rebuild/UNRESOLVED_QUESTIONS_AND_LIMITATIONS.md). | Configured System Standard | `INTERPRETIVE_CONVENTION` |
| `d10-asc-libra-modern-extrapolation` | Modern vocational extrapolation of D10 Libra Ascendant indicating diplomatic conciliation, balanced mediation, and cross-functional consensus building in organizational environments. | Modern vocational synthesis. | Editorial Synthesis | `MODERN_VOCATIONAL_EXTRAPOLATION` |
| `d10-lagnesh-venus-in-10th-fact` | D10 Lagna lord Venus resides at 14° 22' Cancer in the D10 10th house. | `@astro/astrology-engine`: `d10.planets.Venus = { sign: "Cancer", house: 10, degree: 14.368, isLagnaLord: true }` | `@astro/astrology-engine v1.0.0` | `CALCULATED_FACT` |
| `d10-lagnesh-venus-in-10th-shastric` | Classical principle that the D10 Lagna lord placed in the 10th house indicates high career focus and public vocational engagement. | *BPHS* Ch. 6 & Ch. 24. | Classical Shastra | `TRADITIONAL_SHASTRA` |
| `d10-lagnesh-venus-in-10th-modern-extrapolation` | Modern vocational extrapolation of Venus in Cancer in 10th emphasizing relationship management, emotional intelligence, and stakeholder empathy as core leadership assets. | Modern vocational synthesis. | Editorial Synthesis | `MODERN_VOCATIONAL_EXTRAPOLATION` |
| `d10-7th-house-aries-fact` | D10 7th house falls in Aries (*Mesha*, sign 1). | `@astro/astrology-engine`: `d10.houses[7] = { sign: "Aries", signIndex: 1 }` | `@astro/astrology-engine v1.0.0` | `CALCULATED_FACT` |
| `d10-sun-0005-aries-fact` | D10 Sun is at 00° 05' 24" Aries in the 7th house in its exaltation sign (*Uchcha Rashi*), distinct from its exact 10° 00' deep exaltation degree (*Paramochcha Bhaga*). | `@astro/astrology-engine`: `d10.planets.Sun = { sign: "Aries", house: 7, degree: 0.090, dignity: "EXALTED_SIGN" }` | `@astro/astrology-engine v1.0.0` | `CALCULATED_FACT` |
| `d10-sun-0005-aries-modern-extrapolation` | Modern vocational extrapolation of Sun in its exaltation sign in the 7th house providing confidence, executive presence, and visibility in public negotiations. | Modern vocational synthesis. | Editorial Synthesis | `MODERN_VOCATIONAL_EXTRAPOLATION` |
| `d10-saturn-1939-aries-fact` | D10 Saturn is at 19° 39' 41" Aries in the 7th house in its debilitation sign (*Neecha Rashi*), approaching its 20° 00' deep debilitation degree. | `@astro/astrology-engine`: `d10.planets.Saturn = { sign: "Aries", house: 7, degree: 19.661, dignity: "DEBILITATED" }` | `@astro/astrology-engine v1.0.0` | `CALCULATED_FACT` |
| `d10-saturn-1939-aries-disputed-neecha-bhanga` | Audited shastric evaluation of D10 Neecha Bhanga; although certain Kendra conditions are met, divisional chart applicability is historically contested and un-evaluated by the calculation engine; classified as unresolved and excluded from definitive customer-facing claims. | Shastric audit of *Phaladeepika* Ch. 6; engine evaluates D1 only. [`INTERPRETIVE_CONVENTIONS.md`](file:///home/pilot/Projects/astrosushil/docs/editorial_rebuild/INTERPRETIVE_CONVENTIONS.md) Section 4. | Disputed Shastric Status | `DISPUTED_OR_UNVERIFIED` |
| `d10-saturn-1939-aries-modern-extrapolation` | Modern vocational extrapolation of Saturn's debilitation sign placement in the 7th house as a symbolic prompt for contractual diligence, structured governance, and legal safeguards in commercial partnerships. | Modern vocational synthesis. | Editorial Synthesis | `MODERN_VOCATIONAL_EXTRAPOLATION` |
| `d10-7th-house-sun-saturn-cooccupancy-fact` | Sun (00° 05' 24") and Saturn (19° 39' 41") in D10 7th house Aries have an angular separation of 19° 34' 17". | Astronomical angular separation: $\Delta = 19.5714^\circ \approx 19^\circ 34' 17"$ | `@astro/astrology-engine v1.0.0` | `CALCULATED_FACT` |
| `d10-7th-house-sun-saturn-cooccupancy-convention` | Astro Sushil configured editorial convention defining separations $> 10^\circ$ as wide sign-based co-occupancy (*Saha-Bhava*), rather than an active degreewise conjunction. | Configured editorial convention ($\le 5^\circ, 5-10^\circ, >10^\circ$). [`INTERPRETIVE_CONVENTIONS.md`](file:///home/pilot/Projects/astrosushil/docs/editorial_rebuild/INTERPRETIVE_CONVENTIONS.md) Section 5. | Configured System Standard | `INTERPRETIVE_CONVENTION` |
| `d10-7th-house-sun-saturn-synthesis` | Interpretive synthesis of parallel, unblended solar and saturnian dynamics in 7th-house partnership matters. | Astrological synthesis doctrine. | Editorial Synthesis | `INTERPRETIVE_SYNTHESIS` |
| `d1-d10-synthesis` | Methodological synthesis bridging D1 Scorpio reserve with D10 Libra diplomatic polish. | Methodological synthesis doctrine; *BPHS* Ch. 6; *Jataka Parijata* Ch. 3. | Editorial Synthesis | `INTERPRETIVE_SYNTHESIS` |

---

## 3. Epigraph & Customer-Facing Remedial Evidence Records (7 Records)

| Evidence ID | Substantive Meaning & Domain Scope | Astrological / Astronomical Source Basis | Source Engine / Document | Canonical Epistemic Tier |
| :--- | :--- | :--- | :--- | :--- |
| `epigraph-ch02-bphs-lagna-source` | Classical Sanskrit verse affirming that physical constitution, complexion, intellect, inherent strength, joys, sorrows, and core disposition must all be scrutinized from the Ascendant (*Lagna*). | *BPHS* Ch. 11, Sloka 1; *Phaladeepika* Ch. 1, Sloka 42. | Classical Shastra | `TRADITIONAL_SHASTRA` |
| `epigraph-ch02-bphs-lagna-translation` | Provenance-linked literal scholarly translation of *BPHS* Ch. 11, Sloka 1 defining the Ascendant as the primary orientation and life compass. | *BPHS* Ch. 11, Sloka 1 (*Santhanam / Sharma translation reference*). | Classical Shastra | `TRADITIONAL_SHASTRA` |
| `remedy-ch02-saturn-seva-shastric` | Classical remedial doctrine recommending disciplined self-restraint, contemplative routine, and selfless service (*Shani Seva*) to balance Saturnian energies. | *BPHS* Ch. 84, Slokas 1–4; *Phaladeepika* Ch. 26. | Classical Shastra | `TRADITIONAL_SHASTRA` |
| `remedy-ch02-saturn-seva-modern-extrapolation` | Modern behavioral translation of Saturnian service into dedicated weekly contemplative planning, structured retrospective review, and anonymous community support. | Modern behavioral and vocational adaptation of traditional Saturnian disciplines. | Editorial Synthesis | `MODERN_VOCATIONAL_EXTRAPOLATION` |
| `remedy-ch02-saturn-protocol-step1` | Protocol Step 1: Dedicating 30–45 minutes on Saturday mornings to quiet, structured planning and workflow retrospective. | Modern behavioral protocol linked to Saturnian contemplative focus. | Editorial Synthesis | `MODERN_VOCATIONAL_EXTRAPOLATION` |
| `remedy-ch02-saturn-protocol-step2` | Protocol Step 2: Engaging in humble, anonymous charitable support or practical assistance benefiting elderly or vulnerable community groups. | Modern behavioral protocol linked to Saturnian service (*Seva*). | Editorial Synthesis | `MODERN_VOCATIONAL_EXTRAPOLATION` |
| `remedy-ethical-disclaimer-standard` | Standard Astro Sushil ethical disclaimer affirming that remedial recommendations represent traditional contemplative and behavioral reflections, not medical, legal, or guaranteed commercial solutions. | Platform Ethical Standard; [`INTERPRETIVE_CONVENTIONS.md`](file:///home/pilot/Projects/astrosushil/docs/editorial_rebuild/INTERPRETIVE_CONVENTIONS.md) Section 7. | Configured System Standard | `INTERPRETIVE_CONVENTION` |

---

## 4. Formally Audited Deprecated, Disputed, and Rejected Evidence IDs (5 Records)

| Rejected Evidence ID | Former Compound / Erroneous Claim | True Astronomical / Astrological Status | Audit Action |
| :--- | :--- | :--- | :--- |
| `d1-asc-nakshatra-jyeshtha` | Mislabeled Ascendant at 09° 06' Scorpio as Jyeshtha Nakshatra. | Ascendant at 09° 06' Scorpio is strictly **Anuradha Pada 2**. | **REJECTED & REMOVED**. |
| `d1-aspect-saturn-to-10th` | Claimed Saturn in 12th house Libra casts an aspect on 10th house Leo. | Saturn in House 12 casts Parashari aspects strictly on Houses 2, 6, and 9. | **REJECTED & REMOVED**. |
| `d1-house-10-empty` (Compound) | Combined fact, classical rule, and modern versatility under one generic ID. | Conflated astronomical fact with modern extrapolation. | **REPLACED BY ATOMIC TRIAD**: `d1-house-10-empty-fact`, `d1-house-10-empty-shastric`, `d1-house-10-empty-modern-extrapolation`. |
| `d10-saturn-neecha-bhanga` | Claimed definitive "Neecha Bhanga Raja Yoga" for Saturn in D10. | Engine evaluates D1 only; divisional applicability is historically contested. | **REJECTED AS DEFINITIVE CLAIM**. Replaced by `d10-saturn-1939-aries-disputed-neecha-bhanga` (`DISPUTED_OR_UNVERIFIED`). |
| `d10-sun-saturn-tight-conjunction` | Described Sun and Saturn in D10 7th house as a "tight conjunction". | Angular separation is 19° 34' ($> 10^\circ$). | **REJECTED & REMOVED**. Replaced by `d10-7th-house-sun-saturn-cooccupancy-fact` & `-convention`. |

---

## 5. Reproducible Verification Counts & Sign-Off

The following counts are deterministically verified via the automated validation script:
- **Active D1 Evidence Records:** **37**
- **Active D10 Evidence Records:** **17**
  - *Customer-Facing Active Records:* **16**
  - *Disputed / Unresolved Records (Prohibited in active customer copy):* **1** (`d10-saturn-1939-aries-disputed-neecha-bhanga`)
- **Active Epigraph & Remedial Records:** **7**
- **Total Active Evidence IDs:** **61** (60 customer-facing + 1 disputed)
- **Deprecated / Rejected IDs Audited:** **5**
- **Total Tracked Registry Entries:** **66**
- **Atomic Epistemic Conformance:** **100% of rows match exact canonical tier**
