# Astro Sushil - Zero-Cost Local Android Testing Environment

This guide details how to test the **Astro Sushil Android App** end-to-end on a physical Android device using your local development machine as the report-generation backend—**without incurring any cloud compute server costs**.

---

## 1. Architectural Topology

The test environment routes HTTP traffic securely from a physical Android handset over an encrypted Cloudflare Tunnel into your local development machine:

```
Android Physical Phone
    │
    │ (HTTPS via Cloudflare Tunnel)
    ▼
Cloudflare Edge Tunnel (e.g. https://<tunnel-id>.trycloudflare.com)
    │
    │ (Local Reverse Proxy to 0.0.0.0:3000)
    ▼
Astro Sushil Fastify API Backend (Local Node.js process)
    │
    ├──────────► PostgreSQL (Docker: astro_postgres)
    │
    ├──────────► Redis / BullMQ (Docker: astro_redis)
    │                  │
    │                  ▼
    │           Astro Report Worker (Local Worker process)
    │                  │
    │                  ▼
    │           XeLaTeX Compiler Engine (Local TeXLive + Fonts)
    │                  │
    │                  ▼
    └──────────► Cloudflare R2 Object Storage (PDF Dossiers)
                       ▲
                       │ (Signed / Secure PDF Stream)
                       └────────── Flutter Android PDF Viewer
```

### Key Security & Cost Principles
- **Zero Compute Costs**: API, Worker, Database, Redis, and XeLaTeX compilation run on your workstation.
- **Strict Isolation**: Neither PostgreSQL nor Redis is exposed to the internet. Only the Fastify API port (`3000`) is proxied by Cloudflare Tunnel.
- **Server-Side PDF Engine**: XeLaTeX and LaTeX compilation remain 100% server/worker-side. No LaTeX binary or dynamic report compilation runs on the mobile device.
- **Cloudflare R2 Integration**: PDF reports upload directly from the local worker to R2 and are streamed securely to the mobile viewer.

---

## 2. Prerequisites

1. **Development Host**: Linux / macOS with Node.js `v20+`, Docker & Docker Compose.
2. **XeLaTeX & Fonts**: TeXLive (`xelatex`) installed on your host machine along with required LaTeX packages (`geometry`, `titlesec`, `xcolor`, `tcolorbox`, `enumitem`, `tabularx`).
3. **Cloudflare Tunnel CLI**: `cloudflared` CLI installed (`brew install cloudflared` or `sudo apt install cloudflared`).
4. **Flutter SDK**: Installed and configured for Android builds.
5. **Physical Android Device**: USB debugging or wireless debugging enabled.

---

## 3. Environment Setup & Execution Steps

### Step 1: Start Local Database & Redis Services
Start PostgreSQL and Redis containers using Docker Compose:

```bash
docker-compose up -d postgres redis
```

Verify services are running:
```bash
docker-compose ps
```

---

### Step 2: Start API Server
Ensure your `.env` file in `apps/api/.env` has `HOST=0.0.0.0` and `PORT=3000`.

Start the API backend in development mode:
```bash
npm run dev:api
```
The server will bind to `0.0.0.0:3000`.

---

### Step 3: Start Report Worker
In a separate terminal tab, start the local BullMQ report worker process:

```bash
npm run dev:worker
```

The worker connects to local Redis (`localhost:6379`), listens for report generation jobs, executes astrological calculations, compiles PDFs via XeLaTeX, and uploads reports to Cloudflare R2.

---

### Step 4: Launch Cloudflare Tunnel
Expose your local Fastify API (`http://localhost:3000`) via a temporary Cloudflare Tunnel:

```bash
cloudflared tunnel --url http://localhost:3000
```

`cloudflared` will output a public HTTPS URL:
```
+-----------------------------------------------------------------------------------+
|  Your quick Tunnel has been created! Visit it at:                                 |
|  https://random-words-1234.trycloudflare.com                                       |
+-----------------------------------------------------------------------------------+
```

Copy the generated domain (e.g. `https://random-words-1234.trycloudflare.com`).

---

### Step 5: Configure & Build Android App

Build the Android APK target pointing directly to your Cloudflare Tunnel URL:

```bash
cd apps/mobile

# Run directly on attached physical device
flutter run --dart-define=API_BASE_URL=https://random-words-1234.trycloudflare.com

# OR build release APK for manual installation
flutter build apk --release --dart-define=API_BASE_URL=https://random-words-1234.trycloudflare.com
```

> **Note**: Replace `random-words-1234.trycloudflare.com` with your actual live tunnel hostname.

---

## 4. End-to-End Career Report Verification Flow

Perform the following verification sequence on your physical Android handset:

1. **User Authentication**:
   - Register a new account or log in (Master OTP `4444` in development).
   - Verify JWT access token and refresh token rotation work smoothly over HTTPS tunnel.
2. **Birth Profile**:
   - Create a Birth Profile with accurate birth date, time, and location.
3. **Trigger Report Generation**:
   - Navigate to **Reports** -> **Career & Professional Life**.
   - Tap **Generate Report**.
4. **Backend & Worker Execution**:
   - Fastify receives request -> enqueues job in BullMQ (Redis).
   - `ReportWorker` picks up job -> runs deterministic prediction calculations -> compiles `main.tex` via `xelatex`.
   - Worker validates generated PDF page count and structure -> uploads PDF to Cloudflare R2 storage key.
   - Worker updates Prisma database state to `COMPLETED`.
5. **Mobile View & Download**:
   - Android app polls `/api/v1/reports/:id/status` -> state transitions to `COMPLETED`.
   - Tap **View Full PDF Report** -> PDF downloads securely and renders inside the Flutter PDF previewer.

---

## 5. Network Disconnection & Fault Tolerance Testing

1. **Host Shutdown Test**:
   - Terminate the local API or stop `cloudflared`.
   - Attempt actions in the Android app.
   - **Expected Result**: Mobile UI displays a friendly error snackbar ("Unable to connect to server. Please check your connection.") without crashing.
2. **Host Recovery Test**:
   - Restart API / `cloudflared`.
   - Tap **Retry** in Flutter.
   - **Expected Result**: Session state resumes gracefully without requiring app restart.

---

## 6. One-Command Convenience Startup

To start local services and API/Worker development servers concurrently:

```bash
# Start DB & Redis
docker-compose up -d postgres redis

# Run API and Worker concurrently (in root directory)
npm run dev:api & npm run dev:worker
```

---

## 7. Troubleshooting

| Issue | Cause | Fix |
|---|---|---|
| `Connection refused` in Flutter | `API_BASE_URL` pointed to `127.0.0.1` instead of Cloudflare Tunnel | Rebuild app with `--dart-define=API_BASE_URL=https://<tunnel-id>.trycloudflare.com` |
| `CORS Error` | Origin blocked by Fastify CORS | `registerCors` automatically permits `*.trycloudflare.com` domains in dev mode |
| `XeLaTeX binary not found` | TeXLive missing on host machine | Install TeXLive: `sudo apt install texlive-full` or `texlive-xetex` |
| Worker stuck on `QUEUED` | Local Redis not running | Run `docker-compose up -d redis` and check `redis-cli ping` |

