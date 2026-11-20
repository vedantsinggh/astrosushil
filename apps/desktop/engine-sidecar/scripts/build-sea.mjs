// Builds a standalone executable of the sidecar with Node's Single Executable Application (SEA)
// feature so end users do not need Node installed.
//   1. node --experimental-sea-config sea-config.json  -> dist/sea-prep.blob
//   2. copy the running node binary                    -> dist/astro-engine-sidecar[.exe]
//   3. postject (MIT) injects the blob into the copy
// macOS additionally needs codesign removal/re-signing; Windows signature removal is optional.
// Must be run on each target OS (SEA embeds the host Node binary).
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const pkg = path.resolve(here, '..');
const dist = path.join(pkg, 'dist');
const isWin = process.platform === 'win32';
const isMac = process.platform === 'darwin';
const exe = path.join(dist, isWin ? 'astro-engine-sidecar.exe' : 'astro-engine-sidecar');

if (!fs.existsSync(path.join(dist, 'sidecar.cjs'))) throw new Error('Run `npm run bundle` first.');

const seaConfig = {
  main: path.join(dist, 'sidecar.cjs'),
  output: path.join(dist, 'sea-prep.blob'),
  disableExperimentalSEAWarning: true,
  useCodeCache: false,
};
fs.writeFileSync(path.join(dist, 'sea-config.json'), JSON.stringify(seaConfig, null, 2));
execFileSync(process.execPath, ['--experimental-sea-config', path.join(dist, 'sea-config.json')], { stdio: 'inherit' });

fs.copyFileSync(process.execPath, exe);
fs.chmodSync(exe, 0o755);
if (isMac) execFileSync('codesign', ['--remove-signature', exe], { stdio: 'inherit' });

const postjectCli = (() => {
  const local = path.join(pkg, 'node_modules/postject/dist/cli.js');
  if (fs.existsSync(local)) return [process.execPath, [local]];
  return [isWin ? 'npx.cmd' : 'npx', ['--yes', 'postject@1.0.0-alpha.6']];
})();
const args = [
  ...postjectCli[1], exe, 'NODE_SEA_BLOB', seaConfig.output,
  '--sentinel-fuse', 'NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2',
];
if (isMac) args.push('--macho-segment-name', 'NODE_SEA');
execFileSync(postjectCli[0], args, { stdio: 'inherit', shell: isWin });
if (isMac) execFileSync('codesign', ['--sign', '-', exe], { stdio: 'inherit' });

fs.rmSync(seaConfig.output, { force: true });
console.log(`SEA sidecar written to ${exe}`);
