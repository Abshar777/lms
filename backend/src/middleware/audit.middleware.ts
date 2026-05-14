import type { Request, Response, NextFunction } from 'express'
import { AuditLogRepository } from '@/repositories/auditlog.repository.ts'
import { logger } from '@/utils/logger.ts'
import type { AuditAction } from '@/models/schema.ts'

const auditRepo = new AuditLogRepository()

/**
 * Returns an Express middleware that writes an audit log entry AFTER
 * the response is sent (fire-and-forget, never blocks the request).
 *
 * Usage:
 *   router.delete('/:id', authenticate, requireAdmin, audit('course.delete', 'Course', r => r.params['id']), handler)
 */
export function audit(
  action:       AuditAction,
  entity:       string,
  getEntityId?: (req: Request) => string | undefined,
  getMeta?:     (req: Request) => Record<string, unknown>,
) {
  return (_req: Request, res: Response, next: NextFunction) => {
    res.on('finish', () => {
      /* Only log on successful mutating responses (2xx) */
      if (res.statusCode < 200 || res.statusCode >= 300) return
      const user = _req.user
      if (!user) return

      void auditRepo.create({
        actorId:    user.id,
        actorEmail: user.email,
        actorRole:  user.role,
        action,
        entity,
        entityId:   getEntityId?.(_req),
        meta:       getMeta?.(_req),
        ip:         (_req.ip ?? _req.socket?.remoteAddress) || undefined,
        userAgent:  _req.headers['user-agent'] || undefined,
      }).catch(err => logger.warn({ err }, 'audit log write failed'))
    })
    next()
  }
}
