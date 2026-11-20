import { describe, it, expect, afterAll } from 'vitest';
import { spawn } from 'node:child_process';
import path from 'node:path';
import * as readline from 'node:readline';
import { dispatchLine, safeStringify } from '../src/dispatcher';
import { LalKitabCalculator, DEFAULT_ASTROLOGY_CONFIG } from '@astro/astrology-engine';
import { toBirthDetails } from '../src/birth';
import { REF_BIRTH } from './fixtures';

async function call(method: string, params?: unknown): Promise<any> {
  const res = await dispatchLine(JSON.stringify({ id: 1, method, params }));
  if (!res.ok) throw new Error(`${res.error.code}: ${res.error.message}`);
  return JSON.parse(safeStringify(res.result));
}

async function errorCode(method: string, params?: unknown): Promise<string | undefined> {
  const res = await dispatchLine(JSON.stringify({ id: 2, method, params }));
  return res.ok ? undefined : res.error.code;
}

describe('lalKitab.chart', () => {
  it('returns the fixed Aries-first teva, equal to a direct engine call', async () => {
    const r = await call('lalKitab.chart', { birth: REF_BIRTH });
    expect(r.provisional).toBe(true);
    expect(r.source).toMatch(/Lal Kitab/);
    expect(r.houses).toHaveLength(12);
    expect(r.houses[0].fixedRashiName).toBe('Mesha');
    expect(r.planets).toHaveLength(9);
    const direct = await new LalKitabCalculator().calculateChart(toBirthDetails(REF_BIRTH), DEFAULT_ASTROLOGY_CONFIG);
    expect(r.planets).toEqual(JSON.parse(JSON.stringify(direct.planets)));
  });
  it('rejects a missing or bad birth', async () => {
    expect(await errorCode('lalKitab.chart', {})).toBe('INVALID_PARAMS');
    expect(await errorCode('lalKitab.chart', { birth: { ...REF_BIRTH, date: '15/05/1990' } })).toBe('INVALID_PARAMS');
  });
});

describe('lalKitab.varshphal', () => {
  it('maps natal houses by the table row for the running year', async () => {
    const r = await call('lalKitab.varshphal', { birth: REF_BIRTH, age: 21 });
    expect(r.age).toBe(21);
    expect(r.startsInYear).toBe(2010);
    // Lal Kitab 1952 table, age 21 (S1=S2=S3 in the engine test): 12 2 8 5 10 3 9 4 1 11 7 6
    expect(r.houseMapping.map((m: any) => m.annualHouse)).toEqual([12, 2, 8, 5, 10, 3, 9, 4, 1, 11, 7, 6]);
    for (const p of r.planets) expect(p.annualHouse).toBe(r.houseMapping[p.natalHouse - 1].annualHouse);
    const byYear = await call('lalKitab.varshphal', { birth: REF_BIRTH, targetYear: 2010 });
    expect(byYear.planets).toEqual(r.planets);
  });
  it('validates params', async () => {
    expect(await errorCode('lalKitab.varshphal', { birth: REF_BIRTH })).toBe('INVALID_PARAMS');
    expect(await errorCode('lalKitab.varshphal', { birth: REF_BIRTH, age: 3, targetYear: 1992 })).toBe('INVALID_PARAMS');
    expect(await errorCode('lalKitab.varshphal', { birth: REF_BIRTH, age: 0 })).toBe('INVALID_PARAMS');
    expect(await errorCode('lalKitab.varshphal', { birth: REF_BIRTH, age: 121 })).toBe('INVALID_PARAMS');
    expect(await errorCode('lalKitab.varshphal', { birth: REF_BIRTH, age: 'x' })).toBe('INVALID_PARAMS');
    expect(await errorCode('lalKitab.varshphal', { birth: REF_BIRTH, targetYear: 1989 })).toBe('INVALID_PARAMS');
    expect(await errorCode('lalKitab.varshphal', { birth: REF_BIRTH, targetYear: 2110 })).toBe('INVALID_PARAMS');
  });
});

describe('lalKitab sidecar process round-trip (tsx)', () => {
  const root = path.resolve(__dirname, '..');
  const tsxCli = path.resolve(root, '../../../node_modules/tsx/dist/cli.mjs');
  const proc = spawn(process.execPath, [tsxCli, '--tsconfig', path.join(root, 'tsconfig.dev.json'), path.join(root, 'src/main.ts')], {
    cwd: root,
    stdio: 'pipe',
    env: { PATH: process.env.PATH ?? '' },
  });
  const lines: any[] = [];
  readline.createInterface({ input: proc.stdout }).on('line', (l) => lines.push(JSON.parse(l)));
  let stderr = '';
  proc.stderr.on('data', (d) => (stderr += d));
  afterAll(() => {
    proc.kill();
  });

  async function waitFor(pred: (m: any) => boolean, ms = 30000): Promise<any> {
    const deadline = Date.now() + ms;
    for (;;) {
      const hit = lines.find(pred);
      if (hit) return hit;
      if (Date.now() > deadline) throw new Error(`timeout; stderr=${stderr}`);
      await new Promise((r) => setTimeout(r, 100));
    }
  }

  it('answers lalKitab.varshphal over stdio identically to in-process dispatch', async () => {
    await waitFor((m) => m.event === 'ready');
    proc.stdin.write(JSON.stringify({ id: 'lk', method: 'lalKitab.varshphal', params: { birth: REF_BIRTH, age: 35 } }) + '\n');
    const res = await waitFor((m) => m.id === 'lk');
    expect(res.ok).toBe(true);
    const local = await call('lalKitab.varshphal', { birth: REF_BIRTH, age: 35 });
    expect(res.result).toEqual(local);
    expect(res.result.houseMapping.map((m: any) => m.annualHouse)).toEqual([8, 10, 12, 6, 7, 2, 4, 5, 9, 3, 11, 1]);
  }, 40000);
});
