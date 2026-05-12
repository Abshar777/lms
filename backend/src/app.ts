import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { corsOptions } from '@/config/cors.ts'
import { errorMiddleware, notFoundMiddleware } from '@/middleware/error.middleware.ts'
import { logger } from '@/utils/logger.ts'
import apiRouter from '@/routes/index.ts'

const app = express()

/* ─── Trust proxy (for correct IP behind reverse proxy) */
app.set('trust proxy', 1)

/* ─── Security headers ───────────────────────────── */
app.disable('x-powered-by')
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('X-XSS-Protection', '1; mode=block')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  next()
})

/* ─── CORS ───────────────────────────────────────── */
app.use(cors(corsOptions))
app.options('*', cors(corsOptions))

/* ─── Body parsers ───────────────────────────────── */
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

/* ─── Request logging (dev only) ─────────────────── */
if (process.env.NODE_ENV === 'development') {
  app.use((req, _res, next) => {
    logger.debug(`${req.method} ${req.path}`)
    next()
  })
}

/* ─── API routes ─────────────────────────────────── */
app.use('/api/v1', apiRouter)

/* ─── 404 + error handlers ───────────────────────── */
app.use(notFoundMiddleware)
app.use(errorMiddleware)

export default app
