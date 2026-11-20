import { describe, it, expect, afterAll } from 'vitest';
import { spawn } from 'node:child_process';
import path from 'node:path';
import * as readline from 'node:readline';
import { dispatchLine, safeStringify } from '../src/dispatcher';
import { KotaChakraCalculator, SarvatobhadraChakraCalculator, DEFAULT_ASTROLOGY_CONFIG } from '@astro/astrology-engine';
import { toBirthDetails } from '../src/birth';
import { REF_BIRTH } from './fixtures';

/**
 * chakra.* methods: adapter fidelity (result equals a direct engine call) and strict param checks.
 * Expected chakra values themselves are verified against published sources in the engine suite
 * (packages/astrology-engine/tests/unit/chakras-*.test.ts).
 */
async function call(method: string, params?: unknown): Promise<any> {
  const res = await dispatchLine(JSON.stringify({ id: 1, method, params }));
  if (!res.ok) throw new Error(`${res.error.code}: ${res.error.message}`);
  return JSON.parse(safeStringify(res.result));
}
async function code(method: string, params?: unknown): Promise<string | undefined> {
  const res = await dispatchLine(JSON.stringify({ id: 2, method, params }));
  return res.ok ? undefined : res.error.code;
}
const strip = (o: unknown) => JSON.parse(JSON.stringify(o));
const MOMENT = { ...REF_BIRTH, date: '2026-11-20', time: '12:00' };

describe('chakra.sarvatobhadra', () => {
  it('returns the engine result (natal + transit)', async () => {
    const r = await call('chakra.sarvatobhadra', { birth: REF_BIRTH, moment: MOMENT });
    const direct = await new SarvatobhadraChakraCalculator().calculate(toBirthDetails(REF_BIRTH), toBirthDetails(MOMENT), DEFAULT_ASTROLOGY_CONFIG);
    expect(r).toEqual(strip(direct));
    expect(r.grid).toHaveLength(81);
    expect(r.provisional).toBe(true);
    expect(r.transit.placements).toHaveLength(9);
  });
  it('moment is optional', async () => {
    const r = await call('chakra.sarvatobhadra', { birth: REF_BIRTH });
    expect(r.transit).toBeUndefined();
  });
  it('rejects bad params', async () => {
    expect(await code('chakra.sarvatobhadra', {})).toBe('INVALID_PARAMS');
    expect(await code('chakra.sarvatobhadra', { birth: REF_BIRTH, moment: { ...MOMENT, date: 'x' } })).toBe('INVALID_PARAMS');
  });
});

describe('chakra.kota', () => {
  it('returns the engine result', async () => {
    const r = await call('chakra.kota', { birth: REF_BIRTH, moment: MOMENT });
    const direct = await new KotaChakraCalculator().calculate(toBirthDetails(REF_BIRTH), toBirthDetails(MOMENT), DEFAULT_ASTROLOGY_CONFIG);
    expect(r).toEqual(strip(direct));
    expect(r.positions).toHaveLength(28);
  });
  it('rejects bad params', async () => {
    expect(await code('chakra.kota', { birth: { ...REF_BIRTH, timezone: 'Nowhere/Zone' } })).toBe('INVALID_PARAMS');
  });
});

describe('chakra.tripataki', () => {
  it('returns progressed placements for the target year', async () => {
    const r = await call('chakra.tripataki', { birth: REF_BIRTH, targetYear: 2026 });
    expect(r.targetYear).toBe(2026);
    expect(r.placements).toHaveLength(9);
    expect(r.vedha).toBeNull();
  });
  it('rejects a missing or out-of-range year', async () => {
    expect(await code('chakra.tripataki', { birth: REF_BIRTH })).toBe('INVALID_PARAMS');
    expect(await code('chakra.tripataki', { birth: REF_BIRTH, targetYear: 1980 })).toBe('INVALID_PARAMS');
    expect(await code('chakra.tripataki', { birth: REF_BIRTH, targetYear: 2026.5 })).toBe('INVALID_PARAMS');
  });
});

describe('real-process round-trip (tsx)', () => {
  const root = path.resolve(__dirname, '..');
  const tsxCli = path.resolve(root, '../../../node_modules/tsx/dist/cli.mjs');
  const proc = spawn(process.execPath, [tsxCli, '--tsconfig', path.join(root, 'tsconfig.dev.json'), path.join(root, 'src/main.ts')], {
    cwd: root, stdio: 'pipe', env: { PATH: process.env.PATH ?? '' },
  });
  const lines: any[] = [];
  readline.createInterface({ input: proc.stdout }).on('line', (l) => lines.push(JSON.parse(l)));
  afterAll(() => {
    proc.kill();
  });
  it('chakra.kota over stdio equals the in-process result', async () => {
    const req = { id: 'k1', method: 'chakra.kota', params: { birth: REF_BIRTH, moment: MOMENT } };
    proc.stdin.write(JSON.stringify(req) + '\n');
    const deadline = Date.now() + 30000;
    let hit: any;
    while (!(hit = lines.find((m) => m.id === 'k1'))) {
      if (Date.now() > deadline) throw new Error('timeout');
      await new Promise((r) => setTimeout(r, 100));
    }
    const local = JSON.parse(safeStringify(await dispatchLine(JSON.stringify(req))));
    expect(hit).toEqual(local);
    expect(hit.ok).toBe(true);
  }, 40000);
});
