import { describe, it, expect, afterAll } from 'vitest';
import { spawn } from 'node:child_process';
import path from 'node:path';
import * as readline from 'node:readline';
import { dispatchLine, safeStringify } from '../src/dispatcher';
import { REF_BIRTH } from './fixtures';

async function raw(method: string, params?: unknown) {
  return dispatchLine(JSON.stringify({ id: 1, method, params }));
}
async function call(method: string, params?: unknown): Promise<any> {
  const res = await raw(method, params);
  if (!res.ok) throw new Error(`${res.error.code}: ${res.error.message}`);
  return JSON.parse(safeStringify(res.result));
}

const GIRL = { ...REF_BIRTH, name: 'Girl', date: '1992-08-20', time: '06:00', latitude: 13.0827, longitude: 80.2707, placeName: 'Chennai' };

describe('matching.porutham / matching.dashakoota', () => {
  it('returns ten kootas with inputs, provisional flag and source', async () => {
    for (const method of ['matching.porutham', 'matching.dashakoota']) {
      const r = await call(method, { boy: REF_BIRTH, girl: GIRL });
      expect(r.kootas).toHaveLength(10);
      expect(r.kootas.map((k: any) => k.key)).toEqual(['DINA', 'GANA', 'MAHENDRA', 'STREE_DEERGHA', 'YONI', 'RASI', 'RASI_ADHIPATI', 'VASYA', 'RAJJU', 'VEDHA']);
      expect(r.matchedCount).toBe(r.kootas.filter((k: any) => k.matched).length);
      expect(r.provisional).toBe(true);
      expect(typeof r.source).toBe('string');
      expect(r.boy.nakshatraIndex).toBeGreaterThanOrEqual(1);
      expect(r.girl.rashiIndex).toBeLessThanOrEqual(12);
      expect(r.system).toBe(method === 'matching.porutham' ? 'PORUTHAM' : 'DASHAKOOTA');
    }
  });

  it('same birth on both sides gives the hand-derived same-star result', async () => {
    // Same nakshatra and rashi: count 1 → Dina (1 ∉ list; 1 mod 9 = 1), Mahendra, Stree Deergha fail;
    // Gana and Yoni same → uttama; Rasi count 1 agrees; Rasi lords same → uttama; a sign is never
    // vasya to itself → Vasya fails; same rajju → dosha; a star is not vedha to itself → Vedha agrees.
    // Matched = Gana, Yoni, Rasi, Rasi Athipathi, Vedha = 5 (both systems).
    for (const method of ['matching.porutham', 'matching.dashakoota']) {
      const r = await call(method, { boy: REF_BIRTH, girl: REF_BIRTH });
      const m = Object.fromEntries(r.kootas.map((k: any) => [k.key, k.matched]));
      expect(m).toEqual({ DINA: false, GANA: true, MAHENDRA: false, STREE_DEERGHA: false, YONI: true, RASI: true, RASI_ADHIPATI: true, VASYA: false, RAJJU: false, VEDHA: true });
      expect(r.matchedCount).toBe(5);
      expect(r.rajjuDosha).toBe(true);
    }
  });

  it('rejects invalid params', async () => {
    for (const params of [undefined, { boy: REF_BIRTH }, { girl: REF_BIRTH }, { boy: { ...REF_BIRTH, date: '15/05/1990' }, girl: GIRL }, { boy: REF_BIRTH, girl: { ...GIRL, latitude: 95 } }]) {
      const r = await raw('matching.porutham', params);
      expect(r.ok === false && r.error.code).toBe('INVALID_PARAMS');
    }
    const d = await raw('matching.dashakoota', { boy: REF_BIRTH, girl: { ...GIRL, timezone: 'Mars/Olympus' } });
    expect(d.ok === false && d.error.code).toBe('INVALID_PARAMS');
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
  afterAll(() => {
    proc.kill();
  });

  async function waitFor(pred: (m: any) => boolean, ms = 30000): Promise<any> {
    const deadline = Date.now() + ms;
    for (;;) {
      const hit = lines.find(pred);
      if (hit) return hit;
      if (Date.now() > deadline) throw new Error('timeout');
      await new Promise((r) => setTimeout(r, 100));
    }
  }

  it('matches in-process output', async () => {
    const reqs = [
      { id: 'p1', method: 'matching.porutham', params: { boy: REF_BIRTH, girl: GIRL } },
      { id: 'd1', method: 'matching.dashakoota', params: { boy: REF_BIRTH, girl: GIRL } },
    ];
    for (const r of reqs) proc.stdin.write(JSON.stringify(r) + '\n');
    for (const r of reqs) {
      const remote = await waitFor((m) => m.id === r.id);
      const local = JSON.parse(safeStringify(await dispatchLine(JSON.stringify(r))));
      expect(remote).toEqual(local);
      expect(remote.ok).toBe(true);
    }
  }, 40000);
});
