import { describe, it, expect, afterAll } from 'vitest';
import { spawn, ChildProcessWithoutNullStreams } from 'node:child_process';
import path from 'node:path';
import * as readline from 'node:readline';
import { dispatchLine, safeStringify } from '../src/dispatcher';
import { ChartCalculator, DEFAULT_ASTROLOGY_CONFIG, SignDashaExtendedRegistry } from '@astro/astrology-engine';
import { toBirthDetails } from '../src/birth';
import { REF_BIRTH } from './fixtures';

/**
 * dashaExt.list / dashaExt.sign.compute / dashaExt.sign.subPeriods. The sidecar only parses params
 * and shapes JSON, so values are checked against a direct engine call with the same chart; the
 * astrology itself is verified in packages/astrology-engine/tests/unit/dasha-sign-extended.test.ts.
 */
async function call(method: string, params?: unknown): Promise<any> {
  const res = await dispatchLine(JSON.stringify({ id: 1, method, params }));
  if (!res.ok) throw new Error(`${res.error.code}: ${res.error.message}`);
  return JSON.parse(safeStringify(res.result));
}
async function errorCode(method: string, params?: unknown): Promise<string | undefined> {
  const res = await dispatchLine(JSON.stringify({ id: 1, method, params }));
  return res.ok ? undefined : res.error.code;
}

const TARGET = '2026-11-20T00:00:00.000Z';

describe('dashaExt.list', () => {
  it('lists both groups: six implemented sign systems, four pending sign systems, and the planetary ones', async () => {
    const r = await call('dashaExt.list');
    const sign = r.systems.filter((s: any) => s.group === 'SIGN');
    expect(sign.filter((s: any) => s.implemented).map((s: any) => s.system)).toEqual(['SUDASA', 'DRIG', 'NIRYANA_SHOOLA', 'MANDOOKA', 'TRIKONA', 'KENDRADI']);
    expect(sign.filter((s: any) => !s.implemented).map((s: any) => s.system)).toEqual(['BRAHMA', 'NAVAMSA', 'VARNADA', 'PADANADHAMSA']);
    for (const s of sign.filter((x: any) => x.implemented)) {
      expect(s.method).toBe('dashaExt.sign.compute');
      expect(s.label).toBe('provisional – pending client review');
      expect(s.source).toBeTruthy();
    }
    for (const s of sign.filter((x: any) => !x.implemented)) expect(s.notImplementedReason).toBeTruthy();
    const planetary = r.systems.filter((s: any) => s.group === 'PLANETARY');
    expect(planetary.length).toBeGreaterThan(0);
    expect(planetary.filter((s: any) => s.implemented).every((s: any) => typeof s.method === 'string')).toBe(true);
  });
});

describe('dashaExt.sign.compute', () => {
  it('returns the engine tree unchanged for maxLevel 2', async () => {
    const r = await call('dashaExt.sign.compute', { birth: REF_BIRTH, system: 'DRIG', targetDate: TARGET });
    const chart = await new ChartCalculator().calculateChart(toBirthDetails(REF_BIRTH), DEFAULT_ASTROLOGY_CONFIG);
    const direct = JSON.parse(safeStringify(SignDashaExtendedRegistry.calculate('DRIG', chart, { maxLevel: 2, targetDate: TARGET })));
    expect(r.system).toBe('DRIG');
    expect(r.utcOffsetMinutes).toBe(330);
    expect(r.result).toEqual(direct);
    expect(r.result.provisional).toBe(true);
    expect(r.result.mahadashas).toHaveLength(12);
    expect(r.result.mahadashas[0].subPeriods).toHaveLength(12);
    expect(r.result.currentPeriod.antardasha).toBeDefined();
  });

  it('pages Mahadashas for maxLevel 3 and keeps each line under 1 MB', async () => {
    const res = await dispatchLine(JSON.stringify({ id: 1, method: 'dashaExt.sign.compute', params: { birth: REF_BIRTH, system: 'SUDASA', maxLevel: 3, targetDate: TARGET } }));
    expect(res.ok).toBe(true);
    expect(safeStringify(res).length).toBeLessThan(1_000_000);
    const r = JSON.parse(safeStringify((res as any).result));
    expect(r.paging.page).toBe(0);
    expect(r.paging.pageSize).toBe(4);
    expect(r.result.mahadashas).toHaveLength(4);
    expect(r.result.mahadashas[0].subPeriods[0].subPeriods).toHaveLength(12);
    const last = await call('dashaExt.sign.compute', { birth: REF_BIRTH, system: 'SUDASA', maxLevel: 3, targetDate: TARGET, page: r.paging.pageCount - 1 });
    expect(last.result.mahadashas.length).toBeGreaterThan(0);
  });

  it('dashaExt.sign.subPeriods returns one level of Pratyantardashas', async () => {
    const r = await call('dashaExt.sign.subPeriods', { birth: REF_BIRTH, system: 'KENDRADI', path: [1, 2], targetDate: TARGET });
    expect(r.periods).toHaveLength(12);
    expect(r.periods[0].level).toBe(3);
    expect(r.periods[0].subPeriods).toBeUndefined();
  });

  it('rejects invalid params', async () => {
    expect(await errorCode('dashaExt.sign.compute', { birth: REF_BIRTH })).toBe('INVALID_PARAMS');
    expect(await errorCode('dashaExt.sign.compute', { birth: REF_BIRTH, system: 'BRAHMA' })).toBe('INVALID_PARAMS');
    expect(await errorCode('dashaExt.sign.compute', { birth: REF_BIRTH, system: 'DRIG', maxLevel: 4 })).toBe('INVALID_PARAMS');
    expect(await errorCode('dashaExt.sign.compute', { birth: REF_BIRTH, system: 'DRIG', targetDate: 'tomorrow' })).toBe('INVALID_PARAMS');
    expect(await errorCode('dashaExt.sign.compute', { system: 'DRIG' })).toBe('INVALID_PARAMS');
    expect(await errorCode('dashaExt.sign.subPeriods', { birth: REF_BIRTH, system: 'DRIG', path: [] })).toBe('INVALID_PARAMS');
    expect(await errorCode('dashaExt.sign.subPeriods', { birth: REF_BIRTH, system: 'DRIG', path: [99] })).toBe('INVALID_PARAMS');
  });
});

const root = path.resolve(__dirname, '..');
const tsxCli = path.resolve(root, '../../../node_modules/tsx/dist/cli.mjs');

describe('sidecar process round-trip (tsx)', () => {
  const proc: ChildProcessWithoutNullStreams = spawn(
    process.execPath,
    [tsxCli, '--tsconfig', path.join(root, 'tsconfig.dev.json'), path.join(root, 'src/main.ts')],
    { cwd: root, stdio: 'pipe', env: { PATH: process.env.PATH ?? '' } }
  );
  const lines: any[] = [];
  const waiters: Array<() => void> = [];
  readline.createInterface({ input: proc.stdout }).on('line', (l) => {
    lines.push(JSON.parse(l));
    waiters.splice(0).forEach((w) => w());
  });
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
      await new Promise<void>((r) => {
        waiters.push(r);
        setTimeout(r, 200);
      });
    }
  }

  it('answers dashaExt.sign.compute over stdio exactly like the in-process dispatcher', async () => {
    await waitFor((m) => m.event === 'ready');
    const params = { birth: REF_BIRTH, system: 'TRIKONA', maxLevel: 2, targetDate: TARGET };
    proc.stdin.write(JSON.stringify({ id: 'ds1', method: 'dashaExt.sign.compute', params }) + '\n');
    const msg = await waitFor((m) => m.id === 'ds1');
    expect(msg.ok).toBe(true);
    const local = await call('dashaExt.sign.compute', params);
    expect(msg.result).toEqual(local);
  }, 90000);
});
