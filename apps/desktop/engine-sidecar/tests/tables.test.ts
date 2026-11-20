import { describe, it, expect, afterAll } from 'vitest';
import { spawn } from 'node:child_process';
import path from 'node:path';
import * as readline from 'node:readline';
import { dispatchLine } from '../src/dispatcher';
import { REF_BIRTH } from './fixtures';

/** Values asserted here are protocol shape and paging; astronomical accuracy is covered by the engine's reference tests. */
async function call(method: string, params: unknown): Promise<any> {
  return dispatchLine(JSON.stringify({ id: 1, method, params }));
}
const DELHI = { latitude: 28.6139, longitude: 77.209 };

describe('tables feature handlers', () => {
  it('ephemeris.table pages a daily sidereal table', async () => {
    const r = await call('ephemeris.table', { startDate: '2026-01-01', endDate: '2026-03-31', step: 'DAY', timezone: 'Asia/Kolkata', time: '05:30', page: 1, pageSize: 30 });
    expect(r.ok).toBe(true);
    expect(r.result.totalRows).toBe(90);
    expect(r.result.pageCount).toBe(3);
    expect(r.result.rows.length).toBe(30);
    expect(r.result.rows[0].date).toBe('2026-01-31');
    expect(r.result.rows[0].utcIso).toBe('2026-01-31T00:00:00.000Z');
    expect(r.result.rows[0].bodies.length).toBe(9);
  });

  it('ephemeris.table: sunrise local ephemeris, tropical with outer planets and magnitude', async () => {
    const r = await call('ephemeris.table', { startDate: '2026-01-01', endDate: '2026-01-02', timezone: 'Asia/Kolkata', sunrise: true, location: DELHI, zodiac: 'TROPICAL', includeOuterPlanets: true, includeMagnitude: true });
    expect(r.ok).toBe(true);
    expect(r.result.zodiac).toBe('TROPICAL');
    expect(r.result.provisional).toBe(true);
    const row = r.result.rows[0];
    expect(row.ascendant.rashiIndex).toBeGreaterThan(0);
    expect(row.bodies.map((b: any) => b.body)).toContain('PLUTO');
    expect(typeof row.bodies[0].magnitude).toBe('number');
  });

  it('ephemeris.table rejects bad params', async () => {
    expect((await call('ephemeris.table', { startDate: '2026-01-01', endDate: '2026-01-02', timezone: 'Asia/Kolkata', sunrise: true })).error.code).toBe('INVALID_PARAMS');
    expect((await call('ephemeris.table', { startDate: '2026-01-02', endDate: '2026-01-01', timezone: 'UTC' })).error.code).toBe('INVALID_PARAMS');
    expect((await call('ephemeris.table', { startDate: '2026-01-01', endDate: '2026-01-02', timezone: 'UTC', step: 'HOUR' })).error.code).toBe('INVALID_PARAMS');
    expect((await call('ephemeris.table', { startDate: '1900-01-01', endDate: '2100-01-01', timezone: 'UTC' })).error.code).toBe('INVALID_PARAMS');
  });

  it('ephemeris.positions returns planets and Lagna at a moment', async () => {
    const r = await call('ephemeris.positions', { moment: REF_BIRTH });
    expect(r.ok).toBe(true);
    expect(r.result.utcIso).toBe('1990-05-15T09:00:00.000Z');
    expect(r.result.ascendant).toBeDefined();
    expect(r.result.bodies.find((b: any) => b.body === 'VENUS').magnitude).toBeLessThan(-3);
  });

  it('ascendant.rising lists every sign of the day', async () => {
    const r = await call('ascendant.rising', { date: '2026-01-01', location: { ...DELHI, timezone: 'Asia/Kolkata' } });
    expect(r.ok).toBe(true);
    expect(r.result.entries.length).toBe(13);
    expect(r.result.utcOffsetMinutes).toBe(330);
    expect((await call('ascendant.rising', { date: '2026-01-01', location: { latitude: 75, longitude: 0, timezone: 'UTC' } })).error.code).toBe('INVALID_PARAMS');
  });

  it('combustion.periods, relationships.compute, transit.tables, sadeSati.periods', async () => {
    const c = await call('combustion.periods', { startIso: '2026-01-01T00:00:00Z', endIso: '2026-06-30T00:00:00Z', planets: ['SATURN'], timezone: 'Asia/Kolkata' });
    expect(c.ok).toBe(true);
    expect(c.result.provisional).toBe(true);
    expect(c.result.periods.length).toBe(1);
    expect(c.result.periods[0].startOffsetMinutes).toBe(330);
    expect((await call('combustion.periods', { startIso: '2026-01-01T00:00:00Z', endIso: '2026-06-30T00:00:00Z', planets: ['RAHU'] })).error.code).toBe('INVALID_PARAMS');

    const rel = await call('relationships.compute', { birth: REF_BIRTH });
    expect(rel.result.cells.length).toBe(72);

    const t = await call('transit.tables', { startIso: '2026-01-01T00:00:00Z', endIso: '2026-12-31T00:00:00Z', timezone: 'Asia/Kolkata', eventTypes: ['RETROGRADE_STATION', 'DIRECT_STATION'], pageSize: 5 });
    expect(t.ok).toBe(true);
    expect(t.result.totalRows).toBe(12);
    expect(t.result.pageCount).toBe(3);
    expect(t.result.rows[0].utcOffsetMinutes).toBe(330);
    expect((await call('transit.tables', { startIso: '2026-01-01T00:00:00Z', endIso: '2029-01-01T00:00:00Z' })).error.code).toBe('INVALID_PARAMS');

    const s = await call('sadeSati.periods', { birth: REF_BIRTH, years: 40 });
    expect(s.ok).toBe(true);
    expect(s.result.cycles.length).toBeGreaterThan(0);
    expect(s.result.source).toMatch(/no interpretation/);

    const r = await call('rectification.sensitivity', { birth: REF_BIRTH, windowMinutes: 20 });
    expect(r.ok).toBe(true);
    expect(r.result.utcOffsetMinutes).toBe(330);
    expect(r.result.changes.some((c: any) => c.key === 'LAGNA_SIGN')).toBe(true);
    expect((await call('rectification.sensitivity', { birth: REF_BIRTH, windowMinutes: 999 })).error.code).toBe('INVALID_PARAMS');
  });
});

describe('tables round-trip through the real sidecar process (tsx)', () => {
  const root = path.resolve(__dirname, '..');
  const tsxCli = path.resolve(root, '../../../node_modules/tsx/dist/cli.mjs');
  const proc = spawn(process.execPath, [tsxCli, '--tsconfig', path.join(root, 'tsconfig.dev.json'), path.join(root, 'src/main.ts')], { cwd: root, stdio: 'pipe' });
  const lines: any[] = [];
  readline.createInterface({ input: proc.stdout }).on('line', (l) => lines.push(JSON.parse(l)));
  afterAll(() => {
    proc.kill();
  });
  it('answers ascendant.rising and lists the feature methods in engine.info', async () => {
    proc.stdin.write(JSON.stringify({ id: 'r1', method: 'ascendant.rising', params: { date: '2026-01-01', location: { ...DELHI, timezone: 'Asia/Kolkata' } } }) + '\n');
    proc.stdin.write(JSON.stringify({ id: 'r2', method: 'engine.info', params: {} }) + '\n');
    const deadline = Date.now() + 60000;
    while (Date.now() < deadline && !(lines.some((l) => l.id === 'r1') && lines.some((l) => l.id === 'r2'))) await new Promise((r) => setTimeout(r, 100));
    const r1 = lines.find((l) => l.id === 'r1');
    expect(r1.ok).toBe(true);
    expect(r1.result.entries[1].rashiName).toBe('Tula');
    expect(lines.find((l) => l.id === 'r2').result.methods).toEqual(expect.arrayContaining(['ephemeris.table', 'transit.tables', 'sadeSati.periods']));
  });
});
