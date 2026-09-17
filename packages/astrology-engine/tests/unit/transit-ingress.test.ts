import { describe, it, expect } from 'vitest';
import { TransitCalculator } from '../../src/transit/transit-calculator';
import { TransitIngressSolver } from '../../src/transit/transit-ingress.solver';
import { MockEphemerisProvider } from '../../src/ephemeris/mock-ephemeris.provider';
import { PlanetSymbol } from '../../src/planets/planet.types';

describe('TransitIngressSolver & Timeline Unit Tests (Phase 2V)', () => {
  const solver = new TransitIngressSolver();
  const calculator = new TransitCalculator();

  it('detects sign ingresses numerically within requested interval', async () => {
    // 60-day interval for Sun (Sun moves ~1 degree/day, guaranteed at least 1 or 2 sign ingresses)
    const startJD = 2460500.5; // ~2024
    const endJD = 2460560.5;

    const ingresses = await solver.findSignIngresses(PlanetSymbol.SUN, startJD, endJD);

    expect(ingresses.length).toBeGreaterThan(0);
    for (const event of ingresses) {
      expect(event.eventType).toBe('SIGN_INGRESS');
      expect(event.planet).toBe(PlanetSymbol.SUN);
      expect(event.julianDayUT).toBeGreaterThanOrEqual(startJD);
      expect(event.julianDayUT).toBeLessThanOrEqual(endJD);
      expect(event.fromSign).toBeDefined();
      expect(event.toSign).toBeDefined();
      expect(event.fromSign?.index).not.toBe(event.toSign?.index);
    }
  });

  it('detects Nakshatra ingresses for the Moon', async () => {
    // Moon crosses a Nakshatra roughly every 1 day
    const startJD = 2460500.5;
    const endJD = 2460505.5; // 5 days

    const nakIngresses = await solver.findNakshatraIngresses(PlanetSymbol.MOON, startJD, endJD);

    expect(nakIngresses.length).toBeGreaterThanOrEqual(3);
    for (const event of nakIngresses) {
      expect(event.eventType).toBe('NAKSHATRA_INGRESS');
      expect(event.planet).toBe(PlanetSymbol.MOON);
      expect(event.fromNakshatra).toBeDefined();
      expect(event.toNakshatra).toBeDefined();
      expect(event.pada).toBeGreaterThanOrEqual(1);
      expect(event.pada).toBeLessThanOrEqual(4);
    }
  });

  it('calculates chronological transit timeline and rejects invalid intervals', async () => {
    const timeline = await calculator.calculateTransitTimeline({
      startDateIso: '2026-09-01T00:00:00.000Z',
      endDateIso: '2026-10-01T00:00:00.000Z',
      planets: [PlanetSymbol.SUN, PlanetSymbol.MARS],
      eventTypes: ['SIGN_INGRESS', 'NAKSHATRA_INGRESS'],
    });

    expect(timeline.calculationVersion).toBe('0.1.0');
    expect(timeline.eventCount).toBe(timeline.events.length);
    expect(timeline.planets).toContain(PlanetSymbol.SUN);
    expect(timeline.planets).toContain(PlanetSymbol.MARS);

    // Verify chronological ordering
    for (let i = 1; i < timeline.events.length; i++) {
      expect(timeline.events[i].julianDayUT).toBeGreaterThanOrEqual(
        timeline.events[i - 1].julianDayUT
      );
    }

    // Rejects end < start
    await expect(
      calculator.calculateTransitTimeline({
        startDateIso: '2026-10-01T00:00:00.000Z',
        endDateIso: '2026-09-01T00:00:00.000Z',
      })
    ).rejects.toThrow('Timeline endDate cannot precede startDate');

    // Rejects interval > 730 days
    await expect(
      calculator.calculateTransitTimeline({
        startDateIso: '2020-01-01T00:00:00.000Z',
        endDateIso: '2025-01-01T00:00:00.000Z',
      })
    ).rejects.toThrow('Transit timeline query exceeds maximum permitted interval');
  });
});
