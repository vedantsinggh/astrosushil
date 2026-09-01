# Production Incident Response & Rollback Protocol

*Document Version*: 1.0.0  
*Status*: OPERATIONAL  
*Last Updated*: 2026-09-02  

---

## 1. Incident Classification & Escalation Matrix

| Severity Level | Definition / Criteria | Response SLA | Action Required |
| :--- | :--- | :--- | :--- |
| **P0 - CRITICAL** | Full system outage, database corruption, API completely unreachable, or payment verification failure spike ($> 50\%$). | $\le 15$ mins | Immediate deployment rollback, engineering lead notification, and incident response team assembly. |
| **P1 - HIGH** | Report worker compilation failing continuously, Razorpay webhook failure, or Admin panel login blocked. | $\le 1$ hour | Worker restart, fallback service activation, hotfix deployment. |
| **P2 - MEDIUM** | Degraded performance, high response latency ($> 2000$ms), or non-blocking UI rendering bugs. | $\le 4$ hours | Patch release scheduling and performance tuning. |
| **P3 - LOW** | Minor cosmetic UI issues or non-critical log warnings. | $\le 24$ hours | Backlog prioritization. |

---

## 2. Emergency Application Rollback Procedure

If a P0/P1 deployment failure occurs, immediately execute container rollback:

```bash
# 1. Rollback API service containers to previous release tag
docker-compose -f docker-compose.prod.yml stop api
docker-compose -f docker-compose.prod.yml up -d --no-deps api:v1.0.0-previous

# 2. Rollback Report Worker containers
docker-compose -f docker-compose.prod.yml stop report-worker
docker-compose -f docker-compose.prod.yml up -d --no-deps report-worker:v1.0.0-previous

# 3. Rollback Admin Panel containers
docker-compose -f docker-compose.prod.yml stop admin
docker-compose -f docker-compose.prod.yml up -d --no-deps admin:v1.0.0-previous

# 4. Verify API health
curl -f https://api.astrosushil.com/health/ready
```

---

## 3. Database Disaster Recovery Protocol

If database corruption or irreversible schema failure occurs:

```bash
# 1. Terminate active database connections
SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'astro_sushil_prod';

# 2. Restore PostgreSQL database from latest pre-deployment snapshot
pg_restore -h production-db.internal -U postgres -d astro_sushil_prod --clean --if-exists astro_sushil_pre_deploy_backup.dump

# 3. Verify schema integrity and row counts
npx prisma db seed --schema=apps/api/prisma/schema.prisma
```

---

## 4. Secret Rotation Protocol

If a server secret (`JWT_SECRET`, `RAZORPAY_KEY_SECRET`, `GEMINI_API_KEY`, `DATABASE_URL`) is compromised:

1. **JWT Secret Rotation**: Update `JWT_SECRET` in environment variables. Restart API processes. All existing active user JWT tokens will be invalidated, forcing users to re-authenticate cleanly.
2. **Razorpay Secret Rotation**: Generate new API key secret in Razorpay Live Dashboard. Update `RAZORPAY_KEY_SECRET` in server configuration and re-test webhook verification endpoint (`POST /api/v1/payments/webhook`).
3. **Gemini API Key Rotation**: Rotate key in Google Cloud Console. Update `GEMINI_API_KEY` on backend API server. Mobile apps remain unaffected as client apps do not possess Gemini keys.
