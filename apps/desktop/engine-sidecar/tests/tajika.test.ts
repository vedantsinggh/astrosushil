import { describe, it, expect, afterAll } from 'vitest';
import { spawn } from 'node:child_process';
import path from 'node:path';
import * as readline from 'node:readline';
import { dispatchLine, safeStringify } from '../src/dispatcher';
import { REF_BIRTH } from './fixtures';

async function call(method: string, params?: unknown): Promise<any> {
  const res = await dispatchLine(JSON.stringify({ id: 1, method, params }));
  if (!res.ok) throw new Error(`${res.error.code}: ${res.error.message}`);
  return JSON.parse(safeStringify(res.result));
}
async function errCode(method: string, params?: unknown): Promise<string | undefined> {
  const res = await dispatchLine(JSON.stringify({ id: 2, method, params }));
  return res.ok ? undefined : res.error.code;
}

describe('tajika.yogas', () => {
  it('returns the 16 yogas of the annual chart with evidence and the provisional label', async () => {
    const r = await call('tajika.yogas', { birth: REF_BIRTH, targetYear: 2026 });
    expect(r.targetYear).toBe(2026);
    expect(r.solarReturnUtcIso.startsWith('2026-05-15')).toBe(true);
    expect(r.yogas).toHaveLength(16);
    expect(r.planets).toHaveLength(7);
    expect(r.provisional).toBe(true);
    expect(r.source).toMatch(/Neelakanthi/);
    for (const y of r.yogas) expect(y.present).toBe(y.occurrences.length > 0);
    expect(JSON.stringify(r).length).toBeLessThan(1_000_000);
  }, 60000);
  it('passes options through', async () => {
    const r = await call('tajika.yogas', { birth: REF_BIRTH, targetYear: 2026, options: { orbRule: 'HALF_SUM', includeSemiSextile: true } });
    expect(r.options).toEqual({ orbRule: 'HALF_SUM', includeSemiSextile: true, manahooByAspect: false });
  }, 60000);
  it('rejects bad params', async () => {
    expect(await errCode('tajika.yogas', { birth: REF_BIRTH })).toBe('INVALID_PARAMS');
    expect(await errCode('tajika.yogas', { birth: REF_BIRTH, targetYear: 1980 })).toBe('INVALID_PARAMS');
    expect(await errCode('tajika.yogas', { birth: REF_BIRTH, targetYear: 2026, options: { orbRule: 'WIDE' } })).toBe('INVALID_PARAMS');
    expect(await errCode('tajika.yogas', { birth: REF_BIRTH, targetYear: 2026, options: { includeSemiSextile: 'yes' } })).toBe('INVALID_PARAMS');
    expect(await errCode('tajika.yogas', { birth: REF_BIRTH, targetYear: 2026, location: { latitude: 99 } })).toBe('INVALID_PARAMS');
    expect(await errCode('tajika.yogas', { targetYear: 2026 })).toBe('INVALID_PARAMS');
  });
});

describe('tajika.panchaVargiya', () => {
  it('annual and natal variants', async () => {
    const a = await call('tajika.panchaVargiya', { birth: REF_BIRTH, targetYear: 2026 });
    expect(a.chartKind).toBe('ANNUAL');
    expect(a.planets).toHaveLength(7);
    for (const p of a.planets) expect(p.vimshopaka).toBeCloseTo(p.total / 4, 9);
    const n = await call('tajika.panchaVargiya', { birth: REF_BIRTH, neutralScoring: 'AS_FRIEND' });
    expect(n.chartKind).toBe('NATAL');
    expect(n.neutralScoring).toBe('AS_FRIEND');
  }, 60000);
  it('rejects bad params', async () => {
    expect(await errCode('tajika.panchaVargiya', { birth: REF_BIRTH, neutralScoring: 'MAYBE' })).toBe('INVALID_PARAMS');
    expect(await errCode('tajika.panchaVargiya', { birth: REF_BIRTH, targetYear: 'x' })).toBe('INVALID_PARAMS');
    expect(await errCode('tajika.panchaVargiya', { birth: REF_BIRTH, location: { latitude: 1, longitude: 1, timezone: 'UTC' } })).toBe('INVALID_PARAMS');
  });
});

describe('tajika.tithiPravesha', () => {
  it('returns the moment and a normalized rasi chart', async () => {
    const r = await call('tajika.tithiPravesha', { birth: REF_BIRTH, targetYear: 2026 });
    // Independently checked against JPL Horizons in the engine test (≈ 2026-06-05 22:42:39 UT).
    expect(r.moment.utcIso.startsWith('2026-06-05T22:4')).toBe(true);
    expect(r.moment.sunSignMatchesNatal).toBe(true);
    expect(r.rasi.planets.length).toBeGreaterThanOrEqual(9);
    expect(r.rasi.ascendant).toBeDefined();
    expect(r.chart).toBeUndefined();
    expect(r.provisional).toBe(true);
  }, 60000);
  it('rejects bad params', async () => {
    expect(await errCode('tajika.tithiPravesha', { birth: REF_BIRTH, targetYear: 2026.5 })).toBe('INVALID_PARAMS');
    expect(await errCode('tajika.tithiPravesha', { birth: { ...REF_BIRTH, date: '1990/05/15' }, targetYear: 2026 })).toBe('INVALID_PARAMS');
  });
});

describe('tajika real-process round-trip (tsx)', () => {
  const root = path.resolve(__dirname, '..');
  const tsxCli = path.resolve(root, '../../../node_modules/tsx/dist/cli.mjs');
  const proc = spawn(process.execPath, [tsxCli, '--tsconfig', path.join(root, 'tsconfig.dev.json'), path.join(root, 'src/main.ts')], { cwd: root, stdio: 'pipe', env: { PATH: process.env.PATH ?? '' } });
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
  it('answers the three tajika methods identically to the in-process dispatcher', async () => {
    await waitFor((m) => m.event === 'ready');
    const reqs = [
      { id: 't1', method: 'tajika.yogas', params: { birth: REF_BIRTH, targetYear: 2026 } },
      { id: 't2', method: 'tajika.panchaVargiya', params: { birth: REF_BIRTH, targetYear: 2026 } },
      { id: 't3', method: 'tajika.tithiPravesha', params: { birth: REF_BIRTH, targetYear: 2026 } },
    ];
    for (const r of reqs) proc.stdin.write(JSON.stringify(r) + '\n');
    const strip = (o: unknown) => JSON.stringify(o, (k, v) => (k === 'calculationTimestampIso' ? undefined : v));
    for (const r of reqs) {
      const remote = await waitFor((m) => m.id === r.id);
      expect(remote.ok).toBe(true);
      const local = JSON.parse(safeStringify(await dispatchLine(JSON.stringify(r))));
      expect(strip(remote)).toBe(strip(local));
    }
  }, 120000);
});
