import Redis, { RedisOptions } from 'ioredis';
import dotenv from 'dotenv';
import path from 'node:path';
import { logger } from '../utils/logger';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export class ManagedRedisClient {
  private client: Redis | null = null;
  private upstashUrl: string | null = null;
  private upstashToken: string | null = null;
  private mockDisabled = false;

  constructor() {
    this.init();
  }

  public init(): void {
    this.upstashUrl = process.env.UPSTASH_REDIS_REST_URL || null;
    this.upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN || null;
    this.mockDisabled = false;

    if (this.client) {
      try {
        this.client.disconnect();
      } catch (_) {}
      this.client = null;
    }

    if (process.env.REDIS_URL) {
      try {
        const u = new URL(process.env.REDIS_URL);
        const options: RedisOptions = {
          host: u.hostname || 'localhost',
          port: parseInt(u.port || '6379', 10),
          password: u.password ? decodeURIComponent(u.password) : undefined,
          lazyConnect: true,
          maxRetriesPerRequest: 2,
          connectTimeout: 5000,
          retryStrategy(times) {
            return Math.min(times * 100, 2000);
          },
        };

        if (u.protocol === 'rediss:') {
          options.tls = {
            servername: u.hostname || undefined,
          };
        }

        if (u.pathname && u.pathname.length > 1) {
          const dbIndex = parseInt(u.pathname.substring(1), 10);
          if (!isNaN(dbIndex)) {
            options.db = dbIndex;
          }
        }

        this.client = new Redis(options);
        this.client.on('error', (err) => {
          logger.warn({ err: err?.message }, '[ManagedRedisClient] Redis connection error');
        });
      } catch (err: any) {
        logger.error({ err: err?.message }, '[ManagedRedisClient] Failed to parse REDIS_URL');
        this.client = null;
      }
    } else if (process.env.REDIS_HOST) {
      const options: RedisOptions = {
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        password: process.env.REDIS_PASSWORD || undefined,
        lazyConnect: true,
        maxRetriesPerRequest: 2,
        connectTimeout: 5000,
        retryStrategy(times) {
          return Math.min(times * 100, 2000);
        },
      };

      if (process.env.REDIS_TLS_ENABLED === 'true') {
        options.tls = {
          servername: process.env.REDIS_HOST,
        };
      }

      this.client = new Redis(options);
      this.client.on('error', (err) => {
        logger.warn({ err: err?.message }, '[ManagedRedisClient] Redis connection error');
      });
    } else {
      this.client = null;
    }
  }

  public get isConfigured(): boolean {
    if (this.mockDisabled) return false;
    return Boolean(this.client || (this.upstashUrl && this.upstashToken));
  }

  public setMockDisabled(disabled: boolean): void {
    this.mockDisabled = disabled;
    if (disabled) {
      if (this.client) {
        try {
          this.client.disconnect();
        } catch (_) {}
        this.client = null;
      }
    } else if (!this.client) {
      this.init();
    }
  }

  /**
   * Executes a command via Upstash REST using POST JSON protocol for maximum command fidelity
   */
  private async executeUpstashCommand(command: (string | number)[]): Promise<any> {
    if (!this.upstashUrl || !this.upstashToken) return null;

    const res = await fetch(this.upstashUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.upstashToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(command),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Upstash REST command failed (${res.status}): ${errText}`);
    }

    const data = (await res.json()) as any;
    if (data?.error) {
      throw new Error(`Upstash REST error: ${data.error}`);
    }
    return data?.result ?? null;
  }

  public async ping(): Promise<boolean> {
    if (!this.isConfigured || this.mockDisabled) return false;

    if (this.client) {
      try {
        const res = await this.client.ping();
        return res === 'PONG';
      } catch {
        return false;
      }
    }

    if (this.upstashUrl && this.upstashToken) {
      try {
        const res = await this.executeUpstashCommand(['PING']);
        return res === 'PONG';
      } catch {
        return false;
      }
    }

    return false;
  }

  public async setNxPx(key: string, value: string, ttlMs: number): Promise<boolean> {
    if (!this.isConfigured || this.mockDisabled) return false;

    if (this.client) {
      try {
        const res = await this.client.set(key, value, 'PX', ttlMs, 'NX');
        return res === 'OK';
      } catch (err: any) {
        logger.warn({ key, err: err?.message }, '[ManagedRedisClient] setNxPx failed on TCP client');
        return false;
      }
    }

    if (this.upstashUrl && this.upstashToken) {
      try {
        const res = await this.executeUpstashCommand(['SET', key, value, 'PX', ttlMs, 'NX']);
        return res === 'OK';
      } catch (err: any) {
        logger.warn({ key, err: err?.message }, '[ManagedRedisClient] setNxPx failed on Upstash REST');
        return false;
      }
    }

    return false;
  }

  public async eval(script: string, numKeys: number, ...args: (string | number)[]): Promise<any> {
    if (!this.isConfigured || this.mockDisabled) {
      throw new Error('Redis is not configured or available');
    }

    if (this.client) {
      return await (this.client as any).eval(script, numKeys, ...args);
    }

    if (this.upstashUrl && this.upstashToken) {
      return await this.executeUpstashCommand(['EVAL', script, numKeys, ...args]);
    }

    throw new Error('No Redis connection available');
  }

  public async del(key: string): Promise<number> {
    if (!this.isConfigured || this.mockDisabled) return 0;

    if (this.client) {
      try {
        return await this.client.del(key);
      } catch {
        return 0;
      }
    }

    if (this.upstashUrl && this.upstashToken) {
      try {
        const res = await this.executeUpstashCommand(['DEL', key]);
        return typeof res === 'number' ? res : 1;
      } catch {
        return 0;
      }
    }

    return 0;
  }

  public async get(key: string): Promise<string | null> {
    if (!this.isConfigured || this.mockDisabled) return null;

    if (this.client) {
      try {
        return await this.client.get(key);
      } catch (err: any) {
        logger.warn({ key, err: err?.message }, '[ManagedRedisClient] get failed');
        return null;
      }
    }

    if (this.upstashUrl && this.upstashToken) {
      try {
        return (await this.executeUpstashCommand(['GET', key])) as string | null;
      } catch (err: any) {
        logger.warn({ key, err: err?.message }, '[ManagedRedisClient] get failed on Upstash REST');
        return null;
      }
    }

    return null;
  }

  public async rpush(key: string, value: string): Promise<number> {
    if (!this.isConfigured || this.mockDisabled) {
      throw new Error('Redis is not available');
    }

    if (this.client) {
      return await this.client.rpush(key, value);
    }

    if (this.upstashUrl && this.upstashToken) {
      return (await this.executeUpstashCommand(['RPUSH', key, value])) as number;
    }

    throw new Error('No Redis connection available');
  }

  public async lpop(key: string): Promise<string | null> {
    if (!this.isConfigured || this.mockDisabled) return null;

    if (this.client) {
      try {
        return await this.client.lpop(key);
      } catch (err: any) {
        logger.warn({ key, err: err?.message }, '[ManagedRedisClient] lpop failed');
        return null;
      }
    }

    if (this.upstashUrl && this.upstashToken) {
      try {
        return (await this.executeUpstashCommand(['LPOP', key])) as string | null;
      } catch (err: any) {
        logger.warn({ key, err: err?.message }, '[ManagedRedisClient] lpop failed on Upstash REST');
        return null;
      }
    }

    return null;
  }

  public async sadd(key: string, ...members: string[]): Promise<number> {
    if (!this.isConfigured || this.mockDisabled || members.length === 0) return 0;

    if (this.client) {
      try {
        return await this.client.sadd(key, ...members);
      } catch (err: any) {
        logger.warn({ key, err: err?.message }, '[ManagedRedisClient] sadd failed');
        return 0;
      }
    }

    if (this.upstashUrl && this.upstashToken) {
      try {
        const res = await this.executeUpstashCommand(['SADD', key, ...members]);
        return typeof res === 'number' ? res : 1;
      } catch (err: any) {
        logger.warn({ key, err: err?.message }, '[ManagedRedisClient] sadd failed on Upstash REST');
        return 0;
      }
    }

    return 0;
  }

  public async srem(key: string, ...members: string[]): Promise<number> {
    if (!this.isConfigured || this.mockDisabled || members.length === 0) return 0;

    if (this.client) {
      try {
        return await this.client.srem(key, ...members);
      } catch (err: any) {
        logger.warn({ key, err: err?.message }, '[ManagedRedisClient] srem failed');
        return 0;
      }
    }

    if (this.upstashUrl && this.upstashToken) {
      try {
        const res = await this.executeUpstashCommand(['SREM', key, ...members]);
        return typeof res === 'number' ? res : 1;
      } catch (err: any) {
        logger.warn({ key, err: err?.message }, '[ManagedRedisClient] srem failed on Upstash REST');
        return 0;
      }
    }

    return 0;
  }

  public async sismember(key: string, member: string): Promise<boolean> {
    if (!this.isConfigured || this.mockDisabled) return false;

    if (this.client) {
      try {
        const res = await this.client.sismember(key, member);
        return res === 1;
      } catch (err: any) {
        logger.warn({ key, err: err?.message }, '[ManagedRedisClient] sismember failed');
        return false;
      }
    }

    if (this.upstashUrl && this.upstashToken) {
      try {
        const res = await this.executeUpstashCommand(['SISMEMBER', key, member]);
        return res === 1 || res === true;
      } catch (err: any) {
        logger.warn({ key, err: err?.message }, '[ManagedRedisClient] sismember failed on Upstash REST');
        return false;
      }
    }

    return false;
  }

  public async llen(key: string): Promise<number> {
    if (!this.isConfigured || this.mockDisabled) return 0;

    if (this.client) {
      try {
        return await this.client.llen(key);
      } catch (err: any) {
        logger.warn({ key, err: err?.message }, '[ManagedRedisClient] llen failed');
        return 0;
      }
    }

    if (this.upstashUrl && this.upstashToken) {
      try {
        const res = await this.executeUpstashCommand(['LLEN', key]);
        return typeof res === 'number' ? res : parseInt(res, 10) || 0;
      } catch (err: any) {
        logger.warn({ key, err: err?.message }, '[ManagedRedisClient] llen failed on Upstash REST');
        return 0;
      }
    }

    return 0;
  }

  public async quit(): Promise<void> {
    if (this.client) {
      try {
        await this.client.quit();
      } catch (_) {
        this.client.disconnect();
      }
      this.client = null;
    }
  }
}

export const nativeRedisClient = new ManagedRedisClient();
