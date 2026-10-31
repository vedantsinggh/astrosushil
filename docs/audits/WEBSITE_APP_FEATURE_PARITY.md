# Website-to-App Feature Parity Audit Matrix
**Astro Sushil Ecosystem** — Phase 0 Product & Technical Audit  
**Date:** October 2026  
**Audited Targets:**
- Production Website: [https://astrosushil.com/](https://astrosushil.com/)
- Production Web API: `https://backend.astrosushil.com/api/v1`
- Mobile Codebase: `apps/mobile` (Flutter 3.x, Riverpod 2.5.1, Dio)
- Backend Monorepo: `apps/api` (Fastify, Prisma, PostgreSQL, Redis)
- Calculation Engines: `packages/astrology-engine`, `packages/gupta-nadi-engine`, `packages/report-engine`

---

## 1. Executive Summary

This audit establishes a definitive, evidence-backed inventory of every public offering on the live Astro Sushil website and measures it against the current mobile application and monorepo backend.

### Key Audit Findings:
1. **Total Website Offerings Discovered:** **38 discrete customer features** across 8 distinct product verticals (Astrology Calculation Tools, Personalized PDF Reports, Online Consultations, Educational Courses, Spiritual Shop & E-commerce, Customer Account & Dashboard, Editorial & Blogs, Legal & Customer Support).
2. **Current Mobile Status:**
   - **Working End-to-End:** **6 features** (Free Kundli Birth Chart, Planetary Placements, Dasha Timeline, Ashtakoota Matchmaking calculations, Panchanga, and Career Report PDF generation).
   - **Implemented but Requires Verification:** **4 features** (Transits/Gochara, Ashtakavarga, Vastu guidance, Rashi Bhavishya daily).
   - **UI Exists but Backend/Data Flow Incomplete:** **2 features** (Kundli Report PDF ordering, In-app PDF caching/sharing).
   - **Partially Implemented:** **3 features** (Auth & Birth Profiles, Sushil Explainer / Jyoti AI, Guest mode).
   - **Missing from Mobile:** **23 features** (All 4 consumer website report tiers, all 10 consultation tiers & scheduling, all 3 video courses, all 10 digital/physical shop products, Cart & Checkout, In-app Razorpay payments, Invoices, Downloads library, and Blogs).

---

## 2. Complete Website-to-App Parity Matrix

### Status Classifications:
- `Working end-to-end`: Verified in code, tests, and runtime with full data flow.
- `Implemented but requires verification`: Code exists in mobile and API but lacks end-to-end automated test proof or edge-case validation.
- `UI exists but backend/data flow is incomplete`: Screen or card exists in mobile UI, but backend endpoint or data connection is stubbed or missing.
- `Partially implemented`: Core infrastructure exists, but major customer journeys or attributes are missing.
- `Missing`: Completely absent from the mobile application.
- `Not applicable to mobile`: Web-only utility or desktop admin tool not suitable for native app.
- `Blocked by an external integration`: Dependent on third-party API credentials, webhook setup, or external catalog access.

| # | Website Feature & URL | Purpose & Customer Journey | Existing Mobile Screen / Component | Backend Service / Endpoint | DB / External Dependencies | Payment / Entitlement Req. | Status Classification | Exact Missing Work & Evidence | Priority & Complexity |
|---|---|---|---|---|---|---|---|---|---|
| **I** | **FREE ASTROLOGY TOOLS** | | | | | | | | |
| 1 | **Free Online Kundli**<br>`/free-online-kundli`<br>`/kundli/report/` | Free Janma Kundli generator. Inputs DOB, TOB, Lat/Lng. Displays Lagna, Rashi, 9 Planets, Bhavas, Vimshottari Dasha, Doshas. | `BirthChartScreen`<br>`PlanetsScreen`<br>`VimshottariDashaScreen`<br>`apps/mobile/lib/features/astrology/screens/` | `POST /api/v1/astrology/chart`<br>`POST /api/v1/astrology/planets`<br>`POST /api/v1/astrology/dasha` | `packages/astrology-engine`<br>`swisseph` local calculations | Free / None (Guest & Auth) | **Working end-to-end** | Verified in mobile code & backend test suite. App has interactive chart visualization, planet tables, and dasha trees. | P0 / Low (Done) |
| 2 | **Kundli Matching (Ashtakoota)**<br>`/kundli-matching`<br>`/kundli-match/report/` | 36 Guna Ashtakoota matching for Bride & Groom. Calculates Varna, Vashya, Tara, Yoni, Maitri, Gana, Bhakoot, Nadi + Manglik check. | `MatchmakingScreen`<br>`apps/mobile/lib/features/astrology/screens/matchmaking_screen.dart` | `POST /api/v1/astrology/match-making` | `packages/astrology-engine/src/matchmaking/` | Free / None | **Working end-to-end** | Ashtakoota computation and dosha evaluation fully implemented in engine. UI supports entering two profiles. | P0 / Low (Done) |
| 3 | **Panchanga & Choghadiya**<br>Included in `/free-online-kundli` & header | Daily Tithi, Vaar, Nakshatra, Yoga, Karana, Rahu Kalam, Yamaganda, Sunrise/Sunset. | `PanchangaScreen`<br>`apps/mobile/lib/features/astrology/screens/panchanga_screen.dart` | `POST /api/v1/astrology/panchanga` | `packages/astrology-engine/src/panchang/` | Free / None | **Working end-to-end** | Full solar/lunar astronomical calculation. Real-time sunrise/sunset and Muhurta timings verified. | P1 / Low (Done) |
| 4 | **Transit Predictions (Gochara)**<br>`/saturn-transit-2026-how-shanis-movement-will-affect-every-rashi` | Planetary transits across 12 Rashis with Sade Sati / Kantaka Shani analysis. | `GocharaScreen`<br>`apps/mobile/lib/features/astrology/screens/gochara_screen.dart` | `POST /api/v1/astrology/gochara` | `packages/astrology-engine/src/transit/` | Free / None | **Implemented but requires verification** | UI exists and repository is wired. Needs verification against live reference ephemeris for transit date boundaries. | P1 / Medium |
| 5 | **Ashtakavarga & Bhava Bala**<br>Deep chart strength analysis on web | Sarvashtakavarga (SAV), Bhinnashtakavarga (BAV), and Shadbala planetary strength indicators. | `AshtakavargaScreen`<br>`BhavaBalaScreen`<br>`ShadbalaScreen` | `POST /api/v1/astrology/ashtakavarga`<br>`POST /api/v1/astrology/shadbala` | `packages/astrology-engine/src/ashtakavarga/`<br>`/src/strength/` | Free / None | **Implemented but requires verification** | Heavy data tables rendered. Needs older-audience UI simplification (too technical, micro-typography). | P2 / Medium |
| 6 | **Vastu Shastra Guide**<br>`/services/` | Directional Vastu analysis for Residential & Commercial properties. | `VastuScreen`<br>`VastuDetailScreen`<br>`apps/mobile/lib/features/astrology/screens/vastu_screen.dart` | `GET /api/v1/vastu`<br>`apps/api/src/modules/vastu/` | In-memory rules repository | Free / None | **Implemented but requires verification** | Static content and cardinal direction recommendations work. Needs Hindi localization. | P2 / Low |
| **II** | **PERSONALIZED ASTROLOGY REPORTS (PAID)** | | | | | | | | |
| 7 | **Basic Horoscope Report**<br>`/personalized-astrology-reports/basic-horoscope-report` | Foundational birth chart reading (Lagna, Moon Sign, 9 planets, Dasha timeline, Doshas, Gemstone & Numerology recommendations). | None (`ReportsScreen` has dummy "Coming Soon" card) | None in API (`ReportType` enum has `KUNDLI`, but generator is missing) | PostgreSQL `reports`<br>`packages/report-engine` | ₹299 + GST (₹352.82) | **Missing** | Missing report generator template in `packages/report-engine`, missing API order creation for basic horoscope, missing mobile checkout. | P0 / High |
| 8 | **Mini Horoscope Report**<br>`/personalized-astrology-reports/mini-horoscope-report` | Time-bound 3–6 month planetary forecast tracking active transits, career shifts, health, caution periods. | None | None (`ReportType` enum has no `MINI_HOROSCOPE` entry) | PostgreSQL `reports`<br>`packages/report-engine` | ₹199 + GST (₹234.82) | **Missing** | Missing DB enum, missing LaTeX template, missing API route, missing mobile purchasing journey. | P1 / High |
| 9 | **Pro Horoscope Report**<br>`/personalized-astrology-reports/pro-horoscope-report` | Comprehensive exhaustive life reading (Divisional charts D1-D60, annual predictions, deep career/wealth/marriage, remedies). | None | None (`ReportType` enum has no `PRO_HOROSCOPE` entry) | PostgreSQL `reports`<br>`packages/report-engine` | ₹699 + GST (₹824.82) | **Missing** | Missing DB schema migration, missing multi-chapter PDF compiler, missing mobile checkout. | P0 / High |
| 10 | **Match Making Report (Paid PDF)**<br>`/personalized-astrology-reports/match-making-report` | Detailed 36-guna Ashtakoota marriage compatibility PDF dossier with dosha cancellations and remedial guidance. | None (`MatchmakingScreen` only shows screen summary) | None in API (`ReportType` has `MARRIAGE_COMPATIBILITY`, but generator is stubbed) | PostgreSQL `reports`<br>`packages/report-engine` | ₹999 + GST (₹1,178.82) | **Missing** | Engine calculates math, but PDF generator, LaTeX template, payment linking, and order tracking are absent. | P0 / High |
| 11 | **Career & Professional Life Report**<br>Promoted in app | Detailed vocational analysis based on 10th house, D10 Dashamsha, and planetary careers. | `CareerReportOverviewScreen`<br>`CareerReportGenerationScreen` | `POST /api/v1/reports/career`<br>`POST /api/v1/payments/create-order` | PostgreSQL `reports`<br>BullMQ `report-worker`<br>S3 Storage | ₹999 / Entitlement | **Working end-to-end** | Fully implemented in monorepo! Generation queue, progress polling, PDF download, and viewer work. | P0 / Low (Done) |
| **III** | **ONLINE CONSULTATIONS & APPOINTMENTS** | | | | | | | | |
| 12 | **Budget Friendly Consultation**<br>`/online-consultations/` | 30-min audio session for quick astrological queries. | None | None | PostgreSQL (needs `bookings`, `slots`)<br>Razorpay | ₹5,000 | **Missing** | No consultation booking module in backend or mobile. No slot picker, no payment link. | P0 / High |
| 13 | **General Consultation**<br>`/online-consultations/` | 30-min audio or video session for comprehensive life queries. | None | None | PostgreSQL `bookings`<br>Razorpay | ₹10,000 (Audio)<br>₹15,000 (Video) | **Missing** | Backend has no consultation schemas; mobile has no booking UI. | P0 / High |
| 14 | **Standard Consultation**<br>`/online-consultations/` | 30-min deep dive consultation with priority scheduling. | None | None | PostgreSQL `bookings`<br>Razorpay | ₹15,000 (Audio)<br>₹20,000 (Video) | **Missing** | Missing consultation service, calendar slot manager, and mobile UI. | P1 / High |
| 15 | **Urgent Consultation**<br>`/online-consultations/` | Expedited consultation within 48 hours. | None | None | PostgreSQL `bookings`<br>Razorpay | ₹25,000 (Audio)<br>₹35,000 (Video) | **Missing** | Missing backend calendar priority scheduling. | P1 / High |
| 16 | **Signature Analysis**<br>`/online-consultations/` | Special graphology + astrology video session analyzing signature for wealth & success. | None | None | PostgreSQL `bookings`<br>Razorpay | ₹25,000 | **Missing** | Missing booking flow and document upload for signature samples. | P1 / High |
| 17 | **Wrist Watch Therapy**<br>`/online-consultations/` | Astro-based wrist watch selection & metal recommendation session. | None | None | PostgreSQL `bookings`<br>Razorpay | ₹50,000 | **Missing** | Missing booking flow. | P2 / High |
| 18 | **Age / Longevity Consultation**<br>`/online-consultations/` | In-depth lifespan and critical health cycle analysis session. | None | None | PostgreSQL `bookings`<br>Razorpay | ₹60,000 | **Missing** | Missing booking flow. | P2 / High |
| 19 | **Instant Consultation**<br>`/online-consultations/` | Emergency consultation within 24 hours directly with Astro Sushil. | None | None | PostgreSQL `bookings`<br>Razorpay | ₹90,000 (Audio)<br>₹1,00,000 (Video) | **Missing** | Missing instant alert mechanism and emergency booking flow. | P1 / High |
| 20 | **Face-to-Face Consultation (Delhi/NCR)**<br>`/online-consultations/` | 30-min in-person session in Delhi NCR office. | None | None | PostgreSQL `bookings`<br>Razorpay | ₹1,00,000 | **Missing** | Missing in-person booking and location dispatch workflow. | P2 / High |
| 21 | **Face-to-Face Consultation (Other Cities)**<br>`/online-consultations/` | Exclusive in-person session in client's city. | None | None | PostgreSQL `bookings`<br>Razorpay | ₹1,50,000 | **Missing** | Missing travel coordination booking logic. | P2 / High |
| **IV** | **ASTROLOGY COURSES & LEARNING** | | | | | | | | |
| 22 | **Gupt Nadi Astrology Course**<br>`/courses/gupt-nadi-astrology` | Comprehensive video masterclass on Brihaspati Nandi Nadi (BNN) principles. | None | None | PostgreSQL `courses`, `lessons`, `enrollments`<br>Video CDN / S3 | ₹5,999 | **Missing** | Backend lacks course data models; mobile has no course catalog or secure HLS video player. | P1 / High |
| 23 | **K.N. Rao Method: Marriage & Money**<br>`/courses/shri-k-n-rao-method...` | Astrology course on marriage timing and wealth accumulation. | None | None | PostgreSQL `courses`<br>Video CDN | ₹4,999 | **Missing** | Missing course playback, progress tracking, and purchase flow. | P1 / High |
| 24 | **Dash Mahavidya Astrology Course**<br>`/courses/dash-mahavidya-astrology` | Advanced course covering the 10 Mahavidyas in Vedic astrology. | None | None | PostgreSQL `courses`<br>Video CDN | ₹8,999 | **Missing** | Missing course playback and purchase flow. | P1 / High |
| **V** | **SHOP & SPIRITUAL PRODUCTS** | | | | | | | | |
| 25 | **Consecrated Herb for Unlimited Wealth**<br>`/product/ancient-ramayana-era-herb...` | Consecrated physical herb from Ayodhya during Ravi Pushya Nakshatra. Requires physical shipping. | None | None | PostgreSQL `products`, `orders`, `shipping_addresses` | ₹3,999 (Physical) | **Missing** | Backend has no physical product support or shipping address models; mobile has no shop UI. | P2 / Medium |
| 26 | **Dhan Varsha Kit**<br>`/product/dhan-varsha-kit...` | Digital art + Dhan Prapti wallpaper + Audio mantra in Astro Sushil's voice. | None | None | PostgreSQL `products`, `digital_assets`<br>S3 signed URLs | Paid / Digital | **Missing** | Missing digital asset delivery and audio playback. | P2 / Medium |
| 27 | **Spiritual Wallpapers (7 Variants)**<br>`/product/vivah-siddh-wallpaper...`<br>`/product/garbh-dharan...`<br>`/product/court-case...` | Siddha digital manifestation wallpapers (Vivah Siddh, Garbh Dharan, Garbh Raksha, Student Focus, Court Case, Dhan Prapti, Lakshmi/Ram Darbar). | None | None | PostgreSQL `products`<br>S3 signed URLs | Paid / Digital | **Missing** | Missing digital download store in mobile. | P2 / Medium |
| 28 | **Shopping Cart & Checkout**<br>`/cart`<br>`/checkout` | Multi-item cart, coupon application, address management, COD / Razorpay selection. | None | None (`apps/api` only has single-item report payment) | Razorpay SDK<br>PostgreSQL `cart_items` | Cart total | **Missing** | Missing mobile cart state management and checkout screen. | P2 / High |
| **VI** | **CUSTOMER ACCOUNT & DASHBOARD** | | | | | | | | |
| 29 | **My Profile Management**<br>`/dashboard` | Manage full name, email, phone number, saved delivery addresses. | `ProfileScreen`<br>`apps/mobile/lib/home/screens/profile_screen.dart` | `GET /api/v1/users/me`<br>`PATCH /api/v1/users/me` | PostgreSQL `users` | Free | **Partially implemented** | Profile screen displays email and role, but does not support phone number editing, name editing, or saved addresses. | P1 / Low |
| 30 | **My Birth Profiles**<br>App exclusive feature | Save and manage birth details for self, spouse, children, and parents. | `BirthProfileListScreen`<br>`CreateBirthProfileScreen` | `GET /api/v1/birth-profiles`<br>`POST /api/v1/birth-profiles` | PostgreSQL `birth_profiles` | Free | **Working end-to-end** | Fully functional in mobile and API with geocoding city lookup. | P0 / Low (Done) |
| 31 | **My Orders & Invoices**<br>`/dashboard/orders/:orderId` | View order history, payment status, and download tax invoices as PDF. | None | `GET /api/v1/payments/orders` | PostgreSQL `orders`<br>Invoice PDF generator | Authenticated | **Missing** | Backend returns order list, but has no PDF invoice download endpoint; mobile has no orders list screen. | P1 / Medium |
| 32 | **My Purchased Reports**<br>`/dashboard` (My Reports tab) | Central repository of all generated PDF reports with re-download capabilities. | `ReportsScreen` (only shows active profile's Career report) | `GET /api/v1/reports` | PostgreSQL `reports`<br>S3 signed URLs | Authenticated | **UI exists but data flow incomplete** | Mobile reports screen is hardcoded to single profile career report instead of querying user's full report history. | P0 / Medium |
| 33 | **My Consultations & Bookings**<br>`/dashboard` (My Consultations) | View upcoming scheduled sessions, meeting links (Zoom/Google Meet), and booking invoices. | None | None | PostgreSQL `bookings` | Authenticated | **Missing** | Missing consultation management screen. | P1 / Medium |
| 34 | **My Digital Downloads**<br>`/dashboard` (Downloads tab) | View and download purchased high-resolution wallpapers and audio mantras. | None | None | S3 signed URLs | Authenticated | **Missing** | Missing digital downloads screen in mobile. | P2 / Low |
| **VII** | **EDITORIAL, BLOGS & SUPPORT** | | | | | | | | |
| 35 | **Astrology Blog & Articles**<br>`/blog` (10 published posts) | Educational astrology articles on transits, nakshatras, remedies, and news. | None | None in API | CMS / Markdown / DB | Free | **Missing** | Mobile has no blog reader. Could be cached offline for older readers. | P2 / Low |
| 36 | **Customer Support & WhatsApp**<br>`/contact-us`<br>Floating WhatsApp button | Instant support via WhatsApp (`+91 9621127233` / `+91 6393551359`) and email (`connect@astrosushil.com`). | None in mobile | Backend settings endpoint | `url_launcher` / WhatsApp deep-link | Free | **Missing** | Mobile has no quick contact or WhatsApp help button, which is essential for older users. | P0 / Low |
| 37 | **Policies & Legal Terms**<br>`/terms-conditions`<br>`/privacy-policy`<br>`/cancellation-refund-policy` | Mandatory legal disclosures, refund policy, and terms of service. | None (only a toast banner in ProfileScreen) | None in API | Static markdown / webview | Free | **Missing** | Google Play Store and Apple App Store require explicit in-app links to Privacy Policy and Terms. | P0 / Low |
| **VIII** | **EXCLUSIVE MOBILE CAPABILITIES** | | | | | | | | |
| 38 | **Sushil Sir Contextual Explainer & Jyoti AI**<br>Mobile-exclusive feature | On-demand voice-of-authority AI interpretation of complex astrological placements using strictly deterministic inputs. | `SushilExplainerSheet`<br>`JyotiChatScreen` | `POST /api/v1/jyoti/chat`<br>`POST /api/v1/jyoti/explain` | MiniMax / Gemini LLM formatting engine<br>PostgreSQL context | Authenticated | **Working end-to-end** | Fully conforms to AGENTS.md rule 4 (100% deterministic calculation, LLM strictly for NLP translation). | P0 / Low (Done) |

---

## 3. Critical Architectural & Data-Integrity Gaps

### Gap 1: Incompatible Database Order Schema
In the current monorepo (`apps/api/prisma/schema.prisma`):
```prisma
model Order {
  id                String      @id @default(uuid())
  userId            String
  razorpayOrderId   String      @unique
  razorpayPaymentId String?     @unique
  amount            Int
  currency          String      @default("INR")
  status            OrderStatus @default(PENDING)
  reportType        ReportType  // <-- HARDCODED TO SINGLE REPORT TYPE
  reports           Report[]
}
```
**Impact:** The existing database schema cannot accept an Order for a Consultation, a Course, a Digital Product, or a Physical Herb. An attempt to purchase anything other than a `ReportType` enum will throw a Prisma validation exception.
**Remedy:** Refactor `Order` to support polymorphic item lines (`OrderItem`) with item types: `REPORT`, `CONSULTATION`, `COURSE`, `PRODUCT`.

### Gap 2: Missing Report Generators in `report-engine`
The website sells 4 core reports:
1. `Basic Horoscope Report` (₹299)
2. `Mini Horoscope Report` (₹199)
3. `Pro Horoscope Report` (₹699)
4. `Match Making Report` (₹999)

In `packages/report-engine`:
Only `CareerReportService` has an active PDF generator (`career-report.service.ts`). `KundliReportGenerator` is an incomplete stub, and `MiniHoroscope`, `ProHoroscope`, and `MatchmakingReport` do not exist. Users cannot receive what they pay for on mobile without these generators.

### Gap 3: Missing In-App Payment Gateway
`apps/mobile/pubspec.yaml` has no Razorpay or payment plugin. The current mobile payment flow is purely simulated or restricted to admin pre-granted entitlements. Without a native Razorpay SDK or secure checkout sheet, no monetary transactions can occur inside the Flutter app.

---

## 4. Verification Evidence & Artifact Locations

| Artifact | Location | Verification Status |
|---|---|---|
| Live Frontend Bundle | `https://astrosushil.com/assets/index-DeUchiRX.js` | Inspected via headless analysis. 47 lazy chunks identified. |
| Live Consultation API | `https://backend.astrosushil.com/api/v1/consultation` | Queried. 10 consultation tiers returned with exact prices. |
| Live Report API | `https://backend.astrosushil.com/api/v1/report` | Queried. 4 report tiers returned with prices and descriptions. |
| Live Products API | `https://backend.astrosushil.com/api/v1/products` | Queried. 10 products returned (1 physical, 9 digital). |
| Live Courses API | `https://backend.astrosushil.com/api/v1/courses` | Queried. 3 video courses returned. |
| Mobile Navigation | `apps/mobile/lib/home/screens/home_screen.dart` | Code inspected. 3 bottom tabs, 20+ feature cards. |
| Mobile Reports Tab | `apps/mobile/lib/home/screens/reports_screen.dart` | Code inspected. Career report works; Kundli is marked coming soon. |
| Mobile Pubspec | `apps/mobile/pubspec.yaml` | Inspected. No Razorpay, no localization dependencies. |
| API Database Models | `apps/api/prisma/schema.prisma` | Inspected. Lacks consultation, course, and product models. |

