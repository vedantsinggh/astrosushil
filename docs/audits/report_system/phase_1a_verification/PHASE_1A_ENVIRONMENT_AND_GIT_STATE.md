# Astro Sushil: Phase 1A Environment and Git State Record

**Document Reference:** `docs/audits/report_system/phase_1a_verification/PHASE_1A_ENVIRONMENT_AND_GIT_STATE.md`  
**Classification:** Forensic Environment Baseline & Git Audit Record  
**Date of Completion:** November 3, 2026  
**Auditor:** DeepMind Agentic Pair Programmer  
**Phase:** Phase 1A (Independent Verification and Evidence Reconciliation)  
**Access Mode:** STRICTLY READ-ONLY (No code, schema, config, or database records modified)  

---

## 1. Executive Summary

In accordance with Phase 1A absolute restrictions, this document establishes the exact, verified technical state of the Astro Sushil codebase and operating environment prior to conducting any reconciliations or formulating implementation plans.

No production source files, test files, prompts, LaTeX templates, dependencies, Prisma schemas, database records, or environment configurations have been modified, committed, or deployed.

---

## 2. Git Repository & Branch State

### Git Metadata
- **Current Branch:** `backend`
- **Head Commit Hash:** `96a0b17f8ff724101da1a234bb7bd1698178ca67`
- **Remote Origin:** `origin/backend` (synchronized with commit `96a0b17`)
- **Recent Commit History:**
  - `96a0b17` (HEAD -> backend, origin/backend) huge changes
  - `b1a8a20` feat: implement core modules for shop, courses, consultations, and reporting features
  - `e0fd6fa` update
  - `63d6489` feat: add end-to-end astrology model parsing tests and fix response JSON deserialization handling
  - `14c33ee` feat: add feature card preview widgets and visual audit documentation for home screen

### Working Tree Status (`git status --short`)
```text
?? docs/audits/report_system/
?? "docs/reference repots/"
```
- **Uncommitted Modifications:** **None**.
- **Staged Changes:** **None**.
- **Untracked Directories:**
  - `docs/audits/report_system/` (contains Phase 0 audit reports and Phase 1 verification reports from prior forensic analysis)
  - `docs/reference repots/` (contains 13 commercial reference PDF reports from Astro Arun Pandit)

---

## 3. Package Versions & Dependency Inventory

The workspace is organized as an npm monorepo with workspace packages managed under `apps/*` and `packages/*`.

### Node.js & Runtime Environment
- **Node.js Version:** `v24.21.0`
- **npm Version:** `11.3.0`
- **Operating System:** Linux (Kernel 6.6+, x86_64)
- **XeLaTeX Executable:** `XeTeX 3.141592653-2.6-0.999995 (TeX Live 2023/Debian)`

### Workspace Package Breakdown

| Workspace / Package | Name | Version | Primary Runtime Dependencies | Key Dev Dependencies |
| :--- | :--- | :---: | :--- | :--- |
| **Monorepo Root** | `astro-platform` | `0.1.0` | *(Workspaces: `apps/*`, `packages/*`)* | `@types/node@^20.11.0`, `typescript@^5.3.3` |
| **API Backend** (`apps/api`) | `@astro/api` | `0.1.0` | `fastify@^4.28.1`, `@prisma/client@^5.14.0`, `zod@^3.23.8`, `@fastify/jwt@^8.0.1`, `@fastify/cors@^9.0.1`, `bcryptjs@^2.4.3`, `dotenv@^16.4.5` | `prisma@^5.14.0`, `tsx@^4.7.0`, `typescript@^5.3.3`, `vitest@^1.6.0` |
| **Admin Portal** (`apps/admin`) | `@astro/admin` | `0.1.0` | `next@^14.1.0`, `react@^18.2.0`, `react-dom@^18.2.0` | `typescript@^5.3.3`, `@types/react@^18.2.48` |
| **Mobile App** (`apps/mobile`) | `mobile` (Flutter) | `1.0.0+1` | Flutter SDK `>=3.3.0 <4.0.0`, `provider`, `http`, `flutter_secure_storage` | Flutter test framework |
| **Astrology Engine** (`packages/astrology-engine`) | `@astro/astrology-engine` | `0.1.0` | `astronomy-engine@^2.1.19`, `@astro/shared@*` | `typescript@^5.3.3`, `vitest@^1.2.2` |
| **Gupta Nadi Engine** (`packages/gupta-nadi-engine`) | `@astro/gupta-nadi-engine` | `0.1.0` | `@astro/shared@*` | `typescript@^5.3.3` |
| **Prediction Engine** (`packages/prediction-engine`) | `@astro/prediction-engine` | `0.1.0` | `@astro/shared@*`, `@astro/astrology-engine@*`, `@astro/gupta-nadi-engine@*` | `typescript@^5.3.3` |
| **Report Engine** (`packages/report-engine`) | `@astro/report-engine` | `0.1.0` | `@astro/shared@*`, `@astro/astrology-engine@*`, `@astro/prediction-engine@*`, `latexto@^0.1.0` | `typescript@^5.3.3` |
| **Shared Types** (`packages/shared`) | `@astro/shared` | `0.1.0` | *(Pure TypeScript types and DTOs)* | `typescript@^5.3.3` |

---

## 4. Database & Infrastructure Environment

### Database Configuration & Environment Mode
- **Reported `NODE_ENV`:** `development` (in both root `.env` and `apps/api/.env`)
- **Database Engine:** PostgreSQL 16 (running locally on port `5432` / `5433`)
- **Prisma Schema Location:** `apps/api/prisma/schema.prisma`
- **Prisma Client Version:** `5.22.0` / `@prisma/client@^5.14.0`
- **Target Database Name:** `astro_sushil`
- **Credentials Policy:** Credentials and secrets are strictly redacted in this audit. No passwords, API keys, or JWT tokens are stored or printed.

### Running Infrastructure Services (Docker)
- Container `astro_redis` (`redis:7-alpine`): Running on `0.0.0.0:6379->6379/tcp` (Status: Up 2 days).
- Container `loanlens-postgres` (`pgvector/pgvector:pg16`): Running on `0.0.0.0:5433->5432/tcp` (Status: Up 2 days, healthy).
- Local system PostgreSQL: Active on port `5432` hosting `astro_sushil`.

### Object Storage Configuration
- **Configured Storage Provider:** Cloudflare R2 (bucket: `astro-sushil-reports`).
- **Active State in `.env`:** `R2_ACCOUNT_ID` and `R2_ACCESS_KEY_ID` are empty/unconfigured.
- **Active Operational Path:** System automatically falls back to local disk storage at `/tmp/astro-sushil/storage/reports` (confirmed via inspection of active filesystem).

---

## 5. Ephemeris & Astronomical Calculation Environment

- **Installed Astronomical Library:** Don Cross's `astronomy-engine` v2.1.19 (pure JavaScript).
- **Swiss Ephemeris Native Library (`libswe` / `swetest`):** Not installed as a system package or bundled binary.
- **Documentation Claim vs Reality:**
  - Code comments and report cover templates claim: *"Calculated under Swiss Ephemeris algorithms."*
  - Runtime implementation: Evaluates planetary positions via `astronomy-engine` followed by a custom linear Lahiri ayanamsha subtraction in `ChartCalculator`.
