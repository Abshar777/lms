import type { Request, Response, NextFunction } from 'express'
import { verifyAccessToken } from '@/utils/jwt.ts'
import { sendError } from '@/utils/response.ts'
import { ACCESS_COOKIE } from '@/utils/authCookies.ts'
import type { UserRole } from '@/types/index.ts'

/* ─────────────────────────────────────────────────────
   authenticate
   ─────────────────────────────────────────────────────
   Reads the access token from the `lms_at` httpOnly
   cookie. Falls back to `Authorization: Bearer` for
   non-browser clients (CLI, mobile). Attaches decoded
   user to req.user on success.
───────────────────────────────────────────────────── */
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const cookieToken = req.cookies?.[ACCESS_COOKIE]
  const authHeader  = req.headers['authorization']
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

  const token = cookieToken ?? bearerToken

  if (!token) {
    sendError(res, 'MISSING_TOKEN', 'Authentication required', 401)
    return
  }

  try {
    const payload = await verifyAccessToken(token)
    req.user = {
      id:    payload.sub!,
      email: payload.email,
      role:  payload.role,
    }
    next()
  } catch (err: any) {
    const isExpired = err?.code === 'ERR_JWT_EXPIRED'
    sendError(
      res,
      isExpired ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN',
      isExpired ? 'Access token expired' : 'Invalid access token',
      401,
    )
  }
}

/* ─────────────────────────────────────────────────────
   requireRole(...roles)
   ─────────────────────────────────────────────────────
   Authorization guard — must come AFTER authenticate.
───────────────────────────────────────────────────── */
export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, 'UNAUTHORIZED', 'Authentication required', 401)
      return
    }
    if (!roles.includes(req.user.role)) {
      sendError(
        res,
        'FORBIDDEN',
        `Access restricted to: ${roles.join(', ')}`,
        403,
      )
      return
    }
    next()
  }
}

/* ─── Convenience guards ────────────────────────────── */
export const requireAdmin      = requireRole('admin')
export const requireInstructor = requireRole('instructor', 'admin')
export const requireStudent    = requireRole('student', 'instructor', 'admin')

/* ─────────────────────────────────────────────────────
   optionalAuthenticate
   ─────────────────────────────────────────────────────
   Like authenticate but never rejects the request.
   Sets req.user when a valid token is present;
   leaves req.user undefined otherwise.
   Use on public endpoints that want to personalise
   their response when the caller happens to be logged in.
───────────────────────────────────────────────────── */
export async function optionalAuthenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const cookieToken = req.cookies?.[ACCESS_COOKIE]
  const authHeader  = req.headers['authorization']
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  const token       = cookieToken ?? bearerToken

  if (token) {
    try {
      const payload = await verifyAccessToken(token)
      req.user = {
        id:    payload.sub!,
        email: payload.email,
        role:  payload.role,
      }
    } catch {
      /* expired / invalid — treat as unauthenticated */
    }
  }

  next()
}
