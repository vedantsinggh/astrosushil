# Astrological Interpretive Conventions & Methodological Framework

**Document ID:** `INTERPRETIVE_CONVENTIONS`  
**Phase:** Phase 1D Deliverable 1  
**Status:** REVISED & FINALIZED (PHASE 1D FINAL CLOSURE)  
**Scope:** Career Report Monograph Generation & Audit Standards  
**Target Architecture:** Astro Sushil Editorial Consultation Platform

---

## 1. Philosophical Baseline: Epistemic Humility & System Transparency

Vedic Jyotish is not a single, monolithic, dogmatic system. Across three millennia of shastric development, multiple venerable lineages (*Paramparas*), regional traditions (North Indian, South Indian, Bengali, Maharashtrian), and textual authorities (*Brihat Parashara Hora Shastra*, *Jaimini Upadesa Sutras*, *Bhrigu Samhita*, *Phaladeepika*, *Saravali*, *Tajika Neelakanthi*) have preserved distinct calculation conventions and interpretive doctrines.

To claim that any algorithmic software implementation delivers "the single universal, absolute astrological truth" is intellectually dishonest and astrologically unfounded. 

Therefore, Astro Sushil formally adopts **Configured Interpretive Conventions**. These conventions establish clear, auditable, and mathematically deterministic rules for our engine and editorial monographs, while openly acknowledging tradition-dependent variations.

```
Deterministic Astronomical Ephemeris (Swiss Ephemeris / Lahiri)
                           │
                           ▼
          Configured Interpretive Conventions
                           │
         ┌─────────────────┴─────────────────┐
         ▼                                   ▼
Automated Rule-Consistency Gate      Human Editorial Sign-off
(Verifies algorithmic execution)    (Validates tone, ethics & shastra)
```

---

## 2. Convention 1: Planetary Aspects (*Drishti*) & Nodal Traditions

### 2.1 Standard Classical Seven-Planet Aspects (Parashari)
Our calculation engine and editorial prose strictly follow standard Parashari whole-sign aspectual geometry (*Rashi Drishti* / *Purna Drishti*):
1. **Universal 7th House Aspect:** All seven physical planets (Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn) cast full aspect on the 7th house (180° opposite sign) from their occupied sign.
2. **Special Martial Aspects:** Mars casts full aspects on the **4th**, **7th**, and **8th** houses from its occupied sign.
3. **Special Jovian Aspects:** Jupiter casts full aspects on the **5th**, **7th**, and **9th** houses from its occupied sign (trinal drishti).
4. **Special Saturnine Aspects:** Saturn casts full aspects on the **3rd**, **7th**, and **10th** houses from its occupied sign.

### 2.2 Lunar Nodes (Rahu and Ketu) Aspect Convention
- **Configured Editorial Convention:** The engine and editorial system assign **5th, 7th, and 9th trinal aspects** to Rahu and Ketu, following the Parashari transmission preserved in *BPHS* Ch. 26 and widely practiced in North Indian traditional astrology.
- **Acknowledged Tradition Variation:** 
  - Significant classical commentators and modern astrological authorities (including Dr. B.V. Raman, the Jaimini lineage, and orthodox South Indian scholars) hold that Rahu and Ketu, as mathematical intersection points (*Chhaya Grahas* / shadow planets) lacking physical mass, cast **no drishti whatsoever**, or at most cast a direct 7th mutual aspect.
- **Consultation Editorial Directive:**
  - Where Rahu or Ketu aspects are cited (e.g. Rahu from House 7 aspecting House 11 Moon/Mars), the interpretation must acknowledge this as a subtle, psychological, or karmic overlay rather than an absolute physical constraint.
  - No primary vocational prediction may rely solely on a nodal aspect without corroborating physical planetary configurations.

### 2.3 Crucial Aspect Target Distinction: House vs. House Lord
A frequent failure of automated astrology generators is conflating an aspect on a house with an aspect on that house's lord.
- **Rule:** An aspect cast upon a **house** influences the institutional environment, public visibility, and external affairs of that bhava. An aspect cast upon a **house lord** residing elsewhere influences the personal capacity, decision-making style, and subjective experience of the native.
- **Case Application (Puneet Kumar):** 
  - Jupiter in House 2 casts its 9th aspect on **House 10 (Leo)** $\rightarrow$ Classically regarded as a benefic reputational influence on the institutional sphere.
  - Saturn in House 12 casts its 3rd aspect on **Sun (10th Lord)** in House 2 $\rightarrow$ Traditional indicator of discipline, delayed recognition, and structural accountability on personal leadership execution.
  - **Negative Finding:** Saturn does **NOT** aspect House 10. The system strictly rejects any text claiming Saturn aspects the 10th house.

---

## 3. Convention 2: Classical Yoga Formation & Orb Criteria

Classical yogas represent synthesized planetary combinations with specific textual significations. Our system enforces precise formation criteria:

### 3.1 Chandra-Mangal Yoga (Moon + Mars)
- **Shastric Provenance:** *Saravali* Ch. 15, Slokas 20–21; *Jataka Parijata* Ch. 7.
- **Formation Rule:** Requires Moon and Mars to occupy the same sign (*Saha-Vasa* / conjunction) or mutually aspect each other in Kendras.
- **Reference Profile Evaluation:**
  - Moon at 27° 11' Virgo; Mars at 28° 51' Virgo in House 11.
  - Both reside in the same sign (Virgo) and the exact same Nakshatra Pada (Chitra Pada 2).
  - Angular separation: **01° 40' 00"**.
  - **Verdict:** Validated as an exceptional, highly concentrated degree-level conjunction forming authentic *Chandra-Mangal Yoga*.

### 3.2 Budha-Aditya Yoga (Sun + Mercury)
- **Shastric Provenance:** *Saravali* Ch. 8, Sloka 34; *BPHS* Ch. 3.
- **Formation Rule:** Sun and Mercury co-occupying the same sign.
- **Combustion & Distance Consideration:**
  - In traditional Jyotish, Mercury is frequently within close proximity to the Sun. Deep combustion (*Astangata*) occurs when Mercury is within $3^\circ - 5^\circ$ of the Sun (depending on direct vs. retrograde motion).
  - In our reference chart: Sun is at 12° 01' Sagittarius; Mercury is at 19° 41' Sagittarius.
  - Angular separation: **07° 40' 33"**.
  - **Verdict:** Validated as an effective *Budha-Aditya Yoga* free from deep combustion, supporting articulated analytical intellect.

---

## 4. Convention 3: Planetary Dignity & Neecha Bhanga Resolution

### 4.1 Exaltation Sign vs. Exact Deep Exaltation Degree
- **Exaltation Sign (*Uchcha Rashi*):** A planet located anywhere within its designated exaltation sign (0°00' to 30°00') possesses general sign-level exaltation status (*Uchcha Kshetra*).
- **Deep Exaltation Degree (*Paramochcha Bhaga*):** The specific astronomical point of maximum potency defined by classical texts:
  - Sun: 10° 00' Aries
  - Moon: 03° 00' Taurus
  - Mars: 28° 00' Capricorn
  - Mercury: 15° 00' Virgo
  - Jupiter: 05° 00' Cancer
  - Venus: 27° 00' Pisces
  - Saturn: 20° 00' Libra
- **Application (D10 Sun):**
  - Sun in D10 is at 00° 05' Aries. It resides in its **exaltation sign** (*Uchcha Rashi*), but is 9° 55' away from its deep exaltation point.
  - **Editorial Standard:** Describe as "situated in its exaltation sign of Aries", never as "deeply exalted" or "at peak exaltation".

### 4.2 Comprehensive Shastric Audit of Neecha Bhanga for D10 Saturn

Classical authorities (*Phaladeepika* Ch. 6, Slokas 26–30; *BPHS* Ch. 41; *Jataka Parijata* Ch. 6) establish conditions for the cancellation of debility (*Neecha Bhanga*). When evaluated strictly against Puneet Kumar's D10 placements (D10 Lagna: Libra; Saturn at 19° 39' Aries in House 7; Sun at 00° 05' Aries in House 7; Moon at 01° 52' Aquarius in House 5; Mars at 18° 36' Aquarius in House 5; Venus at 14° 22' Cancer in House 10):

| Condition ID | Classical Shastric Rule | D10 Configuration | Mathematical & Astrological Status | Engine Implementation Status |
| :--- | :--- | :--- | :--- | :--- |
| **NB-COND-1** | Lord of debilitation sign in Kendra from Lagna | Dispositor Mars is in Aquarius (House 5 from D10 Libra Lagna). 5th house is a Trikona, not a Kendra. | **NOT SATISFIED** | Not evaluated for D10 in code |
| **NB-COND-2** | Lord of debilitation sign in Kendra from Moon | Dispositor Mars is in Aquarius, co-occupying the same sign as Moon (1st from Moon). | **SATISFIED (from Moon)** | Not evaluated for D10 in code |
| **NB-COND-3** | Lord of planet's exaltation sign in Kendra from Lagna or Moon | Exaltation lord Venus (ruler of Libra) is in Cancer (House 10 from D10 Lagna = Kendra). | **SATISFIED (from Lagna)** | Not evaluated for D10 in code |
| **NB-COND-4** | Planet that gets exalted in debilitation sign in Kendra from Lagna or Moon | Sun (exalted in Aries) is in Aries (House 7 from D10 Lagna = Kendra). | **SATISFIED (from Lagna)** | Not evaluated for D10 in code |
| **NB-COND-5** | Debilitated planet conjunct an exalted planet or aspected by dispositor | Sun and Saturn co-occupy Aries, but Sun is in its exaltation sign (not deep exaltation) and separated by 19° 34'. Dispositor Mars does not aspect Aries. | **NOT SATISFIED degreewise / NOT MET via aspect** | Not evaluated for D10 in code |

### 4.3 Engine Source Code Verification & Tradition Divergence
1. **Calculation Engine Limitation:**
   - Source code inspection of `@astro/astrology-engine` (`packages/astrology-engine/src/yoga/evaluators/neecha-bhanga.evaluator.ts`) confirms that the engine evaluates Neecha Bhanga **strictly and exclusively for the primary D1 Rashi chart**.
   - The engine's Varga calculator (`VargaCalculator`) derives only raw divisional placements and contains **zero implementation** for evaluating Yogas or Neecha Bhanga inside D10 or other divisional charts.
   - **Mandatory Directive:** We do **not** claim that the calculation engine evaluates or confirms Neecha Bhanga in D10.
2. **Tradition Applicability Dispute:**
   - Classical texts formulate Neecha Bhanga as a constitutional phenomenon of the physical birth chart (D1 Rashi).
   - The orthodox Parashari tradition holds that divisional charts are measurement divisions (*Vargas*) reflecting subtle dignity (*Vimshopaka Bala*), not independent horoscopes where Kendras cancel debility.
   - Other modern/divergent commentators assert that Kendra placements in D10 provide functional cancellation of vocational debility.
3. **Resolution & Editorial Policy:**
   - Because D10 applicability is historically contested and unverified by the calculation engine, the status of Neecha Bhanga for Saturn in D10 is classified as **UNRESOLVED / DISPUTED**.
   - **Definitive claims of Neecha Bhanga in D10 are strictly PROHIBITED.**
   - Saturn in D10 Aries must be evaluated objectively as occupying its debilitation sign, serving as a constructive indicator for contractual diligence, legal safeguards, and structural risk management in business partnerships.

---

## 5. Convention 4: Orb Thresholds (Configured Editorial Convention)

### 5.1 Configured Orb Thresholds vs. Universal Rules
Classical Jyotish traditionally operated on whole-sign rashi boundaries (*Rashi-Bhava*) or specific combustion arcs, without universal consensus on fixed degree orbs for non-solar planetary conjunctions. 

To ensure mathematical precision, reproducible auditability, and prevention of unwarranted claims of planetary fusion, Astro Sushil formally adopts the following **Configured Editorial Conventions**:
- **Close Degreewise Conjunction (`CLOSE_CONJUNCTION`):** Angular separation $\le 5^\circ 00'$. Significant mutual energetic interaction.
- **Moderate Degreewise Conjunction (`MODERATE_CONJUNCTION`):** Angular separation $5^\circ 00' - 10^\circ 00'$. Interactive presence within the same operational sphere.
- **Wide Sign-Based Co-Occupancy (`WIDE_SIGN_COOCCUPANCY`):** Angular separation $> 10^\circ 00'$ (up to $29^\circ 59'$). Planets occupy the same sign/house (*Saha-Bhava*), but operate as distinct, unblended forces.

These thresholds represent Astro Sushil's configured editorial standard and must **not** be presented as universal or dogmatic astrological laws.

### 5.2 Application: D10 7th House Sun and Saturn
- **Sun:** 00° 05' 24" Aries (House 7)
- **Saturn:** 19° 39' 41" Aries (House 7)
- **Angular Distance:** $\Delta = 19^\circ 34' 17" > 10^\circ 00'$.
- **Classification:** Strictly **wide sign-based co-occupancy (`WIDE_SIGN_COOCCUPANCY`)**.
- **Editorial Standard:** Both planets simultaneously influence the 7th house environment of partnerships and alliances along separate vectors without combust or fused blending.

---

## 6. Convention 5: Divisional Chart (Varga) Interpretive Boundaries

1. **Subordinate Diagnostic Role:**
   - Divisional charts (D9, D10, D60) are mathematical harmonics derived from D1. They are **not independent physical birth charts**.
   - A divisional chart cannot override the fundamental constitutional potential established in D1 Rashi.
2. **No Physical Transits to Vargas:**
   - Planetary transits (*Gochara*) occur exclusively through the physical 360° zodiac relative to the D1 Rashi and Moon. Transits are **never** calculated directly onto D10 house cusps.
3. **Departmental House Significations:**
   - D10 represents vocational status and institutional karma (*Karma Phala*). The 4th house in D10 represents institutional workspace and operational base, **not** private domestic real estate or mother. The 7th house in D10 represents commercial contracts and business partnerships, **not** marriage or romantic spouse.

---

## 7. Summary Matrix of Configured Conventions

| Interpretive Area | Astro Sushil Configured Convention | Shastric Basis | Alternative / Divergent Traditions |
| :--- | :--- | :--- | :--- |
| **House System** | Whole Sign (*Rashi = Bhava*) | *BPHS*, *Jaimini*, Classical Antiquity | Sripathi / Porphyry / Placidus unequal house cusps |
| **Ayanamsa** | Lahiri Sidereal (Chitra Paksha) | Official Indian Ephemeris / Govt. of India | Krishnamurti (KP), Raman, Fagan-Bradley, Pushya-Paksha |
| **Nodal Aspects** | Rahu & Ketu cast 5th, 7th, 9th full drishti | *BPHS* Ch. 26, North Indian tradition | South Indian tradition / Dr. B.V. Raman (no drishti for nodes) |
| **D10 Sun-Saturn** | Wide Sign Co-Occupancy (19°34' separation) | Configured Editorial Convention ($\le 5^\circ, 5-10^\circ, >10^\circ$) | Describing all same-sign planets as full conjunctions regardless of degree |
| **D10 Neecha Bhanga** | Classified as UNRESOLVED / CONTESTED; definitive claims prohibited | Engine evaluates D1 only; orthodox tradition restricts to D1 Rashi | Unqualified cancellation claimed whenever dispositor/exaltation lord in Kendra |
| **D10 Nature** | Harmonic lens subordinate to D1 | Classical Shodashavarga Doctrine | Reading Vargas as standalone independent horoscopes |
