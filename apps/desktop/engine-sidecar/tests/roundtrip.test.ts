import { describe, it, expect, afterAll } from 'vitest';
import { spawn, ChildProcessWithoutNullStreams } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import * as readline from 'node:readline';
import { dispatchLine, safeStringify } from '../src/dispatcher';
import { REF_BIRTH, REF_UTC } from './fixtures';

/**
 * Spawns the real sidecar process and talks NDJSON over stdio, exactly as the Flutter client does.
 * Runs against every runner that exists: tsx on sources (always), the esbuild bundle and the SEA
 * executable (after `npm run build:sea`). Each runner's output must equal the in-process engine
 * output byte-for-byte (except the calculation timestamp), which catches bundling regressions such
 * as an ephemeris module silently failing to load.
 */
const root = path.resolve(__dirname, '..');
const tsxCli = path.resolve(root, '../../../node_modules/tsx/dist/cli.mjs');
const runners: Array<[string, string, string[]]> = [
  ['tsx', process.execPath, [tsxCli, '--tsconfig', path.join(root, 'tsconfig.dev.json'), path.join(root, 'src/main.ts')]],
];
const bundled = path.join(root, 'dist/sidecar.cjs');
if (fs.existsSync(bundled)) runners.push(['bundle', process.execPath, [bundled]]);
const seaExe = path.join(root, 'dist', process.platform === 'win32' ? 'astro-engine-sidecar.exe' : 'astro-engine-sidecar');
if (fs.existsSync(seaExe)) runners.push(['sea', seaExe, []]);

const strip = (o: unknown) => JSON.stringify(o, (k, v) => (k === 'calculationTimestampIso' ? undefined : v));

describe.each(runners)('sidecar process round-trip (%s)', (_name, cmd, args) => {
  const proc: ChildProcessWithoutNullStreams = spawn(cmd, args, { cwd: root, stdio: 'pipe', env: { PATH: process.env.PATH ?? '' } });
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

  async function waitFor(pred: (m: any) => boolean, ms = 30000): Promise<any> {
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

  it('emits a ready event first', async () => {
    const ready = await waitFor((m) => m.event === 'ready');
    expect(ready.protocolVersion).toBe(1);
    expect(lines[0].event).toBe('ready');
  });

  it('answers pipelined requests by id', async () => {
    proc.stdin.write(JSON.stringify({ id: 'a', method: 'ping' }) + '\n');
    proc.stdin.write(JSON.stringify({ id: 'b', method: 'chart.compute', params: { birth: REF_BIRTH } }) + '\n');
    proc.stdin.write('garbage\n');
    const a = await waitFor((m) => m.id === 'a');
    const b = await waitFor((m) => m.id === 'b');
    const bad = await waitFor((m) => m.id === null && m.ok === false);
    expect(a).toEqual({ id: 'a', ok: true, result: { pong: true } });
    expect(b.ok).toBe(true);
    expect(b.result.utcIso).toBe(REF_UTC);
    expect(bad.error.code).toBe('PARSE_ERROR');
  });

  it('matches in-process engine output exactly (chart, panchang/day divisions, eclipses)', async () => {
    const reqs = [
      { id: 'c1', method: 'chart.compute', params: { birth: REF_BIRTH } },
      { id: 'c2', method: 'panchang.compute', params: { moment: { ...REF_BIRTH, date: '2026-11-20', time: '06:00' } } },
      { id: 'c3', method: 'eclipses.find', params: { startIso: '2026-01-01T00:00:00Z', endIso: '2027-01-01T00:00:00Z' } },
    ];
    for (const r of reqs) proc.stdin.write(JSON.stringify(r) + '\n');
    for (const r of reqs) {
      const remote = await waitFor((m) => m.id === r.id);
      const local = JSON.parse(safeStringify(await dispatchLine(JSON.stringify(r))));
      expect(strip(remote)).toBe(strip(local));
    }
  });

  it('exits cleanly when stdin closes', async () => {
    const code = await new Promise<number | null>((resolve) => {
      proc.on('exit', resolve);
      proc.stdin.end();
    });
    expect(code).toBe(0);
  });
});

describe.each(runners)('one-shot pipe usage (%s)', (_name, cmd, args) => {
  it('flushes large responses (>64 KiB) before exiting when stdin closes immediately', async () => {
    const proc = spawn(cmd, args, { cwd: root, stdio: 'pipe', env: { PATH: process.env.PATH ?? '' } });
    let out = '';
    proc.stdout.on('data', (d) => (out += d));
    proc.stdin.end(JSON.stringify({ id: 1, method: 'dasha.compute', params: { birth: REF_BIRTH, system: 'CHARA', maxLevel: 2 } }) + '\n');
    const code = await new Promise<number | null>((resolve) => proc.on('exit', resolve));
    expect(code).toBe(0);
    const lines = out.trim().split('\n');
    expect(lines).toHaveLength(2);
    expect(lines[1].length).toBeGreaterThan(65536);
    expect(JSON.parse(lines[1]).ok).toBe(true);
  });
});
