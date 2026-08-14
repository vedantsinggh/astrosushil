# Client Questionnaire & Clarifications Required - Astro Sushil

This document compiles all mandatory astrological, technical, operational, and business questions that must be formally answered by the client prior to core engine implementation.

---

## 1. Astrological Methodology & Math Parameters

1. **Ayanamsa Preference**: Which Ayanamsa standard should be set as the platform default?
   - [ ] Lahiri / Chitrapaksha (Standard Indian default)
   - [ ] Raman Ayanamsa
   - [ ] Krishnamurti (KP) Ayanamsa
   - [ ] Option to allow user toggle?

2. **House System (Bhava Chalit)**: Which house system should be used for Bhava Chalit chart generation?
   - [ ] Equal House / Whole Sign System (recommended for Rashi chart)
   - [ ] Sri Pati House System (traditional Indian Bhava Chalit)
   - [ ] Placidus System

3. **Node Calculation Method**: How should Rahu and Ketu coordinates be computed?
   - [ ] Mean Node (Standard default)
   - [ ] True Node

4. **Dasha Year Standard**: What year length standard should Vimshottari Dasha calculations follow?
   - [ ] Solar Year (365.2425 days per year)
   - [ ] Savana Year (360 days per year)

5. **Mandatory Divisional Charts (Vargas)**: Please confirm the exact list of Vargas required for paid reports.
   - [x] D-1 (Rashi)
   - [x] D-7 (Saptamsa - Children)
   - [x] D-9 (Navamsha - Marriage/Spouse)
   - [x] D-10 (Dasamsa - Career)
   - [ ] Additional Vargas (e.g. D-2 Hora, D-3 Drekkana, D-12 Dwadasamsa, D-30 Trimsamsa, D-60 Shashtiamsa)?

6. **Panchang Specifications**: Are there specific regional variations required for Panchang output (e.g. Amanta vs Purnimanta month endings)?

---

## 2. Proprietary Gupta Nadi (BNN) Specifications

1. **Complete Rulebook**: Can the client provide the complete, written rulebook / formula set for Brihaspati Nandi Nadi (BNN) combinations?
2. **Directional Orbs**: What is the maximum acceptable degree orb for planets to be considered in directional trine (1-5-9) alignment?
3. **Retrograde Planet Rules**: Does a retrograde planet in BNN evaluate from its current sign, its preceding sign, or both?
4. **Rule Precedence Matrix**: When two opposing BNN rules trigger simultaneously (e.g. one indicating career promotion, another indicating delay), what deterministic priority or scoring system resolves the conflict?
5. **Reference Validation Charts**: Can the client supply 10 to 20 benchmark birth charts with verified BNN hand-calculated outcomes for engine verification?

---

## 3. Product Features & Content Libraries

1. **Daily Horoscope (Rashi Bhavishya)**:
   - Should daily horoscopes be dynamically compiled based on transit movements over moon signs, or provided as a static daily/weekly content feed managed via the Admin Panel?
2. **Vastu Content Library**:
   - Can the client supply the text guidelines and recommendations library for the Vastu feature section?
3. **Remedies & Gemstones**:
   - Should paid reports recommend specific gemstone, mantra, or ritual remedies? If yes, please provide the approved remedy matching catalog.

---

## 4. Report Specifications & Design

1. **Sample PDF Reports**: Can the client provide sample target PDFs or visual design templates for Marriage, Career, and Childbirth reports?
2. **Report Length & Depth**: What is the target page count for standard paid reports (e.g. 15-20 pages vs 30+ pages)?
3. **Branding Expectations**: Are there specific brand guidelines (colors, typography, logo assets, visual aesthetic preferences) for the mobile app, PDF reports, and admin panel?

---

## 5. Monetization, Pricing & External Services

1. **Pricing Structure**: What are the exact pricing points in INR and USD for:
   - Marriage Report: ________
   - Career Report: ________
   - Childbirth Report: ________
   - Gupta Nadi Flagship Report: ________
2. **SMS / OTP Service Provider**: What is the preferred SMS/OTP vendor for mobile authentication (e.g. MSG91, Twilio, Firebase Auth)?
3. **WhatsApp Business Account**: Does the client already have an active Meta WhatsApp Business API account set up, or does a new account need to be created?
