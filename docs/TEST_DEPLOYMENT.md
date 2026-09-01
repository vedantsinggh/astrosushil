# Astro Sushil: Staging / Free-Tier Testing Deployment Guide

This guide details the exact step-by-step instructions to deploy the complete **Astro Sushil** platform to free / near-zero-cost cloud services for real end-to-end testing.

> **Note**: This environment is intended exclusively for **Staging & Integration Testing**. The Android mobile app remains a local/test APK, pointing to the deployed API endpoint via `--dart-define=TEST_API_URL=...`.

---

## 1. Target Testing Architecture

```
                                  ┌───────────────────────────┐
                                  │      Vercel Hosting       │
                                  │ Next.js Admin Portal UI   │
                                  └─────────────┬─────────────┘
                                                │
                                                ▼ HTTPS
┌──────────────────────────┐      ┌───────────────────────────┐
│     Flutter Test APK     ├─────>│    Render Web Service     │
│ (Android/iOS Test Device)│      │  Fastify API Backend      │
└──────────────────────────┘      └──────┬─────────────┬──────┘
                                         │             │
                    ┌────────────────────┘             └────────────────────┐
                    ▼                                                       ▼
┌──────────────────────────────────────┐                ┌──────────────────────────────────────┐
│        Supabase PostgreSQL           │                │         Upstash Redis Queue          │
│ Relational Database & Metadata Store │                │      BullMQ Queue Broker (TLS)       │
└──────────────────────────────────────┘                └──────────────────┬───────────────────┘
                                                                           │
                                                                           ▼
┌──────────────────────────────────────┐                ┌──────────────────────────────────────┐
│        Cloudflare R2 Storage         │<───────────────┤         Render Private Worker        │
│   Private Object Storage for PDFs    │  Upload Stream │ XeLaTeX PDF Generation & Validation  │
└──────────────────────────────────────┘                └──────────────────────────────────────┘
```

| Service | Hosting Provider | Free-Tier Plan Details |
| :--- | :--- | :--- |
| **Admin Portal** | **Vercel** | Free Hobby Tier (Instant GitHub integration) |
| **Backend API** | **Render** | Free Web Service (512 MB RAM, HTTPS included) |
| **Report Worker** | **Render** | Free Web Service / Private Service (Docker deployment with XeLaTeX) |
| **Database** | **Supabase** | Free Shared PostgreSQL (500 MB DB, SSL required) |
| **Redis Queue** | **Upstash** | Free Serverless Redis (10,000 requests/day, TLS enabled) |
| **Object Storage** | **Cloudflare R2** | Free Tier (10 GB storage, 1M write operations/month) |

---

## 2. Mandatory Deployment Order

Execute deployment in this precise order:

1. **Supabase PostgreSQL Database**
2. **Upstash Redis Queue**
3. **Cloudflare R2 Object Storage**
4. **Render Report Worker (Docker)**
5. **Render Backend API (Docker / Node)**
6. **Vercel Admin Portal (Next.js)**
7. **Flutter Mobile App Configuration (`TEST_API_URL`)**

---

## 3. Step-by-Step Configuration Guide

### Step 1: Supabase PostgreSQL Setup
1. Create a free project at [supabase.com](https://supabase.com).
2. Go to **Project Settings -> Database** and copy the **Transaction Pooler Connection String**:
   ```env
   DATABASE_URL="postgresql://postgres.[REF]:[PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true"
   DIRECT_URL="postgresql://postgres.[REF]:[PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:5432/postgres?sslmode=require"
   ```
3. Run migrations from your local workspace:
   ```bash
   DATABASE_URL="postgresql://postgres.[REF]:[PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:5432/postgres?sslmode=require" npm run db:migrate --workspace=apps/api
   ```

### Step 2: Upstash Redis Setup
1. Create a free database at [upstash.com](https://upstash.com).
2. Note your Redis credentials under **Details**:
   ```env
   REDIS_HOST="your-db.upstash.io"
   REDIS_PORT=6379
   REDIS_PASSWORD="your_upstash_password"
   REDIS_TLS_ENABLED="true"
   UPSTASH_REDIS_REST_URL="https://your-db.upstash.io"
   UPSTASH_REDIS_REST_TOKEN="your_rest_token"
   ```

### Step 3: Cloudflare R2 Setup
1. Log into your Cloudflare dashboard and navigate to **R2**.
2. Create a private bucket: `astrosushil-reports-staging`.
3. Under **Manage R2 API Tokens**, create an API token with `Object Read & Write` permissions.
4. Note credentials:
   ```env
   R2_ACCOUNT_ID="your_cloudflare_account_id"
   R2_ACCESS_KEY_ID="your_r2_access_key_id"
   R2_SECRET_ACCESS_KEY="your_r2_secret_access_key"
   R2_BUCKET_NAME="astrosushil-reports-staging"
   R2_REGION="auto"
   ```

### Step 4: Render Report Worker (Docker)
1. Log into [render.com](https://render.com) and create a **Web Service** or **Private Service**.
2. Connect your GitHub repository.
3. Select **Docker** as environment.
4. Set **Docker Command / Path**: `infrastructure/docker/Dockerfile.worker`
5. Add Environment Variables:
   - `NODE_ENV=production`
   - `DATABASE_URL` (Supabase pooled URL)
   - `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, `REDIS_TLS_ENABLED` (Upstash)
   - `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`
   - `GEMINI_API_KEY`

### Step 5: Render Backend API Setup
1. On Render, create a new **Web Service**.
2. Select **Docker** (using `infrastructure/docker/Dockerfile.api`) or Node environment.
3. Set Build Command: `npm run build:packages && npm run build:api`
4. Set Start Command: `npm run start:api`
5. Set Environment Variables:
   - `NODE_ENV=production`
   - `PORT=10000`
   - `HOST=0.0.0.0`
   - `DATABASE_URL`
   - `JWT_SECRET` (Generate random string, >= 32 characters)
   - `CORS_ORIGIN=https://astro-sushil-admin.vercel.app`
   - `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, `REDIS_TLS_ENABLED`
   - `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`

### Step 6: Vercel Admin Portal
1. Connect your GitHub repository on [vercel.com](https://vercel.com).
2. Set **Root Directory**: `apps/admin`
3. Framework Preset: **Next.js**
4. Add Environment Variable:
   - `NEXT_PUBLIC_API_URL=https://astro-sushil-api.onrender.com`
5. Deploy.

### Step 7: Flutter Mobile Test APK Configuration
Build the test APK locally pointing to the deployed Render API:
```bash
flutter build apk --debug --dart-define=TEST_API_URL=https://astro-sushil-api.onrender.com
```

---

## 4. Environment Secrets Checklist

| Secret Variable | Service | Required In |
| :--- | :--- | :--- |
| `DATABASE_URL` | Supabase | API, Worker |
| `REDIS_HOST` & `REDIS_PASSWORD` | Upstash | API, Worker |
| `R2_ACCESS_KEY_ID` & `R2_SECRET_ACCESS_KEY` | Cloudflare | API, Worker |
| `JWT_SECRET` | Render | API |
| `GEMINI_API_KEY` | Render | API, Worker |
| `NEXT_PUBLIC_API_URL` | Vercel | Admin |

---

## 5. End-to-End Testing Procedure & Verification

1. **API Health Check**:
   ```bash
   curl -i https://astro-sushil-api.onrender.com/health
   # Expected: 200 OK {"status":"ok","timestamp":"..."}
   ```

2. **Admin Portal Login**:
   - Open `https://astro-sushil-admin.vercel.app`.
   - Log in with test admin credentials (`admin@astrosushil.com`).

3. **Report Generation Test (Mobile APK / API)**:
   - Trigger a report generation job via mobile client or API (`POST /api/v1/reports/career`).
   - Observe worker logs on Render: `[ReportWorkerProcess] Dequeued report job from Redis...`
   - Verify PDF QA check passes: `[CareerReportWorker] Report completed successfully`.
   - Verify PDF file is uploaded to Cloudflare R2 under key `reports/{userId}/{reportId}.pdf`.
   - Retrieve signed access URL via `GET /api/v1/reports/{reportId}/access`.
   - Open and verify PDF on mobile device / browser.

---

## 6. Known Free-Tier Limitations

1. **Render Service Cold Starts**: Render free Web Services spin down after 15 minutes of inactivity. The first request after sleep may take ~50 seconds to respond.
2. **Supabase Connection Limits**: Free Supabase instances limit max direct connections to 20. Use pooled `DATABASE_URL` (`port 6543`) for Web API requests.
3. **Upstash Daily Request Cap**: Upstash free tier allows up to 10,000 requests per day.
4. **Cloudflare R2 Free Storage**: 10 GB limit. Run `storageService.cleanupOrphanedObjects()` during periodic maintenance.
