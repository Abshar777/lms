import rateLimit from 'express-rate-limit'
import { sendError } from '@/utils/response.ts'

/* ─── Auth endpoints (strict) ───────────────────────
   15 requests per 15 minutes per IP
───────────────────────────────────────────────────── */
export const authRateLimit = rateLimit({
  windowMs:         15 * 60 * 1000,
  max:              15,
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
