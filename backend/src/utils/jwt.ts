import { SignJWT, jwtVerify, type JWTPayload } from 'jose'
import { randomBytes } from 'crypto'
import { env } from '@/config/env.ts'
import type { AccessTokenPayload, RefreshTokenPayload, TokenPair, UserRole } from '@/types/index.ts'

/* Random JWT ID — guarantees two tokens issued in the same second
   still produce different signatures, so tokenHash stays unique. */
function newJti(): string {
  return randomBytes(16).toString('hex')
}

/* ─── Key helpers ───────────────────────────────────
   jose uses TextEncoder for HMAC keys
───────────────────────────────────────────────────── */
const accessKey  = new TextEncoder().encode(env.JWT_ACCESS_SECRET)
const refreshKey = new TextEncoder().encode(env.JWT_REFRESH_SECRET)

/* ─── Duration → seconds ────────────────────────────
   Converts '15m', '30d', '1h' → seconds for expires_in field
───────────────────────────────────────────────────── */
function durationToSeconds(duration: string): number {
  const unit  = duration.slice(-1)
  const value = parseInt(duration.slice(0, -1), 10)
  switch (unit) {
    case 's': return value
    case 'm': return value * 60
    case 'h': return value * 3600
    case 'd': return value * 86400
    default:  return 900  // fallback: 15m
  }
}

/* ─── Sign access token ─────────────────────────────
   Short-lived (default 15m), carries role + email
───────────────────────────────────────────────────── */
export async function signAccessToken(payload: {
  id: string
  email: string
  role: UserRole
}): Promise<string> {
  return new SignJWT({
    email: payload.email,
    role:  payload.role,
    type:  'access',
  } satisfies Omit<AccessTokenPayload, 'sub'>)
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.id)
    .setJti(newJti())
    .setIssuedAt()
    .setExpirationTime(env.JWT_ACCESS_EXPIRES_IN)
    .sign(accessKey)
}

/* ─── Sign refresh token ────────────────────────────
   Long-lived (default 30d), only carries sub
───────────────────────────────────────────────────── */
export async function signRefreshToken(userId: string): Promise<string> {
  return new SignJWT({ type: 'refresh' } satisfies Omit<RefreshTokenPayload, 'sub'>)
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setJti(newJti())
    .setIssuedAt()
    .setExpirationTime(env.JWT_REFRESH_EXPIRES_IN)
    .sign(refreshKey)
}

/* ─── Generate token pair ───────────────────────────
   Convenience: returns both tokens + expiry seconds
───────────────────────────────────────────────────── */
export async function generateTokenPair(payload: {
  id: string
  email: string
  role: UserRole
}): Promise<TokenPair> {
  const [access_token, refresh_token] = await Promise.all([
    signAccessToken(payload),
    signRefreshToken(payload.id),
  ])
  return {
    access_token,
    refresh_token,
    expires_in: durationToSeconds(env.JWT_ACCESS_EXPIRES_IN),
  }
}

/* ─── Verify access token ───────────────────────────
   Returns typed payload or throws
───────────────────────────────────────────────────── */
export async function verifyAccessToken(
  token: string,
): Promise<AccessTokenPayload & JWTPayload> {
  const { payload } = await jwtVerify(token, accessKey)
  if (payload['type'] !== 'access') {
    throw new Error('Invalid token type')
  }
  return payload as AccessTokenPayload & JWTPayload
}

/* ─── Verify refresh token ──────────────────────────
   Returns typed payload or throws
───────────────────────────────────────────────────── */
export async function verifyRefreshToken(
  token: string,
): Promise<RefreshTokenPayload & JWTPayload> {
  const { payload } = await jwtVerify(token, refreshKey)
  if (payload['type'] !== 'refresh') {
    throw new Error('Invalid token type')
  }
  return payload as RefreshTokenPayload & JWTPayload
}
