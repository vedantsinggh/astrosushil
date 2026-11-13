import dotenv from 'dotenv';
import path from 'path';
import { nativeRedisClient } from './redis-client';
import { logger } from '../utils/logger';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export class RedisQueueService {
  private queueKey = 'astrosushil:queue:reports';
  private pendingKey = 'astrosushil:queue:reports:pending';
  private claimedKey = 'astrosushil:queue:reports:claimed';
  private claimsHashKey = 'astrosushil:queue:reports:claims';

  // In-memory fallback structures when Redis is unconfigured or disabled
  private fallbackQueue: string[] = [];
  private fallbackPending = new Set<string>();
  private fallbackClaimed = new Set<string>();
  private fallbackClaims = new Map<string, string>(); // reportId -> claimToken

  public get isConfigured(): boolean {
    return nativeRedisClient.isConfigured;
  }

  private getClaimKey(reportId: string): string {
    return `astrosushil:claim:report:${reportId}`;
  }

  /**
   * Pushes a report job ID to the Redis queue idempotently.
   * If already present in pending queue, preserves existing FIFO position and returns true without duplicating.
   * CRITICAL: Ordinary enqueue MUST NEVER remove an active claim!
   */
  public async enqueueJob(reportId: string): Promise<boolean> {
    if (!this.isConfigured) {
      if (!this.fallbackPending.has(reportId)) {
        this.fallbackPending.add(reportId);
        this.fallbackQueue.push(reportId);
      }
      logger.info({ reportId }, '[REDIS_QUEUE] (Fallback) Enqueued job to memory queue.');
      return true;
    }

    const script = `
      local isMember = redis.call('SISMEMBER', KEYS[2], ARGV[1])
      if isMember == 1 then
        return 2
      end
      redis.call('SADD', KEYS[2], ARGV[1])
      redis.call('RPUSH', KEYS[1], ARGV[1])
      return 1
    `;

    try {
      const res = await nativeRedisClient.eval(
        script,
        2,
        this.queueKey,
        this.pendingKey,
        reportId
      );
      const isDuplicate = res === 2;
      logger.info(
        { reportId, duplicateSkipped: isDuplicate },
        isDuplicate
          ? '[REDIS_QUEUE] Job already in pending queue; preserved FIFO position without duplicating.'
          : '[REDIS_QUEUE] Enqueued job to Redis queue.'
      );
      return true;
    } catch (err: any) {
      logger.warn({ reportId, err: err?.message }, '[REDIS_QUEUE] Failed to enqueue job via Redis.');
      return false;
    }
  }

  /**
   * Pops a report job ID from the Redis queue atomically.
   */
  public async dequeueJob(): Promise<string | null> {
    if (!this.isConfigured) {
      const item = this.fallbackQueue.shift() || null;
      if (item) {
        this.fallbackPending.delete(item);
        this.fallbackClaimed.add(item);
      }
      return item;
    }

    const script = `
      local item = redis.call('LPOP', KEYS[1])
      if item then
        redis.call('SREM', KEYS[2], item)
        redis.call('SADD', KEYS[3], item)
        return item
      else
        return nil
      end
    `;

    try {
      const item = await nativeRedisClient.eval(
        script,
        3,
        this.queueKey,
        this.pendingKey,
        this.claimedKey
      );
      return (item as string) || null;
    } catch (err: any) {
      logger.warn({ err: err?.message }, '[REDIS_QUEUE] Failed to dequeue job via Redis.');
      return null;
    }
  }

  /**
   * Atomically acquires ownership of a report using an exclusive token and TTL.
   * If another worker actively owns the claim, this operation strictly fails.
   */
  public async acquireReportClaim(
    reportId: string,
    claimToken: string,
    ttlMs: number = 300000
  ): Promise<boolean> {
    if (!this.isConfigured) {
      const existing = this.fallbackClaims.get(reportId);
      if (existing && existing !== claimToken) {
        return false;
      }
      this.fallbackClaims.set(reportId, claimToken);
      return true;
    }

    const claimKey = this.getClaimKey(reportId);
    const script = `
      local current = redis.call('GET', KEYS[1])
      if current and current ~= ARGV[2] then
        return 0
      end
      redis.call('SET', KEYS[1], ARGV[2], 'PX', ARGV[3])
      redis.call('HSET', KEYS[2], ARGV[1], ARGV[2])
      return 1
    `;

    try {
      const res = await nativeRedisClient.eval(
        script,
        2,
        claimKey,
        this.claimsHashKey,
        reportId,
        claimToken,
        ttlMs
      );
      return res === 1;
    } catch (err: any) {
      logger.warn({ reportId, claimToken, err: err?.message }, '[REDIS_QUEUE] acquireReportClaim error');
      return false;
    }
  }

  /**
   * Releases report claim only if the provided claimToken matches the active owner.
   * An expired or superseded worker CANNOT release a newer worker's claim.
   */
  public async releaseReportClaim(reportId: string, claimToken: string): Promise<boolean> {
    if (!this.isConfigured) {
      const existing = this.fallbackClaims.get(reportId);
      if (existing === claimToken) {
        this.fallbackClaims.delete(reportId);
        return true;
      }
      return false;
    }

    const claimKey = this.getClaimKey(reportId);
    const script = `
      local current = redis.call('GET', KEYS[1])
      if current == ARGV[2] then
        redis.call('DEL', KEYS[1])
        redis.call('HDEL', KEYS[2], ARGV[1])
        return 1
      else
        return 0
      end
    `;

    try {
      const res = await nativeRedisClient.eval(
        script,
        2,
        claimKey,
        this.claimsHashKey,
        reportId,
        claimToken
      );
      return res === 1;
    } catch (err: any) {
      logger.warn({ reportId, claimToken, err: err?.message }, '[REDIS_QUEUE] releaseReportClaim error');
      return false;
    }
  }

  /**
   * Checks whether a job is currently waiting in the pending queue.
   */
  public async isInPendingQueue(reportId: string): Promise<boolean> {
    if (!this.isConfigured) {
      return this.fallbackPending.has(reportId);
    }

    try {
      return await nativeRedisClient.sismember(this.pendingKey, reportId);
    } catch (err: any) {
      logger.warn({ reportId, err: err?.message }, '[REDIS_QUEUE] Failed to check isInPendingQueue');
      return false;
    }
  }

  /**
   * Checks whether a job was claimed by any worker process.
   */
  public async isClaimedByWorker(reportId: string): Promise<boolean> {
    if (!this.isConfigured) {
      return this.fallbackClaimed.has(reportId) || this.fallbackClaims.has(reportId);
    }

    try {
      const inClaimedSet = await nativeRedisClient.sismember(this.claimedKey, reportId);
      if (inClaimedSet) return true;
      const claimKey = this.getClaimKey(reportId);
      const token = await nativeRedisClient.get(claimKey);
      return Boolean(token);
    } catch (err: any) {
      logger.warn({ reportId, err: err?.message }, '[REDIS_QUEUE] Failed to check isClaimedByWorker');
      return false;
    }
  }

  /**
   * Retrieves active claim token for a report.
   */
  public async getClaimToken(reportId: string): Promise<string | null> {
    if (!this.isConfigured) {
      return this.fallbackClaims.get(reportId) || null;
    }

    try {
      const claimKey = this.getClaimKey(reportId);
      return await nativeRedisClient.get(claimKey);
    } catch (err: any) {
      return null;
    }
  }

  /**
   * Checks whether a report is actively claimed.
   */
  public async isClaimActive(reportId: string): Promise<boolean> {
    const token = await this.getClaimToken(reportId);
    return token !== null && token !== undefined && token.length > 0;
  }

  /**
   * Retrieves the current count of items in the queue.
   */
  public async getQueueLength(): Promise<number> {
    if (!this.isConfigured) {
      return this.fallbackQueue.length;
    }
    try {
      return await nativeRedisClient.llen(this.queueKey);
    } catch (_) {
      return this.fallbackQueue.length;
    }
  }

  /**
   * Atomically extends the lease of an existing claim if and only if the
   * claimToken matches the active claim owner.
   */
  public async renewReportClaim(
    reportId: string,
    claimToken: string,
    ttlMs: number = 60000
  ): Promise<boolean> {
    if (!this.isConfigured) {
      const existing = this.fallbackClaims.get(reportId);
      return existing === claimToken;
    }

    const claimKey = this.getClaimKey(reportId);
    const script = `
      local current = redis.call('GET', KEYS[1])
      if current == ARGV[1] then
        redis.call('PEXPIRE', KEYS[1], ARGV[2])
        return 1
      else
        return 0
      end
    `;

    try {
      const res = await nativeRedisClient.eval(script, 1, claimKey, claimToken, ttlMs);
      return res === 1;
    } catch (err: any) {
      logger.warn({ reportId, claimToken, err: err?.message }, '[REDIS_QUEUE] renewReportClaim error');
      return false;
    }
  }

  /**
   * Cleans up tracking for a completed or permanently failed report job.
   * If claimToken is provided, uses an atomic Lua script to verify that the
   * caller owns the claim before deleting the claim key, hash, or tracking sets.
   * A stale worker calling completeJob CANNOT delete a newer worker's claim or tracking state.
   */
  public async completeJob(reportId: string, claimToken?: string): Promise<boolean> {
    if (!this.isConfigured) {
      if (claimToken) {
        const existing = this.fallbackClaims.get(reportId);
        if (existing && existing !== claimToken) {
          return false;
        }
      }
      this.fallbackClaims.delete(reportId);
      this.fallbackPending.delete(reportId);
      this.fallbackClaimed.delete(reportId);
      return true;
    }

    const claimKey = this.getClaimKey(reportId);
    // Atomic Lua script: if claimToken is provided and doesn't match active claim, do NOT delete anything.
    const script = `
      local current = redis.call('GET', KEYS[1])
      if ARGV[1] ~= '' and current and current ~= ARGV[1] then
        return 0
      end
      redis.call('DEL', KEYS[1])
      redis.call('HDEL', KEYS[2], ARGV[2])
      redis.call('SREM', KEYS[3], ARGV[2])
      redis.call('SREM', KEYS[4], ARGV[2])
      return 1
    `;

    try {
      const res = await nativeRedisClient.eval(
        script,
        4,
        claimKey,
        this.claimsHashKey,
        this.claimedKey,
        this.pendingKey,
        claimToken || '',
        reportId
      );
      return res === 1;
    } catch (err: any) {
      logger.warn({ reportId, claimToken, err: err?.message }, '[REDIS_QUEUE] completeJob error');
      return false;
    }
  }

  /**
   * Purges all queue and tracking items (for testing and maintenance).
   */
  public async clearQueue(): Promise<void> {
    this.fallbackQueue = [];
    this.fallbackPending.clear();
    this.fallbackClaims.clear();
    this.fallbackClaimed.clear();

    if (this.isConfigured) {
      try {
        await nativeRedisClient.del(this.queueKey);
        await nativeRedisClient.del(this.pendingKey);
        await nativeRedisClient.del(this.claimsHashKey);
        await nativeRedisClient.del(this.claimedKey);
      } catch (_) {}
    }
  }

  /**
   * Health probe checking connectivity to configured Redis broker
   */
  public async checkHealth(): Promise<boolean> {
    if (!this.isConfigured) return true;
    return await nativeRedisClient.ping();
  }

  /**
   * Graceful connection close
   */
  public async closeConnection(): Promise<void> {
    return Promise.resolve();
  }
}

export const redisQueueService = new RedisQueueService();
