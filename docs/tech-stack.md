# Technology Stack

## Backend & Worker (`apps/api`)
- **Runtime & Language**: Node.js, TypeScript (`"strict": true`)
- **HTTP Framework**: Fastify (`@fastify/jwt`, `@fastify/cookie`, `@fastify/cors`, `@fastify/rate-limit`, `@fastify/multipart`)
- **ORM & Database**: Prisma ORM + PostgreSQL
- **Validation**: Zod (`zod` & `zod/v3`)
- **Logging**: Pino (`apps/api/src/utils/logger.ts`) with strict secret/PII redaction
- **Payments**: Razorpay (orders, payment verification, HMAC-verified webhooks)
- **Messaging Providers**:
  - SMS: **SMSLane** (`SmsLaneProvider`)
  - WhatsApp: **WhatChimp** (`WhatChimpProvider`)
  - Email: **SMTP** via `nodemailer` (`SmtpEmailProvider`)
  - Push: **Firebase Cloud Messaging (FCM)**
- **Testing**: Vitest (`tests/unit`, `tests/integration`)

## Astrology & Report Packages (`packages/*`)
- **`@astro/astrology-engine`**: TypeScript + local Swiss Ephemeris / astronomical calculation modules (Lahiri ayanamsa, D1–D60 vargas, dashas, panchang, ashtakavarga, varshaphala, prashna, KP, Jaimini, Lal Kitab, muhurta, matchmaking)
- **`@astro/gupta-nadi-engine`**: Brihaspati Nandi Nadi (BNN) rule evaluation
- **`@astro/prediction-engine`**: Deterministic evidence engines + AI provider adapters (Gemini, OpenRouter, Groq)
- **`@astro/report-engine`**: Universal report platform compiling deterministic data + LLM prose into LaTeX/PDF dossiers and GST invoice PDFs

## Customer Website (`apps/website`)
- **Framework**: React 19 + Vite 8 + React Router
- **Styling**: Tailwind CSS v4 (`@tailwindcss/vite`, `@tailwindcss/typography`)
- **State & HTTP**: Zustand (`useAuthStore`, `usSettingStore`, etc.) + Axios (`withCredentials: true` + CSRF interceptor)
- **Animation & Icons**: Framer Motion, Lucide React, Swiper

## Admin Portal (`apps/admin`)
- **Framework**: Next.js (App Router) + React + TypeScript
- **Auth & HTTP**: `apiFetch` (`apps/admin/lib/api-client.ts`) using `httpOnly` admin cookies (`astro_admin_access` / `astro_admin_refresh`) + `X-CSRF-Token` + `X-Auth-Scope: admin`

## Mobile App (`apps/mobile`)
- **Framework**: Flutter (Dart) targeting **iOS** and **Android**
- **State Management**: Riverpod (`flutter_riverpod`)
- **Networking**: Dio with Bearer JWT `AuthInterceptor`
- **Localization**: `flutter_localizations` (English `en` & Hindi `hi` ARB files)
- **Payments & Storage**: Razorpay Flutter SDK, `flutter_secure_storage`, `pdf` / `printing`
