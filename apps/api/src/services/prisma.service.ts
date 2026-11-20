import { PrismaClient } from '@prisma/client';
import { config } from '../config';
import { logger } from '../utils/logger';

/**
 * Forces every pooled PostgreSQL session to TimeZone=UTC.
 *
 * Our DateTime columns are `timestamp(3)` (WITHOUT time zone). Prisma writes
 * and reads them as UTC wall-clock values, but raw SQL `clock_timestamp()` /
 * `now()` and Date parameters bound in `$queryRaw`/`$executeRaw` are converted
 * to the SESSION time zone before being stored in such a column. When the
 * PostgreSQL server runs with e.g. TimeZone=Asia/Kolkata, SQL-written values
 * (claim leases, retry schedules, paidAt...) end up 5h30m ahead of Prisma's
 * view, and every comparison mixing the two is wrong. Pinning the session to
 * UTC makes both writers agree regardless of the server's configuration.
 *
 * Adds `options=-c TimeZone=UTC` to the connection URL (or merges it into an
 * existing `options` parameter, replacing any other TimeZone setting).
 * Set DATABASE_FORCE_UTC_SESSION=false only for a connection pooler that rejects
 * the `options` startup parameter; the server's own TimeZone must then be UTC.
 */
export function withUtcSessionTimeZone(url: string): string {
  const utcOption = '-c TimeZone=UTC';
  const queryStart = url.indexOf('?');
  if (queryStart === -1) {
    return `${url}?options=${encodeURIComponent(utcOption)}`;
  }
  const base = url.slice(0, queryStart);
  const params = url.slice(queryStart + 1).split('&').filter((p) => p.length > 0);
  let merged = false;
  const next = params.map((param) => {
    const eq = param.indexOf('=');
    const key = eq === -1 ? param : param.slice(0, eq);
    if (key !== 'options') return param;
    merged = true;
    const current = decodeURIComponent((eq === -1 ? '' : param.slice(eq + 1)).replace(/\+/g, ' '));
    const withoutTz = current
      .replace(/(^|\s)-c\s*TimeZone=\S+/gi, ' ')
      .replace(/(^|\s)--TimeZone=\S+/gi, ' ')
      .trim();
    return `options=${encodeURIComponent(withoutTz ? `${withoutTz} ${utcOption}` : utcOption)}`;
  });
  if (!merged) next.push(`options=${encodeURIComponent(utcOption)}`);
  return `${base}?${next.join('&')}`;
}

function resolveDatasourceUrl(): string | undefined {
  const url = process.env.DATABASE_URL;
  if (!url) return undefined;
  if (process.env.DATABASE_FORCE_UTC_SESSION === 'false') return url;
  return withUtcSessionTimeZone(url);
}

class PrismaService {
  private static instance: PrismaClient;

  public static getInstance(): PrismaClient {
    if (!PrismaService.instance) {
      const url = resolveDatasourceUrl();
      PrismaService.instance = new PrismaClient({
        log: config.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
        ...(url ? { datasources: { db: { url } } } : {}),
      });
    }
    return PrismaService.instance;
  }
}

export const prisma = PrismaService.getInstance();

/**
 * Fast lightweight database ping checking PostgreSQL connectivity.
 */
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Startup guard: returns the database session's TimeZone and logs an error when
 * it is not UTC (raw-SQL timestamps would then disagree with Prisma's).
 */
export async function verifyDatabaseSessionTimeZone(): Promise<string | null> {
  try {
    const rows = await prisma.$queryRaw<Array<{ tz: string }>>`SELECT current_setting('TimeZone') AS tz`;
    const tz = rows[0]?.tz ?? null;
    if (tz && !['UTC', 'Etc/UTC', 'GMT', 'Etc/GMT', 'UCT', 'Zulu'].includes(tz)) {
      logger.error(
        { sessionTimeZone: tz },
        '[Database] PostgreSQL session TimeZone is not UTC. Raw-SQL timestamps (report claim leases, retry schedules) will disagree with Prisma. Remove DATABASE_FORCE_UTC_SESSION=false or set the server TimeZone to UTC.'
      );
    }
    return tz;
  } catch (err: any) {
    logger.warn({ err: err?.message || err }, '[Database] Could not read the session TimeZone');
    return null;
  }
}

/**
 * Gracefully disconnect PrismaClient on server shutdown.
 */
export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
}
