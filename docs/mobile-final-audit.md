# Mobile App Final Audit & Screen Mapping

*Document Version*: 1.0.0  
*Last Updated*: 2026-09-02  
*Author*: Astro Sushil Engineering Team  

---

## 1. Overview & Architecture

The Astro Sushil Mobile Application (`apps/mobile`) is built with Flutter and Riverpod for state management. It communicates exclusively via REST backend APIs for authenticated user state, payment processing, report requests, and notification management, while providing a robust offline-first local birth profile experience for guest users.

- **Framework**: Flutter 3.x / Dart 3.x
- **State Management**: Riverpod (`ConsumerWidget`, `StateNotifierProvider`)
- **Backend API Base**: `/api/v1` (Fastify REST Server)
- **Local Storage**: `SharedPreferences` / Secure Storage (Isolated per user account)

---

## 2. Comprehensive Mobile Screen Mapping Table

| Screen Name | File Path | Purpose / Description | API Dependencies | Auth Required | Status | Known Issues |
| :--- | :--- | :--- | :--- | :---: | :---: | :--- |
| `SplashScreen` | `features/splash/splash_screen.dart` | App initialization & session validation | `GET /api/v1/auth/me` | NO | VERIFIED | None |
| `LoginScreen` | `features/auth/screens/login_screen.dart` | User authentication via email/password | `POST /api/v1/auth/login` | NO | VERIFIED | None |
| `RegisterScreen` | `features/auth/screens/register_screen.dart` | New user account creation | `POST /api/v1/auth/register` | NO | VERIFIED | None |
| `VerificationScreen` | `features/auth/screens/verification_screen.dart` | Email OTP verification | `POST /api/v1/auth/verify-email` | NO | VERIFIED | None |
| `ForgotPasswordScreen` | `features/auth/screens/forgot_password_screen.dart` | Request password reset OTP | `POST /api/v1/auth/forgot-password` | NO | VERIFIED | None |
| `ResetPasswordScreen` | `features/auth/screens/reset_password_screen.dart` | Set new password with OTP token | `POST /api/v1/auth/reset-password` | NO | VERIFIED | None |
| `HomeScreen` | `home/screens/home_screen.dart` | Main dashboard & navigation hub | `GET /api/v1/astrology/chart` | NO (Guest Mode Supported) | VERIFIED | None |
| `BirthChartScreen` | `features/astrology/screens/birth_chart_screen.dart` | Interactive Kundli (Chart, Planets, Houses, Nakshatra, Rashi) | `POST /api/v1/astrology/chart` | NO (Guest Mode Supported) | VERIFIED | None |
| `PlanetsScreen` | `features/astrology/screens/planets_screen.dart` | Planetary positions, degrees, nakshatras, dignities | `POST /api/v1/astrology/chart` | NO (Guest Mode Supported) | VERIFIED | None |
| `PlanetDetailScreen` | `features/astrology/screens/planet_detail_screen.dart` | Specific planet breakdown & house influence | `POST /api/v1/astrology/chart` | NO (Guest Mode Supported) | VERIFIED | None |
| `RashiBhavishyaScreen` | `features/astrology/screens/rashi_bhavishya_screen.dart` | Rashi prediction & planetary transit insights | `POST /api/v1/astrology/predictions` | NO (Guest Mode Supported) | VERIFIED | None |
| `JyotiChatScreen` | `features/jyoti/screens/jyoti_chat_screen.dart` | Conversational Jyoti AI Assistant with Markdown rendering | `POST /api/v1/jyoti/chat` | YES (Paywall for Guests) | VERIFIED | None |
| `CareerReportOverviewScreen` | `features/reports/screens/career_report_overview_screen.dart` | 50–75 Page Career Report purchase & preview | `GET /api/v1/reports`, `POST /api/v1/payments/create-order` | YES | VERIFIED | None |
| `CareerReportGenerationScreen` | `features/reports/screens/career_report_generation_screen.dart` | Real-time 7-stage report generation progress tracking | `GET /api/v1/reports/:id/status` | YES | VERIFIED | None |
| `CareerReportPdfScreen` | `features/reports/screens/career_report_pdf_screen.dart` | In-app PDF Report Viewer & download manager | `GET /api/v1/reports/:id/download-file` | YES | VERIFIED | None |
| `BirthProfileListScreen` | `features/birth_profile/screens/birth_profile_list_screen.dart` | Saved birth profiles manager | `GET /api/v1/birth-profiles` | YES (Local for Guest) | VERIFIED | None |
| `CreateBirthProfileScreen` | `features/birth_profile/screens/create_birth_profile_screen.dart` | Create/edit birth details & geocoding | `POST /api/v1/birth-profiles` | NO (Local for Guest) | VERIFIED | None |
| `ProfileScreen` | `home/screens/profile_screen.dart` | User profile, active plan, entitlements, and logout | `GET /api/v1/auth/me` | YES | VERIFIED | None |

---

## 3. Core Operational Journeys Verified

### 3.1 Guest Mode Journey
- **Onboarding & Local Profile**: Unauthenticated users can input birth details locally (`CreateBirthProfileScreen`), view their North Indian Kundli chart (`BirthChartScreen`), inspect planetary positions (`PlanetsScreen`), and read rashi insights without forced registration.
- **Paywall Triggers**: Attempting to access paid features (Jyoti AI Assistant chat, 50-75 Page Career Report generation) opens the login/registration paywall dialog seamlessly.

### 3.2 Authentication & Session Resilience
- **Auth Interceptor**: Single-flight automatic token refresh handles HTTP 401 response transparently via `AuthInterceptor`. If refresh fails or token is revoked, local tokens are cleared and the user is navigated safely to `LoginScreen`.
- **Data Isolation**: Logging out purges local user tokens, cached birth profiles, and active chat history so subsequent logins start with a clean state.

### 3.3 Astrology & Kundli Rendering
- **North Indian Style Chart**: Renders actual calculated house numbers, signs, ascendant sign (`As`), and planetary placement abbreviations (`Su`, `Mo`, `Ma`, `Me`, `Ju`, `Ve`, `Sa`, `Ra`, `Ke`).
- **Data Completeness**: Clean formatting prevents display of `null`, `undefined`, or raw `Planet` placeholders.

### 3.4 Jyoti AI Assistant
- **Markdown & Rich Text**: Backend response strings containing formatting tags (`**bold**`, line breaks) render cleanly via Markdown text widgets.
- **Safe Intent Navigation**: Pre-approved navigation triggers ("Show my birth chart", "Show planets", "Show houses") navigate safely to dedicated Flutter screens without arbitrary route execution risks.

### 3.5 Career Report Pipeline & Cache Management
- **Lifecycle Tracking**: Monitors report generation progress through `QUEUED`, `CALCULATING`, `ANALYZING`, `RENDERING`, `COMPILING`, `UPLOADING`, `COMPLETED`, `FAILED`.
- **Cache Invalidation**: Unique storage keys prevent serving stale PDF files when report regeneration is requested.

### 3.6 Payment & Entitlement Synchronization
- **Razorpay Flow**: Plan selection -> order creation -> Razorpay SDK / Gateway -> backend verification webhook -> automatic entitlement refresh in Riverpod provider without requiring app restart.
