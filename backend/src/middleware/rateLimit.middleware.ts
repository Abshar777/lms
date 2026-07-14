import rateLimit from 'express-rate-limit'
import { sendError } from '@/utils/response.ts'

const isDev = process.env.NODE_ENV !== 'production'

/* Read a positive integer from env, falling back to a default. */
const envInt = (key: string, fallback: number): number => {
  const v = Number(process.env[key])
  return Number.isFinite(v) && v > 0 ? v : fallback
}

/* Global kill switch for load testing.
   Set DISABLE_RATE_LIMIT=true (then reload) to bypass ALL limiters, so a
   load test from a single IP isn't throttled. Remember to unset afterwards. */
const rateLimitDisabled = () => process.env.DISABLE_RATE_LIMIT === 'true'

/* ─── Auth endpoints ─────────────────────────────────
   Production: 15 requests per 15 minutes per IP  (override: RATE_LIMIT_AUTH_MAX)
   Development: 200 / 15min so dev iteration isn't blocked
───────────────────────────────────────────────────── */
export const authRateLimit = rateLimit({
  windowMs:         15 * 60 * 1000,
  max:              envInt('RATE_LIMIT_AUTH_MAX', isDev ? 200 : 15),
  standardHeaders:  true,
  legacyHeaders:    false,
  skip:             rateLimitDisabled,
  handler: (_req, res) => {
    sendError(res, 'RATE_LIMITED', 'Too many requests. Please try again in 15 minutes.', 429)
  },
})

/* ─── General API (relaxed) ─────────────────────────
   100 requests per minute per IP  (override: RATE_LIMIT_API_MAX)
───────────────────────────────────────────────────── */
export const apiRateLimit = rateLimit({
  windowMs:         60 * 1000,
  max:              envInt('RATE_LIMIT_API_MAX', 100),
  standardHeaders:  true,
  legacyHeaders:    false,
  skip:             rateLimitDisabled,
  handler: (_req, res) => {
    sendError(res, 'RATE_LIMITED', 'Too many requests. Please slow down.', 429)
  },
})

/* ─── Search endpoints (moderate) ───────────────────
   30 requests per minute per IP  (override: RATE_LIMIT_SEARCH_MAX)
───────────────────────────────────────────────────── */
export const searchRateLimit = rateLimit({
  windowMs:        60 * 1000,
  max:             envInt('RATE_LIMIT_SEARCH_MAX', 30),
  standardHeaders: true,
  legacyHeaders:   false,
  skip:            rateLimitDisabled,
  handler: (_req, res) => {
    sendError(res, 'RATE_LIMITED', 'Search rate limit exceeded.', 429)
  },
})
