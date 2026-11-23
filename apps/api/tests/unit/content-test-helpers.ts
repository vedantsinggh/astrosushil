/**
 * Shared fakes for the content module tests (tests/unit/content*.test.ts): an in-memory stand-in
 * for the Prisma models the module uses, and a fake key-value store for the cache. No database,
 * Redis, S3 or mail server is touched.
 */
import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import type { KeyValueStore } from '../../src/modules/content/content.cache';
import type { AdminActor } from '../../src/modules/content/content.audit';

type Row = Record<string, unknown>;
type Where = Record<string, unknown>;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value) && !(value instanceof Date);
}

function comparable(value: unknown): number | string {
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number' || typeof value === 'string') return value;
  return String(value);
}

function matchesField(actual: unknown, condition: unknown): boolean {
  if (isPlainObject(condition)) {
    if ('contains' in condition) {
      const needle = String(condition.contains);
      const haystack = String(actual ?? '');
      return condition.mode === 'insensitive'
        ? haystack.toLowerCase().includes(needle.toLowerCase())
        : haystack.includes(needle);
    }
    if ('has' in condition) return Array.isArray(actual) && actual.includes(condition.has);
    let ok = true;
    if ('gte' in condition) ok = ok && comparable(actual) >= comparable(condition.gte);
    if ('lte' in condition) ok = ok && comparable(actual) <= comparable(condition.lte);
    return ok;
  }
  if (condition instanceof Date && actual instanceof Date) return condition.getTime() === actual.getTime();
  return actual === condition;
}

function matches(row: Row, where: Where | undefined): boolean {
  if (!where) return true;
  return Object.entries(where).every(([field, condition]) => {
    if (condition === undefined) return true;
    if (field === 'OR') return (condition as Where[]).some((alternative) => matches(row, alternative));
    return matchesField(row[field], condition);
  });
}

function sortRows(rows: Row[], orderBy: unknown): Row[] {
  const clauses = (Array.isArray(orderBy) ? orderBy : orderBy ? [orderBy] : []) as Record<string, 'asc' | 'desc'>[];
  return [...rows].sort((a, b) => {
    for (const clause of clauses) {
      const [field, direction] = Object.entries(clause)[0];
      const left = comparable(a[field]);
      const right = comparable(b[field]);
      if (left === right) continue;
      const order = left < right ? -1 : 1;
      return direction === 'desc' ? -order : order;
    }
    return 0;
  });
}

function applyData(row: Row, data: Row): void {
  for (const [field, value] of Object.entries(data)) {
    if (value === undefined) continue;
    if (isPlainObject(value) && 'increment' in value) {
      row[field] = Number(row[field] ?? 0) + Number(value.increment);
    } else {
      row[field] = value;
    }
  }
}

function uniqueViolation(model: string, field: string): Error {
  return new Prisma.PrismaClientKnownRequestError(`Unique constraint failed on ${model}.${field}`, {
    code: 'P2002',
    clientVersion: 'test',
  });
}

export class FakeModel {
  public rows: Row[] = [];
  private clock = Date.UTC(2026, 0, 1);

  constructor(
    private readonly name: string,
    private readonly defaults: () => Row,
    private readonly uniqueFields: string[] = []
  ) {}

  private tick(): Date {
    this.clock += 1000;
    return new Date(this.clock);
  }

  private assertUnique(candidate: Row, ignoreId?: unknown): void {
    for (const field of ['id', ...this.uniqueFields]) {
      const value = candidate[field];
      if (value === null || value === undefined) continue;
      if (this.rows.some((row) => row.id !== ignoreId && row[field] === value)) throw uniqueViolation(this.name, field);
    }
  }

  private project(row: Row, select?: Record<string, boolean>): Row {
    const copy = structuredClone(row);
    if (!select) return copy;
    return Object.fromEntries(Object.keys(select).map((field) => [field, copy[field]]));
  }

  public create = async ({ data }: { data: Row }): Promise<Row> => {
    const now = this.tick();
    const row: Row = { id: randomUUID(), ...this.defaults(), createdAt: now, updatedAt: now, ...structuredClone(data) };
    this.assertUnique(row);
    this.rows.push(row);
    return structuredClone(row);
  };

  public findUnique = async ({ where, select }: { where: Where; select?: Record<string, boolean> }): Promise<Row | null> => {
    const row = this.rows.find((candidate) => matches(candidate, where));
    return row ? this.project(row, select) : null;
  };

  public findFirst = async (args: { where?: Where; orderBy?: unknown; select?: Record<string, boolean> } = {}): Promise<Row | null> => {
    const row = sortRows(this.rows.filter((candidate) => matches(candidate, args.where)), args.orderBy)[0];
    return row ? this.project(row, args.select) : null;
  };

  public findMany = async (args: { where?: Where; orderBy?: unknown; skip?: number; take?: number } = {}): Promise<Row[]> => {
    const sorted = sortRows(this.rows.filter((candidate) => matches(candidate, args.where)), args.orderBy);
    const start = args.skip ?? 0;
    const end = args.take === undefined ? undefined : start + args.take;
    return sorted.slice(start, end).map((row) => structuredClone(row));
  };

  public count = async (args: { where?: Where } = {}): Promise<number> => {
    return this.rows.filter((candidate) => matches(candidate, args.where)).length;
  };

  public update = async ({ where, data }: { where: Where; data: Row }): Promise<Row> => {
    const row = this.rows.find((candidate) => matches(candidate, where));
    if (!row) {
      throw new Prisma.PrismaClientKnownRequestError('Record to update not found', { code: 'P2025', clientVersion: 'test' });
    }
    const next = { ...row };
    applyData(next, structuredClone(data));
    this.assertUnique(next, row.id);
    Object.assign(row, next, { updatedAt: (data.updatedAt as Date | undefined) ?? this.tick() });
    return structuredClone(row);
  };

  public updateMany = async ({ where, data }: { where?: Where; data: Row }): Promise<{ count: number }> => {
    const targets = this.rows.filter((candidate) => matches(candidate, where));
    for (const row of targets) {
      applyData(row, structuredClone(data));
      row.updatedAt = (data.updatedAt as Date | undefined) ?? this.tick();
    }
    return { count: targets.length };
  };

  public delete = async ({ where }: { where: Where }): Promise<Row> => {
    const index = this.rows.findIndex((candidate) => matches(candidate, where));
    if (index === -1) {
      throw new Prisma.PrismaClientKnownRequestError('Record to delete not found', { code: 'P2025', clientVersion: 'test' });
    }
    const [row] = this.rows.splice(index, 1);
    return row;
  };
}

export function createFakeContentPrisma() {
  return {
    banner: new FakeModel('Banner', () => ({
      legacyId: null, title: null, subtitle: null, description: null, imageUrl: null, imageKey: null,
      buttons: [], page: 'Homepage', order: 0, isActive: true,
    })),
    blogPost: new FakeModel(
      'BlogPost',
      () => ({
        legacyId: null, tags: [], authorName: null, authorAvatarUrl: null, authorAvatarKey: null,
        thumbnailUrl: null, thumbnailKey: null, images: [], seoMetaTitle: null, seoMetaDescription: null,
        seoKeywords: [], status: 'draft', isFeatured: false, views: 0, publishedAt: null,
      }),
      ['slug']
    ),
    faq: new FakeModel('Faq', () => ({ legacyId: null, isActive: true, order: 0, createdById: null, updatedById: null })),
    testimonial: new FakeModel('Testimonial', () => ({
      legacyId: null, designation: null, rating: 5, imageUrl: null, imageKey: null, serviceName: null,
      tagline: null, type: 'text', videoUrl: null, page: 'home', order: 0, isActive: true,
    })),
    mediaItem: new FakeModel('MediaItem', () => ({
      legacyId: null, description: '', type: 'image', mediaUrl: null, mediaKey: null, thumbnailUrl: null,
      thumbnailKey: null, tag: '', personName: '', background: '', isActive: true, order: 0,
      createdById: null, updatedById: null,
    })),
    contactInquiry: new FakeModel('ContactInquiry', () => ({ legacyId: null, email: '', phone: null, subject: null, remarks: '' })),
    seoPage: new FakeModel('SeoPage', () => ({ legacyId: null, imageUrl: null, imageKey: null }), ['name']),
    siteSetting: new FakeModel('SiteSetting', () => ({ legacyId: null, data: {}, updatedById: null })),
  };
}

export type FakeContentPrisma = ReturnType<typeof createFakeContentPrisma>;

/** One shared instance: the mocked prisma.service returns it, and the tests inspect and reset it. */
export const fakePrisma: FakeContentPrisma = createFakeContentPrisma();

export function resetFakePrisma(): void {
  for (const model of Object.values(fakePrisma)) model.rows = [];
}

/** A Redis stand-in implementing the commands the content cache uses (GET, DEL, SET PX, INCR/PEXPIRE). */
export class FakeKeyValueStore implements KeyValueStore {
  public isConfigured = true;
  public failing = false;
  public readonly data = new Map<string, { value: string; expiresAt: number | null }>();

  constructor(private readonly now: () => number = () => Date.now()) {}

  private read(key: string): string | null {
    const entry = this.data.get(key);
    if (!entry) return null;
    if (entry.expiresAt !== null && entry.expiresAt <= this.now()) {
      this.data.delete(key);
      return null;
    }
    return entry.value;
  }

  public async get(key: string): Promise<string | null> {
    if (this.failing) throw new Error('redis down');
    return this.read(key);
  }

  public async del(key: string): Promise<number> {
    if (this.failing) throw new Error('redis down');
    return this.data.delete(key) ? 1 : 0;
  }

  public async eval(script: string, _numKeys: number, ...args: (string | number)[]): Promise<unknown> {
    if (this.failing) throw new Error('redis down');
    const key = String(args[0]);
    if (script.includes("'SET'")) {
      this.data.set(key, { value: String(args[1]), expiresAt: this.now() + Number(args[2]) });
      return 'OK';
    }
    if (script.includes("'INCR'")) {
      const current = this.read(key);
      const count = Number(current ?? 0) + 1;
      const expiresAt = current === null ? this.now() + Number(args[1]) : this.data.get(key)?.expiresAt ?? null;
      this.data.set(key, { value: String(count), expiresAt });
      return count;
    }
    throw new Error('unexpected script');
  }
}

export const testActor: AdminActor = {
  id: 'admin-1',
  email: 'admin@example.test',
  ipAddress: '203.0.113.9',
  userAgent: 'vitest',
};
