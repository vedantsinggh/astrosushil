# CI and test strategy

## Local commands

- `npm ci` installs the exact JavaScript dependency graph from `package-lock.json`.
- `npm run db:generate --workspace=apps/api` generates the Prisma client.
- `npm exec --workspace=apps/api -- prisma validate` validates the Prisma schema.
- `npm exec --workspace=apps/api -- prisma migrate deploy` applies committed migrations to the selected database. Use only a disposable local test database for this command.
- `npm test` runs the API unit and integration suite, report-engine PDF and report regressions, and astrology-engine unit regressions in sequence.
- `npm run build` builds internal TypeScript packages, the API, and the admin app.
- `npm run lint --workspace=apps/admin` runs the Next.js ESLint rules. The admin has a matching `eslint-config-next` and ESLint dev setup; both are MIT licensed and are development-only dependencies.
- From `apps/mobile`, run `flutter pub get --enforce-lockfile`, `flutter analyze --no-pub`, and `flutter test --no-pub`.

API integration tests use PostgreSQL and Redis. Point `DATABASE_URL` and `TEST_DATABASE_URL` only at a disposable test database; some suites create and delete records. CI provisions isolated service containers and applies migrations before tests. File-level test parallelism is disabled for API suites because tests share service state.

The report-engine suite is invoked through the API Vitest configuration so it uses the same aliases and toolchain. PDF output created by tests is placed in the system temporary directory, not in tracked repository artifacts.

## CI stages

The pull request and `main` workflow has six independent jobs:

1. Backend: locked install, Prisma generation/schema validation, disposable PostgreSQL migrations, all TypeScript workspace/API builds, API/payment-security/fulfillment/queue suites, and JUnit output.
2. Report regression: local TeX toolchain, report-engine and PDF regressions, and JUnit output.
3. Astrology regression: calculation and determinism fixtures, and JUnit output.
4. Prediction regression: deterministic evidence and mocked provider contracts, and JUnit output.
5. Mobile: locked Flutter dependency resolution, static analysis, unit/widget tests, and machine-readable test output.
6. Frontend and containers: admin ESLint and build plus API, worker, and admin Docker build validation.

The admin lint currently completes with 12 React hook dependency warnings. They remain visible and are not auto-fixed as part of repository cleanup.

No production credentials are required. Test secrets are synthetic values defined in the workflow. Staging deployment is intentionally not automated yet: the repository currently defines no staging provider, target, identity mechanism, health URL, or rollback contract. Configure those concrete values before adding a workflow that can mutate staging.

## Coverage boundaries

The repository contains extensive API and astrology coverage, report generation and PDF assertions, payment/webhook security, fulfillment, queue ownership, notification delivery, and Flutter widget tests. Tests depending on PostgreSQL and Redis require those services. Current local baseline execution without services is expected to fail DB-backed cases; catalogue price assertions and several API route assertions also currently fail independently of service availability. These failures are retained as findings and are not suppressed.
