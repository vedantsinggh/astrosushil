// Emits declaration files for @astro/astrology-engine into .engine-types/ so the sidecar can be
// type-checked with "strict": true without type-checking the engine's own (non-strict) sources.
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../../..');
const tsc = path.join(root, 'node_modules/typescript/bin/tsc');
execFileSync(process.execPath, [
  tsc, '-p', path.join(root, 'packages/astrology-engine/tsconfig.json'),
  '--emitDeclarationOnly', '--declaration', '--composite', 'false', '--incremental', 'false',
  '--sourceMap', 'false', '--declarationMap', 'false',
  '--outDir', path.join(here, '../.engine-types'),
], { stdio: 'inherit' });
