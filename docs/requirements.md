# Product Requirements Document (PRD) - Astro Sushil

This document outlines the detailed product requirements for the **Astro Sushil** platform.

---

## 1. Feature Specifications

### 1.1 Free Features
- **FR-FREE-01 (Kundli Generation)**: The system shall calculate and render a standard D-1 Rashi Kundli (North Indian and South Indian chart styles) given date, time, and geographic location of birth.
- **FR-FREE-02 (Planetary Position Table)**: The system shall display planetary positions including sign, exact degree/minute, nakshatra, nakshatra pada, retrograde (Vakra) status, and combustion (Lupta) status.
- **FR-FREE-03 (Rashi & Bhava Analysis)**: Display house cusps, house lords, and planetary placement in houses.
- **FR-FREE-04 (Nakshatra Profile)**: Display birth nakshatra details, moon sign, nakshatra lord, and basic nakshatra characteristics.
- **FR-FREE-05 (Daily Rashi Bhavishya)**: Provide daily horoscope forecasts categorized by the 12 signs. `[CLIENT CONFIRMATION REQUIRED: Source of daily horoscopes - static rule generation vs automated transit system]`
- **FR-FREE-06 (Vastu Guidance)**: Basic Vastu tips organized by rooms, directions (eight cardinal directions), and elemental rules. `[CLIENT CONFIRMATION REQUIRED: Provide exact Vastu content library / guidelines]`
- **FR-FREE-07 (Basic Panchang Utilities)**: Display current daily Tithi, Vara, Nakshatra, Yoga, and Karana.

---

### 1.2 Paid Features & Reports
- **FR-PAID-01 (Marriage & Compatibility Report)**: Generate an in-depth compatibility report featuring Ashtakoota / Dashakoota scoring, Manglik Dosha analysis, and planetary synastry.
- **FR-PAID-02 (Career & Financial Report)**: Generate a comprehensive career report utilizing Dasamsa (D-10) divisional chart analysis, key Dasha periods, and vocational inclinations.
- **FR-PAID-03 (Childbirth & Family Report)**: Generate a child forecasting and progeny report utilizing Saptamsa (D-7) analysis and favorable transit windows.
- **FR-PAID-04 (Custom Personalized Reports)**: Modular PDF dossiers combining overall chart strength, dasha timelines, and actionable remedies. `[CLIENT CONFIRMATION REQUIRED: List of specific remedies / gemstone advice to include]`

---

### 1.3 Flagship Product: Gupta Nadi Engine
- **FR-NADI-01 (Rule Determinism)**: The engine must process planetary configurations using Brihaspati Nandi Nadi (BNN) principles without human intervention or AI guesswork.
- **FR-NADI-02 (Directional & Conjunction Matrix)**: Evaluate 1-5-9 (trine), 2-12, 3-11, and 7th house planetary relationships.
- **FR-NADI-03 (Transit Overlays)**: Calculate planetary transit movements (Saturn, Jupiter, Rahu, Ketu) against natal planetary positions to determine life event timings.
- **FR-NADI-04 (Auditability)**: Each output prediction MUST reference the explicit Rule ID triggered. `[CLIENT CONFIRMATION REQUIRED: Client to provide full set of BNN formulas and rule priority logic]`

---

### 1.4 Communication Channels & Messaging

#### WhatsApp Integration
- **FR-WA-01 (Automated Report Delivery)**: Send generated PDF reports directly to the user's WhatsApp number upon completion.
- **FR-WA-02 (Interactive Message Flows)**: Support conversational interactions (requesting birth details, viewing daily predictions, checking order status).
- **FR-WA-03 (Webhook Processing)**: Robust handling of Meta WhatsApp webhooks with message queueing to avoid dropped messages.

#### Mobile Push Notifications (FCM)
- **FR-NOTIF-01 (Daily Prediction Alerts)**: Dispatch personalized daily notifications based on user's birth moon sign.
- **FR-NOTIF-02 (Order Updates)**: Notify users when an async report generation job completes.

---

### 1.5 Admin Panel Features
- **FR-ADM-01 (User Management)**: View user profiles, birth charts created, transaction history, and status.
- **FR-ADM-02 (Report Order Management)**: Monitor report queue status, retry failed report builds, and re-send PDF reports.
- **FR-ADM-03 (Gupta Nadi Rule Management)**: UI tool for super-admins to inspect, activate, deactivate, or adjust priorities of BNN rules. `[CLIENT CONFIRMATION REQUIRED: Admin rule editing permissions]`
- **FR-ADM-04 (Analytics & Financial Dashboard)**: Track daily sales, revenue per report type, active users, and system performance metrics.

---

### 1.6 Payments & Financial Operations
- **FR-PAY-01 (Razorpay Integration)**: Create order tokens on backend, execute payment on frontend/mobile SDK, and verify payment signature on backend.
- **FR-PAY-02 (Idempotency)**: Guarantee that duplicate payment webhook dispatches do not trigger double report generation or double fulfillment.
- **FR-PAY-03 (Pricing Tiers)**: Dynamic pricing per report type configured in database. `[CLIENT CONFIRMATION REQUIRED: Specific INR / USD pricing for each paid report]`

---

## 2. Non-Functional Requirements

### 2.1 Scalability & Performance
- **NFR-PERF-01**: Standard API responses (chart calculations, basic Kundli APIs) must return within `< 300 ms` under normal load.
- **NFR-PERF-02**: Background PDF generation must complete within `< 30 seconds` from payment verification.
- **NFR-SCALE-01**: System architecture must support at least 10,000 daily active users (DAU) and 1,000 concurrent API requests with horizontal backend scaling.

### 2.2 Security & Authentication
- **NFR-SEC-01**: Secure JWT-based authentication for Mobile and Admin applications.
- **NFR-SEC-02**: Phone number OTP verification for mobile authentication. `[CLIENT CONFIRMATION REQUIRED: Preferred OTP provider (SMS Country / Twilio / MSG91 / Firebase Auth)]`
- **NFR-SEC-03**: All communication must strictly enforce TLS/HTTPS encryption.

### 2.3 User Management & Data Privacy
- **NFR-PRIV-01**: Users can save multiple birth profiles (family members, friends) under a single account.
- **NFR-PRIV-02**: Compliance with data privacy regulations; user birth data must be encrypted at rest.

---

## 3. Requirements Confirmation Summary

| Requirement Area | Status | Action Required |
| :--- | :--- | :--- |
| **Kundli & Planetary Math** | Specified | Pending exact ephemeris engine selection |
| **Gupta Nadi Formulas** | **Pending** | `[CLIENT CONFIRMATION REQUIRED]` - Client must supply BNN rule sets |
| **Daily Rashi Bhavishya Source** | **Pending** | `[CLIENT CONFIRMATION REQUIRED]` - Confirm static vs transit rules |
| **Vastu Guidance Content** | **Pending** | `[CLIENT CONFIRMATION REQUIRED]` - Provide Vastu text library |
| **Report Formats & Remedies** | **Pending** | `[CLIENT CONFIRMATION REQUIRED]` - Provide sample report PDFs |
| **OTP Service Provider** | **Pending** | `[CLIENT CONFIRMATION REQUIRED]` - Select SMS/OTP vendor |
| **Report Pricing** | **Pending** | `[CLIENT CONFIRMATION REQUIRED]` - Define pricing strategy |
