import * as readline from 'node:readline';
import { ASTROLOGY_ENGINE_VERSION } from '@astro/astrology-engine';
import { PROTOCOL_VERSION, ReadyEvent, SIDECAR_VERSION } from './protocol';
import { dispatchLine, safeStringify } from './dispatcher';

function write(obj: unknown): void {
  process.stdout.write(safeStringify(obj) + '\n');
}

/** Exit only after everything queued on stdout has been flushed (pipe writes are async). */
function exitAfterFlush(): void {
  process.stdout.write('', () => process.exit(0));
}

export function main(): void {
  const ready: ReadyEvent = {
    event: 'ready',
    protocolVersion: PROTOCOL_VERSION,
    engineVersion: ASTROLOGY_ENGINE_VERSION,
    sidecarVersion: SIDECAR_VERSION,
  };
  write(ready);

  const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity, terminal: false });
  let pending = 0;
  let closing = false;
  rl.on('line', (line) => {
    if (line.trim().length === 0) return;
    pending++;
    void dispatchLine(line).then((res) => {
      write(res);
      pending--;
      if (closing && pending === 0) exitAfterFlush();
    });
  });
  rl.on('close', () => {
    closing = true;
    if (pending === 0) exitAfterFlush();
  });
}

main();
