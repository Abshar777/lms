import type { Request, Response, NextFunction } from 'express'
import { ProgressService } from '@/services/progress.service.ts'
import { sendSuccess } from '@/utils/response.ts'

export class ProgressController {
  private readonly service = new ProgressService()

  markComplete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const lessonId = String(req.params['id'] ?? '')
      const result = await this.service.markComplete(req.user!.id, lessonId)
      sendSuccess(res, result, 'Lesson marked complete')
    } catch (err) {
      next(err)
    }
  }

  recordWatchTime = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const lessonId = String(req.params['id'] ?? '')
      const { secs } = req.body as { secs: number }
      await this.service.recordWatchTime(req.user!.id, lessonId, secs)
      sendSuccess(res, null)
    } catch (err) {
      next(err)
    }
  }

  myLessonProgress = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const lessonId = String(req.params['id'] ?? '')
      const data = await this.service.getMyLessonProgress(req.user!.id, lessonId)
      sendSuccess(res, data)
    } catch (err) {
      next(err)
    }
  }
}
