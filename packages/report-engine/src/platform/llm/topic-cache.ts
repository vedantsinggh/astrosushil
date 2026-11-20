/**
 * Topic cache.
 *
 * The key covers every input that can change generated content, so one
 * client's narrative can never be served to another, and any change to the
 * chart, prompt, spec, model or generation config forces regeneration.
 */
import * as fs from 'fs';
import * as path from 'path';
import { GeneratedTopicPayload } from '../contracts';
import { sha256, stableStringify } from '../snapshot/chart-snapshot';

export interface TopicCacheKeyParts {
  snapshotId: string;
  subjectRef: string;
  definitionId: string;
  specVersion: string;
  topicId: string;
  promptVersion: string;
  evidenceFingerprint: string;
  model: string;
  generationConfig: Record<string, unknown>;
}

export function topicCacheKey(parts: TopicCacheKeyParts): string {
  return 'tc_' + sha256(stableStringify(parts)).slice(0, 40);
}

export interface CachedTopicEntry {
  key: string;
  parts: TopicCacheKeyParts;
  payload: GeneratedTopicPayload;
  generationId: string;
  provider: string;
  model: string;
  createdAtIso: string;
  tokens: { input: number; output: number; thinking: number };
  latencyMs: number;
}

export interface TopicCacheStore {
  get(key: string): Promise<CachedTopicEntry | undefined>;
  set(entry: CachedTopicEntry): Promise<void>;
  delete(key: string): Promise<void>;
}

export class InMemoryTopicCacheStore implements TopicCacheStore {
  private readonly map = new Map<string, CachedTopicEntry>();
  async get(key: string) {
    return this.map.get(key);
  }
  async set(entry: CachedTopicEntry) {
    this.map.set(entry.key, entry);
  }
  async delete(key: string) {
    this.map.delete(key);
  }
}

/**
 * Development file cache. Entries are partitioned per subject so that deleting
 * a subject's directory removes all of their cached narrative. Production uses
 * a database-backed store with the same interface.
 */
export class FileTopicCacheStore implements TopicCacheStore {
  constructor(private readonly rootDir: string) {}

  private file(key: string, subjectRef?: string): string {
    return path.join(this.rootDir, subjectRef ?? '_unscoped', `${key}.json`);
  }

  private findFile(key: string): string | undefined {
    if (!fs.existsSync(this.rootDir)) return undefined;
    for (const dir of fs.readdirSync(this.rootDir)) {
      const f = path.join(this.rootDir, dir, `${key}.json`);
      if (fs.existsSync(f)) return f;
    }
    return undefined;
  }

  async get(key: string): Promise<CachedTopicEntry | undefined> {
    const f = this.findFile(key);
    if (!f) return undefined;
    const entry = JSON.parse(fs.readFileSync(f, 'utf-8')) as CachedTopicEntry;
    // Defence in depth: the stored key must re-derive from its own parts.
    if (topicCacheKey(entry.parts) !== key) return undefined;
    return entry;
  }

  async set(entry: CachedTopicEntry): Promise<void> {
    const f = this.file(entry.key, entry.parts.subjectRef);
    fs.mkdirSync(path.dirname(f), { recursive: true, mode: 0o700 });
    fs.writeFileSync(f, JSON.stringify(entry, null, 2), { encoding: 'utf-8', mode: 0o600 });
  }

  async delete(key: string): Promise<void> {
    const f = this.findFile(key);
    if (f) fs.rmSync(f);
  }
}
