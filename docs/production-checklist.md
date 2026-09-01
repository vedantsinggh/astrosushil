# Production Deployment Verification Checklist

*Document Version*: 1.0.0  
*Status*: VERIFIED  
*Date*: 2026-09-02  

---

## 1. Infrastructure & Core Services
- [x] **PostgreSQL 16**: Multi-AZ instance provisioned with SSL connection strings (`sslmode=require`).
- [x] **Redis 7**: Password-authenticated instance configured with memory eviction limits (`noeviction` for BullMQ queues).
- [x] **Fastify API Server**: Node.js 20 runtime environment configured with `NODE_ENV=production`.
- [x] **BullMQ Background Workers**: Isolated worker containers running `XeLaTeX` compiler and report worker.
- [x] **S3 Storage Bucket**: Private S3 bucket created with authenticated presigned URL access policy.

## 2. Security & Compliance Controls
- [x] **HTTPS Enforcement**: TLS 1.3 certificates provisioned for `api.astrosushil.com` and `admin.astrosushil.com`.
- [x] **CORS Configuration**: Restricts origin requests strictly to approved Admin and web domains.
- [x] **Secret Isolation**: Server secrets (JWT Secret, Razorpay Secret, Gemini Key, DB Passwords) stored strictly in server environment variables. Zero secrets in Flutter or Admin browser bundles.
- [x] **Master OTP Disabled**: Verified `NODE_ENV === 'production'` disables development master OTP bypasses.
- [x] **Server-Side RBAC**: Every Admin route enforces `preHandler: [checkPermission(...)]` hooks.

## 3. External Integrations
- [x] **Razorpay Live Gateway**: Production `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and webhook signature verification configured.
- [x] **Firebase Cloud Messaging**: Production FCM service account JSON initialized on backend API.
- [x] **Gemini 1.5 Pro AI**: Production API key configured with timeout controls and deterministic fallback providers.
- [x] **Transactional Email**: Production SMTP / Resend provider verified for verification and reset emails.

## 4. XeLaTeX Report Generation
- [x] **TeX Runtime Environment**: `texlive-xetex` and `texlive-latex-extra` installed in worker runtime image.
- [x] **Font Dependencies**: `font-open-sans` and `font-tex-gyre` installed.
- [x] **PDF QA Validator**: `PdfQaValidator` configured to enforce page count ($\ge 5$ pages) and scan for forbidden placeholders (`"Valued Client"`, `"Not supplied"`, `"Planet"`, `"TODO"`).
- [x] **Temp Working Directories**: Isolated `/tmp/astro-sushil/reports/<reportId>` directories cleaned up automatically post-compilation.

## 5. Mobile & Admin App Readiness
- [x] **Flutter Release Build**: Android APK/AAB and iOS release builds pointing to `https://api.astrosushil.com`.
- [x] **Auth Interceptor**: Single-flight token refresh handling HTTP 401 transparently.
- [x] **Admin Build**: Next.js production build (`apps/admin`) with server-side authentication state.

## 6. Observability & Operations
- [x] **Structured Logging**: JSON logging with request ID correlation (`x-request-id`).
- [x] **Health Check Endpoints**: Liveness (`GET /health`) and Readiness (`GET /health/ready`) endpoints verified.
- [x] **Automated Backups**: Daily automated PostgreSQL snapshots with 30-day retention policy.
- [x] **Audit Trail**: State-changing administrative actions logged to `AuditLog` database table.
