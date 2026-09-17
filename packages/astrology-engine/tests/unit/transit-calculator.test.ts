import { describe, it, expect } from 'vitest';
import { TransitCalculator } from '../../src/transit/transit-calculator';
import { ChartCalculator } from '../../src/chart/chart-calculator';
import { MockEphemerisProvider } from '../../src/ephemeris/mock-ephemeris.provider';
import { PlanetSymbol } from '../../src/planets/planet.types';

describe('TransitCalculator Unit Tests (Phase 2V Gochara)', () => {
  const calculator = new TransitCalculator(new MockEphemerisProvider());
  const chartCalculator = new ChartCalculator(new MockEphemerisProvider());

  const config = {
    zodiacType: 'SIDEREAL' as const,
    ayanamsa: 'LAHIRI' as const,
    houseSystem: 'WHOLE_SIGN' as const,
    nodeCalculation: 'MEAN_NODE' as const,
    planetaryCalculationMode: 'GEOCENTRIC' as const,
    precisionDegrees: 0.0001,
    roundingRule: 'NEAREST' as const,
    dashaSystem: 'VIMSHOTTARI' as const,
  };

  const transitInput = {
    timestampIso: '2026-09-17T12:00:00.000Z',
    timezone: 'Asia/Kolkata',
    location: {
      latitude: 28.6139,
      longitude: 77.209,
      timezone: 'Asia/Kolkata',
      placeName: 'New Delhi, India',
    },
  };

  it('calculates transit chart with 9 planets, Ascendant, and 12 whole-sign houses', async () => {
    const transitChart = await calculator.calculateTransitChart(transitInput, config);

    expect(transitChart.calculationVersion).toBe('0.1.0');
    expect(transitChart.transitTime.utcIso).toBe('2026-09-17T12:00:00.000Z');
    expect(transitChart.location.latitude).toBe(28.6139);

    // Ascendant
    expect(transitChart.ascendant).toBeDefined();
    expect(transitChart.ascendant.rashiIndex).toBeGreaterThanOrEqual(1);
    expect(transitChart.ascendant.rashiIndex).toBeLessThanOrEqual(12);
    expect(transitChart.ascendant.nakshatraIndex).toBeGreaterThanOrEqual(1);
    expect(transitChart.ascendant.nakshatraIndex).toBeLessThanOrEqual(27);
    expect(transitChart.ascendant.pada).toBeGreaterThanOrEqual(1);
    expect(transitChart.ascendant.pada).toBeLessThanOrEqual(4);

    // 9 Vedic planets
    const planetKeys = Object.keys(transitChart.planets) as PlanetSymbol[];
    expect(planetKeys.length).toBe(9);

    for (const p of planetKeys) {
      const pPos = transitChart.planets[p];
      expect(pPos).toBeDefined();
      expect(pPos.planet).toBe(p);
      expect(typeof pPos.longitude).toBe('number');
      expect(pPos.rashiIndex).toBeGreaterThanOrEqual(1);
      expect(pPos.rashiIndex).toBeLessThanOrEqual(12);
      expect(pPos.house).toBeGreaterThanOrEqual(1);
      expect(pPos.house).toBeLessThanOrEqual(12);
      expect(pPos.nakshatraIndex).toBeGreaterThanOrEqual(1);
      expect(pPos.nakshatraIndex).toBeLessThanOrEqual(27);
      expect(pPos.pada).toBeGreaterThanOrEqual(1);
      expect(pPos.pada).toBeLessThanOrEqual(4);
      expect(typeof pPos.isRetrograde).toBe('boolean');
      expect(typeof pPos.isCombust).toBe('boolean');
    }

    // 12 Houses
    expect(transitChart.houses.length).toBe(12);
    for (let i = 0; i < 12; i++) {
      const h = transitChart.houses[i];
      expect(h.houseNumber).toBe(i + 1);
      expect(h.rashiIndex).toBeGreaterThanOrEqual(1);
      expect(h.rashiIndex).toBeLessThanOrEqual(12);
      expect(h.lord).toBeDefined();
      expect(Array.isArray(h.occupyingPlanets)).toBe(true);
    }
  });

  it('calculates complete transit snapshot with relationships against a natal chart', async () => {
    const natalChart = await chartCalculator.calculateChart(
      {
        date: { year: 1990, month: 5, day: 15 },
        time: { hour: 14, minute: 30, second: 0 },
        timezone: 'Asia/Kolkata',
        latitude: 28.6139,
        longitude: 77.209,
        placeName: 'New Delhi, India',
      },
      config
    );

    const snapshot = await calculator.calculateTransitSnapshot(
      transitInput,
      natalChart,
      config,
      ['D1', 'D9']
    );

    expect(snapshot.calculationVersion).toBe('0.1.0');
    expect(snapshot.transitChart).toBeDefined();

    // 1. Transit to Natal Lagna
    expect(snapshot.transitToLagna).toBeDefined();
    expect(snapshot.transitToLagna?.length).toBe(9);
    for (const rel of snapshot.transitToLagna!) {
      expect(rel.houseFromLagna).toBeGreaterThanOrEqual(1);
      expect(rel.houseFromLagna).toBeLessThanOrEqual(12);
      expect(rel.signDistance).toBeGreaterThanOrEqual(1);
      expect(rel.signDistance).toBeLessThanOrEqual(12);
      expect(rel.angularSeparation).toBeGreaterThanOrEqual(0);
      expect(rel.angularSeparation).toBeLessThanOrEqual(180);
    }

    // 2. Transit to Natal Moon
    expect(snapshot.transitToMoon).toBeDefined();
    expect(snapshot.transitToMoon?.length).toBe(9);
    for (const rel of snapshot.transitToMoon!) {
      expect(rel.houseFromMoon).toBeGreaterThanOrEqual(1);
      expect(rel.houseFromMoon).toBeLessThanOrEqual(12);
      expect(typeof rel.transitNakshatra).toBe('string');
    }

    // 3. Transit to Natal Planets
    expect(snapshot.transitToNatalPlanets).toBeDefined();
    expect(snapshot.transitToNatalPlanets?.length).toBe(9);
    for (const rel of snapshot.transitToNatalPlanets!) {
      expect(rel.angularSeparation).toBeGreaterThanOrEqual(0);
      expect(rel.angularSeparation).toBeLessThanOrEqual(180);
      expect(typeof rel.relationship).toBe('string');
    }

    // 4. Parashari Drishti Aspects
    expect(snapshot.aspectsToNatal).toBeDefined();
    expect(snapshot.aspectsToNatal!.length).toBeGreaterThan(0);
    for (const asp of snapshot.aspectsToNatal!) {
      expect(['NATAL_PLANET', 'NATAL_LAGNA', 'NATAL_HOUSE']).toContain(asp.targetType);
      expect(asp.isFullDrishti).toBe(true);
    }

    // 5. Ashtakavarga Transit Integration
    expect(snapshot.ashtakavargaTransit).toBeDefined();
    expect(snapshot.ashtakavargaTransit?.length).toBe(9);
    for (const av of snapshot.ashtakavargaTransit!) {
      expect(typeof av.bavPoints).toBe('number');
      expect(typeof av.savPoints).toBe('number');
      expect(typeof av.isBavFavorable).toBe('boolean');
      expect(typeof av.isSavFavorable).toBe('boolean');
    }

    // 6. Gochara Kaksha Status
    expect(snapshot.gocharaKakshas).toBeDefined();
    expect(snapshot.gocharaKakshas?.length).toBe(9);
    for (const k of snapshot.gocharaKakshas!) {
      expect(k.kakshaIndex).toBeGreaterThanOrEqual(1);
      expect(k.kakshaIndex).toBeLessThanOrEqual(8);
      expect(k.startDegree).toBeLessThan(k.endDegree);
      expect(typeof k.hasNatalBindu).toBe('boolean');
    }

    // 7. Varga Transits
    expect(snapshot.vargaTransits).toBeDefined();
    expect(snapshot.vargaTransits?.length).toBeGreaterThan(0);
    for (const vt of snapshot.vargaTransits!) {
      expect(['D1', 'D9']).toContain(vt.vargaType);
      expect(typeof vt.isSameVargaSign).toBe('boolean');
    }
  });
});

