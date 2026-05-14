import type { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'
import { logger } from '@/utils/logger.ts'
import { sendError } from '@/utils/response.ts'
import { AuthError } from '@/services/auth.service.ts'
import { CourseError } from '@/services/course.service.ts'
import { EnrollmentError } from '@/services/enrollment.service.ts'
import { ReviewError } from '@/services/review.service.ts'
import { CategoryError } from '@/services/category.service.ts'
import { LiveClassError } from '@/services/liveClass.service.ts'
import { NotificationError } from '@/services/notification.service.ts'
import { FavoriteError } from '@/services/favorite.service.ts'
import { OutlineError } from '@/services/section.service.ts'
import { UserError } from '@/services/user.service.ts'
import { QuizError } from '@/services/quiz.service.ts'
import { AssignmentError } from '@/services/assignment.service.ts'
import { CertificateError } from '@/services/certificate.service.ts'
import { OrderError } from '@/services/order.service.ts'
import { CouponError } from '@/services/coupon.service.ts'
import { DiscussionError } from '@/services/discussion.service.ts'
import { NoteError } from '@/services/note.service.ts'
import { BookmarkError } from '@/services/bookmark.service.ts'
import { LearningPathError } from '@/services/learningpath.service.ts'
import { AIError } from '@/services/ai.service.ts'

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
  if (err instanceof CourseError) {
    sendError(res, err.code, err.message, err.statusCode)
    return
  }
  if (err instanceof EnrollmentError) {
    sendError(res, err.code, err.message, err.statusCode)
    return
  }
  if (err instanceof ReviewError) {
    sendError(res, err.code, err.message, err.statusCode)
    return
  }
  if (err instanceof CategoryError) {
    sendError(res, err.code, err.message, err.statusCode)
    return
  }
  if (err instanceof LiveClassError) {
    sendError(res, err.code, err.message, err.statusCode)
    return
  }
  if (err instanceof NotificationError) {
    sendError(res, err.code, err.message, err.statusCode)
    return
  }
  if (err instanceof FavoriteError) {
    sendError(res, err.code, err.message, err.statusCode)
    return
  }
  if (err instanceof OutlineError) {
    sendError(res, err.code, err.message, err.statusCode)
    return
  }
  if (err instanceof UserError) {
    sendError(res, err.code, err.message, err.statusCode)
    return
  }
  if (err instanceof QuizError) {
    sendError(res, err.code, err.message, err.statusCode)
    return
  }
  if (err instanceof AssignmentError) {
    sendError(res, err.code, err.message, err.statusCode)
    return
  }
  if (err instanceof CertificateError) {
    sendError(res, err.code, err.message, err.statusCode)
    return
  }
  if (err instanceof OrderError) {
    sendError(res, err.code, err.message, err.statusCode)
    return
  }
  if (err instanceof DiscussionError) {
    sendError(res, err.code, err.message, err.statusCode)
    return
  }
  if (err instanceof NoteError) {
    sendError(res, err.code, err.message, err.statusCode)
    return
  }
  if (err instanceof BookmarkError) {
    sendError(res, err.code, err.message, err.statusCode)
    return
  }
  if (err instanceof LearningPathError) {
    sendError(res, err.code, err.message, err.statusCode)
    return
  }
  if (err instanceof CouponError) {
    sendError(res, err.code, err.message, err.statusCode)
    return
  }
  if (err instanceof AIError) {
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
