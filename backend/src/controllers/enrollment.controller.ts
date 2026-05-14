import type { Request, Response, NextFunction } from 'express'
import { EnrollmentService } from '@/services/enrollment.service.ts'
import { sendSuccess } from '@/utils/response.ts'

export class EnrollmentController {
  private readonly service = new EnrollmentService()

  enroll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { courseId } = req.body as { courseId: string }
      const { enrollment, created } = await this.service.enroll(req.user!.id, courseId)
      sendSuccess(
        res,
        { enrollment },
        created ? 'Enrolled successfully' : 'Already enrolled',
        created ? 201 : 200,
      )
    } catch (err) {
      next(err)
    }
  }

  listMine = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const docs = await this.service.listMine(req.user!.id)
      sendSuccess(res, docs)
    } catch (err) {
      next(err)
    }
  }

  getCourseProgress = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const slug = String(req.params['slug'] ?? '')
      const data = await this.service.getCourseProgress(req.user!.id, slug)
      sendSuccess(res, data)
    } catch (err) {
      next(err)
    }
  }

  myActivity = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const limit = Math.min(Number(req.query['limit'] ?? 8), 30)
      const data  = await this.service.getMyActivity(req.user!.id, limit)
      sendSuccess(res, data)
    } catch (err) {
      next(err)
    }
  }
}
