/**
 * PM2 ecosystem for Delta LMS — backend API only
 * ---------------------------------------------------------------------------
 * lms-backend → Express + Bun API (proxied by nginx → localhost:4000)
 *
 * Install deps first:
 *   cd backend && bun install
 *
 * Start / manage:
 *   pm2 start ecosystem.config.js
 *   pm2 save                 # persist across reboots
 *   pm2 startup              # generate the boot script (run once, follow its output)
 *   pm2 logs lms-backend
 *   pm2 reload ecosystem.config.js   # zero-downtime reload
 *
 * NOTE on Bun: PM2 runs the backend through the Bun interpreter. If PM2 can't
 * find `bun` on PATH, replace "bun" below with the absolute path from
 * `which bun` (commonly /root/.bun/bin/bun or ~/.bun/bin/bun).
 */
module.exports = {
  apps: [
    {
      name: 'lms-backend',
      cwd: './backend',
      script: 'src/index.ts',
      interpreter: 'bun', // ← absolute path if not on PATH, e.g. '/root/.bun/bin/bun'
      exec_mode: 'fork', // cluster mode is NOT supported with the Bun interpreter
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 4000, // must match `proxy_pass http://localhost:4000` in nginx
      },
      out_file: './logs/backend-out.log',
      error_file: './logs/backend-error.log',
      merge_logs: true,
      time: true,
    },
  ],
}
