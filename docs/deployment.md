# Production Deployment & Staging Release Candidate Protocol

*Document Version*: 1.0.0  
*Status*: APPROVED FOR OPERATIONAL EXECUTION  
*Last Updated*: 2026-09-02  

---

## 1. Overview

This document specifies the standard operating procedure for deploying Astro Sushil releases to Staging and Production environments. Automatic deployment on push is prohibited for production; all production deployments require explicit human authorization and manual execution of this protocol.

---

## 2. Pre-Deployment Staging Smoke Test Protocol

Before deploying any release candidate to Production, the build must pass the 29-step Staging Smoke Test Suite:

1. Open Mobile App on Staging environment (`https://api-staging.astrosushil.com`).
2. Register a new test user account.
3. Verify test email OTP code.
4. Log into the mobile application.
5. Create a new birth profile (Name: "Test User", DOB: 1995-05-15, Time: 10:30, Location: Delhi).
6. Generate North Indian Kundli chart.
7. Verify planets table display (Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn, Rahu, Ketu).
8. Verify 12 houses rendering without `null` or `undefined` strings.
9. Verify Nakshatras and degrees calculation.
10. Ask Jyoti AI a natural language question ("Explain my career prospects").
11. Test Jyoti intent action chips ("Show my birth chart").
12. Navigate to Career Report section.
13. Select Career Report purchase.
14. Complete test Razorpay payment flow in Test Mode.
15. Confirm instant entitlement update in user profile.
16. Request 50–75 Page Career Report generation.
17. Monitor BullMQ report worker status logs (`QUEUED` $\to$ `COMPLETED`).
18. Verify compiled PDF opens in in-app viewer.
19. Inspect PDF for real client name, DOB, dynamic Dasha timeline, and absence of placeholders.
20. Verify push notification delivery for report completion.
21. Open Admin Panel on Staging (`https://admin-staging.astrosushil.com`).
22. Inspect target test user under Users directory.
23. Inspect Career Report generation diagnostics and 7-stage pipeline timing.
24. Inspect verified payment record under Payments log.
25. Verify active entitlement under User Entitlements.
26. Verify Analytics dashboard rendering for new user & revenue data points.
27. Inspect Audit Log for recorded admin/system events.
28. Log out of Admin and Mobile apps.
29. Log back in and confirm seamless session refresh token rotation.

---

## 3. Step-by-Step Production Deployment Guide

### Step 1: Pre-Deployment Database Snapshot
```bash
# Create an immutable, pre-deployment database backup
pg_dump -h production-db.internal -U postgres -d astro_sushil_prod -F c -f astro_sushil_pre_deploy_backup.dump
```

### Step 2: Build & Verify Workspace Containers
```bash
# Build workspace production container images locally or in CI runner
docker build -t astrosushil/api:v1.0.0 -f apps/api/Dockerfile .
docker build -t astrosushil/admin:v1.0.0 -f apps/admin/Dockerfile .
```

### Step 3: Run Database Migrations
```bash
# Execute safe Prisma database migrations (NEVER use prisma migrate reset!)
npx prisma migrate deploy --schema=apps/api/prisma/schema.prisma
```

### Step 4: Deploy API & Background Worker Instances
```bash
# Deploy updated API service containers
docker-compose -f docker-compose.prod.yml up -d --no-deps api

# Deploy updated Report Worker containers
docker-compose -f docker-compose.prod.yml up -d --no-deps report-worker
```

### Step 5: Deploy Next.js Admin Panel
```bash
# Deploy updated Admin Panel container
docker-compose -f docker-compose.prod.yml up -d --no-deps admin
```

### Step 6: Health & Readiness Verification
```bash
# Verify API liveness and readiness endpoints
curl -f https://api.astrosushil.com/health
curl -f https://api.astrosushil.com/health/ready
```

---

## 4. Post-Deployment Monitoring Window

For 60 minutes following deployment, monitor:
- HTTP 500 error rates on Fastify API logs (`apps/api/logs/app.log`).
- Worker failure events on BullMQ Redis queue (`career-report-queue`).
- Database connection pool utilization and query response latency.
