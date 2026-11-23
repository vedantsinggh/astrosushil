import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { Permission } from '../admin/admin.permissions';
import { checkPermission } from '../admin/rbac/check-permission';
import { adminService } from '../admin/admin.service';
import { featureAccessService } from '../../services/feature-access.service';
import { AuthorizationError } from '../../errors/app-error';

/**
 * HTTP helpers shared by the shop modules (categories, products admin, coupons, cart, wishlist,
 * shop orders, course links, customers).
 */

export interface AdminActor {
  id: string;
  email: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Server-side permission check for every shop admin route: the database-backed checker
 * (custom staff roles are honoured; the role is read from the database, not from the token).
 */
export function requirePermission(...permissions: [Permission, ...Permission[]]) {
  return checkPermission(...permissions);
}

/** Applies the admin panel's authentication to every route of a plugin registered under /admin. */
export function protectAdminScope(fastify: FastifyInstance): void {
  fastify.addHook('onRequest', fastify.authenticate);
  fastify.addHook('onRequest', fastify.authorize(['SUPER_ADMIN', 'ADMIN', 'SUPPORT']));
}

export async function adminActor(request: FastifyRequest): Promise<AdminActor> {
  const profile = await adminService.getProfile(request.user.id);
  return {
    id: request.user.id,
    email: profile.email,
    ipAddress: request.ip,
    userAgent: request.headers['user-agent'],
  };
}

export async function audit(actor: AdminActor, action: string, resource: string, details: string): Promise<void> {
  await adminService.logAction({
    adminId: actor.id,
    adminEmail: actor.email,
    action,
    resource,
    details,
    ipAddress: actor.ipAddress,
    userAgent: actor.userAgent,
  });
}

export function sendOk(reply: FastifyReply, data: unknown, message: string, statusCode = 200) {
  return reply.status(statusCode).send({ statusCode, success: true, message, data });
}

/** Lower-case URL slug (website: slugify(name, { lower: true, strict: true })). */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

/** First free slug among `base`, `base-1`, `base-2`... (website `generateUniqueSlug`). */
export async function uniqueSlug(base: string, isTaken: (slug: string) => Promise<boolean>): Promise<string> {
  const root = base || 'item';
  let slug = root;
  let count = 1;
  while (await isTaken(slug)) {
    slug = `${root}-${count++}`;
    if (count > 500) throw new Error('Could not allocate a unique slug');
  }
  return slug;
}

/**
 * A blocked (suspended) customer may not use the shop.
 *
 * The backend records suspension as the latest USER_SUSPENDED / USER_ACTIVATED / USER_ACCOUNT_DELETED
 * audit entry (`featureAccessService.isUserSuspended`). The website's customer status BLOCKED is
 * stored the same way, so there is one mechanism. Result cached briefly so a request does not add
 * an audit-log query to every call.
 */
const BLOCK_CACHE_MS = 30_000;
const blockCache = new Map<string, { blocked: boolean; at: number }>();

export function forgetCustomerBlockState(userId: string): void {
  blockCache.delete(userId);
}

export async function isCustomerBlocked(userId: string, now: number = Date.now()): Promise<boolean> {
  const cached = blockCache.get(userId);
  if (cached && now - cached.at < BLOCK_CACHE_MS) return cached.blocked;
  const blocked = await featureAccessService.isUserSuspended(userId);
  blockCache.set(userId, { blocked, at: now });
  if (blockCache.size > 5000) {
    for (const [key, value] of blockCache) {
      if (now - value.at >= BLOCK_CACHE_MS) blockCache.delete(key);
    }
  }
  return blocked;
}

/** Hook for customer routes: runs after `fastify.authenticate`. */
export async function requireActiveCustomer(request: FastifyRequest): Promise<void> {
  const userId = request.user?.id;
  if (!userId) return;
  if (await isCustomerBlocked(userId)) {
    throw new AuthorizationError('This account is blocked. Please contact support.');
  }
}

/** Pagination in the website's style (`page`, `limit`), bounded. */
export function pageParams(page: number | undefined, limit: number | undefined, maxLimit = 100) {
  const safeLimit = Math.min(Math.max(Math.trunc(limit ?? 10) || 10, 1), maxLimit);
  const safePage = Math.max(Math.trunc(page ?? 1) || 1, 1);
  return { page: safePage, limit: safeLimit, skip: (safePage - 1) * safeLimit };
}

/** Inclusive date range from `fromDate` / `toDate` query values (website admin filters). */
export function dateRange(fromDate?: string, toDate?: string): { gte?: Date; lte?: Date } | undefined {
  const range: { gte?: Date; lte?: Date } = {};
  if (fromDate) {
    const from = new Date(fromDate);
    if (!Number.isNaN(from.getTime())) range.gte = from;
  }
  if (toDate) {
    const to = new Date(toDate);
    if (!Number.isNaN(to.getTime())) {
      // A bare date means "to the end of that day".
      if (/^\d{4}-\d{2}-\d{2}$/.test(toDate)) to.setUTCHours(23, 59, 59, 999);
      range.lte = to;
    }
  }
  return range.gte || range.lte ? range : undefined;
}
