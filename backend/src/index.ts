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

  /* 2. Start HTTP server */
  const server = app.listen(env.PORT, () => {
    logger.info(`🚀  Server running on http://localhost:${env.PORT}`)
    logger.info(`📡  API prefix: /api/v1`)
    logger.info(`🌍  Environment: ${env.NODE_ENV}`)
  })

  /* 3. Start cron jobs */
  startReminderJobs()

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
