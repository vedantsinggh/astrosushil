import { describe, it, expect, beforeEach } from 'vitest';
import { ContentCache } from '../../src/modules/content/content.cache';
import { FakeKeyValueStore } from './content-test-helpers';

describe('ContentCache', () => {
  let now: number;
  const clock = () => now;

  beforeEach(() => {
    now = 1_000_000;
  });

  describe('with Redis configured', () => {
    it('stores JSON with the TTL and reads it back', async () => {
      const store = new FakeKeyValueStore(clock);
      const cache = new ContentCache(store, clock);

      await cache.set('k', { a: 1 }, 5_000);
      expect(await cache.get('k')).toEqual({ a: 1 });
      expect(store.data.get('k')?.expiresAt).toBe(now + 5_000);

      now += 5_001;
      expect(await cache.get('k')).toBeNull();
    });

    it('deletes every given key from Redis, so all API processes miss afterwards', async () => {
      const store = new FakeKeyValueStore(clock);
      const writer = new ContentCache(store, clock);
      const otherProcess = new ContentCache(store, clock);

      await writer.set('a', 1, 60_000);
      await writer.set('b', 2, 60_000);
      expect(await otherProcess.get('a')).toBe(1);

      await writer.del('a', 'b');
      expect(await otherProcess.get('a')).toBeNull();
      expect(await otherProcess.get('b')).toBeNull();
    });

    it('treats a Redis outage as a miss and never throws', async () => {
      const store = new FakeKeyValueStore(clock);
      const cache = new ContentCache(store, clock);
      await cache.set('k', 'v', 60_000);

      store.failing = true;
      expect(await cache.get('k')).toBeNull();
      await expect(cache.set('k', 'v2', 60_000)).resolves.toBeUndefined();
      await expect(cache.del('k')).resolves.toBeUndefined();
    });

    it('treats a corrupt entry as a miss', async () => {
      const store = new FakeKeyValueStore(clock);
      const cache = new ContentCache(store, clock);
      store.data.set('k', { value: '{not json', expiresAt: null });
      expect(await cache.get('k')).toBeNull();
    });

    it('counts hits in a fixed window', async () => {
      const store = new FakeKeyValueStore(clock);
      const cache = new ContentCache(store, clock);

      expect(await cache.hit('c', 10_000)).toBe(1);
      now += 9_000;
      expect(await cache.hit('c', 10_000)).toBe(2);
      // The window started at the first hit and is not extended by later ones.
      now += 1_001;
      expect(await cache.hit('c', 10_000)).toBe(1);
    });

    it('keeps counting in process memory when Redis fails, instead of dropping the limit', async () => {
      const store = new FakeKeyValueStore(clock);
      const cache = new ContentCache(store, clock);
      store.failing = true;

      expect(await cache.hit('c', 10_000)).toBe(1);
      expect(await cache.hit('c', 10_000)).toBe(2);
      expect(await cache.hit('c', 10_000)).toBe(3);
    });
  });

  describe('without Redis', () => {
    it('caches in process memory, for at most one minute', async () => {
      const store = new FakeKeyValueStore(clock);
      store.isConfigured = false;
      const cache = new ContentCache(store, clock);

      await cache.set('k', { a: 1 }, 24 * 60 * 60 * 1000);
      expect(store.data.size).toBe(0);
      expect(await cache.get('k')).toEqual({ a: 1 });

      now += 59_000;
      expect(await cache.get('k')).toEqual({ a: 1 });
      now += 1_001;
      expect(await cache.get('k')).toBeNull();
    });

    it('deletes from process memory', async () => {
      const store = new FakeKeyValueStore(clock);
      store.isConfigured = false;
      const cache = new ContentCache(store, clock);

      await cache.set('k', 1, 10_000);
      await cache.del('k');
      expect(await cache.get('k')).toBeNull();
    });

    it('counts hits per key and resets after the window', async () => {
      const store = new FakeKeyValueStore(clock);
      store.isConfigured = false;
      const cache = new ContentCache(store, clock);

      expect(await cache.hit('a', 1_000)).toBe(1);
      expect(await cache.hit('a', 1_000)).toBe(2);
      expect(await cache.hit('b', 1_000)).toBe(1);
      now += 1_000;
      expect(await cache.hit('a', 1_000)).toBe(1);
    });
  });
});
