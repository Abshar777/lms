import mongoose from 'mongoose'
import { env } from './env.ts'
import { logger } from '@/utils/logger.ts'

/* ─────────────────────────────────────────────────────
   MongoDB connection via Mongoose
   ─────────────────────────────────────────────────────
   Mongoose manages an internal connection pool.
   All models share this single connection — no db
   instance needs to be passed around.
───────────────────────────────────────────────────── */

mongoose.set('strictQuery', true)

/* ── Event listeners ────────────────────────────────── */
mongoose.connection.on('connected', () =>
  logger.info('✅  MongoDB connected'),
)
mongoose.connection.on('error', err =>
  logger.error({ err }, '❌  MongoDB connection error'),
)
mongoose.connection.on('disconnected', () =>
  logger.warn('⚠️   MongoDB disconnected'),
)

/* ── Connect ────────────────────────────────────────── */
export async function connectDatabase(): Promise<void> {
  try {
    await mongoose.connect(env.DATABASE_URL, {
      maxPoolSize:       10,
      serverSelectionTimeoutMS: 5_000,
      socketTimeoutMS:   45_000,
      connectTimeoutMS:  10_000,
      authSource: "admin"
    })
  } catch (err) {
    logger.error({ err }, '❌  Failed to connect to MongoDB')
    process.exit(1)
  }
}

/* ── Graceful disconnect (called on shutdown) ───────── */
export async function disconnectDatabase(): Promise<void> {
  await mongoose.connection.close()
  logger.info('MongoDB connection closed')
}
