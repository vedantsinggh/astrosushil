/**
 * Consultation types: snapshot, resolution, admin writes and the commerce catalogue adapter.
 * prisma is substituted; no database connection.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockPrisma = vi.hoisted(() => ({
  consultationType: { findMany: vi.fn(), findFirst: vi.fn(), count: vi.fn(), create: vi.fn(), update: vi.fn() },
  consultationTypeMode: { findMany: vi.fn(), update: vi.fn(), create: vi.fn() },
  consultationTypeBlockedDate: { upsert: vi.fn(), deleteMany: vi.fn(), findMany: vi.fn() },
  $transaction: vi.fn(),
}));

vi.mock('../../src/services/prisma.service', () => ({ prisma: mockPrisma }));

import { ConsultationTypesService, slugify } from '../../src/modules/consultations/consultation-types.service';
import { DEFAULT_CONSULTATION_TIERS } from '../../src/modules/consultations/consultation-types.defaults';
import { toCatalogItem } from '../../src/modules/consultations/consultation-catalog.adapter';
import { COMMERCE_CATALOG } from '../../src/modules/commerce/commerce.catalog';
import {
  createConsultationTypeSchema,
  updateConsultationTypeSchema,
} from '../../src/modules/consultations/consultation-types.schemas';

const created = new Date('2026-11-01T00:00:00.000Z');
function typeRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'type-1',
    legacyId: null,
    title: 'Premium Consultation',
    kind: 'SPECIAL',
    description: 'desc',
    includes: ['Chart reading'],
    durationMinutes: 45,
    responseDays: 3,
    priceLabel: 'per session',
    note: null,
    isActive: true,
    deletedAt: null,
    createdAt: created,
    updatedAt: created,
    blockedDates: [{ date: new Date('2026-12-25T00:00:00.000Z') }],
    modes: [
      { id: 'm-v', typeId: 'type-1', mode: 'VIDEO', catalogId: 'consult-premium-consultation-video', pricePaise: 2000000, gstEnabled: true, gstRateBasisPoints: 1800, gstType: 'EXCLUSIVE', isActive: true },
      { id: 'm-a', typeId: 'type-1', mode: 'AUDIO', catalogId: 'consult-premium-consultation-audio', pricePaise: 1000000, gstEnabled: true, gstRateBasisPoints: 1800, gstType: 'INCLUSIVE', isActive: true },
      { id: 'm-p', typeId: 'type-1', mode: 'IN_PERSON', catalogId: 'consult-premium-consultation-in-person', pricePaise: 5000000, gstEnabled: true, gstRateBasisPoints: 1800, gstType: 'INCLUSIVE', isActive: false },
    ],
    ...overrides,
  };
}

let service: ConsultationTypesService;

beforeEach(() => {
  vi.clearAllMocks();
  service = new ConsultationTypesService();
  mockPrisma.consultationType.count.mockResolvedValue(1);
  mockPrisma.consultationType.findMany.mockResolvedValue([typeRow()]);
  mockPrisma.consultationTypeMode.findMany.mockResolvedValue([]);
  mockPrisma.$transaction.mockResolvedValue([]);
});

describe('default tiers', () => {
  it('equal the consultation constants of the commerce catalogue (same ids, prices, modes, notice)', () => {
    const constants = Object.values(COMMERCE_CATALOG).filter((i) => i.itemType === 'CONSULTATION');
    // Once the commerce catalogue reads consultations from the database these constants go away.
    if (constants.length === 0) return;
    expect(DEFAULT_CONSULTATION_TIERS.map((t) => t.catalogId).sort()).toEqual(constants.map((c) => c.id).sort());
    for (const item of constants) {
      const tier = DEFAULT_CONSULTATION_TIERS.find((t) => t.catalogId === item.id)!;
      expect(tier).toMatchObject({
        title: item.title,
        description: item.description,
        pricePaise: item.pricePaise,
        mode: item.consultationMode,
        durationMinutes: item.durationMinutes,
        responseDays: item.responseDays,
        gstRateBasisPoints: item.taxRateBasisPoints,
        gstType: item.taxIncluded ? 'INCLUSIVE' : 'EXCLUSIVE',
        isActive: item.isActive,
      });
    }
  });

  it('are what a process serves before it has read the database', () => {
    const offering = service.resolveOffering('consult-urgent-audio');
    expect(offering.type.responseDays).toBe(4);
    expect(offering.mode.mode).toBe('AUDIO');
    expect(offering.pricing.totalPaise).toBe(2500000);
  });

  it('seedDefaults creates only the tiers that are missing', async () => {
    mockPrisma.consultationTypeMode.findMany.mockResolvedValue(
      DEFAULT_CONSULTATION_TIERS.slice(2).map((t) => ({ catalogId: t.catalogId }))
    );
    mockPrisma.consultationType.create.mockResolvedValue({});
    expect(await service.seedDefaults()).toBe(2);
    const data = mockPrisma.consultationType.create.mock.calls[0][0].data;
    expect(data.modes.create[0]).toMatchObject({ catalogId: 'consult-budget-friendly', pricePaise: 500000, mode: 'AUDIO', gstType: 'INCLUSIVE' });
  });

  it('an empty table is seeded on first read; a table with rows is left alone', async () => {
    mockPrisma.consultationType.count.mockResolvedValue(0);
    mockPrisma.consultationType.create.mockResolvedValue({});
    await service.refresh({ force: true });
    expect(mockPrisma.consultationType.create).toHaveBeenCalledTimes(DEFAULT_CONSULTATION_TIERS.length);

    mockPrisma.consultationType.create.mockClear();
    mockPrisma.consultationType.count.mockResolvedValue(3);
    await service.refresh({ force: true });
    expect(mockPrisma.consultationType.create).not.toHaveBeenCalled();
  });
});

describe('snapshot and resolution', () => {
  it('replaces the defaults with the database rows, hiding removed modes', async () => {
    await service.refresh({ force: true });
    const [type] = service.all();
    expect(type).toMatchObject({ id: 'type-1', type: 'special', unavailableDates: ['2026-12-25'] });
    expect(type.modes.map((m) => m.mode)).toEqual(['AUDIO', 'VIDEO']);
    expect(() => service.resolveOffering('consult-urgent-audio')).toThrow(/not found/);
  });

  it('resolves by mode catalog id, and by type id + mode', async () => {
    await service.refresh({ force: true });
    expect(service.resolveOffering('consult-premium-consultation-video').mode.mode).toBe('VIDEO');
    expect(service.resolveOffering('type-1', 'AUDIO').mode.catalogId).toBe('consult-premium-consultation-audio');
    expect(service.resolveType('type-1').modes).toHaveLength(2);
    expect(service.resolveType('consult-premium-consultation-audio').id).toBe('type-1');
    // A catalog id of one mode with another mode requested prices the requested mode.
    expect(service.resolveOffering('consult-premium-consultation-audio', 'VIDEO').mode.pricePaise).toBe(2000000);
  });

  it('needs a mode when the type has several, and refuses a mode that is not offered', async () => {
    await service.refresh({ force: true });
    expect(() => service.resolveOffering('type-1')).toThrow(/Choose a mode/);
    expect(() => service.resolveOffering('type-1', 'IN_PERSON')).toThrow(/not offered/);
  });

  it('prices exclusive GST on top and inclusive GST inside', async () => {
    await service.refresh({ force: true });
    expect(service.resolveOffering('type-1', 'VIDEO').pricing).toMatchObject({ taxablePaise: 2000000, gstPaise: 360000, totalPaise: 2360000 });
    expect(service.resolveOffering('type-1', 'AUDIO').pricing.totalPaise).toBe(1000000);
  });

  it('hides inactive types from customers but not from staff', async () => {
    mockPrisma.consultationType.findMany.mockResolvedValue([typeRow({ isActive: false })]);
    await service.refresh({ force: true });
    expect(() => service.resolveOffering('type-1', 'AUDIO')).toThrow(/not found/);
    expect(service.resolveOffering('type-1', 'AUDIO', { includeInactive: true }).type.id).toBe('type-1');
    expect(service.listPublic()).toEqual([]);
  });

  it('keeps the previous snapshot when the database cannot be read, unless forced', async () => {
    await service.refresh({ force: true });
    mockPrisma.consultationType.count.mockRejectedValue(new Error('db down'));
    await expect(service.refresh({ force: true })).rejects.toThrow('db down');
    expect(service.all()).toHaveLength(1);
  });

  it('public list is cheapest first and can be filtered by kind', async () => {
    mockPrisma.consultationType.findMany.mockResolvedValue([
      typeRow(),
      typeRow({ id: 'type-2', kind: 'NORMAL', title: 'Cheap', blockedDates: [], modes: [
        { id: 'm2', typeId: 'type-2', mode: 'AUDIO', catalogId: 'consult-cheap-audio', pricePaise: 150000, gstEnabled: true, gstRateBasisPoints: 1800, gstType: 'INCLUSIVE', isActive: true },
      ] }),
    ]);
    await service.refresh({ force: true });
    expect(service.listPublic().map((t) => t.id)).toEqual(['type-2', 'type-1']);
    expect(service.listPublic('special').map((t) => t.id)).toEqual(['type-1']);
  });
});

describe('admin writes', () => {
  it('create allocates a stable catalog id per mode and never reuses one', async () => {
    mockPrisma.consultationTypeMode.findMany.mockImplementation(async ({ where }: { where: { catalogId: { startsWith: string } } }) =>
      where.catalogId.startsWith.endsWith('-audio') ? [{ catalogId: 'consult-vastu-visit-audio' }] : []
    );
    mockPrisma.consultationType.create.mockResolvedValue(typeRow());
    await service.create({
      title: 'Vastu Visit!',
      durationMinutes: 60,
      modes: [
        { mode: 'AUDIO', pricePaise: 100000 },
        { mode: 'VIDEO', pricePaise: 200000, gst: { rateBasisPoints: 1800, type: 'EXCLUSIVE' } },
      ],
    });
    const data = mockPrisma.consultationType.create.mock.calls[0][0].data;
    expect(data.isActive).toBe(true);
    expect(data.responseDays).toBe(0);
    expect(data.modes.create.map((m: { catalogId: string }) => m.catalogId)).toEqual([
      'consult-vastu-visit-audio-2',
      'consult-vastu-visit-video',
    ]);
    // Website defaults: GST enabled, rate 0, inclusive.
    expect(data.modes.create[0]).toMatchObject({ gstEnabled: true, gstRateBasisPoints: 0, gstType: 'INCLUSIVE' });
    expect(data.modes.create[1]).toMatchObject({ gstRateBasisPoints: 1800, gstType: 'EXCLUSIVE' });
  });

  it('create refuses duplicate modes and a mode without a price', async () => {
    await expect(
      service.create({ title: 'X y', durationMinutes: 30, modes: [{ mode: 'AUDIO', pricePaise: 100 }, { mode: 'AUDIO', pricePaise: 200 }] })
    ).rejects.toThrow(/more than once/);
    await expect(service.create({ title: 'X y', durationMinutes: 30, modes: [{ mode: 'AUDIO' }] })).rejects.toThrow(/Price is required/);
  });

  it('update merges modes by mode: change one, remove one, re-add a removed one with its old catalog id', async () => {
    mockPrisma.consultationType.findFirst.mockResolvedValue(typeRow());
    await service.update('type-1', {
      modes: [
        { mode: 'AUDIO', pricePaise: 1200000 },
        { mode: 'VIDEO', _delete: true },
        { mode: 'IN_PERSON', pricePaise: 6000000 },
      ],
    });
    const updates = mockPrisma.consultationTypeMode.update.mock.calls.map((c) => c[0]);
    expect(updates).toContainEqual(expect.objectContaining({ where: { id: 'm-a' }, data: expect.objectContaining({ pricePaise: 1200000, gstType: 'INCLUSIVE', isActive: true }) }));
    expect(updates).toContainEqual({ where: { id: 'm-v' }, data: { isActive: false } });
    expect(updates).toContainEqual(expect.objectContaining({ where: { id: 'm-p' }, data: expect.objectContaining({ pricePaise: 6000000, isActive: true }) }));
    expect(mockPrisma.consultationTypeMode.create).not.toHaveBeenCalled();
  });

  it('update refuses to remove the last mode', async () => {
    mockPrisma.consultationType.findFirst.mockResolvedValue(typeRow());
    await expect(
      service.update('type-1', { modes: [{ mode: 'AUDIO', _delete: true }, { mode: 'VIDEO', _delete: true }] })
    ).rejects.toThrow(/at least one mode/);
  });

  it('delete keeps the row (hidden, inactive) so past bookings still resolve', async () => {
    mockPrisma.consultationType.findFirst.mockResolvedValue({ id: 'type-1' });
    await service.remove('type-1');
    const args = mockPrisma.consultationType.update.mock.calls[0][0];
    expect(args.where).toEqual({ id: 'type-1' });
    expect(args.data.isActive).toBe(false);
    expect(args.data.deletedAt).toBeInstanceOf(Date);
  });

  it('blocking a date for a type is stored as a real date', async () => {
    mockPrisma.consultationType.findFirst.mockResolvedValue({ id: 'type-1' });
    mockPrisma.consultationTypeBlockedDate.findMany.mockResolvedValue([{ date: new Date('2026-12-25T00:00:00.000Z') }]);
    expect(await service.blockDate('type-1', '25-12-2026')).toEqual(['2026-12-25']);
    expect(mockPrisma.consultationTypeBlockedDate.upsert.mock.calls[0][0].create).toEqual({
      typeId: 'type-1',
      date: new Date('2026-12-25T00:00:00.000Z'),
    });
  });
});

describe('schemas', () => {
  it('accept the website lower-case enums and reject client-supplied extras', () => {
    const parsed = createConsultationTypeSchema.parse({
      title: 'General',
      type: 'special',
      durationMinutes: 30,
      modes: [{ mode: 'in_person', pricePaise: 500000, gst: { type: 'exclusive', rateBasisPoints: 1800 } }],
    });
    expect(parsed.modes[0]).toMatchObject({ mode: 'IN_PERSON', gst: { type: 'EXCLUSIVE' } });
    expect(() => createConsultationTypeSchema.parse({ title: 'G', durationMinutes: 30, modes: [] })).toThrow();
    expect(() => createConsultationTypeSchema.parse({ title: 'General', durationMinutes: 30, modes: [{ mode: 'AUDIO', pricePaise: 12.5 }] })).toThrow();
    expect(() => updateConsultationTypeSchema.parse({ catalogId: 'x' })).toThrow();
    expect(updateConsultationTypeSchema.parse({ isActive: false })).toEqual({ isActive: false });
  });

  it('slugify is ASCII and never empty', () => {
    expect(slugify('Wrist Watch Therapy — 30 min!')).toBe('wrist-watch-therapy-30-min');
    expect(slugify('परामर्श')).toBe('consultation');
  });
});

describe('commerce catalogue adapter', () => {
  it('maps a seeded tier to exactly the catalogue item it replaces', () => {
    const offering = service.resolveOffering('consult-general-video');
    const item = toCatalogItem(offering.type, offering.mode);
    const constant = COMMERCE_CATALOG['consult-general-video'];
    if (constant) {
      expect(item).toEqual(constant);
    }
    expect(item).toMatchObject({ id: 'consult-general-video', pricePaise: 1500000, taxIncluded: true, taxRateBasisPoints: 1800, consultationMode: 'VIDEO' });
  });

  it('marks exclusive GST as not included and names the mode of a multi-mode type', async () => {
    await service.refresh({ force: true });
    const offering = service.resolveOffering('type-1', 'VIDEO');
    const item = toCatalogItem(offering.type, offering.mode);
    expect(item).toMatchObject({
      id: 'consult-premium-consultation-video',
      title: 'Premium Consultation (Video)',
      pricePaise: 2000000,
      taxIncluded: false,
      taxRateBasisPoints: 1800,
      durationMinutes: 45,
    });
  });
});
