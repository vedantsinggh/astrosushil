import { Prisma } from '@prisma/client';
import { prisma } from '../../services/prisma.service';
import type { RashiDailyFacts } from './rashi-gochara.engine';
import type { RashiNarrative } from './rashi-bhavishya.narrator';

export interface HoroscopeKey {
  date: string;
  rashiIndex: number;
  language: string;
  methodVersion: string;
  promptVersion: string;
}

export interface StoredHoroscope extends HoroscopeKey {
  factsHash: string;
  facts: RashiDailyFacts;
  narrative: RashiNarrative;
  provider: string;
  model: string;
  generationId: string;
  tokens: { input: number; output: number; thinking: number };
  latencyMs: number;
  createdAt: Date;
}

export type NewStoredHoroscope = Omit<StoredHoroscope, 'createdAt'>;

/** Persistence for validated daily horoscopes. Only validated narrative is ever saved. */
export interface RashiHoroscopeStore {
  find(key: HoroscopeKey): Promise<StoredHoroscope | null>;
  save(record: NewStoredHoroscope): Promise<StoredHoroscope>;
  listForDate(date: string, language: string, methodVersion: string, promptVersion: string): Promise<StoredHoroscope[]>;
}

type Row = Prisma.RashiDailyHoroscopeGetPayload<Record<string, never>>;

function fromRow(row: Row): StoredHoroscope {
  return {
    date: row.date,
    rashiIndex: row.rashiIndex,
    language: row.language,
    methodVersion: row.methodVersion,
    promptVersion: row.promptVersion,
    factsHash: row.factsHash,
    facts: row.facts as unknown as RashiDailyFacts,
    narrative: row.narrative as unknown as RashiNarrative,
    provider: row.provider,
    model: row.model,
    generationId: row.generationId,
    tokens: row.tokens as unknown as StoredHoroscope['tokens'],
    latencyMs: row.latencyMs,
    createdAt: row.createdAt,
  };
}

export class PrismaRashiHoroscopeStore implements RashiHoroscopeStore {
  async find(key: HoroscopeKey): Promise<StoredHoroscope | null> {
    const row = await prisma.rashiDailyHoroscope.findUnique({
      where: { date_rashiIndex_language_methodVersion_promptVersion: key },
    });
    return row ? fromRow(row) : null;
  }

  async save(record: NewStoredHoroscope): Promise<StoredHoroscope> {
    const { date, rashiIndex, language, methodVersion, promptVersion } = record;
    const data = {
      factsHash: record.factsHash,
      facts: record.facts as unknown as Prisma.InputJsonValue,
      narrative: record.narrative as unknown as Prisma.InputJsonValue,
      provider: record.provider,
      model: record.model,
      generationId: record.generationId,
      tokens: record.tokens as unknown as Prisma.InputJsonValue,
      latencyMs: Math.round(record.latencyMs),
    };
    // A concurrent generation of the same key keeps the first stored row (both are validated).
    const row = await prisma.rashiDailyHoroscope.upsert({
      where: { date_rashiIndex_language_methodVersion_promptVersion: { date, rashiIndex, language, methodVersion, promptVersion } },
      create: { date, rashiIndex, language, methodVersion, promptVersion, ...data },
      update: {},
    });
    return fromRow(row);
  }

  async listForDate(date: string, language: string, methodVersion: string, promptVersion: string): Promise<StoredHoroscope[]> {
    const rows = await prisma.rashiDailyHoroscope.findMany({
      where: { date, language, methodVersion, promptVersion },
      orderBy: { rashiIndex: 'asc' },
    });
    return rows.map(fromRow);
  }
}

/** For tests and offline scripts. */
export class InMemoryRashiHoroscopeStore implements RashiHoroscopeStore {
  readonly rows = new Map<string, StoredHoroscope>();
  private k(key: HoroscopeKey): string {
    return [key.date, key.rashiIndex, key.language, key.methodVersion, key.promptVersion].join('|');
  }
  async find(key: HoroscopeKey): Promise<StoredHoroscope | null> {
    return this.rows.get(this.k(key)) ?? null;
  }
  async save(record: NewStoredHoroscope): Promise<StoredHoroscope> {
    const existing = this.rows.get(this.k(record));
    if (existing) return existing;
    const row = { ...record, createdAt: new Date() };
    this.rows.set(this.k(record), row);
    return row;
  }
  async listForDate(date: string, language: string, methodVersion: string, promptVersion: string): Promise<StoredHoroscope[]> {
    return [...this.rows.values()]
      .filter((r) => r.date === date && r.language === language && r.methodVersion === methodVersion && r.promptVersion === promptVersion)
      .sort((a, b) => a.rashiIndex - b.rashiIndex);
  }
}
