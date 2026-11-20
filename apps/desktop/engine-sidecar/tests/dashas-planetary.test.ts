import { describe, it, expect, afterAll } from 'vitest';
import { spawn } from 'node:child_process';
import path from 'node:path';
import * as readline from 'node:readline';
import { dispatchLine, safeStringify } from '../src/dispatcher';
import { REF_BIRTH, REF_UTC } from './fixtures';

async function call(method: string, params?: unknown): Promise<any> {
  const res = await dispatchLine(JSON.stringify({ id: 1, method, params }));
  if (!res.ok) throw new Error(`${res.error.code}: ${res.error.message}`);
  return JSON.parse(safeStringify(res.result));
}

async function errorCode(method: string, params?: unknown): Promise<string | undefined> {
  const res = await dispatchLine(JSON.stringify({ id: 2, method, params }));
  return res.ok ? undefined : res.error.code;
}

describe('dashaExt.planetary.*', () => {
  it('list: systems with provisional flag and source; Moola not implemented', async () => {
    const r = await call('dashaExt.planetary.list', {});
    const names = r.systems.map((s: any) => s.system);
    expect(names).toEqual(['TRIBHAGI', 'SHASTIHAYANI', 'TARA', 'PATYAYINI', 'MOOLA']);
    expect(r.systems.every((s: any) => s.provisional === true && typeof s.source === 'string')).toBe(true);
    expect(r.systems.find((s: any) => s.system === 'MOOLA').implemented).toBe(false);
  });

  it('compute: Tribhagi tree with mahadashas -> subPeriods and an active path', async () => {
    const r = await call('dashaExt.planetary.compute', { birth: REF_BIRTH, system: 'TRIBHAGI', maxLevel: 2, targetDate: '2026-11-20T00:00:00Z' });
    expect(r.system).toBe('TRIBHAGI');
    expect(r.utcOffsetMinutes).toBe(330);
    expect(r.result.provisional).toBe(true);
    expect(r.result.mahadashas).toHaveLength(27);
    expect(r.result.mahadashas[0].startDateIso).toBe(REF_UTC);
    expect(r.result.mahadashas[0].subPeriods).toHaveLength(9);
    expect(r.result.mahadashas[0].subPeriods[0].subPeriods).toBeUndefined();
    expect(r.result.currentPeriod.mahadasha.lord).toBeTypeOf('string');
    expect(r.result.mahadashas.filter((m: any) => m.isActive)).toHaveLength(1);
  });

  it('compute: Shastihayani and Tara (level 3 stays under 1 MB)', async () => {
    for (const system of ['SHASTIHAYANI', 'TARA']) {
      const res = await dispatchLine(JSON.stringify({ id: 3, method: 'dashaExt.planetary.compute', params: { birth: REF_BIRTH, system, maxLevel: 3 } }));
      expect(res.ok).toBe(true);
      expect(safeStringify(res).length).toBeLessThan(1_000_000);
      const r = res.ok ? (res.result as any) : undefined;
      expect(r.result.dashaSystem).toBe(system);
      expect(typeof r.result.eligibility.isEligible).toBe('boolean');
    }
    const tri = await dispatchLine(JSON.stringify({ id: 4, method: 'dashaExt.planetary.compute', params: { birth: REF_BIRTH, system: 'TRIBHAGI', maxLevel: 3 } }));
    expect(safeStringify(tri).length).toBeLessThan(1_000_000);
  });

  it('compute: invalid params', async () => {
    expect(await errorCode('dashaExt.planetary.compute', { birth: REF_BIRTH, system: 'MOOLA' })).toBe('INVALID_PARAMS');
    expect(await errorCode('dashaExt.planetary.compute', { birth: REF_BIRTH })).toBe('INVALID_PARAMS');
    expect(await errorCode('dashaExt.planetary.compute', { birth: REF_BIRTH, system: 'TARA', maxLevel: 4 })).toBe('INVALID_PARAMS');
    expect(await errorCode('dashaExt.planetary.compute', { birth: REF_BIRTH, system: 'TARA', targetDate: 'soon' })).toBe('INVALID_PARAMS');
    expect(await errorCode('dashaExt.planetary.compute', { system: 'TARA' })).toBe('INVALID_PARAMS');
  });
});

describe('dashaExt.patyayini', () => {
  it('returns 8 rows (Lagna + 7 grahas) spanning the solar-return year', async () => {
    const r = await call('dashaExt.patyayini', { birth: REF_BIRTH, targetYear: 2026, targetDate: '2026-11-20T00:00:00Z' });
    expect(r.provisional).toBe(true);
    expect(r.rows).toHaveLength(8);
    expect(r.periods).toHaveLength(8);
    expect(r.periods[0].startDateIso).toBe(r.solarReturnUtcIso);
    expect(r.periods[7].endDateIso).toBe(r.nextSolarReturnUtcIso);
    expect(r.periods[0].subPeriods).toHaveLength(8);
    expect(Array.isArray(r.activePath)).toBe(true);
  });

  it('accepts an annual location and rejects bad params', async () => {
    const r = await call('dashaExt.patyayini', {
      birth: REF_BIRTH, targetYear: 2026, maxLevel: 1,
      location: { latitude: 51.5074, longitude: -0.1278, timezone: 'Europe/London', placeName: 'London' },
    });
    expect(r.annualLocation.timezone).toBe('Europe/London');
    expect(r.periods[0].subPeriods).toBeUndefined();
    expect(await errorCode('dashaExt.patyayini', { birth: REF_BIRTH })).toBe('INVALID_PARAMS');
    expect(await errorCode('dashaExt.patyayini', { birth: REF_BIRTH, targetYear: 1980 })).toBe('INVALID_PARAMS');
    expect(await errorCode('dashaExt.patyayini', { birth: REF_BIRTH, targetYear: 2026, location: { latitude: 99 } })).toBe('INVALID_PARAMS');
  });
});

describe('dashas-planetary process round-trip (tsx)', () => {
  const root = path.resolve(__dirname, '..');
  const tsxCli = path.resolve(root, '../../../node_modules/tsx/dist/cli.mjs');
  const proc = spawn(process.execPath, [tsxCli, '--tsconfig', path.join(root, 'tsconfig.dev.json'), path.join(root, 'src/main.ts')], {
    cwd: root, stdio: 'pipe', env: { PATH: process.env.PATH ?? '' },
  });
  const lines: any[] = [];
  readline.createInterface({ input: proc.stdout }).on('line', (l) => lines.push(JSON.parse(l)));
  let stderr = '';
  proc.stderr.on('data', (d) => (stderr += d));
  afterAll(() => {
    proc.kill();
  });

  async function waitFor(pred: (m: any) => boolean, ms = 60000): Promise<any> {
    const deadline = Date.now() + ms;
    for (;;) {
      const hit = lines.find(pred);
      if (hit) return hit;
      if (Date.now() > deadline) throw new Error(`timeout; stderr=${stderr}`);
      await new Promise((r) => setTimeout(r, 100));
    }
  }

  it('answers dashaExt.planetary.compute and dashaExt.patyayini like the in-process dispatcher', async () => {
    await waitFor((m) => m.event === 'ready');
    const params = { birth: REF_BIRTH, system: 'SHASTIHAYANI', maxLevel: 2, targetDate: '2026-11-20T00:00:00Z' };
    proc.stdin.write(JSON.stringify({ id: 'p1', method: 'dashaExt.planetary.compute', params }) + '\n');
    proc.stdin.write(JSON.stringify({ id: 'p2', method: 'dashaExt.patyayini', params: { birth: REF_BIRTH, targetYear: 2026 } }) + '\n');
    const a = await waitFor((m) => m.id === 'p1');
    const b = await waitFor((m) => m.id === 'p2');
    expect(a.ok).toBe(true);
    expect(b.ok).toBe(true);
    expect(a.result).toEqual(await call('dashaExt.planetary.compute', params));
    expect(b.result).toEqual(await call('dashaExt.patyayini', { birth: REF_BIRTH, targetYear: 2026 }));
  }, 90000);
});
