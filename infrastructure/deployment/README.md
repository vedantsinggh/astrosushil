# Deployment automation status

The repository has local Docker definitions and CI image-build validation. It does not identify a staging platform, registry, deployment identity, API/admin/worker target, staging health URL, or rollback mechanism. Those are required inputs for safe staging deployment automation and are intentionally not guessed here.

## Staging rollout contract to configure

Before adding a deployment trigger, define the staging environment and configure protected GitHub environment secrets for registry authentication and the chosen platform. The deployment must build and publish immutable API, admin, and worker image digests; validate required staging variables without printing values; run `prisma migrate deploy` only against staging; deploy API, admin, and worker images; and verify readiness endpoints plus worker queue health.

Use an explicit `workflow_dispatch` or protected staging environment approval for the first deployment. CI pull requests and pushes to `main` must remain build-and-test only. Do not add production credentials to this workflow.

## Rollback guidance

Redeploy the previous immutable image digests for API, admin, and worker. Check readiness and queue processing before reopening traffic. Prisma migrations are forward-only in this repository: use a reviewed corrective migration for compatible schema changes. For an incompatible migration, stop rollout and follow the staging database backup/restore runbook before retrying. There is no automated database rollback until a provider-specific backup and restore process is documented and exercised.

## Current validation

The CI workflow builds the API, worker, and admin images without deploying them. No staging secrets are currently required. See [CI and test strategy](../../docs/testing/ci-and-test-strategy.md) for CI job behavior and the missing target configuration.
