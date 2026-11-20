import { describe, it, expect } from 'vitest';
import { dispatchLine, safeStringify } from '../src/dispatcher';
import { ChartCalculator, DEFAULT_ASTROLOGY_CONFIG, PlanetSymbol } from '@astro/astrology-engine';
import { toBirthDetails } from '../src/birth';
import { REF_BIRTH } from './fixtures';

/**
 * params.options (engine 0.2.0, ADR-017): ayanamsa, nodeType and kpCuspSystem, all optional.
 * Every expected value comes from calling the engine directly with the same config.
 */
async function call(method: string, params?: unknown): Promise<any> {
  const res = await dispatchLine(JSON.stringify({ id: 1, method, params }));
  if (!res.ok) throw new Error(`${res.error.code}: ${res.error.message}`);
  return JSON.parse(safeStringify(res.result));
}

describe('calculation options', () => {
  it('defaults to true Lahiri, mean node, Placidus KP cusps', async () => {
    const r = await call('chart.compute', { birth: REF_BIRTH });
    expect(r.options).toEqual({ ayanamsa: 'LAHIRI', nodeType: 'MEAN_NODE', kpCuspSystem: 'PLACIDUS' });
    expect(r.config.ayanamsa).toBe('LAHIRI');
    const chart = await new ChartCalculator().calculateChart(toBirthDetails(REF_BIRTH), DEFAULT_ASTROLOGY_CONFIG);
    expect(r.ayanamsa).toBe(chart.metadata.ayanamsa!.trueDegrees);
    const info = await call('engine.info');
    expect(info.options.defaults).toEqual({ ayanamsa: 'LAHIRI', nodeType: 'MEAN_NODE', kpCuspSystem: 'PLACIDUS' });
    expect(info.options.ayanamsa).toEqual(['LAHIRI', 'RAMAN', 'KRISHNAMURTI', 'KP', 'FAGAN_BRADLEY']);
  });

  it('applies ayanamsa and nodeType to the chart exactly as the engine does', async () => {
    const r = await call('chart.compute', { birth: REF_BIRTH, options: { ayanamsa: 'KP', nodeType: 'TRUE_NODE' } });
    const config = { ...DEFAULT_ASTROLOGY_CONFIG, ayanamsa: 'KP' as const, nodeCalculation: 'TRUE_NODE' as const };
    const chart = await new ChartCalculator().calculateChart(toBirthDetails(REF_BIRTH), config);
    expect(r.options).toEqual({ ayanamsa: 'KP', nodeType: 'TRUE_NODE', kpCuspSystem: 'PLACIDUS' });
    expect(r.ayanamsa).toBe(chart.metadata.ayanamsa!.trueDegrees);
    const rahu = r.rasi.planets.find((p: any) => p.name === 'RAHU');
    expect(rahu.absoluteDegree).toBeCloseTo(chart.planets[PlanetSymbol.RAHU].longitude, 6);
  });

  it('keeps pipelined requests with different options isolated', async () => {
    const [a, b] = await Promise.all([
      dispatchLine(JSON.stringify({ id: 'a', method: 'chart.compute', params: { birth: REF_BIRTH, options: { ayanamsa: 'RAMAN' } } })),
      dispatchLine(JSON.stringify({ id: 'b', method: 'chart.compute', params: { birth: REF_BIRTH } })),
    ]);
    expect(a.ok && (a.result as any).options.ayanamsa).toBe('RAMAN');
    expect(b.ok && (b.result as any).options.ayanamsa).toBe('LAHIRI');
    expect(a.ok && b.ok && (a.result as any).ayanamsa < (b.result as any).ayanamsa - 1).toBe(true);
  });

  it('keys the dasha cache on the options', async () => {
    const params = { birth: REF_BIRTH, maxLevel: 1, targetDate: '2026-01-01T00:00:00Z' };
    const lahiri = await call('dasha.compute', params);
    const raman = await call('dasha.compute', { ...params, options: { ayanamsa: 'RAMAN' } });
    expect(JSON.stringify(raman)).not.toBe(JSON.stringify(lahiri));
  });

  it('KP cusps are Placidus and the report says so', async () => {
    const r = await call('kp.compute', { birth: REF_BIRTH, options: { kpCuspSystem: 'PLACIDUS' } });
    expect(r.cuspSystem).toBe('PLACIDUS');
    expect(r.ayanamsaType).toBe('LAHIRI');
  });

  it('KP above the polar circle fails with a clear calculation error', async () => {
    const res = await dispatchLine(
      JSON.stringify({ id: 9, method: 'kp.compute', params: { birth: { ...REF_BIRTH, latitude: 69.65, longitude: 18.96, timezone: 'Europe/Oslo' } } })
    );
    expect(res.ok).toBe(false);
    expect(!res.ok && res.error.code).toBe('CALCULATION_ERROR');
    expect(!res.ok && res.error.message).toContain('Placidus house cusps are undefined');
    expect(!res.ok && res.error.reason).toBe('PLACIDUS_UNDEFINED_AT_LATITUDE');
  });

  it.each([
    [{ ayanamsa: 'YUKTESHWAR' }, 'options.ayanamsa'],
    [{ nodeType: 'TRUE' }, 'options.nodeType'],
    [{ kpCuspSystem: 'KOCH' }, 'options.kpCuspSystem'],
    ['LAHIRI', 'options must be an object'],
  ])('rejects invalid options %j', async (options, msg) => {
    const res = await dispatchLine(JSON.stringify({ id: 2, method: 'chart.compute', params: { birth: REF_BIRTH, options } }));
    expect(!res.ok && res.error.code).toBe('INVALID_PARAMS');
    expect(!res.ok && res.error.message).toContain(msg);
  });
});
