import '@/config/timezone.ts'   // MUST be first — pins the process to UAE time (reload)
import 'dotenv/config'
import app from './app.ts'
import { env } from '@/config/env.ts'
import { connectDatabase, disconnectDatabase } from '@/config/database.ts'
import { logger } from '@/utils/logger.ts'
import { startReminderJobs } from '@/jobs/reminders.job.ts'
import { seedDefaultRoles } from '@/utils/seedRoles.ts'
import { UserModel } from '@/models/schema.ts'

async function bootstrap() {
  /* 1. Connect to MongoDB before accepting traffic */
  await connectDatabase()

  /* 1a. Ensure system roles exist (idempotent — skips existing) */
  await seedDefaultRoles()

  /* 1b-pre. Drop the old sparse unique index on stripeCheckoutSessionId so
     Razorpay orders (which have no Stripe session) can coexist in the collection.
     The schema now uses a partialFilterExpression instead. Idempotent — safe to run
     every boot; throws are swallowed if the index doesn't exist. */
  try {
    const { OrderModel } = await import('@/models/schema.ts')
    await OrderModel.collection.dropIndex('stripeCheckoutSessionId_1')
    await OrderModel.syncIndexes()
    logger.info('✅  Re-indexed orders: stripeCheckoutSessionId partial index applied')
  } catch {
    // Index already gone or collection doesn't exist yet — no action needed
  }

  /* 1b. Migrate legacy student accounts that predate the enrollmentStatus field */
  const migrated = await UserModel.updateMany(
    { role: 'student', enrollmentStatus: { $exists: false } },
    { $set: { enrollmentStatus: 'approved' } },
  )
  if (migrated.modifiedCount > 0) {
    logger.info(`✅  Migrated ${migrated.modifiedCount} legacy student(s) → enrollmentStatus: approved`)
  }

  /* 2. Start HTTP server.
     Under PM2 multi-instance load balancing, every fork inherits the SAME
     env PORT (base), so we derive a unique listen port per instance from
     NODE_APP_INSTANCE (0,1,2,…). This is deterministic and does NOT rely on
     PM2's `increment_var`, which is unreliable in fork mode.
       instance 0 → base+0 (4000), instance 1 → 4001, … matching nginx upstream.
     Single process / dev: NODE_APP_INSTANCE is unset → 0 → listens on base. */
  const instanceId = Number(process.env.NODE_APP_INSTANCE ?? 0)
  const listenPort = env.PORT + instanceId
  process.env.PORT = String(listenPort) // so /health reports the real port
  const server = app.listen(listenPort, () => {
    logger.info(`🚀  Server running on http://localhost:${listenPort} (instance ${instanceId})`)
    logger.info(`📡  API prefix: /api/v1`)
    logger.info(`🌍  Environment: ${env.NODE_ENV}`)
  })

  /* 3. Start cron jobs — ONLY on the primary instance.
     Under PM2 multi-instance load balancing, PM2 sets NODE_APP_INSTANCE
     (0,1,2,…) per fork. Running the scheduler on every instance would fire
     each reminder N times, so we pin it to instance 0. When unset (single
     process / dev), it defaults to '0' and jobs run normally. */
  if ((process.env.NODE_APP_INSTANCE ?? '0') === '0') {
    startReminderJobs()
    logger.info('⏰  Reminder cron jobs started (primary instance)')
  } else {
    logger.info(`⏸️   Reminder cron jobs skipped (instance ${process.env.NODE_APP_INSTANCE})`)
  }

  /* 4. Graceful shutdown */
  const shutdown = (signal: string) => {
    logger.info(`${signal} received — shutting down gracefully`)
    server.close(async () => {
      await disconnectDatabase()
      logger.info('HTTP server closed')
      process.exit(0)
    })
    /* Force exit after 10s if connections hang */
    setTimeout(() => {
      logger.error('Forced shutdown after timeout')
      process.exit(1)
    }, 10_000)
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT',  () => shutdown('SIGINT'))

  /* 5. Unhandled rejections */
  process.on('unhandledRejection', (reason) => {
    logger.error({ reason }, 'Unhandled promise rejection')
    // Don't exit — log and continue in prod
  })

  process.on('uncaughtException', (err) => {
    logger.fatal({ err }, 'Uncaught exception — exiting')
    process.exit(1)
  })
}

bootstrap()
