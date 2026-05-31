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

export const ADMIN_ACCESS_COOKIE  = 'lms_admin_at'
export const ADMIN_REFRESH_COOKIE = 'lms_admin_rt'

const REFRESH_PATH       = '/api/v1/auth'
const ADMIN_REFRESH_PATH = '/api/v1/admin/auth'

const isProd = () => env.NODE_ENV === 'production'

/* Shared cookie domain in production so lms_at is readable by all
   *.deltainstitutions.com subdomains (admin, client, api).
   In development leave undefined so localhost cookies work normally. */
const cookieDomain = () => isProd() ? '.deltainstitutions.com' : undefined

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
    domain:   cookieDomain(),
    path:     '/',
    maxAge:   parseDurationMs(env.JWT_ACCESS_EXPIRES_IN),
  })
  res.cookie(REFRESH_COOKIE, tokens.refresh_token, {
    httpOnly: true,
    secure:   isProd(),
    sameSite: 'lax',
    domain:   cookieDomain(),
    path:     REFRESH_PATH,
    maxAge:   parseDurationMs(env.JWT_REFRESH_EXPIRES_IN),
  })
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie(ACCESS_COOKIE,  { path: '/',          domain: cookieDomain() })
  res.clearCookie(REFRESH_COOKIE, { path: REFRESH_PATH, domain: cookieDomain() })
}

/* ── Admin-portal cookies (lms_admin_at / lms_admin_rt) ─────────────────
   Completely separate from client cookies so both portals can maintain
   independent sessions on the same browser simultaneously.
──────────────────────────────────────────────────────────────────────── */
export function setAdminAuthCookies(res: Response, tokens: TokenPair): void {
  res.cookie(ADMIN_ACCESS_COOKIE, tokens.access_token, {
    httpOnly: true,
    secure:   isProd(),
    sameSite: 'lax',
    domain:   cookieDomain(),
    path:     '/',
    maxAge:   parseDurationMs(env.JWT_ACCESS_EXPIRES_IN),
  })
  res.cookie(ADMIN_REFRESH_COOKIE, tokens.refresh_token, {
    httpOnly: true,
    secure:   isProd(),
    sameSite: 'lax',
    domain:   cookieDomain(),
    path:     ADMIN_REFRESH_PATH,
    maxAge:   parseDurationMs(env.JWT_REFRESH_EXPIRES_IN),
  })
}

export function clearAdminAuthCookies(res: Response): void {
  res.clearCookie(ADMIN_ACCESS_COOKIE,  { path: '/',               domain: cookieDomain() })
  res.clearCookie(ADMIN_REFRESH_COOKIE, { path: ADMIN_REFRESH_PATH, domain: cookieDomain() })
}
