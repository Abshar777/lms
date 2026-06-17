import type { Request, Response, NextFunction } from 'express'
import { verifyAccessToken } from '@/utils/jwt.ts'
import { sendError } from '@/utils/response.ts'
import { ACCESS_COOKIE, ADMIN_ACCESS_COOKIE } from '@/utils/authCookies.ts'
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
   authenticateAny
   ─────────────────────────────────────────────────────
   Accepts EITHER the client cookie (`lms_at`) or the admin
   cookie (`lms_admin_at`). Used by endpoints shared between
   the client and admin portals (e.g. support tickets, where
   both the ticket owner and an admin read/reply on the same
   resource).
───────────────────────────────────────────────────── */
export async function authenticateAny(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader  = req.headers['authorization']
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  const token = req.cookies?.[ADMIN_ACCESS_COOKIE] ?? req.cookies?.[ACCESS_COOKIE] ?? bearerToken

  if (!token) {
    sendError(res, 'MISSING_TOKEN', 'Authentication required', 401)
    return
  }

  try {
    const payload = await verifyAccessToken(token)
    req.user = { id: payload.sub!, email: payload.email, role: payload.role }
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

/* ─── Role hierarchy (highest to lowest) ───────────────
   super_admin > admin > 4x_admin / digital_marketing_admin > instructor > student
──────────────────────────────────────────────────── */
export const requireSuperAdmin = requireRole('super_admin')

/** Any admin-panel admin — super_admin or admin (full platform management) */
export const requireAdmin      = requireRole('super_admin', 'admin')

/** Category admins + above */
export const requireAnyAdmin   = requireRole('super_admin', 'admin', '4x_admin', 'digital_marketing_admin')

/** Teaching staff + above */
export const requireInstructor = requireRole('super_admin', 'admin', '4x_admin', 'digital_marketing_admin', 'instructor')

/** Any authenticated user */
export const requireStudent    = requireRole('super_admin', 'admin', '4x_admin', 'digital_marketing_admin', 'instructor', 'student')

/* ─────────────────────────────────────────────────────
   authenticateAdmin
   ─────────────────────────────────────────────────────
   Same as authenticate but reads from the admin-portal
   cookie `lms_admin_at` so admin and client sessions are
   fully independent on the same browser.
───────────────────────────────────────────────────── */
export async function authenticateAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const cookieToken = req.cookies?.[ADMIN_ACCESS_COOKIE]
  const authHeader  = req.headers['authorization']
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

  // Bearer takes priority: an explicit Authorization header (used for impersonation)
  // overrides the session cookie so the caller identity is whoever the token says.
  const token = bearerToken ?? cookieToken

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
   optionalAuthenticate
   ─────────────────────────────────────────────────────
   Like authenticate but never rejects the request.
   Sets req.user when a valid token is present;
   leaves req.user undefined otherwise.
   Use on public endpoints that want to personalise
   their response when the caller happens to be logged in.
───────────────────────────────────────────────────── */
export async function injectCategoryScope(req: Request, _res: Response, next: NextFunction): Promise<void> {
  if (!req.user) { next(); return }
  if (req.user.role === '4x_admin')                     req.user.categoryScope = '4x-trading'
  else if (req.user.role === 'digital_marketing_admin') req.user.categoryScope = 'digital-marketing'
  else if (req.user.role === 'instructor') {
    const { UserModel } = await import('@/models/schema.ts')
    const user = await UserModel.findById(req.user.id).select('category').lean()
    const cat  = (user as any)?.category as string | undefined
    if (cat === '4x-trading' || cat === 'digital-marketing') req.user.categoryScope = cat
  }
  next()
}

/* ─────────────────────────────────────────────────────
   requireEnrollmentApproval
   ─────────────────────────────────────────────────────
   For student-facing endpoints that require the student
   to have been approved by an admin (when they signed up
   with a program category).

   Non-students always pass through.
   Students with no category always pass through.
   Students with a category must have enrollmentStatus === 'approved'.
───────────────────────────────────────────────────── */
export async function requireEnrollmentApproval(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  if (!req.user || req.user.role !== 'student') { next(); return }

  const { UserModel } = await import('@/models/schema.ts')
  const user = await UserModel.findById(req.user.id)
    .select('category enrollmentStatus enrollmentCancellationReason').lean()

  if (!user || !user.category) { next(); return }

  if (user.enrollmentStatus === 'pending') {
    res.status(403).json({
      success: false,
      error: {
        code:    'PENDING_APPROVAL',
        message: 'Your account is pending admin approval. You can browse courses but cannot access sessions yet.',
      },
    }); return
  }

  if (user.enrollmentStatus === 'cancelled') {
    res.status(403).json({
      success: false,
      error: {
        code:    'ACCESS_CANCELLED',
        message: 'Your access has been cancelled by an admin.',
        reason:  user.enrollmentCancellationReason ?? '',
      },
    }); return
  }

  next()
}

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
