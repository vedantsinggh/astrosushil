/**
 * Consultation types: the admin-editable replacement for the consultation tiers that used to be
 * constants in the commerce catalogue (website module `consultation`).
 *
 * The database is the source of truth. Because the commerce catalogue and a few existing callers
 * are synchronous, this service also keeps an in-memory snapshot of the types:
 *   - it starts as the built-in default tiers (the same rows the seed inserts);
 *   - `refresh()` replaces it from the database (at most every 30 s, and after every admin write);
 *   - `refresh({ force: true })` is used before money is involved and fails if the database
 *     cannot be read, so a booking is never priced from a stale snapshot.
 */
import { ConsultationMode, ConsultationTypeKind, Prisma } from '@prisma/client';
import { prisma } from '../../services/prisma.service';
import { ConflictError, NotFoundError, ValidationError } from '../../errors/app-error';
import { logger } from '../../utils/logger';
import { calendarDateToDb, dbToCalendarDate, normaliseCalendarDate } from '../availability/availability.time';
import { computeGst, GstBreakdown, GstConfig, GstType } from './consultation-gst';
import { DEFAULT_CONSULTATION_TIERS, DefaultConsultationTier } from './consultation-types.defaults';

export interface ConsultationModeView {
  mode: ConsultationMode;
  /** Commerce catalogue id of this type + mode. Stable for the life of the mode. */
  catalogId: string;
  pricePaise: number;
  gst: GstConfig;
  /** What the customer pays for this mode, GST included. */
  priceWithGstPaise: number;
  gstPaise: number;
  taxablePaise: number;
}

export interface ConsultationTypeView {
  id: string;
  legacyId: string | null;
  title: string;
  type: 'normal' | 'special';
  description: string | null;
  includes: string[];
  durationMinutes: number;
  responseDays: number;
  priceLabel: string | null;
  note: string | null;
  isActive: boolean;
  /** Active modes only. */
  modes: ConsultationModeView[];
  /** IST dates (YYYY-MM-DD) on which this type cannot be booked. */
  unavailableDates: string[];
  createdAt: string | null;
  updatedAt: string | null;
}

export interface ResolvedOffering {
  type: ConsultationTypeView;
  mode: ConsultationModeView;
  pricing: GstBreakdown;
}

export interface ConsultationModeInput {
  mode: ConsultationMode;
  pricePaise?: number;
  gst?: Partial<GstConfig>;
  _delete?: boolean;
}

export interface ConsultationTypeInput {
  title: string;
  type?: 'normal' | 'special';
  description?: string | null;
  responseDays?: number;
  includes?: string[];
  /** Optional when the only mode is MESSAGE (stored as 0). */
  durationMinutes?: number;
  priceLabel?: string | null;
  note?: string | null;
  isActive?: boolean;
  modes: ConsultationModeInput[];
}

export type ConsultationTypePatch = Partial<ConsultationTypeInput>;

const TYPE_INCLUDE = {
  modes: true,
  blockedDates: { select: { date: true } },
} satisfies Prisma.ConsultationTypeInclude;

type TypeRow = Prisma.ConsultationTypeGetPayload<{ include: typeof TYPE_INCLUDE }>;

const MODE_ORDER: Record<ConsultationMode, number> = { AUDIO: 0, VIDEO: 1, IN_PERSON: 2, MESSAGE: 3 };
const SNAPSHOT_TTL_MS = 30_000;
const RETRY_AFTER_FAILURE_MS = 5_000;

function modeView(row: {
  mode: ConsultationMode;
  catalogId: string;
  pricePaise: number;
  gstEnabled: boolean;
  gstRateBasisPoints: number;
  gstType: GstType;
}): ConsultationModeView {
  const gst: GstConfig = { enabled: row.gstEnabled, rateBasisPoints: row.gstRateBasisPoints, type: row.gstType };
  const pricing = computeGst(row.pricePaise, gst);
  return {
    mode: row.mode,
    catalogId: row.catalogId,
    pricePaise: row.pricePaise,
    gst,
    priceWithGstPaise: pricing.totalPaise,
    gstPaise: pricing.gstPaise,
    taxablePaise: pricing.taxablePaise,
  };
}

function rowToView(row: TypeRow): ConsultationTypeView {
  return {
    id: row.id,
    legacyId: row.legacyId,
    title: row.title,
    type: row.kind === ConsultationTypeKind.SPECIAL ? 'special' : 'normal',
    description: row.description,
    includes: row.includes,
    durationMinutes: row.durationMinutes,
    responseDays: row.responseDays,
    priceLabel: row.priceLabel,
    note: row.note,
    isActive: row.isActive,
    modes: row.modes
      .filter((m) => m.isActive)
      .sort((a, b) => MODE_ORDER[a.mode] - MODE_ORDER[b.mode])
      .map(modeView),
    unavailableDates: row.blockedDates.map((d) => dbToCalendarDate(d.date)).sort(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function defaultTierToView(tier: DefaultConsultationTier): ConsultationTypeView {
  return {
    id: tier.catalogId,
    legacyId: null,
    title: tier.title,
    type: 'normal',
    description: tier.description,
    includes: [],
    durationMinutes: tier.durationMinutes,
    responseDays: tier.responseDays,
    priceLabel: null,
    note: null,
    isActive: tier.isActive,
    modes: [
      modeView({
        mode: tier.mode,
        catalogId: tier.catalogId,
        pricePaise: tier.pricePaise,
        gstEnabled: true,
        gstRateBasisPoints: tier.gstRateBasisPoints,
        gstType: tier.gstType,
      }),
    ],
    unavailableDates: [],
    createdAt: null,
    updatedAt: null,
  };
}

export function slugify(text: string): string {
  const slug = text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '');
  return slug || 'consultation';
}

function modeSlug(mode: ConsultationMode): string {
  return mode.toLowerCase().replace(/_/g, '-');
}

function resolveGst(input: Partial<GstConfig> | undefined, existing?: GstConfig): GstConfig {
  return {
    // Website schema defaults: enabled true, rate 0, type inclusive.
    enabled: input?.enabled ?? existing?.enabled ?? true,
    rateBasisPoints: input?.rateBasisPoints ?? existing?.rateBasisPoints ?? 0,
    type: input?.type ?? existing?.type ?? 'INCLUSIVE',
  };
}

function assertUniqueModes(modes: ConsultationModeInput[]): void {
  const seen = new Set<ConsultationMode>();
  for (const m of modes) {
    if (seen.has(m.mode)) throw new ValidationError(`Mode ${m.mode} is listed more than once`);
    seen.add(m.mode);
  }
}

export class ConsultationTypesService {
  private snapshot: ConsultationTypeView[] = DEFAULT_CONSULTATION_TIERS.map(defaultTierToView);
  private nextRefreshAt = 0;
  private refreshing: Promise<void> | null = null;

  // ---------------------------------------------------------------------------
  // Snapshot
  // ---------------------------------------------------------------------------

  /**
   * Bring the in-memory snapshot up to date with the database.
   * Without `force`, a failed read keeps the previous snapshot (logged); with `force` it throws.
   */
  public async refresh(options: { force?: boolean } = {}): Promise<void> {
    if (!options.force && Date.now() < this.nextRefreshAt) return;
    if (!this.refreshing) {
      this.refreshing = this.loadFromDatabase().finally(() => {
        this.refreshing = null;
      });
    }
    try {
      await this.refreshing;
    } catch (err) {
      if (options.force) throw err;
      this.nextRefreshAt = Date.now() + RETRY_AFTER_FAILURE_MS;
      logger.warn(
        { err: err instanceof Error ? err.message : String(err) },
        '[ConsultationTypes] Could not read consultation types; keeping the previous snapshot'
      );
    }
  }

  private async loadFromDatabase(): Promise<void> {
    await this.seedDefaultsIfEmpty();
    const rows = await prisma.consultationType.findMany({
      where: { deletedAt: null },
      include: TYPE_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    this.snapshot = rows.map(rowToView);
    this.nextRefreshAt = Date.now() + SNAPSHOT_TTL_MS;
  }

  /**
   * Insert the default tiers that are missing. Idempotent: a tier is identified by its catalog id
   * and an existing one is never modified. Returns how many were created.
   */
  public async seedDefaults(): Promise<number> {
    const existing = await prisma.consultationTypeMode.findMany({
      where: { catalogId: { in: DEFAULT_CONSULTATION_TIERS.map((t) => t.catalogId) } },
      select: { catalogId: true },
    });
    const have = new Set(existing.map((m) => m.catalogId));
    let created = 0;
    for (const tier of DEFAULT_CONSULTATION_TIERS) {
      if (have.has(tier.catalogId)) continue;
      try {
        await prisma.consultationType.create({
          data: {
            title: tier.title,
            kind: ConsultationTypeKind.NORMAL,
            description: tier.description,
            includes: [],
            durationMinutes: tier.durationMinutes,
            responseDays: tier.responseDays,
            isActive: tier.isActive,
            modes: {
              create: [
                {
                  mode: tier.mode,
                  catalogId: tier.catalogId,
                  pricePaise: tier.pricePaise,
                  gstEnabled: true,
                  gstRateBasisPoints: tier.gstRateBasisPoints,
                  gstType: tier.gstType,
                },
              ],
            },
          },
        });
        created += 1;
      } catch (err) {
        // Another process seeded the same tier at the same moment.
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') continue;
        throw err;
      }
    }
    return created;
  }

  /** A brand-new database (no consultation type was ever created) gets the default tiers. */
  private async seedDefaultsIfEmpty(): Promise<void> {
    const count = await prisma.consultationType.count();
    if (count > 0) return;
    const created = await this.seedDefaults();
    logger.info({ created }, '[ConsultationTypes] Empty table: default consultation tiers inserted');
  }

  /** All non-deleted types from the snapshot (newest first). Call `refresh()` first in async code. */
  public all(): ConsultationTypeView[] {
    return this.snapshot;
  }

  // ---------------------------------------------------------------------------
  // Reads
  // ---------------------------------------------------------------------------

  /**
   * Find what a customer is booking. `idOrCatalogId` is either a mode's catalog id (what the
   * mobile app sends, e.g. "consult-general-audio") or a consultation type id; `mode` picks the
   * mode when the type has more than one.
   */
  public resolveOffering(
    idOrCatalogId: string,
    mode?: ConsultationMode | null,
    options: { includeInactive?: boolean } = {}
  ): ResolvedOffering {
    const type = this.resolveType(idOrCatalogId, options);
    let chosen = type.modes.find((m) => m.catalogId === idOrCatalogId);

    if (mode && chosen?.mode !== mode) {
      chosen = type.modes.find((m) => m.mode === mode);
      if (!chosen) {
        throw new ValidationError(`Mode ${mode} is not offered for "${type.title}"`);
      }
    }
    if (!chosen) {
      if (type.modes.length !== 1) {
        throw new ValidationError(`Choose a mode for "${type.title}"`);
      }
      chosen = type.modes[0];
    }

    return { type, mode: chosen, pricing: computeGst(chosen.pricePaise, chosen.gst) };
  }

  /** Resolve a consultation type when callers need type-level data, such as available slots. */
  public resolveType(
    idOrCatalogId: string,
    options: { includeInactive?: boolean } = {}
  ): ConsultationTypeView {
    const byCatalogId = this.snapshot.find((candidate) =>
      candidate.modes.some((mode) => mode.catalogId === idOrCatalogId)
    );
    const type = byCatalogId ?? this.snapshot.find((candidate) => candidate.id === idOrCatalogId);
    if (!type || (!type.isActive && !options.includeInactive)) {
      throw new NotFoundError(`Consultation offering '${idOrCatalogId}' not found`);
    }
    return type;
  }

  /** Website `GET /consultation`: active types, cheapest first, optionally one kind. */
  public listPublic(kind?: 'normal' | 'special'): ConsultationTypeView[] {
    const minPrice = (t: ConsultationTypeView) => Math.min(...t.modes.map((m) => m.pricePaise));
    return this.snapshot
      .filter((t) => t.isActive && t.modes.length > 0 && (!kind || t.type === kind))
      .sort((a, b) => minPrice(a) - minPrice(b));
  }

  public getPublic(id: string): ConsultationTypeView {
    const type = this.snapshot.find((t) => t.id === id);
    if (!type || !type.isActive) throw new NotFoundError('Consultation not found');
    return type;
  }

  /** Website `GET /consultation/admin/all`: every type, newest first. */
  public async listAdmin(): Promise<ConsultationTypeView[]> {
    await this.refresh({ force: true });
    return this.snapshot;
  }

  /** Website `GET /consultation/admin`: one row per type + mode, for the booking drawer. */
  public async listAdminFlat() {
    const types = await this.listAdmin();
    return types.flatMap((t) =>
      t.modes.map((m) => ({
        id: `${t.id}_${m.mode}`,
        consultationTypeId: t.id,
        catalogId: m.catalogId,
        title: t.title,
        type: t.type,
        mode: m.mode,
        pricePaise: m.pricePaise,
        priceWithGstPaise: m.priceWithGstPaise,
        gst: m.gst,
        durationMinutes: t.durationMinutes,
        isActive: t.isActive,
        createdAt: t.createdAt,
      }))
    );
  }

  public async getAdmin(id: string): Promise<ConsultationTypeView> {
    const row = await prisma.consultationType.findFirst({ where: { id, deletedAt: null }, include: TYPE_INCLUDE });
    if (!row) throw new NotFoundError('Consultation not found');
    return rowToView(row);
  }

  // ---------------------------------------------------------------------------
  // Writes (admin)
  // ---------------------------------------------------------------------------

  public async create(input: ConsultationTypeInput): Promise<ConsultationTypeView> {
    assertUniqueModes(input.modes);
    const modes = input.modes.filter((m) => !m._delete);
    if (modes.length === 0) throw new ValidationError('At least one mode is required');

    const slug = slugify(input.title);
    const modeRows: Prisma.ConsultationTypeModeCreateWithoutTypeInput[] = [];
    for (const m of modes) {
      if (m.pricePaise === undefined) throw new ValidationError(`Price is required for mode ${m.mode}`);
      const gst = resolveGst(m.gst);
      modeRows.push({
        mode: m.mode,
        catalogId: await this.allocateCatalogId(slug, m.mode),
        pricePaise: m.pricePaise,
        gstEnabled: gst.enabled,
        gstRateBasisPoints: gst.rateBasisPoints,
        gstType: gst.type,
      });
    }

    const row = await this.withCatalogIdConflict(() =>
      prisma.consultationType.create({
        data: {
          title: input.title,
          kind: input.type === 'special' ? ConsultationTypeKind.SPECIAL : ConsultationTypeKind.NORMAL,
          description: input.description ?? null,
          includes: input.includes ?? [],
          durationMinutes: input.durationMinutes ?? 0,
          responseDays: input.responseDays ?? 0,
          priceLabel: input.priceLabel ?? null,
          note: input.note ?? null,
          // As on the website, a new consultation is always created active.
          isActive: true,
          modes: { create: modeRows },
        },
        include: TYPE_INCLUDE,
      })
    );
    await this.refresh({ force: true });
    return rowToView(row);
  }

  /**
   * Partial update. `modes` is merged by mode, as on the website: a listed mode is added or
   * changed, `_delete: true` removes it, a mode that is not listed is left alone.
   */
  public async update(id: string, patch: ConsultationTypePatch): Promise<ConsultationTypeView> {
    const existing = await prisma.consultationType.findFirst({ where: { id, deletedAt: null }, include: { modes: true } });
    if (!existing) throw new NotFoundError('Consultation not found');
    if (patch.modes) assertUniqueModes(patch.modes);

    const slug = slugify(patch.title ?? existing.title);
    const modeWrites: Prisma.PrismaPromise<unknown>[] = [];
    const activeAfter = new Set(existing.modes.filter((m) => m.isActive).map((m) => m.mode));

    for (const incoming of patch.modes ?? []) {
      const current = existing.modes.find((m) => m.mode === incoming.mode);
      if (incoming._delete) {
        activeAfter.delete(incoming.mode);
        if (current) {
          modeWrites.push(prisma.consultationTypeMode.update({ where: { id: current.id }, data: { isActive: false } }));
        }
        continue;
      }
      activeAfter.add(incoming.mode);
      if (current) {
        const gst = resolveGst(incoming.gst, {
          enabled: current.gstEnabled,
          rateBasisPoints: current.gstRateBasisPoints,
          type: current.gstType,
        });
        modeWrites.push(
          prisma.consultationTypeMode.update({
            where: { id: current.id },
            data: {
              pricePaise: incoming.pricePaise ?? current.pricePaise,
              gstEnabled: gst.enabled,
              gstRateBasisPoints: gst.rateBasisPoints,
              gstType: gst.type,
              isActive: true,
            },
          })
        );
      } else {
        if (incoming.pricePaise === undefined) {
          throw new ValidationError(`Price is required for mode ${incoming.mode}`);
        }
        const gst = resolveGst(incoming.gst);
        modeWrites.push(
          prisma.consultationTypeMode.create({
            data: {
              typeId: id,
              mode: incoming.mode,
              catalogId: await this.allocateCatalogId(slug, incoming.mode),
              pricePaise: incoming.pricePaise,
              gstEnabled: gst.enabled,
              gstRateBasisPoints: gst.rateBasisPoints,
              gstType: gst.type,
            },
          })
        );
      }
    }

    if (activeAfter.size === 0) {
      throw new ValidationError('A consultation must keep at least one mode');
    }

    const data: Prisma.ConsultationTypeUpdateInput = {};
    if (patch.title !== undefined) data.title = patch.title;
    if (patch.type !== undefined) {
      data.kind = patch.type === 'special' ? ConsultationTypeKind.SPECIAL : ConsultationTypeKind.NORMAL;
    }
    if (patch.description !== undefined) data.description = patch.description;
    if (patch.responseDays !== undefined) data.responseDays = patch.responseDays;
    if (patch.includes !== undefined) data.includes = patch.includes;
    if (patch.durationMinutes !== undefined) data.durationMinutes = patch.durationMinutes;
    if (patch.priceLabel !== undefined) data.priceLabel = patch.priceLabel;
    if (patch.note !== undefined) data.note = patch.note;
    if (patch.isActive !== undefined) data.isActive = patch.isActive;

    await this.withCatalogIdConflict(() =>
      prisma.$transaction([...modeWrites, prisma.consultationType.update({ where: { id }, data })])
    );
    await this.refresh({ force: true });
    return this.getAdmin(id);
  }

  /**
   * Admin delete. The website removes the document; here the row is kept (hidden and inactive)
   * so that past bookings and paid orders still resolve their consultation.
   */
  public async remove(id: string): Promise<void> {
    const existing = await prisma.consultationType.findFirst({ where: { id, deletedAt: null }, select: { id: true } });
    if (!existing) throw new NotFoundError('Consultation not found');
    await prisma.consultationType.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
    await this.refresh({ force: true });
  }

  // ---------------------------------------------------------------------------
  // Per-type blocked dates (the website's `unavailableDates`, made effective)
  // ---------------------------------------------------------------------------

  public async blockDate(typeId: string, date: string): Promise<string[]> {
    await this.assertExists(typeId);
    const day = calendarDateToDb(normaliseCalendarDate(date));
    await prisma.consultationTypeBlockedDate.upsert({
      where: { typeId_date: { typeId, date: day } },
      create: { typeId, date: day },
      update: {},
    });
    await this.refresh({ force: true });
    return this.getBlockedDates(typeId);
  }

  public async unblockDate(typeId: string, date: string): Promise<string[]> {
    await this.assertExists(typeId);
    const day = calendarDateToDb(normaliseCalendarDate(date));
    await prisma.consultationTypeBlockedDate.deleteMany({ where: { typeId, date: day } });
    await this.refresh({ force: true });
    return this.getBlockedDates(typeId);
  }

  public async getBlockedDates(typeId: string): Promise<string[]> {
    await this.assertExists(typeId);
    const rows = await prisma.consultationTypeBlockedDate.findMany({
      where: { typeId },
      select: { date: true },
      orderBy: { date: 'asc' },
    });
    return rows.map((r) => dbToCalendarDate(r.date));
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private async assertExists(typeId: string): Promise<void> {
    const row = await prisma.consultationType.findFirst({ where: { id: typeId, deletedAt: null }, select: { id: true } });
    if (!row) throw new NotFoundError('Consultation not found');
  }

  /** "consult-<title-slug>-<mode>", with a numeric suffix when that id was ever used. */
  private async allocateCatalogId(titleSlug: string, mode: ConsultationMode): Promise<string> {
    const base = `consult-${titleSlug}-${modeSlug(mode)}`;
    const taken = await prisma.consultationTypeMode.findMany({
      where: { catalogId: { startsWith: base } },
      select: { catalogId: true },
    });
    const used = new Set(taken.map((t) => t.catalogId));
    if (!used.has(base)) return base;
    for (let n = 2; n < 1000; n += 1) {
      const candidate = `${base}-${n}`;
      if (!used.has(candidate)) return candidate;
    }
    throw new ConflictError('Could not allocate a catalog id for this consultation');
  }

  private async withCatalogIdConflict<T>(run: () => Promise<T>): Promise<T> {
    try {
      return await run();
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictError('Another consultation was saved at the same time. Please try again.');
      }
      throw err;
    }
  }
}

export const consultationTypesService = new ConsultationTypesService();
