/**
 * PM2 ecosystem for Delta LMS — backend API (load-balanced)
 * ---------------------------------------------------------------------------
 * Runs N Bun fork instances on consecutive ports starting at 4000:
 *   instance 0 → :4000   (also runs the reminder cron jobs)
 *   instance 1 → :4001
 *   instance 2 → :4002
 *   instance 3 → :4003
 *
 * nginx `upstream` (see nginx.lms.conf) round-robins across those ports.
 * Bun does NOT support PM2 cluster mode, so we use `fork` + `increment_var`.
 *
 * Install deps first:  cd backend && bun install
 *
 * Start / manage:
 *   pm2 start ecosystem.config.js
 *   pm2 save && pm2 startup
 *   pm2 reload ecosystem.config.js   # zero-downtime rolling reload
 *   pm2 logs lms-backend
 *
 * Tune `instances` to your CPU core count (leave 1 core for nginx + mongo).
 * If PM2 can't find `bun`, set interpreter to the absolute path (`which bun`).
 */
module.exports = {
  apps: [
    {
      name: 'lms-backend',
      cwd: './backend',
      script: 'src/index.ts',
      interpreter: 'bun', // ← absolute path if not on PATH, e.g. '/root/.bun/bin/bun'
      exec_mode: 'fork', // cluster mode is NOT supported with the Bun interpreter
      instances: 4, // ← set to (CPU cores - 1)
      // NOTE: no `increment_var` — the app derives its listen port from
      // NODE_APP_INSTANCE (see backend/src/index.ts). All forks share PORT=4000
      // as the BASE; instance N listens on 4000+N (4000..4003). Matches nginx upstream.
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      kill_timeout: 10000, // give in-flight requests 10s to drain on reload (matches graceful shutdown)
      env: {
        NODE_ENV: 'production',
        PORT: 4000, // base port; incremented per instance
      },
      out_file: './logs/backend-out.log',
      error_file: './logs/backend-error.log',
      merge_logs: true,
      time: true,
    },
  ],
}
