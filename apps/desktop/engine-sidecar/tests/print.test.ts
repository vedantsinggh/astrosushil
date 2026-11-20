import { describe, it, expect, afterAll } from 'vitest';
import { spawn } from 'node:child_process';
import path from 'node:path';
import * as readline from 'node:readline';
import { dispatchLine, safeStringify } from '../src/dispatcher';

const DELHI = { latitude: 28.6139, longitude: 77.209, timezone: 'Asia/Kolkata', placeName: 'New Delhi, India' };

async function call(method: string, params?: unknown): Promise<any> {
  const res = await dispatchLine(JSON.stringify({ id: 1, method, params }));
  if (!res.ok) throw new Error(`${res.error.code}: ${res.error.message}`);
  return JSON.parse(safeStringify(res.result));
}

/** Minutes after local midnight of a UTC ISO instant at a fixed offset. */
function localMinutes(iso: string, offsetMin: number): number {
  const d = new Date(Date.parse(iso) + offsetMin * 60000);
  return d.getUTCHours() * 60 + d.getUTCMinutes() + d.getUTCSeconds() / 60;
}

describe('panchang.month', () => {
  it('returns one row per civil day with the documented shape', async () => {
    const r = await call('panchang.month', { year: 2026, month: 1, location: DELHI });
    expect(r.year).toBe(2026);
    expect(r.month).toBe(1);
    expect(r.daysInMonth).toBe(31);
    expect(r.rows).toHaveLength(31);
    for (const [k, row] of r.rows.entries()) {
      expect(row.day).toBe(k + 1);
      expect(row.date).toBe(`2026-01-${String(k + 1).padStart(2, '0')}`);
      expect(row.utcOffsetMinutes).toBe(330); // IST has no DST
      expect(Date.parse(row.sunriseIso)).toBeLessThan(Date.parse(row.sunsetIso));
      expect(Date.parse(row.rahuKaala.startIso)).toBeGreaterThanOrEqual(Date.parse(row.sunriseIso));
      expect(Date.parse(row.rahuKaala.endIso)).toBeLessThanOrEqual(Date.parse(row.sunsetIso));
      expect(row.tithi.index).toBeGreaterThanOrEqual(1);
      expect(row.tithi.index).toBeLessThanOrEqual(30);
      expect(row.nakshatra.index).toBeGreaterThanOrEqual(1);
      expect(row.nakshatra.index).toBeLessThanOrEqual(27);
      expect(typeof row.tithi.name).toBe('string');
      expect(typeof row.yoga.name).toBe('string');
      expect(typeof row.karana.name).toBe('string');
      expect(typeof row.masa.amanta).toBe('string');
      expect(['SUKLA', 'KRISHNA']).toContain(row.paksha);
      // The tithi current at sunrise ends after that sunrise.
      expect(Date.parse(row.tithi.endIso)).toBeGreaterThan(Date.parse(row.sunriseIso));
    }
    // Calendar facts (Gregorian calendar, independently known): 1 Jan 2026 is a Thursday,
    // 26 Jan 2026 (Republic Day) is a Monday, 31 Jan 2026 is a Saturday.
    expect(r.rows[0].weekday).toBe('Thursday');
    expect(r.rows[25].weekday).toBe('Monday');
    expect(r.rows[30].weekday).toBe('Saturday');
  });

  it('sunrise/sunset in New Delhi agree with USNO within 2 minutes', async () => {
    // US Naval Observatory, Rise/Set/Transit API (fetched 2026-11-20):
    //   https://aa.usno.navy.mil/api/rstt/oneday?date=2026-01-01&coords=28.6139,77.209&tz=5.5
    //     -> Rise 07:14, Set 17:35 (IST)
    //   https://aa.usno.navy.mil/api/rstt/oneday?date=2026-06-21&coords=28.6139,77.209&tz=5.5
    //     -> Rise 05:24, Set 19:22 (IST)
    // USNO rounds to the minute, so the tolerance is +/-2 min.
    const jan = (await call('panchang.month', { year: 2026, month: 1, location: DELHI })).rows[0];
    const jun = (await call('panchang.month', { year: 2026, month: 6, location: DELHI })).rows[20];
    expect(jun.date).toBe('2026-06-21');
    expect(Math.abs(localMinutes(jan.sunriseIso, 330) - (7 * 60 + 14))).toBeLessThanOrEqual(2);
    expect(Math.abs(localMinutes(jan.sunsetIso, 330) - (17 * 60 + 35))).toBeLessThanOrEqual(2);
    expect(Math.abs(localMinutes(jun.sunriseIso, 330) - (5 * 60 + 24))).toBeLessThanOrEqual(2);
    expect(Math.abs(localMinutes(jun.sunsetIso, 330) - (19 * 60 + 22))).toBeLessThanOrEqual(2);
  });

  it('handles month lengths (28/29/30 days)', async () => {
    expect((await call('panchang.month', { year: 2026, month: 2, location: DELHI })).rows).toHaveLength(28);
    expect((await call('panchang.month', { year: 2028, month: 2, location: DELHI })).rows).toHaveLength(29);
    expect((await call('panchang.month', { year: 2026, month: 4, location: DELHI })).rows).toHaveLength(30);
  });

  it('rejects invalid params', async () => {
    for (const params of [
      { year: 2026, month: 13, location: DELHI },
      { year: 2026, month: 0, location: DELHI },
      { year: '2026x', month: 1, location: DELHI },
      { year: 2026, month: 1 },
      { year: 2026, month: 1, location: { ...DELHI, timezone: 'Mars/Olympus' } },
      { year: 2026, month: 1, location: { ...DELHI, latitude: 95 } },
    ]) {
      const r = await dispatchLine(JSON.stringify({ id: 2, method: 'panchang.month', params }));
      expect(r.ok === false && r.error.code).toBe('INVALID_PARAMS');
    }
  });
});

describe('panchang.month over the real sidecar process (tsx)', () => {
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

  async function waitFor(pred: (m: any) => boolean, ms = 60000): Promise<any> {
    const deadline = Date.now() + ms;
    for (;;) {
      const hit = lines.find(pred);
      if (hit) return hit;
      if (Date.now() > deadline) throw new Error(`timeout; stderr=${stderr}`);
      await new Promise((r) => setTimeout(r, 100));
    }
  }

  it('matches the in-process result', async () => {
    await waitFor((m) => m.event === 'ready');
    const params = { year: 2026, month: 2, location: DELHI };
    proc.stdin.write(JSON.stringify({ id: 'pm', method: 'panchang.month', params }) + '\n');
    const res = await waitFor((m) => m.id === 'pm');
    expect(res.ok).toBe(true);
    expect(res.result.rows).toHaveLength(28);
    expect(JSON.stringify(res.result)).toBe(JSON.stringify(await call('panchang.month', params)));
  }, 90000);
});
