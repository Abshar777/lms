import rateLimit from 'express-rate-limit'
import { sendError } from '@/utils/response.ts'

const isDev = process.env.NODE_ENV !== 'production'

/* ─── Auth endpoints ─────────────────────────────────
   Production: 15 requests per 15 minutes per IP
   Development: 200 / 15min so dev iteration isn't blocked
───────────────────────────────────────────────────── */
export const authRateLimit = rateLimit({
  windowMs:         15 * 60 * 1000,
  max:              isDev ? 200 : 15,
  standardHeaders:  true,
  legacyHeaders:    false,
  handler: (_req, res) => {
    sendError(res, 'RATE_LIMITED', 'Too many requests. Please try again in 15 minutes.', 429)
  },
})

/* ─── General API (relaxed) ─────────────────────────
   100 requests per minute per IP
───────────────────────────────────────────────────── */
export const apiRateLimit = rateLimit({
  windowMs:         60 * 1000,
  max:              100,
  standardHeaders:  true,
  legacyHeaders:    false,
  handler: (_req, res) => {
    sendError(res, 'RATE_LIMITED', 'Too many requests. Please slow down.', 429)
  },
})

/* ─── Search endpoints (moderate) ───────────────────
   30 requests per minute per IP
───────────────────────────────────────────────────── */
export const searchRateLimit = rateLimit({
  windowMs:        60 * 1000,
  max:             30,
  standardHeaders: true,
  legacyHeaders:   false,
  handler: (_req, res) => {
    sendError(res, 'RATE_LIMITED', 'Search rate limit exceeded.', 429)
  },
})
