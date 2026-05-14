import { Router, type Request, type Response, type NextFunction } from 'express'
import { authenticate, requireRole } from '@/middleware/auth.middleware.ts'
import { sendSuccess, parsePagination, buildPaginationMeta } from '@/utils/response.ts'
import { AuditLogRepository } from '@/repositories/auditlog.repository.ts'

const router = Router()
const repo   = new AuditLogRepository()

/* GET /audit-logs — admin only */
router.get(
  '/',
  authenticate,
  requireRole('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page, per_page } = parsePagination(req.query as Record<string, unknown>)
      const q = req.query as Record<string, string | undefined>
      const { docs, totalCount } = await repo.list(page, per_page, {
        actorId: q['actorId'],
        action:  q['action'],
        entity:  q['entity'],
      })
      sendSuccess(res, docs, undefined, 200, buildPaginationMeta(totalCount, page, per_page))
    } catch (err) {
      next(err)
    }
  },
)

export default router
