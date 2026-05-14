import type { Request, Response, NextFunction } from 'express'
import { ReviewService } from '@/services/review.service.ts'
import { sendSuccess, buildPaginationMeta, parsePagination } from '@/utils/response.ts'

export class ReviewController {
  private readonly service = new ReviewService()

  submit = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const courseId = String(req.params['id'] ?? '')
      const { rating, comment } = req.body as { rating: number; comment?: string }
      const review = await this.service.submit(req.user!.id, courseId, { rating, comment })
      sendSuccess(res, { review }, 'Review saved')
    } catch (err) {
      next(err)
    }
  }

  listForCourse = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const courseId = String(req.params['id'] ?? '')
      const { page, per_page } = parsePagination(req.query as Record<string, unknown>)
      const { docs, totalCount } = await this.service.listForCourse(courseId, page, per_page)
      const meta = buildPaginationMeta(totalCount, page, per_page)
      sendSuccess(res, docs, undefined, 200, meta)
    } catch (err) {
      next(err)
    }
  }

  deleteOwn = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const reviewId = String(req.params['id'] ?? '')
      await this.service.deleteOwn(req.user!.id, reviewId)
      sendSuccess(res, null, 'Review deleted')
    } catch (err) {
      next(err)
    }
  }
}
