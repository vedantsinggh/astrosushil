// Bundles the sidecar + @astro/astrology-engine + astronomy-engine into one CommonJS file
// (dist/sidecar.cjs) using esbuild (MIT). The bundle has no runtime dependencies besides Node.
import { build } from 'esbuild';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const pkg = path.resolve(here, '..');
const root = path.resolve(pkg, '../../..');

await build({
  entryPoints: [path.join(pkg, 'src/main.ts')],
  outfile: path.join(pkg, 'dist/sidecar.cjs'),
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  minify: false,
  sourcemap: false,
  legalComments: 'inline',
  alias: {
    '@astro/astrology-engine': path.join(root, 'packages/astrology-engine/src/index.ts'),
    '@astro/shared': path.join(root, 'packages/shared/src/index.ts'),
  },
  logLevel: 'info',
});
