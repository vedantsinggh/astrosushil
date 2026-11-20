import { describe, it, expect, afterAll } from 'vitest';
import { spawn } from 'node:child_process';
import path from 'node:path';
import * as readline from 'node:readline';
import { dispatchLine, safeStringify } from '../src/dispatcher';
import {
  ChartCalculator,
  DEFAULT_ASTROLOGY_CONFIG,
  PlanetSymbol,
  computeBhriguBinduLongitude,
  extraVargaSign,
} from '@astro/astrology-engine';
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

describe('vargasExtra.compute', () => {
  it('returns all 8 extra vargas by default, VargaChart-shaped and provisional', async () => {
    const r = await call('vargasExtra.compute', { birth: REF_BIRTH });
    expect(Object.keys(r.vargas)).toEqual(['D5', 'D6', 'D8', 'D11', 'D81', 'D108', 'D144', 'D150']);
    const d5 = r.vargas.D5;
    expect(d5.vargaType).toBe('D5');
    expect(d5.division).toBe(5);
    expect(d5.provisional).toBe(true);
    expect(d5.source).toMatch(/Narasimha Rao/);
    expect(d5.houses).toHaveLength(12);
    expect(d5.placements.Ascendant.house).toBe(1);
    // Adapter fidelity: placements equal the engine's pure rule on a direct engine chart.
    const direct = await new ChartCalculator().calculateChart(toBirthDetails(REF_BIRTH), DEFAULT_ASTROLOGY_CONFIG);
    expect(r.vargas.D11.placements.SUN.rashiIndex).toBe(extraVargaSign(direct.planets[PlanetSymbol.SUN].longitude, 'D11'));
    expect(typeof r.vargas.D150.placements.MOON.nadiamsaNumber).toBe('number');
  });
  it('honours a subset and rejects unknown vargas / bad birth', async () => {
    const r = await call('vargasExtra.compute', { birth: REF_BIRTH, vargas: ['D8', 'D150'] });
    expect(Object.keys(r.vargas)).toEqual(['D8', 'D150']);
    expect(await errorCode('vargasExtra.compute', { birth: REF_BIRTH, vargas: ['D9'] })).toBe('INVALID_PARAMS');
    expect(await errorCode('vargasExtra.compute', { birth: REF_BIRTH, vargas: 'D5' })).toBe('INVALID_PARAMS');
    expect(await errorCode('vargasExtra.compute', {})).toBe('INVALID_PARAMS');
  });
});

describe('pushkara.compute / bhriguBindu.compute', () => {
  it('pushkara returns bodies (Lagna first) and the 12-row table', async () => {
    const r = await call('pushkara.compute', { birth: REF_BIRTH });
    expect(r.bodies[0].body).toBe('Ascendant');
    expect(r.table).toHaveLength(12);
    expect(r.table[0].pushkaraBhaga).toBe(21);
    expect(r.provisional).toBe(true);
    expect(await errorCode('pushkara.compute', { birth: { ...REF_BIRTH, date: 'x' } })).toBe('INVALID_PARAMS');
  });
  it('bhriguBindu equals the Rahu-to-Moon midpoint', async () => {
    const r = await call('bhriguBindu.compute', { birth: REF_BIRTH });
    expect(r.longitude).toBeCloseTo(computeBhriguBinduLongitude(r.moonLongitude, r.rahuLongitude), 9);
    expect(r.rashiIndex).toBeGreaterThanOrEqual(1);
    expect(await errorCode('bhriguBindu.compute', {})).toBe('INVALID_PARAMS');
  });
});

describe('real sidecar process round-trip (tsx)', () => {
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

  it('answers all three methods', async () => {
    await waitFor((m) => m.event === 'ready');
    proc.stdin.write(JSON.stringify({ id: 'v', method: 'vargasExtra.compute', params: { birth: REF_BIRTH, vargas: ['D5'] } }) + '\n');
    proc.stdin.write(JSON.stringify({ id: 'p', method: 'pushkara.compute', params: { birth: REF_BIRTH } }) + '\n');
    proc.stdin.write(JSON.stringify({ id: 'b', method: 'bhriguBindu.compute', params: { birth: REF_BIRTH } }) + '\n');
    const v = await waitFor((m) => m.id === 'v');
    const p = await waitFor((m) => m.id === 'p');
    const b = await waitFor((m) => m.id === 'b');
    const inProc = await call('vargasExtra.compute', { birth: REF_BIRTH, vargas: ['D5'] });
    expect(v.ok).toBe(true);
    expect(v.result).toEqual(inProc);
    expect(p.ok && p.result.table.length).toBe(12);
    expect(b.ok && typeof b.result.longitude).toBe('number');
  }, 60000);
});
