# Client Clarification Questionnaire - Astro Sushil

This document catalogs essential business rules, astrological methodologies, content specifications, and operational parameters requiring explicit confirmation from the client prior to core engine implementation.

---

## 1. Astrological Methodology & Engine Standards

1. **Ayanamsa Preference**: Which Ayanamsa standard must be used for Kundli and planetary positions?
   - [ ] Lahiri / Chitrapaksha Ayanamsa (Standard default)
   - [ ] Raman Ayanamsa
   - [ ] Krishnamurti (KP) Ayanamsa
   - [ ] Other (Please specify)

2. **House System (Bhava Division)**:
   - [ ] Equal House System / Whole Sign (Standard for Rashi Kundli)
   - [ ] Sri Pati / Placidus System (For Bhava Chalit)
   - [ ] Other

3. **Node Calculation Method**:
   - [ ] Mean Node (Standard default)
   - [ ] True Node

4. **Dasha Engine Parameters**:
   - Confirm Vimshottari Dasha calculation year length:
     - [ ] 365.2425 days (Standard Tropical/Solar calendar year)
     - [ ] 360 days (Savana year)
   - Required Dasha Depth: Up to Level 3 (Mahadasha -> Antardasha -> Pratyantardasha) or Level 4?

5. **Divisional Charts (Vargas)**:
   - Please confirm the exact list of required Vargas to display in mobile app & reports:
     - Mandatory: D-1 (Rashi), D-9 (Navamsha), D-10 (Dasamsa), D-7 (Saptamsa)
     - Optional: D-2, D-3, D-12, D-30, D-60.

6. **Panchang Requirements**:
   - Are daily Panchang calculations based on solar sunrise time at user location or standard regional time?

---

## 2. Gupta Nadi (Brihaspati Nandi Nadi / BNN) Specifications

1. **Formula Documentation**:
   - Please provide the written rules, formulas, and planetary aspect matrices for the BNN engine.
2. **Rule Priority & Precedence**:
   - How should conflicting rules be resolved? (e.g. If a career rule indicates high success but another indicates interruption due to Ketu aspect).
3. **Reference Benchmark Charts**:
   - Can the client provide 10-20 verified sample charts with expected BNN prediction outputs to serve as unit testing reference data?

---

## 3. Product Features & Content Libraries

1. **Daily Horoscope (Rashi Bhavishya)**:
   - Will daily horoscopes be generated dynamically via transit engine rules or provided as a daily text content feed?
2. **Vastu Guidance Content**:
   - Please provide the text library / guidelines for Vastu rules, cardinal direction advice, and room placements.
3. **Astrological Remedies**:
   - What remedies (gemstones, mantras, charity recommendations) should be included in generated reports? Please provide approved remedy rules.

---

## 4. Business, Pricing & Delivery Channels

1. **Report Pricing & Product Tiers**:
   - What are the explicit INR / USD prices for paid reports (Marriage, Career, Childbirth, Gupta Nadi Flagship Dossier)?
2. **Report Page Length & Design Format**:
   - Do you have existing PDF report examples or preferred page length targets (e.g. 15-page comprehensive report vs 5-page concise report)?
3. **WhatsApp Flow Expectations**:
   - Which specific user actions should trigger WhatsApp dispatches (Order confirmation, PDF delivery, daily notification, interactive Kundli query)?
4. **SMS / OTP Service Provider**:
   - Which OTP vendor should be configured for mobile authentication (Twilio, MSG91, Firebase Auth, SMS Country)?
5. **Branding & Design Expectations**:
   - Are there specific brand colors, logos, font guidelines, or design references for the Flutter mobile app and Next.js admin panel?
