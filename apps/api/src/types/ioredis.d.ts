declare module 'ioredis' {
  export interface RedisOptions {
    maxRetriesPerRequest?: number | null;
    connectTimeout?: number;
    commandTimeout?: number;
    retryStrategy?: (times: number) => number | void | null;
    enableReadyCheck?: boolean;
    tls?: any;
    lazyConnect?: boolean;
  }

  export default class Redis {
    constructor(url?: string, options?: RedisOptions);
    status: string;
    rpush(key: string, ...values: (string | number)[]): Promise<number>;
    lpop(key: string): Promise<string | null>;
    ping(): Promise<string>;
    quit(): Promise<'OK'>;
    disconnect(): void;
    on(event: string, listener: (...args: any[]) => void): this;
    off(event: string, listener: (...args: any[]) => void): this;
  }
}

