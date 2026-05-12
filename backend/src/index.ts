import 'dotenv/config'
import app from './app.ts'
import { env } from '@/config/env.ts'
import { connectDatabase, disconnectDatabase } from '@/config/database.ts'
import { logger } from '@/utils/logger.ts'

async function bootstrap() {
  /* 1. Connect to MongoDB before accepting traffic */
  await connectDatabase()

  /* 2. Start HTTP server */
  const server = app.listen(env.PORT, () => {
    logger.info(`🚀  Server running on http://localhost:${env.PORT}`)
    logger.info(`📡  API prefix: /api/v1`)
    logger.info(`🌍  Environment: ${env.NODE_ENV}`)
  })

  /* 3. Graceful shutdown */
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

  /* 4. Unhandled rejections */
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
