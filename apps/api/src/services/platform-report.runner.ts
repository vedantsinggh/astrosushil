/**
 * Bridge between the report worker and the universal report platform
 * (packages/report-engine/src/platform) — the only report generation path.
 * A ReportType without a registered platform module cannot be sold or generated.
 */
import { Prisma } from '@prisma/client';
import { GeminiAiProvider } from '@astro/prediction-engine';
import { reportPlatform } from '@astro/report-engine';
import { prisma } from './prisma.service';
import { logger } from '../utils/logger';

type CachedTopicEntry = reportPlatform.CachedTopicEntry;
type SubjectInput = reportPlatform.SubjectInput;

/** Postgres-backed topic cache (table report_topic_cache). */
export class PrismaTopicCacheStore implements reportPlatform.TopicCacheStore {
  async get(key: string): Promise<CachedTopicEntry | undefined> {
    const row = await prisma.reportTopicCache.findUnique({ where: { key } });
    if (!row) return undefined;
    const entry: CachedTopicEntry = {
      key: row.key,
      parts: row.parts as unknown as CachedTopicEntry['parts'],
      payload: row.payload as unknown as CachedTopicEntry['payload'],
      generationId: row.generationId,
      provider: row.provider,
      model: row.model,
      createdAtIso: row.createdAt.toISOString(),
      tokens: row.tokens as unknown as CachedTopicEntry['tokens'],
      latencyMs: row.latencyMs,
    };
    // Defence in depth: the key must re-derive from its stored parts.
    return reportPlatform.topicCacheKey(entry.parts) === key ? entry : undefined;
  }

  async set(entry: CachedTopicEntry): Promise<void> {
    const data = {
      subjectRef: entry.parts.subjectRef,
      snapshotId: entry.parts.snapshotId,
      definitionId: entry.parts.definitionId,
      topicId: entry.parts.topicId,
      model: entry.model,
      provider: entry.provider,
      generationId: entry.generationId,
      parts: entry.parts as unknown as Prisma.InputJsonValue,
      payload: entry.payload as unknown as Prisma.InputJsonValue,
      tokens: entry.tokens as unknown as Prisma.InputJsonValue,
      latencyMs: Math.round(entry.latencyMs),
    };
    await prisma.reportTopicCache.upsert({ where: { key: entry.key }, create: { key: entry.key, ...data }, update: data });
  }

  async delete(key: string): Promise<void> {
    await prisma.reportTopicCache.deleteMany({ where: { key } });
  }
}

/** True when the platform has a genuine generator for this ReportType. */
export function isPlatformReportType(reportType: string): boolean {
  return Boolean(reportPlatform.ReportRegistry.byReportType(reportType));
}

/** Every ReportType the platform can fulfil. */
export function platformReportTypes(): string[] {
  return reportPlatform.ReportRegistry.reportTypes();
}

interface BirthProfileLike {
  name: string;
  dateOfBirth: string;
  timeOfBirth: string;
  latitude: number;
  longitude: number;
  timezone: string;
  placeName: string | null;
  utcDateTime?: Date | null;
  timezoneOffsetSeconds?: number | null;
  disambiguation?: string | null;
}

export function subjectFromProfile(profile: BirthProfileLike): SubjectInput {
  const time = (profile.timeOfBirth || '').trim();
  return {
    name: profile.name,
    dateOfBirth: profile.dateOfBirth.slice(0, 10),
    timeOfBirth: time ? time.slice(0, 8) : undefined,
    // No placeholder text: without a stored place name the cover shows the actual coordinates.
    placeName: profile.placeName?.trim() || `${profile.latitude.toFixed(4)}, ${profile.longitude.toFixed(4)}`,
    latitude: profile.latitude,
    longitude: profile.longitude,
    timezone: profile.timezone,
    // Use the instant resolved at profile creation (handles DST-ambiguous local times).
    utcDateTime: profile.utcDateTime ? new Date(profile.utcDateTime).toISOString() : undefined,
    timezoneOffsetSeconds: typeof profile.timezoneOffsetSeconds === 'number' ? profile.timezoneOffsetSeconds : undefined,
    disambiguation: profile.disambiguation === 'earlier' || profile.disambiguation === 'later' ? profile.disambiguation : undefined,
  };
}

export interface PlatformRunInput {
  reportId: string;
  reportType: string;
  userId: string;
  profile: BirthProfileLike;
  /** Partner birth profile ID for two-person reports (must belong to the same user). */
  partnerProfileId?: string;
  regenerateTopics?: string[];
  asOf?: Date;
  /** Baby Name: names the family is considering (validated strings only). */
  candidateNames?: unknown;
  /** Cancels generation between sections (attempt time limit). */
  signal?: AbortSignal;
  /** Generation progress (per settled narrative topic, then PDF compile). Presentation only. */
  onProgress?: (event: reportPlatform.ReportProgressEvent) => void;
}

export class PlatformInputError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
  }
}

export async function runPlatformReport(input: PlatformRunInput) {
  const definition = reportPlatform.ReportRegistry.byReportType(input.reportType);
  if (!definition) throw new PlatformInputError('REPORT_TYPE_NOT_SUPPORTED', `No platform definition for ${input.reportType}`);

  let partner: SubjectInput | undefined;
  if (definition.requires.partner) {
    if (!input.partnerProfileId) throw new PlatformInputError('MISSING_PARTNER_PROFILE', 'Partner birth profile ID is required for this report.');
    // Client isolation: the partner profile must belong to the purchasing user.
    const partnerProfile = await prisma.birthProfile.findFirst({ where: { id: input.partnerProfileId, userId: input.userId } });
    if (!partnerProfile) throw new PlatformInputError('PARTNER_PROFILE_NOT_FOUND', 'Partner birth profile not found.');
    partner = subjectFromProfile(partnerProfile);
  }

  const provider = new GeminiAiProvider();
  if (!provider.isConfigured) throw new PlatformInputError('LLM_NOT_CONFIGURED', 'GEMINI_API_KEY is not configured.');
  const narrator = new reportPlatform.LlmNarrator(provider, new PrismaTopicCacheStore());

  let result: Awaited<ReturnType<typeof reportPlatform.generateReport>>;
  try {
    result = await generatePlatform(definition.id, input, partner, narrator);
  } catch (err) {
    // Invalid or incomplete birth data can never succeed on retry.
    const message = err instanceof Error ? err.message : String(err);
    if (err instanceof reportPlatform.SnapshotInputError || /^(SNAPSHOT_INPUT_INVALID|NUMEROLOGY_INPUT_INVALID)/.test(message)) {
      throw new PlatformInputError('BIRTH_DATA_INVALID', `The birth details on file are incomplete or invalid: ${message.replace(/^[A-Z_]+: /, '')}`);
    }
    if (/^REPORT_TYPE_MISMATCH/.test(message)) throw new PlatformInputError('REPORT_TYPE_MISMATCH', message);
    throw err;
  }
  return result;
}

async function generatePlatform(
  definitionId: string,
  input: PlatformRunInput,
  partner: SubjectInput | undefined,
  narrator: reportPlatform.LlmNarrator
) {
  const result = await reportPlatform.generateReport({
    definitionId,
    reportType: input.reportType,
    signal: input.signal,
    onProgress: input.onProgress,
    subject: {
      ...subjectFromProfile(input.profile),
      candidateNames: Array.isArray(input.candidateNames)
        ? input.candidateNames.filter((n): n is string => typeof n === 'string' && n.trim().length > 0 && n.length <= 60).slice(0, 10)
        : undefined,
    },
    partner,
    narrator,
    asOf: input.asOf,
    reportId: input.reportId,
    regenerateTopics: input.regenerateTopics,
    llmProviderLabel: 'Google Gemini',
  });

  // Never log narrative or birth details; only operational facts.
  logger.info(
    {
      reportId: input.reportId,
      definitionId,
      status: result.manifest.status,
      pages: result.manifest.pdf?.pageCount,
      liveCalls: result.manifest.usage.liveCalls,
      cachedTopics: result.manifest.usage.cachedCalls,
      estimatedCostUsd: result.manifest.usage.estimatedCostUsd,
    },
    '[ReportPlatform] Generation finished'
  );
  return result;
}
