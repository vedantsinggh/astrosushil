import { describe, it, expect, afterAll } from 'vitest';
import { spawn } from 'node:child_process';
import path from 'node:path';
import * as readline from 'node:readline';
import { dispatchLine, safeStringify } from '../src/dispatcher';
import { MuhurtaExtrasCalculator, DEFAULT_ASTROLOGY_CONFIG } from '@astro/astrology-engine';

async function call(method: string, params?: unknown): Promise<any> {
  const res = await dispatchLine(JSON.stringify({ id: 1, method, params }));
  if (!res.ok) throw new Error(`${res.error.code}: ${res.error.message}`);
  return JSON.parse(safeStringify(res.result));
}

async function errorCode(method: string, params?: unknown): Promise<string | undefined> {
  const res = await dispatchLine(JSON.stringify({ id: 2, method, params }));
  return res.ok ? undefined : res.error.code;
}

const DELHI = { latitude: 28.6139, longitude: 77.209, timezone: 'Asia/Kolkata', placeName: 'New Delhi' };

describe('muhurta.extras', () => {
  it('returns the engine day report (Tuesday 2026-03-03) plus the UTC offset', async () => {
    const r = await call('muhurta.extras', { date: '2026-03-03', location: DELHI });
    expect(r.provisional).toBe(true);
    expect(r.weekdayIndex).toBe(2);
    expect(r.utcOffsetMinutes).toBe(330);
    // Tuesday: 4th day muhurta and 7th night muhurta (Muhurta Chintamani table).
    expect(r.durmuhurta.map((d: any) => `${d.part}${d.muhurtaNumber}`)).toEqual(['DAY4', 'NIGHT7']);
    const direct = await new MuhurtaExtrasCalculator(DEFAULT_ASTROLOGY_CONFIG).calculateDay({
      date: { year: 2026, month: 3, day: 3 },
      timezone: DELHI.timezone,
      latitude: DELHI.latitude,
      longitude: DELHI.longitude,
    });
    expect(r.varjyam).toEqual(JSON.parse(JSON.stringify(direct.varjyam)));
    expect(r.amritKalam).toEqual(JSON.parse(JSON.stringify(direct.amritKalam)));
  });
  it('accepts the Prashna Marga Varjyam table', async () => {
    const r = await call('muhurta.extras', { date: '2026-03-03', location: DELHI, varjyamTable: 'PRASHNA_MARGA' });
    expect(r.varjyamTable).toBe('PRASHNA_MARGA');
  });
  it('validates params', async () => {
    expect(await errorCode('muhurta.extras', { date: '2026-03-03' })).toBe('INVALID_PARAMS');
    expect(await errorCode('muhurta.extras', { date: '03/03/2026', location: DELHI })).toBe('INVALID_PARAMS');
    expect(await errorCode('muhurta.extras', { date: '2026-03-03', location: { ...DELHI, timezone: 'Mars/Base' } })).toBe('INVALID_PARAMS');
    expect(await errorCode('muhurta.extras', { date: '2026-03-03', location: DELHI, varjyamTable: 'X' })).toBe('INVALID_PARAMS');
    // Polar night (no sunrise) is reported as invalid params, not an internal error.
    expect(await errorCode('muhurta.extras', { date: '2026-12-21', location: { latitude: 78.22, longitude: 15.65, timezone: 'Arctic/Longyearbyen' } })).toBe('INVALID_PARAMS');
  });
});

describe('muhurta.gandmoolPanchakaAt', () => {
  it('flags the Moon nakshatra', async () => {
    const r = await call('muhurta.gandmoolPanchakaAt', { instant: '2026-03-02T00:00:00Z' });
    expect([r.nakshatraName, r.pada, r.gandmool, r.gandantaJunctionPada, r.panchaka]).toEqual(['Ashlesha', 4, true, true, false]);
  });
  it('validates params', async () => {
    expect(await errorCode('muhurta.gandmoolPanchakaAt', {})).toBe('INVALID_PARAMS');
    expect(await errorCode('muhurta.gandmoolPanchakaAt', { instant: 'yesterday' })).toBe('INVALID_PARAMS');
  });
});

describe('muhurta.gandmoolPanchaka', () => {
  const range = { startIso: '2026-01-01T00:00:00Z', endIso: '2026-03-01T00:00:00Z', timezone: 'Asia/Kolkata' };
  it('returns paged, filtered windows with local offsets', async () => {
    const all = await call('muhurta.gandmoolPanchaka', range);
    expect(all.provisional).toBe(true);
    expect(all.source).toMatch(/Gandmool/);
    expect(all.totalRows).toBeGreaterThan(6);
    expect(all.rows[0].utcOffsetMinutes).toBe(330);
    const p0 = await call('muhurta.gandmoolPanchaka', { ...range, pageSize: 3, page: 0 });
    const p1 = await call('muhurta.gandmoolPanchaka', { ...range, pageSize: 3, page: 1 });
    expect(p0.pageCount).toBe(Math.ceil(all.totalRows / 3));
    expect([...p0.rows, ...p1.rows]).toEqual(all.rows.slice(0, 6));
    const onlyP = await call('muhurta.gandmoolPanchaka', { ...range, kinds: ['PANCHAKA'] });
    expect(onlyP.rows.every((w: any) => w.kind === 'PANCHAKA')).toBe(true);
    expect(onlyP.totalRows).toBe(all.rows.filter((w: any) => w.kind === 'PANCHAKA').length);
  });
  it('validates params', async () => {
    expect(await errorCode('muhurta.gandmoolPanchaka', { startIso: '2026-01-01T00:00:00Z' })).toBe('INVALID_PARAMS');
    expect(await errorCode('muhurta.gandmoolPanchaka', { startIso: '2026-02-01T00:00:00Z', endIso: '2026-01-01T00:00:00Z' })).toBe('INVALID_PARAMS');
    expect(await errorCode('muhurta.gandmoolPanchaka', { startIso: '2026-01-01T00:00:00Z', endIso: '2027-01-05T00:00:00Z' })).toBe('INVALID_PARAMS');
    expect(await errorCode('muhurta.gandmoolPanchaka', { ...range, timezone: 'Nowhere/X' })).toBe('INVALID_PARAMS');
    expect(await errorCode('muhurta.gandmoolPanchaka', { ...range, kinds: ['DOSHA'] })).toBe('INVALID_PARAMS');
    expect(await errorCode('muhurta.gandmoolPanchaka', { ...range, page: 99 })).toBe('INVALID_PARAMS');
  });
});

describe('muhurta-extras sidecar process round-trip (tsx)', () => {
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

  it('answers muhurta.extras over stdio identically to in-process dispatch', async () => {
    await waitFor((m) => m.event === 'ready');
    const params = { date: '2026-03-03', location: DELHI };
    proc.stdin.write(JSON.stringify({ id: 'mx', method: 'muhurta.extras', params }) + '\n');
    const res = await waitFor((m) => m.id === 'mx');
    expect(res.ok).toBe(true);
    expect(res.result).toEqual(await call('muhurta.extras', params));
  }, 40000);
});
