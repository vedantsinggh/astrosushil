/**
 * pm2 process file for the Astro Sushil dev/showcase VM (1 GB RAM).
 *
 * deploy.sh copies this file to /opt/astro-sushil/app/ and runs
 *   pm2 startOrReload ecosystem.config.cjs && pm2 save
 * as the app user. Boot start-up is the pm2-<user> systemd unit that
 * setup.sh created with `pm2 startup`.
 *
 * Both processes run from apps/api so they read apps/api/.env
 * (a symlink to /opt/astro-sushil/shared/api.env). NODE_ENV is set here as
 * well; pm2's value wins because dotenv never overrides existing variables.
 *
 * Log rotation: setup.sh installs a system logrotate rule for ~/.pm2/logs
 * (or the pm2-logrotate module with --pm2-logrotate).
 */
const path = require('path');

const API_DIR = path.join(__dirname, 'apps', 'api');

const common = {
  cwd: API_DIR,
  exec_mode: 'fork',
  instances: 1, // never cluster on 1 GB: each instance is a full copy of the app
  autorestart: true,
  exp_backoff_restart_delay: 2000,
  max_restarts: 20,
  min_uptime: '30s',
  time: true, // timestamp each log line
  merge_logs: true,
  env: {
    NODE_ENV: 'development',
  },
};

module.exports = {
  apps: [
    {
      ...common,
      name: 'astro-api',
      script: 'dist/server.js',
      // Cap the V8 heap so GC runs before the VM starts swapping hard.
      node_args: '--max-old-space-size=256',
      // RSS limit for the Node process. Reports do not run here when
      // REPORT_INSTANT_EXECUTION=false (set in api.env by the kit).
      max_memory_restart: '350M',
      // Graceful shutdown (src/server.ts): stop claiming reports, release any
      // in-flight claim, close HTTP and the DB pool. 30 s is ample.
      kill_timeout: 30000,
      // The API calls process.send('ready') once it listens (and, in instant
      // mode, after start-up report recovery).
      wait_ready: true,
      listen_timeout: 30000,
    },
    {
      ...common,
      name: 'astro-worker',
      script: 'dist/worker.js',
      // The worker loop claims ONE job at a time (apps/api/src/worker.ts), so a
      // single worker process means report concurrency = 1. Do not scale it up
      // on this VM. xelatex runs as a child process and is not counted here.
      node_args: '--max-old-space-size=320',
      max_memory_restart: '450M',
      // On SIGTERM/SIGINT (pm2 restart / reload, deploy.sh) the worker stops
      // claiming, waits REPORT_SHUTDOWN_GRACE_MS (20 s in api.env) for the running
      // report, then releases its claim (back to QUEUED) so the new worker resumes
      // it at once. kill_timeout must stay above that grace period. If the worker
      // is killed hard (OOM, SIGKILL) the next start releases the claim of the
      // previous boot immediately, and other instances recover it after the 60 s
      // lease expires.
      kill_timeout: 30000,
      // worker.ts calls process.send('ready') after start-up recovery.
      wait_ready: true,
      listen_timeout: 30000,
    },
  ],
};
