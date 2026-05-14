import type { Response } from 'express'
import { env } from '@/config/env.ts'
import type { TokenPair } from '@/types/index.ts'

/* ─────────────────────────────────────────────────────
   Auth cookie helpers
   ─────────────────────────────────────────────────────
   Access token  → `lms_at` cookie, ~15m, Path=/
   Refresh token → `lms_rt` cookie, ~30d, Path=/api/v1/auth
   Both httpOnly + SameSite=Lax. Secure flag only in
   production so dev over http://localhost still works.
───────────────────────────────────────────────────── */

export const ACCESS_COOKIE  = 'lms_at'
export const REFRESH_COOKIE = 'lms_rt'

const REFRESH_PATH = '/api/v1/auth'

const isProd = () => env.NODE_ENV === 'production'

function parseDurationMs(duration: string): number {
  const unit  = duration.slice(-1)
  const value = parseInt(duration.slice(0, -1), 10)
  switch (unit) {
    case 's': return value * 1_000
    case 'm': return value * 60_000
    case 'h': return value * 3_600_000
    case 'd': return value * 86_400_000
    default:  return 900_000
  }
}

export function setAuthCookies(res: Response, tokens: TokenPair): void {
  res.cookie(ACCESS_COOKIE, tokens.access_token, {
    httpOnly: true,
    secure:   isProd(),
    sameSite: 'lax',
    path:     '/',
    maxAge:   parseDurationMs(env.JWT_ACCESS_EXPIRES_IN),
  })
  res.cookie(REFRESH_COOKIE, tokens.refresh_token, {
    httpOnly: true,
    secure:   isProd(),
    sameSite: 'lax',
    path:     REFRESH_PATH,
    maxAge:   parseDurationMs(env.JWT_REFRESH_EXPIRES_IN),
  })
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie(ACCESS_COOKIE,  { path: '/' })
  res.clearCookie(REFRESH_COOKIE, { path: REFRESH_PATH })
}
