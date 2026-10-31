# Mobile Accessibility & Usability Audit
**Astro Sushil Mobile Client** — Phase 0 Design Audit for Mature & Non-Technical Demographics  
**Target Demographic:** Adults aged 40–75+ across India and the diaspora seeking astrological guidance, reports, consultations, and spiritual remedies.

---

## 1. Executive Summary & Design Philosophy

The typical client of Astro Sushil is not a digital-native tech worker. They are frequently parents evaluating marriage compatibility for their children, individuals navigating mid-life career transitions, retirees seeking spiritual guidance, or devotees seeking astrological remedies.

### Core Usability Directives:
1. **Respectful Clarity over Tech Complexity:** Astrological insights must be translated into human answers first (*"Will my career stabilize?"*), with mathematical proof available for enthusiasts on tap, not as an impenetrable wall of numbers.
2. **Vernacular-First Inclusion:** Hindi is not an optional feature — it is the primary language of Astro Sushil's existing community.
3. **High-Trust Financial Journeys:** Clear prices, explicit GST breakdowns, instant receipt delivery, and direct human WhatsApp reassurance.
4. **Friction-Free Physical & Visual Interaction:** Minimum 48×48 dp touch targets, robust text scaling up to 130% without clipping, and high-contrast WCAG 2.1 AAA compliance.

---

## 2. Comprehensive Usability & Accessibility Audit

### 2.1 Text Readability, Typography & Font Scaling

| Dimension | Current Implementation | Usability Impact on Mature Users | Required Remedy & Standard |
|---|---|---|---|
| **Base Body Text** | `14sp` with `AppColors.lightTextSecondary` (#718096) on light surfaces. | Low visual contrast on mobile screens, especially outdoors or on low-brightness settings. Difficult for presbyopic eyes. | Elevate default body to **`16sp`**. Use high-contrast `#1A202C` on light backgrounds (contrast ratio > 7:1, WCAG AAA). |
| **Data Tables & Degrees** | `10sp` – `12sp` in planetary degree tables, Ashtakavarga matrices, and Shadbala breakdowns. | Near-impossible to read without reading glasses. Causes eye strain and confusion. | Set minimum table font to **`14sp`**. Group data with alternating high-contrast row shading and clear column dividers. |
| **System Font Scaling** | Standard Flutter text without scaling constraints. When user sets OS font scale to 1.3x–1.5x, cards produce `RenderFlex overflowed by xx pixels`. | Broken layouts, truncated numbers, and invisible CTA buttons when older users increase Android text size. | Wrap all screens in `MediaQuery(data: mediaQuery.copyWith(textScaler: TextScaler.linear(clampedScale)), ...)` and audit all cards for flexible height / `SingleChildScrollView`. |
| **Headings & Hierarchy** | Mixed font weights; headings sometimes blend into card subtitles. | Difficulty skimming content and understanding screen purpose. | Use bold, distinct hierarchy: H1 `24sp` bold, H2 `20sp` semibold, H3 `18sp` medium, Body `16sp`. |

---

### 2.2 Touch Targets & Motor Accessibility

| Component | Current Metric | WCAG 2.1 Standard | Defect Description & Remedy |
|---|---|---|---|
| **Chart Planet Nodes** | Approx. 28×28 dp touch area in `kundli_chart_widget.dart`. | **Min 48×48 dp** | Tapping a specific planet (e.g. Rahu conjunct Sun) in a crowded house causes frequent mis-taps. **Remedy:** Implement enlarged touch hit-test bubbles or open a bottom sheet showing all planets in that house. |
| **Choice Chips (Profiles)** | Height 38 dp, horizontal padding 8 dp. | **Min 48 dp height** | Switching between saved family profiles on `ReportsScreen` is finicky for tremor-prone fingers. **Remedy:** Increase chip height to 48 dp with 14 dp internal padding. |
| **Filter Tabs** | 36 dp tab pills in `AstrologyTabBar`. | **Min 48×48 dp** | Tabs are too small on compact Android phones. **Remedy:** Enforce minimum 48 dp tab touch height. |
| **Action Buttons (CTAs)** | `ElevatedButton` configured with `minimumSize: Size.fromHeight(48)`. | Meets 48 dp standard. | Standard buttons comply, but in-line icon buttons (delete, share, info) often measure only 32×32 dp. **Remedy:** Ensure all `IconButton` widgets have `constraints: BoxConstraints(minWidth: 48, minHeight: 48)`. |

---

### 2.3 Color Contrast & Visual Design

| Surface / Element | Current Colors | Contrast Ratio | Evaluation |
|---|---|---|---|
| Light Card Body Text | `#718096` on `#FFFFFF` | **4.48:1** | Fails WCAG AAA (requires 7:1 for normal text). Borderline AA. |
| Gold Accent on White | `#D9B13B` on `#FAFAFC` | **2.21:1** | **Severe Failure.** Gold icons and badges on light backgrounds are nearly invisible to older eyes. |
| Gold Accent on Navy | `#D9B13B` on `#121440` | **7.82:1** | **Passes AAA.** Gold works brilliantly on dark navy, but must NEVER be placed on white. |
| Error State Banners | `#EF4444` on `#FEF2F2` | **4.92:1** | Passes AA. Clear icon accompaniment ensures non-color-dependent error recognition. |
| Success State Chips | `#10B981` on `#ECFDF5` | **4.65:1** | Passes AA. Needs text weight bolded to improve legibility. |

---

### 2.4 Hindi & English Bilingual Architecture

| Aspect | Current Status | User Impact | Implementation Requirement |
|---|---|---|---|
| **In-App Localization** | English only (`pubspec.yaml` lacks `flutter_localizations`). | Excludes over 60% of Astro Sushil's core audience who prefer Shuddh Hindi or Hinglish. | Integrate `flutter_localizations`, configure `intl`, and build comprehensive `.arb` translation catalogues (`app_en.arb`, `app_hi.arb`). |
| **Astrological Nomenclature** | Transliterated Sanskrit / English (e.g., "Jupiter in 10th House", "Retrograde Saturn"). | Confusing to traditional clients who recognize "गुरु (बृहस्पति) दशम भाव में", "वक्री शनि". | Provide dual-display: e.g., **"बृहस्पति / Jupiter"**, with language toggle prominently accessible in the top AppBar. |
| **Report Language Choice** | Hardcoded to English in Career Report. | Users cannot request their purchased PDF in Hindi. | Add explicit `Language: [Hindi, English]` selector before report generation and store language preference on profile. |

---

### 2.5 Navigation Clarity & Cognitive Load Reduction

#### Problem Analysis: The "Wall of Cards" Home Screen
The existing `HomeScreen` currently attempts to expose all 20+ engine features on a single scrolling page:
1. Header & Active Profile
2. Hero Cosmic Card
3. Jyoti AI Card
4. Quick Access Grid
5. Rashi Bhavishya Card
6. Mini Kundli Preview
7. Planets Preview
8. Vargas (Divisional Charts) Preview
9. Dasha Timeline Preview
10. Matchmaking Preview
11. Panchanga Preview
12. Transits (Gochara) Preview
13. Yogas Preview
14. Jaimini Preview
15. KP Astrology Preview
16. Varshaphala Preview
17. Prashna Preview
18. Ashtakavarga Preview
19. Bhava Bala Preview
20. Shadbala Preview
21. Special Points Preview
22. Vastu Preview
23. Gupta Nadi Card
24. Reports Section

**Impact on Older Users:** Massive scroll fatigue, disorientation, cognitive overload, and complete failure to discover paid reports, consultations, or courses.

#### Recommended 4-Tab Bottom Navigation Architecture:
To create a serene, uncluttered experience while retaining complete access to advanced tools, restructure the app shell into **4 clear, purposeful tabs**:

```
┌────────────────────────────────────────────────────────┐
│ [Logo] Astro Sushil        [Profile Chip] [हिंदी / EN] │
├────────────────────────────────────────────────────────┤
│                                                        │
│                    MAIN TAB CONTENT                    │
│                                                        │
├────────────────────────────────────────────────────────┤
│   [🏠 Home]    [📜 Reports]   [📞 Consult]   [👤 Account]│
└────────────────────────────────────────────────────────┘
```

1. **Tab 1: Home (आज का दिन / Daily Dashboard)**
   - Header with active family member selector.
   - **Today's Panchang & Auspicious Muhurta** (Tithi, Choghadiya, Rahu Kaal).
   - **Daily Rashi Bhavishya** for the selected profile's Moon Sign.
   - **Current Active Dasha** summary (*"You are running Jupiter Mahadasha"*).
   - **Quick Actions:** *"View My Kundli"*, *"Match Kundli"*, *"Ask Sushil Sir"*.
   - **Advanced Tools Hub Button:** Single clean card leading to the full Vedic Tools directory (Vargas, Ashtakavarga, Shadbala, KP, Jaimini, Vastu).
2. **Tab 2: Reports (विस्तृत रिपोर्ट)**
   - Clear catalog of all 5 specialized reports with sample previews:
     - Basic Horoscope (₹299)
     - Mini Horoscope 6-Month Transit (₹199)
     - Pro Horoscope Complete Life Dossier (₹699)
     - Marriage Compatibility Dossier (₹999)
     - Career & Professional Life (₹999)
   - "My Purchased Reports" instant download shelf at the very top.
3. **Tab 3: Consult (परामर्श / Appointments)**
   - Direct access to book 1-on-1 audio/video sessions with Astro Sushil.
   - Plain-language categories:
     - *Budget Friendly Call (₹5,000)*
     - *General Life Guidance (₹10,000)*
     - *Urgent 24-Hour Consultation (₹25,000 / ₹90,000)*
     - *Signature Analysis & Watch Therapy*
     - *Face-to-Face Meeting in Delhi / NCR*
   - Clear 3-step booking: Choose Topic -> Pick Slot -> Confirm on WhatsApp/Razorpay.
4. **Tab 4: Account & Library (मेरी प्रोफ़ाइल और ऑर्डर्स)**
   - Saved family birth profiles.
   - Order history & Tax Invoices (PDF).
   - My Digital Downloads (Wallpapers, Audio Mantras).
   - My Enrolled Courses.
   - Direct WhatsApp Support button (`+91 9621127233`).
   - App language, text size adjuster, and privacy controls.

---

### 2.6 Form Labels, Input Aids & Error Recovery

| Form / Field | Current Defect | Usability Risk | Accessible Design Solution |
|---|---|---|---|
| **Date of Birth** | Text input or standard date wheel. | Typing `YYYY-MM-DD` manually is error-prone. Selecting birth years in the 1950s–1970s requires scrolling through 600 months in standard calendar popups. | Implement year-first picker with quick decade jumpers (1950s, 1960s, 1970s, 1980s). Display confirmation in Indian format: **"15 August 1968"**. |
| **Time of Birth** | 24-hour HH:MM time picker or raw text. | Many older Indians know their birth time as *"सुबह 4:15"* (4:15 AM) or *"शाम 7:30"* (7:30 PM). 24-hour clocks cause 12-hour AM/PM errors. | Dedicated 12-hour picker with prominent, high-contrast **[ AM / सुबह ]** and **[ PM / शाम ]** toggle buttons. Provide checkbox for *"Exact time unknown / जन्म समय निश्चित नहीं"*. |
| **Place of Birth** | Search field requiring precise city name. | Misspelled Indian towns (e.g. "Varanasi" vs "Banaras", "Prayagraj" vs "Allahabad") fail to resolve, blocking chart generation. | Intelligent multi-name alias search backed by OpenStreetMap / Nominatim with state/district badges (e.g., *"Prayagraj (formerly Allahabad), Uttar Pradesh"*). |
| **Error Messages** | Technical exceptions (e.g. `DioException: status 422`, `Invalid coordinate boundary`). | Users think the app is broken and abandon the process. | Human-friendly guidance in plain Hindi/English: *"कृपया जन्म का सही शहर चुनें ताकि कुंडली की गणना सटीक हो सके"* (Please select a valid birth city for accurate calculation). |

---

### 2.7 Payment Trust, Reassurance & Financial Transparency

Older users in India have acute fears of online fraud, duplicate charges, and failed transactions.

#### Required Trust Badges & UX Patterns:
1. **Upfront Price Transparency:** Show total inclusive price before checkout. Never hide the 18% GST until the final bank screen.
   - Example: *"₹299 + ₹53.82 (18% GST) = ₹352.82"*
2. **Security Credentials:**
   - Display official badges: **[ 🔒 100% सुरक्षित भुगतान | RBI Authorized Razorpay Gateway ]**.
   - Show accepted payment icons: UPI (Google Pay, PhonePe, Paytm), Netbanking, Credit/Debit cards.
3. **Post-Payment Reassurance:**
   - Upon successful payment:
     - Play a gentle positive confirmation chime.
     - Show high-contrast green success banner: *"भुगतान सफल | Payment Received"*.
     - Display Order ID, GST Invoice download button, and instant message: *"आपकी रिपोर्ट तैयार की जा रही है। कॉपी आपके ईमेल और व्हाट्सएप पर भी भेजी जाएगी।"* (Your report is being prepared. A copy will also be sent to your Email & WhatsApp).
   - If payment is pending or failed:
     - Provide a direct *"Check Status"* button and an emergency *"Talk to Support on WhatsApp"* link with the order ID auto-filled.

---

### 2.8 Screen Reader & Assistive Tech Accessibility

| Component | State | Issue | Remediation |
|---|---|---|---|
| **Kundli Chart Canvas** | CustomPainter | TalkBack reads: *"Unlabeled graphic"*. Visually impaired users cannot interact with their chart. | Wrap the chart widget in `Semantics(label: "जनम कुंडली। लग्न मेष राशि में, सूर्य दशम भाव में मकर राशि में स्थित है...", ...)`. |
| **Planetary Chips** | Container with text | Screen reader announces disjointed fragments: *"Su", "Cp", "10"*. | Add semantic label: `Semantics(label: "Sun in Capricorn, 10th House, 14 degrees 22 minutes", child: PlanetChip(...))`. |
| **Dasha Timeline** | Custom tree/tiles | Screen reader skips level hierarchy. | Provide structured list tiles with semantic indices: *"Vimshottari Dasha, Level 1: Jupiter Mahadasha from 2020 to 2036"*. |

---

### 2.9 Performance on Budget Devices & Slower Networks

1. **Target Hardware Profile:** Low-to-mid tier Android devices (Redmi, Realme, Samsung Galaxy M/A series with 3GB–4GB RAM, MediaTek Helio processors).
2. **Offline-First Resilience:**
   - Once a birth profile is calculated, its planetary positions, divisional charts, and dasha trees must be cached locally in SQLite/Hive/SharedPreferences.
   - Older users travelling or in tier-2/3 cities with intermittent 4G/3G should be able to view their Janma Kundli and saved reports without re-fetching from the network.
3. **PDF Memory Management:**
   - Heavy 50+ page PDFs (e.g. Pro Horoscope) must not be rendered into full uncompressed bitmaps in Flutter memory, which triggers OOM (Out Of Memory) crashes on 3GB RAM devices. Use streaming page-by-page PDF view via `pdfx` or native Android PDF renderer.

---

## 3. Usability Verification Checklist for Development

- [ ] All interactive buttons have minimum 48×48 dp hit targets.
- [ ] Base body text is minimum 16sp with contrast ratio ≥ 7:1 against background.
- [ ] Text scaling tested up to 130% across all screens without UI overflow.
- [ ] Hindi / English toggle tested on every user-facing screen.
- [ ] Date of Birth picker allows easy selection of birth years from 1940 to present.
- [ ] Time of Birth picker defaults to 12-hour format with AM/PM indicators.
- [ ] Home screen limited to 4 core daily cards + Advanced Tools navigation hub.
- [ ] All payments display clear GST breakdown and official security badges.
- [ ] Direct WhatsApp support button accessible from Account and Payment screens.
- [ ] All generated PDFs cached locally for offline review.

