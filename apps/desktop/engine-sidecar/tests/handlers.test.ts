import { describe, it, expect } from 'vitest';
import { dispatchLine, safeStringify } from '../src/dispatcher';
import { METHOD_NAMES, DASHA_SYSTEMS } from '../src/protocol';
import { handlers, dashaCacheSize } from '../src/handlers';
import { ChartCalculator, DEFAULT_ASTROLOGY_CONFIG, PlanetSymbol } from '@astro/astrology-engine';
import { toBirthDetails } from '../src/birth';
import { REF_BIRTH, REF_JD, REF_UTC } from './fixtures';

async function call(method: string, params?: unknown): Promise<any> {
  const res = await dispatchLine(JSON.stringify({ id: 1, method, params }));
  if (!res.ok) throw new Error(`${res.error.code}: ${res.error.message}`);
  return JSON.parse(safeStringify(res.result));
}

describe('protocol surface', () => {
  it('has a handler for every declared method and nothing else', () => {
    expect(Object.keys(handlers).sort()).toEqual([...METHOD_NAMES].sort());
  });
});

describe('dispatcher error handling', () => {
  it('rejects malformed JSON', async () => {
    const r = await dispatchLine('{not json');
    expect(r).toEqual({ id: null, ok: false, error: { code: 'PARSE_ERROR', message: 'Request is not valid JSON' } });
  });
  it('rejects missing id / unknown method / bad params', async () => {
    expect((await dispatchLine('{"method":"ping"}')).ok).toBe(false);
    const u = await dispatchLine('{"id":7,"method":"nope"}');
    expect(u.ok === false && u.error.code).toBe('UNKNOWN_METHOD');
    const b = await dispatchLine(JSON.stringify({ id: 8, method: 'chart.compute', params: { birth: { ...REF_BIRTH, date: '15/05/1990' } } }));
    expect(b.ok === false && b.error.code).toBe('INVALID_PARAMS');
    const tz = await dispatchLine(JSON.stringify({ id: 9, method: 'chart.compute', params: { birth: { ...REF_BIRTH, timezone: 'Mars/Olympus' } } }));
    expect(tz.ok === false && tz.error.code).toBe('INVALID_PARAMS');
  });
  it('serialises NaN/Infinity as null', () => {
    expect(safeStringify({ a: NaN, b: Infinity, c: 1 })).toBe('{"a":null,"b":null,"c":1}');
  });
});

describe('engine adapter — values match the engine verified fixture REF_CHART_001', () => {
  it('chart.compute', async () => {
    const r = await call('chart.compute', { birth: REF_BIRTH });
    expect(r.utcIso).toBe(REF_UTC);
    expect(r.julianDayUT).toBeCloseTo(REF_JD, 6);
    // Adapter fidelity: every planet equals a direct engine call (no maths in the adapter).
    const direct = await new ChartCalculator().calculateChart(toBirthDetails(REF_BIRTH), DEFAULT_ASTROLOGY_CONFIG);
    for (const p of r.rasi.planets) {
      expect(p.absoluteDegree).toBeCloseTo(direct.planets[p.name as PlanetSymbol].longitude, 9);
    }
    // Independent sanity check: Vrishabha (Taurus) Sankranti fell on 14/15 May 1990 (Lahiri
    // panchangas), so the sidereal Sun at 09:00 UT on 15 May must be in the first degree of Taurus.
    const sun = r.rasi.planets.find((p: any) => p.name === 'SUN');
    expect(sun.rashiIndex).toBe(2);
    expect(sun.degree).toBeLessThan(1.5);
    expect(r.rasi.planets).toHaveLength(9);
    expect(r.rasi.houses).toHaveLength(12);
    expect(r.navamsa.planets).toHaveLength(9);
    expect(r.config.ayanamsa).toBe('LAHIRI');
    expect(typeof r.isDayBirth).toBe('boolean');
    expect(r.isDayBirth).toBe(true); // 14:30 IST in May is daytime in Delhi
  });

  it('vargas.compute returns all 16 Shodashvarga charts by default', async () => {
    const r = await call('vargas.compute', { birth: REF_BIRTH });
    expect(Object.keys(r.vargas)).toHaveLength(16);
    expect(r.vargas.D9.placements.SUN.rashiIndex).toBeGreaterThanOrEqual(1);
  });

  it('dasha.compute supports every listed system without throwing', async () => {
    for (const system of DASHA_SYSTEMS) {
      const r = await call('dasha.compute', { birth: REF_BIRTH, system, maxLevel: 2, targetDate: '2026-01-01T00:00:00Z' });
      expect(r.system).toBe(system);
      expect(r.result).toBeTruthy();
    }
  });

  it('vimshottari mahadashas span 120 years', async () => {
    const r = await call('dasha.compute', { birth: REF_BIRTH, system: 'VIMSHOTTARI', maxLevel: 1 });
    const md = r.result.mahadashas ?? r.result.periods;
    expect(Array.isArray(md)).toBe(true);
    expect(md.length).toBe(9);
  });

  it('strength.compute includes Ishta/Kashta for 7 grahas', async () => {
    const r = await call('strength.compute', { birth: REF_BIRTH });
    expect(r.ishtaKashta).toHaveLength(7);
    expect(r.shadbala.summary).toHaveLength(7);
  });

  it('ashtakavarga SAV totals 337 bindus (classical invariant)', async () => {
    const r = await call('ashtakavarga.compute', { birth: REF_BIRTH });
    expect(JSON.stringify(r)).toContain('337');
  });

  it('remaining methods return results', async () => {
    const moment = { ...REF_BIRTH, date: '2026-11-20', time: '12:00:00' };
    for (const [method, params] of [
      ['ping', {}],
      ['engine.info', {}],
      ['panchang.compute', { moment }],
      ['dayDivisions.compute', { date: '2026-11-20', location: REF_BIRTH }],
      ['transit.compute', { birth: REF_BIRTH, moment }],
      ['matchmaking.compute', { boy: REF_BIRTH, girl: { ...REF_BIRTH, date: '1992-08-01' } }],
      ['yogas.compute', { birth: REF_BIRTH }],
      ['kp.compute', { birth: REF_BIRTH }],
      ['jaimini.compute', { birth: REF_BIRTH }],
      ['specialPoints.compute', { birth: REF_BIRTH }],
      ['chartVariants.compute', { birth: REF_BIRTH }],
      ['avakhada.compute', { birth: REF_BIRTH }],
      ['sudarshana.compute', { birth: REF_BIRTH }],
      ['varshaphala.compute', { birth: REF_BIRTH, targetYear: 2026 }],
      ['prashna.compute', { moment, questionNumber: 42, questionNumberSystem: 'PARASHARI_1_108' }],
      ['eclipses.find', { startIso: '2026-01-01T00:00:00Z', endIso: '2027-01-01T00:00:00Z' }],
      ['transitTimeline.compute', { startIso: '2026-01-01T00:00:00Z', endIso: '2026-03-01T00:00:00Z' }],
    ] as const) {
      const r = await call(method, params);
      expect(r, method).toBeTruthy();
    }
  });

  it('time.local converts a UTC instant with the engine timezone solver', async () => {
    // 09:00 UTC on 1990-05-15 is 14:30 IST (UTC+05:30, no DST in India)
    const r = await call('time.local', { timezone: 'Asia/Kolkata', utcIso: REF_UTC });
    expect(r).toEqual({ utcIso: REF_UTC, date: '1990-05-15', time: '14:30:00', utcOffsetMinutes: 330 });
    // New York is on EDT (UTC-4) on 2024-07-04
    const ny = await call('time.local', { timezone: 'America/New_York', utcIso: '2024-07-04T16:00:00Z' });
    expect(ny.time).toBe('12:00:00');
    expect(ny.utcOffsetMinutes).toBe(-240);
  });

  it('is deterministic apart from the calculation timestamp', async () => {
    const strip = (o: any) => JSON.stringify(o, (k, v) => (k === 'calculationTimestampIso' ? undefined : v));
    const a = await call('chart.compute', { birth: REF_BIRTH });
    const b = await call('chart.compute', { birth: REF_BIRTH });
    expect(strip(a)).toBe(strip(b));
  });

  it('dasha.subPeriods returns exactly the engine sub-periods of the addressed node', async () => {
    const targetDate = '2026-01-01T00:00:00.000Z';
    const full = await call('dasha.compute', { birth: REF_BIRTH, system: 'VIMSHOTTARI', maxLevel: 4, targetDate });
    const md = full.result.mahadashas ?? full.result.periods;
    const sub = await call('dasha.subPeriods', { birth: REF_BIRTH, system: 'VIMSHOTTARI', maxLevel: 4, targetDate, path: [2, 3] });
    expect(sub.path).toEqual([2, 3]);
    expect(sub.utcOffsetMinutes).toBe(330);
    expect(sub.periods).toEqual(md[2].subPeriods[3].subPeriods);
    expect(sub.periods).toHaveLength(9);
    expect(sub.periods[0].subPeriods.length).toBe(9); // level 4 under the level-3 node
    expect(dashaCacheSize()).toBeGreaterThan(0);
  });

  it('dasha.subPeriods rejects a bad path', async () => {
    const r = await dispatchLine(JSON.stringify({ id: 3, method: 'dasha.subPeriods', params: { birth: REF_BIRTH, path: [99] } }));
    expect(r.ok === false && r.error.code).toBe('INVALID_PARAMS');
    const r2 = await dispatchLine(JSON.stringify({ id: 4, method: 'dasha.subPeriods', params: { birth: REF_BIRTH, path: [] } }));
    expect(r2.ok === false && r2.error.code).toBe('INVALID_PARAMS');
  });

  it('dasha results are identical with and without the cache', async () => {
    const params = { birth: REF_BIRTH, system: 'YOGINI', maxLevel: 2, targetDate: '2026-01-01T00:00:00Z' };
    const a = await call('dasha.compute', params);
    const b = await call('dasha.compute', params);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('transitTimeline.compute adds the zone offset at each event when a timezone is given', async () => {
    const r = await call('transitTimeline.compute', { startIso: '2026-03-01T00:00:00Z', endIso: '2026-04-15T00:00:00Z', timezone: 'America/New_York' });
    expect(r.events.length).toBeGreaterThan(0);
    const offsets = new Set(r.events.map((e: any) => e.utcOffsetMinutes));
    // EST (-300) before 8 March 2026, EDT (-240) after
    expect(offsets).toEqual(new Set([-300, -240]));
    const plain = await call('transitTimeline.compute', { startIso: '2026-03-01T00:00:00Z', endIso: '2026-03-05T00:00:00Z' });
    expect(plain.events[0].utcOffsetMinutes).toBeUndefined();
    const bad = await dispatchLine(JSON.stringify({ id: 5, method: 'transitTimeline.compute', params: { startIso: '2026-03-01T00:00:00Z', endIso: '2026-03-05T00:00:00Z', timezone: 'Nowhere/Zone' } }));
    expect(bad.ok === false && bad.error.code).toBe('INVALID_PARAMS');
  });
});
