import crypto from 'node:crypto';
import { nativeRedisClient } from './redis-client';
import { prisma } from './prisma.service';
import { logger } from '../utils/logger';
import { AppError } from '../errors/app-error';

export interface LockOptions {
  ttlMs?: number;
  waitTimeoutMs?: number;
  retryIntervalMs?: number;
}

export class DistributedLockService {
  private readonly defaultTtlMs = 15000; // 15 seconds
  private readonly defaultWaitTimeoutMs = 10000; // 10 seconds
  private readonly defaultRetryIntervalMs = 250; // 250 ms

  /**
   * Hashes a string key into a 64-bit signed BigInt for PostgreSQL advisory locks.
   */
  public hashKeyToBigInt(key: string): bigint {
    const hash = crypto.createHash('sha256').update(key).digest();
    return hash.readBigInt64BE(0);
  }

  /**
   * Safe Redis release Lua script: Deletes key ONLY if value matches token
   */
  private readonly releaseScript = `
    if redis.call("get", KEYS[1]) == ARGV[1] then
      return redis.call("del", KEYS[1])
    else
      return 0
    end
  `;

  /**
   * Acquires a Redis lock atomically with NX and PX.
   */
  public async acquireRedisLock(
    key: string,
    ttlMs: number = this.defaultTtlMs
  ): Promise<{ acquired: boolean; token: string; key: string } | null> {
    const lockKey = key.startsWith('astrosushil:lock:') ? key : `astrosushil:lock:${key}`;
    const token = crypto.randomUUID();

    try {
      const acquired = await nativeRedisClient.setNxPx(lockKey, token, ttlMs);
      return { acquired, token, key: lockKey };
    } catch (err: any) {
      logger.warn(
        { key: lockKey, err: err?.message },
        '[DISTRIBUTED_LOCK] Redis is unavailable. Redis locking attempt failed.'
      );
      return null;
    }
  }

  /**
   * Releases a Redis lock safely using Lua script.
   */
  public async releaseRedisLock(lockKey: string, token: string): Promise<boolean> {
    try {
      const res = await nativeRedisClient.eval(this.releaseScript, 1, lockKey, token);
      return res === 1 || res === ':1\r\n';
    } catch (err: any) {
      logger.warn({ lockKey, err: err?.message }, '[DISTRIBUTED_LOCK] Error releasing Redis lock');
      return false;
    }
  }

  /**
   * Executes an operation protected by distributed locking across all cluster instances.
   * Uses Redis-backed distributed lock with token verification as primary.
   * Falls back to PostgreSQL transaction-level advisory locks when Redis is unavailable.
   */
  public async withDistributedLock<T>(
    key: string,
    fn: () => Promise<T>,
    options?: LockOptions
  ): Promise<T> {
    const ttlMs = options?.ttlMs ?? this.defaultTtlMs;
    const waitTimeoutMs = options?.waitTimeoutMs ?? this.defaultWaitTimeoutMs;
    const retryIntervalMs = options?.retryIntervalMs ?? this.defaultRetryIntervalMs;
    const lockKey = key.startsWith('astrosushil:lock:') ? key : `astrosushil:lock:${key}`;

    const startTime = Date.now();
    let lockResult: { acquired: boolean; token: string; key: string } | null = null;
    let isRedisWorking = false;

    // Check Redis availability
    try {
      isRedisWorking = await nativeRedisClient.ping();
    } catch {
      isRedisWorking = false;
    }

    if (isRedisWorking) {
      // Loop with backoff to acquire Redis lock if another instance holds it
      while (Date.now() - startTime <= waitTimeoutMs) {
        lockResult = await this.acquireRedisLock(lockKey, ttlMs);
        if (lockResult && lockResult.acquired) {
          break;
        }

        // Wait before retrying
        await new Promise((r) => setTimeout(r, retryIntervalMs));
      }

      if (lockResult && lockResult.acquired) {
        try {
          return await fn();
        } finally {
          await this.releaseRedisLock(lockResult.key, lockResult.token);
        }
      } else {
        logger.warn(
          { lockKey, elapsedMs: Date.now() - startTime },
          '[DISTRIBUTED_LOCK] Redis lock acquisition timed out. Falling back to DB advisory lock serialization.'
        );
      }
    } else {
      logger.warn(
        { lockKey },
        '[DISTRIBUTED_LOCK] Redis is unavailable or unconfigured. Falling back to PostgreSQL transaction-level advisory locks for distributed cluster safety.'
      );
    }

    // Fallback: PostgreSQL Advisory Locks inside Prisma Transaction
    // Guaranteed across all cluster instances sharing the PostgreSQL database.
    const hash = this.hashKeyToBigInt(lockKey);
    return await prisma.$transaction(async (tx) => {
      // pg_advisory_xact_lock returns void, so use $executeRaw instead of $queryRaw
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${hash})`;
      return await fn();
    }, { timeout: 30000 });
  }

  /**
   * Executes within an existing transaction using PostgreSQL advisory transaction lock
   */
  public async withTxAdvisoryLock<T>(
    key: string,
    tx: any,
    fn: () => Promise<T>
  ): Promise<T> {
    const lockKey = key.startsWith('astrosushil:lock:') ? key : `astrosushil:lock:${key}`;
    const hash = this.hashKeyToBigInt(lockKey);
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${hash})`;
    return await fn();
  }
}

export const distributedLockService = new DistributedLockService();
