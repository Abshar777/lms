import type { Request, Response, NextFunction } from 'express'
import { NotificationService } from '@/services/notification.service.ts'
import { sendSuccess, buildPaginationMeta, parsePagination } from '@/utils/response.ts'

export class NotificationController {
  private readonly service = new NotificationService()

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { page, per_page } = parsePagination(req.query as Record<string, unknown>)
      const unreadOnly = req.query['unread'] === 'true'
      const { docs, totalCount, unreadCount } = await this.service.list(req.user!.id, {
        page, perPage: per_page, unreadOnly,
      })
      const meta = buildPaginationMeta(totalCount, page, per_page)
      sendSuccess(res, { items: docs, unreadCount }, undefined, 200, meta)
    } catch (err) { next(err) }
  }

  unreadCount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      sendSuccess(res, { unreadCount: await this.service.unreadCount(req.user!.id) })
    } catch (err) { next(err) }
  }

  markRead = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const n = await this.service.markRead(req.user!.id, String(req.params['id'] ?? ''))
      sendSuccess(res, n, 'Marked as read')
    } catch (err) { next(err) }
  }

  markAllRead = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      sendSuccess(res, await this.service.markAllRead(req.user!.id), 'All notifications marked read')
    } catch (err) { next(err) }
  }
}
