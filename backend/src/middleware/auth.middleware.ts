import type { Request, Response, NextFunction } from 'express'
import { verifyAccessToken } from '@/utils/jwt.ts'
import { sendError } from '@/utils/response.ts'
import type { UserRole } from '@/types/index.ts'

/* ─────────────────────────────────────────────────────
   authenticate
   ─────────────────────────────────────────────────────
   Verifies Bearer token from Authorization header.
   Attaches decoded user to req.user on success.
───────────────────────────────────────────────────── */
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers['authorization']

  if (!authHeader?.startsWith('Bearer ')) {
    sendError(res, 'MISSING_TOKEN', 'Authorization header is required', 401)
    return
  }

  const token = authHeader.slice(7)

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

   Usage:
     router.delete('/course/:id',
       authenticate,
       requireRole('admin', 'instructor'),
       courseController.delete
     )
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
