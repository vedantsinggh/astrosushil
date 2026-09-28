# Background Workers - Astro Sushil

> [!NOTE]
> **Active Implementation Location**: The current operational background worker runs out of **`apps/api/src/worker.ts`** and is executed via `npm run dev:worker`.
> This `/workers/` directory is an architectural placeholder for future standalone worker microservices (Phase 15+).

## Current Active Worker Architecture
- **Script Command**: `npm run dev:worker` (delegates to `apps/api/package.json` -> `tsx watch src/worker.ts`)
- **Queue Engine**: `RedisQueueService` (`apps/api/src/services/redis-queue.service.ts`)
- **Pipeline Implementation**: `CareerReportWorker` (`apps/api/src/services/report-worker.service.ts`)
- **PDF Engine**: XeLaTeX compiler (`@astro/report-engine`)
- **Storage**: Cloudflare R2 / Local fallback (`apps/api/src/services/storage.service.ts`)

## Future Scope (Phase 15+)
When background processing is decoupled from `@astro/api`, standalone BullMQ worker packages will be housed under this directory.
