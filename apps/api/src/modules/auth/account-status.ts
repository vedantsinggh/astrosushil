import { AuthorizationError } from '../../errors/app-error';
import { featureAccessService } from '../../services/feature-access.service';

/**
 * Is this account blocked? The one check used wherever a customer can act: the four login paths
 * and token refresh (auth.service.ts), every authenticated request (plugins/jwt.ts), and the shop
 * and account routes (products/shop-http.ts delegates here).
 *
 * "Blocked" is the backend's existing suspension, not a second mechanism: the latest
 * USER_SUSPENDED / USER_ACTIVATED / USER_ACCOUNT_DELETED audit entry of the user
 * (`featureAccessService.isUserSuspended`). The website's customer status BLOCKED, the admin
 * panel's "suspend user" and account deletion all write that entry.
 *
 * The answer is cached per user for a few seconds in this process, as the staff access resolver
 * does (admin/rbac/rbac.resolver.ts), so an authenticated request normally costs no database
 * query. Whoever blocks, unblocks or deletes an account calls `invalidateAccountStatusCache`, so
 * the change is immediate on the instance that made it and reaches any other API instance within
 * the TTL. Login and token refresh always read the database (`fresh`).
 *
 * A database error is not caught: a check that cannot be made refuses the request (fails closed).
 */

export const ACCOUNT_STATUS_CACHE_TTL_MS = 10_000;
const CACHE_MAX_ENTRIES = 5_000;

export const ACCOUNT_BLOCKED_MESSAGE = 'This account is blocked. Please contact support.';

const cache = new Map<string, { expiresAt: number; blocked: boolean }>();

/** Drops the cached state of one account, or of every account when no id is given. */
export function invalidateAccountStatusCache(userId?: string): void {
  if (userId) cache.delete(userId);
  else cache.clear();
}

export async function isAccountBlocked(userId: string, options: { fresh?: boolean; now?: number } = {}): Promise<boolean> {
  const now = options.now ?? Date.now();
  if (!options.fresh) {
    const hit = cache.get(userId);
    if (hit && hit.expiresAt > now) return hit.blocked;
  }

  const blocked = await featureAccessService.isUserSuspended(userId);

  if (cache.size >= CACHE_MAX_ENTRIES) cache.clear();
  cache.set(userId, { expiresAt: now + ACCOUNT_STATUS_CACHE_TTL_MS, blocked });
  return blocked;
}

/**
 * Throws the standard 403 (`AUTHORIZATION_ERROR`) when the account is blocked: the same answer
 * the shop routes and the admin login already give a suspended account.
 */
export async function assertAccountActive(userId: string, options: { fresh?: boolean } = {}): Promise<void> {
  if (await isAccountBlocked(userId, options)) {
    throw new AuthorizationError(ACCOUNT_BLOCKED_MESSAGE);
  }
}
