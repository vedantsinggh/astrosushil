# Astro Sushil Production Architecture Specification

*Document Version*: 1.0.0  
*Status*: DEPLOYMENT READY  
*Last Updated*: 2026-09-02  

---

## 1. High-Level System Architecture

Astro Sushil is deployed as a modular monorepo service topology. Client channels (Flutter Mobile App & Next.js Admin Panel) communicate strictly via HTTPS with the Fastify API backend. Astrological calculations and prediction rule evaluations execute 100% deterministically in TypeScript packages (`packages/astrology-engine`, `packages/gupta-nadi-engine`, `packages/prediction-engine`). Report PDF generation runs asynchronously via background BullMQ workers executing inside isolated Docker containers equipped with XeLaTeX.

```
+--------------------------+       +--------------------------+
|    Flutter Mobile App    |       |    Next.js Admin Panel   |
|   (iOS & Android Release)|       |  (https://admin.domain)  |
+--------------------------+       +--------------------------+
             |                                   |
             | HTTPS (REST API)                  | HTTPS (REST API)
             +-----------------+-----------------+
                               |
                               v
               +-------------------------------+
               |    Production Fastify API     |
               |     (https://api.domain)      |
               +-------------------------------+
                               |
        +----------------------+----------------------+
        |                      |                      |
        v                      v                      v
+---------------+      +---------------+      +---------------+
| PostgreSQL 16 |      |    Redis 7    |      | Private S3    |
| (Database DB) |      | (Cache/Queue) |      | (PDF Storage) |
+---------------+      +---------------+      +---------------+
                               |
                               v
                       +---------------+
                       | BullMQ Worker |
                       |  (XeLaTeX /   |
                       | Report Jobs)  |
                       +---------------+
                               |
        +----------------------+----------------------+
        |                      |                      |
        v                      v                      v
+---------------+      +---------------+      +---------------+
|  Razorpay SDK |      |  Firebase FCM |      | Gemini 1.5 Pro|
|  (Payments)   |      |  (Push/Email) |      | (NLU Engine)  |
+---------------+      +---------------+      +---------------+
```

---

## 2. Service Responsibilities & Domain Isolation

### 2.1 Fastify REST API (`apps/api`)
- Serves endpoints for Authentication, User Profiles, Birth Profiles, Kundli Charts, Predictions, Jyoti Assistant, Career Reports, Subscriptions, Payments, and Admin Operations.
- Enforces strict server-side RBAC hooks (`checkPermission`), input validation via Zod schemas, CORS constraints, rate limiting, and request ID correlation headers.
- **Never** exposes database credentials, JWT secrets, Gemini API keys, or Razorpay secrets.

### 2.2 Background Workers (`workers/` / `report-worker`)
- Subscribes to BullMQ queues on Redis (`career-report-queue`, `notification-queue`).
- Handles long-running jobs (Career Report TeX generation, XeLaTeX 2-pass compilation, PDF QA validation, S3 upload).
- Operates inside containerized environments pre-installed with `texlive-xetex` and Open Sans fonts.

### 2.3 Object Storage (AWS S3)
- Stores compiled multi-page PDFs under unique, non-predictable keys (`reports/career/<userId>/<reportId>/<filename>.pdf`).
- Configured with private access controls and signed temporary download URL generation.

### 2.4 Database & Cache Layer
- **PostgreSQL 16**: Primary relational database managing Users, Birth Profiles, Reports, Subscriptions, Payments, Entitlements, and Audit Logs.
- **Redis 7**: High-performance in-memory cache for token revocation lists, rate limiting, and BullMQ queue coordination.

---

## 3. Environment Separation Matrix

| Environment Parameter | Development (`development`) | Staging (`staging`) | Production (`production`) |
| :--- | :--- | :--- | :--- |
| **API Domain** | `http://localhost:3000` | `https://api-staging.astrosushil.com` | `https://api.astrosushil.com` |
| **Admin Domain** | `http://localhost:3001` | `https://admin-staging.astrosushil.com` | `https://admin.astrosushil.com` |
| **Database Engine** | PostgreSQL (Local/Docker) | Managed RDS PostgreSQL | Managed RDS PostgreSQL (Multi-AZ) |
| **Redis Instance** | Redis (Local/Docker) | Managed ElastiCache | Managed ElastiCache |
| **Razorpay Credentials**| Test Mode (`rzp_test_...`) | Test Mode (`rzp_test_...`) | **Live Mode (`rzp_live_...`)** |
| **Firebase Project** | `astrosushil-dev` | `astrosushil-staging` | `astrosushil-prod` |
| **Master OTP** | Enabled (Dev Only) | Disabled (`NODE_ENV === 'staging'`) | **Disabled (`NODE_ENV === 'production'`)** |
| **CORS Access** | `*` (Localhost) | Strict Staging Domains | **Strict Production Domains** |
| **Error Handling** | Stack Traces Enabled | Redacted Errors | **Redacted Errors + Request IDs** |

---

## 4. Resource & Cost Optimization Constraints

1. **Gemini NLU Quotas**: Calls to Gemini 1.5 Pro execute only after deterministic evidence collection. Output caching reduces redundant LLM queries.
2. **XeLaTeX Compilation Concurrency**: Report generation concurrency is capped at 4 parallel worker jobs per container instance to prevent CPU and memory exhaustion.
3. **Database Connection Pooling**: API processes use Prisma connection pooling (`connection_limit=20`) with query timeouts.
