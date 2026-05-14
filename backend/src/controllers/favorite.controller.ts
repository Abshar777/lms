import type { Request, Response, NextFunction } from 'express'
import { FavoriteService } from '@/services/favorite.service.ts'
import { sendSuccess, buildPaginationMeta, parsePagination } from '@/utils/response.ts'

export class FavoriteController {
  private readonly service = new FavoriteService()

  add = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { courseId } = req.body as { courseId: string }
      const fav = await this.service.add(req.user!.id, courseId)
      sendSuccess(res, fav, 'Added to favorites', 201)
    } catch (err) { next(err) }
  }

  remove = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const courseId = String(req.params['courseId'] ?? '')
      const ok = await this.service.remove(req.user!.id, courseId)
      sendSuccess(res, { removed: ok }, ok ? 'Removed from favorites' : 'Was not favorited')
    } catch (err) { next(err) }
  }

  listMine = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { page, per_page } = parsePagination(req.query as Record<string, unknown>)
      const { docs, totalCount } = await this.service.listMine(req.user!.id, page, per_page)
      const meta = buildPaginationMeta(totalCount, page, per_page)
      sendSuccess(res, docs, undefined, 200, meta)
    } catch (err) { next(err) }
  }

  exists = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const courseId = String(req.params['courseId'] ?? '')
      sendSuccess(res, { favorited: await this.service.exists(req.user!.id, courseId) })
    } catch (err) { next(err) }
  }
}
