import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export class RedisQueueService {
  private redisUrl: string | null = null;
  private queueKey = 'astrosushil:queue:reports';

  constructor() {
    if (process.env.REDIS_URL) {
      this.redisUrl = process.env.REDIS_URL;
    } else if (process.env.REDIS_HOST) {
      const protocol = process.env.REDIS_TLS_ENABLED === 'true' ? 'rediss' : 'redis';
      const auth = process.env.REDIS_PASSWORD ? `:${encodeURIComponent(process.env.REDIS_PASSWORD)}@` : '';
      const port = process.env.REDIS_PORT || '6379';
      this.redisUrl = `${protocol}://${auth}${process.env.REDIS_HOST}:${port}`;
    }
  }

  public get isConfigured(): boolean {
    return !!this.redisUrl || !!process.env.UPSTASH_REDIS_REST_URL;
  }

  /**
   * Pushes a report job ID to the Redis queue
   */
  public async enqueueJob(reportId: string): Promise<boolean> {
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      try {
        const url = `${process.env.UPSTASH_REDIS_REST_URL}/rpush/${this.queueKey}/${reportId}`;
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}` },
        });
        if (res.ok) {
          console.log(`[REDIS_QUEUE] Enqueued job ${reportId} to Upstash Redis REST queue.`);
          return true;
        }
      } catch (err: any) {
        console.error(`[REDIS_QUEUE] Failed to enqueue job ${reportId} via Upstash REST: ${err?.message}`);
      }
    }

    if (this.redisUrl) {
      try {
        const { default: Redis } = await import('ioredis').catch(() => ({ default: null as any }));
        if (Redis) {
          const client = new Redis(this.redisUrl, { maxRetriesPerRequest: 3 });
          await client.rpush(this.queueKey, reportId);
          await client.quit();
          console.log(`[REDIS_QUEUE] Enqueued job ${reportId} to Redis TCP queue.`);
          return true;
        }
      } catch (err: any) {
        console.error(`[REDIS_QUEUE] Failed to enqueue job ${reportId} via Redis TCP: ${err?.message}`);
      }
    }

    return false;
  }

  /**
   * Pops a report job ID from the Redis queue
   */
  public async dequeueJob(): Promise<string | null> {
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      try {
        const url = `${process.env.UPSTASH_REDIS_REST_URL}/lpop/${this.queueKey}`;
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}` },
        });
        if (res.ok) {
          const data = (await res.json()) as any;
          if (data && data.result) {
            return data.result;
          }
        }
      } catch (err: any) {
        console.error(`[REDIS_QUEUE] Upstash dequeue error: ${err?.message}`);
      }
    }

    if (this.redisUrl) {
      try {
        const { default: Redis } = await import('ioredis').catch(() => ({ default: null as any }));
        if (Redis) {
          const client = new Redis(this.redisUrl, { maxRetriesPerRequest: 3 });
          const item = await client.lpop(this.queueKey);
          await client.quit();
          return item;
        }
      } catch (err: any) {
        console.error(`[REDIS_QUEUE] Redis TCP dequeue error: ${err?.message}`);
      }
    }

    return null;
  }

  /**
   * Health probe checking connectivity to configured Redis broker
   */
  public async checkHealth(): Promise<boolean> {
    if (!this.isConfigured) return true;
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      try {
        const res = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/ping`, {
          headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}` },
        });
        return res.ok;
      } catch {
        return false;
      }
    }
    if (this.redisUrl) {
      try {
        const { default: Redis } = await import('ioredis').catch(() => ({ default: null as any }));
        if (!Redis) return true;
        const client = new Redis(this.redisUrl, { maxRetriesPerRequest: 1, connectTimeout: 1000 });
        const pong = await client.ping();
        await client.quit();
        return pong === 'PONG';
      } catch {
        return false;
      }
    }
    return true;
  }

  /**
   * Graceful connection close
   */
  public async closeConnection(): Promise<void> {
    return Promise.resolve();
  }
}

export const redisQueueService = new RedisQueueService();
