import { hostname } from 'os';
import { randomUUID } from 'crypto';

/**
 * Identity of this process for report-job claims.
 *
 * Claim tokens are `<instanceId>/<bootId>/<uuid>`. The instance id is stable
 * across restarts of the same logical process (same host + role + pm2 slot),
 * the boot id changes on every start. On start-up a process can therefore
 * release, immediately, the claims still held by a previous boot of ITSELF
 * (which is certainly dead) instead of waiting for the lease to expire.
 *
 * Two live processes must never share an instance id: give each one its own
 * REPORT_WORKER_INSTANCE_ID if you run several of the same role on one host
 * (the pm2 slot id is included automatically).
 */
export type ProcessRole = 'api' | 'worker' | 'proc';

let role: ProcessRole = 'proc';
const bootId = randomUUID().replace(/-/g, '').slice(0, 12);

export function setProcessRole(next: ProcessRole): void {
  role = next;
}

export function getInstanceId(): string {
  const fromEnv = process.env.REPORT_WORKER_INSTANCE_ID?.trim();
  const base = fromEnv || `${hostname()}:${role}:${process.env.pm_id ?? process.env.NODE_APP_INSTANCE ?? '0'}`;
  // '/' separates the token parts.
  return base.replace(/\//g, '_');
}

export function getBootId(): string {
  return bootId;
}

/** Prefix shared by every claim token issued by this instance (any boot). */
export function instanceClaimPrefix(instanceId = getInstanceId()): string {
  return `${instanceId}/`;
}

/** Prefix of claim tokens issued by THIS boot of this instance. */
export function bootClaimPrefix(instanceId = getInstanceId(), boot = bootId): string {
  return `${instanceId}/${boot}/`;
}

export function newClaimToken(): string {
  return `${bootClaimPrefix()}${randomUUID()}`;
}
