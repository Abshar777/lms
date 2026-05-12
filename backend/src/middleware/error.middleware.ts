import type { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'
import { logger } from '@/utils/logger.ts'
import { sendError } from '@/utils/response.ts'
import { AuthError } from '@/services/auth.service.ts'

/* ─────────────────────────────────────────────────────
   Global error handler
   ─────────────────────────────────────────────────────
   Must be registered LAST (after all routes) with 4 args.
   Catches all errors thrown/passed to next(err).
───────────────────────────────────────────────────── */
export function errorMiddleware(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  /* ── Domain errors (auth, business logic) ──────── */
  if (err instanceof AuthError) {
    sendError(res, err.code, err.message, err.statusCode)
    return
  }

  /* ── Zod validation errors (from service layer) ── */
  if (err instanceof ZodError) {
    sendError(res, 'VALIDATION_ERROR', 'Validation failed', 422, err.issues)
    return
  }

  /* ── CORS errors ───────────────────────────────── */
  if (err instanceof Error && err.message.startsWith('CORS:')) {
    sendError(res, 'CORS_ERROR', err.message, 403)
    return
  }

  /* ── Unknown errors ────────────────────────────── */
  logger.error(
    {
      err,
      method: req.method,
      url:    req.url,
      ip:     req.ip,
    },
    'Unhandled error',
  )

  const isDev = process.env.NODE_ENV === 'development'
  sendError(
    res,
    'INTERNAL_ERROR',
    isDev && err instanceof Error ? err.message : 'An unexpected error occurred',
    500,
    isDev && err instanceof Error ? err.stack : undefined,
  )
}

/* ─── 404 handler ───────────────────────────────────
   Register before errorMiddleware to catch unknown routes
───────────────────────────────────────────────────── */
export function notFoundMiddleware(req: Request, res: Response): void {
  sendError(res, 'NOT_FOUND', `Route ${req.method} ${req.path} not found`, 404)
}
