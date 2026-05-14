import type { Request, Response, NextFunction } from 'express'
import { TranscriptService } from '@/services/transcript.service.ts'
import { sendSuccess } from '@/utils/response.ts'

export class TranscriptController {
  private readonly svc = new TranscriptService()

  /* GET /lessons/:id/transcript — authenticated, enrolled */
  get = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const lessonId = String(req.params['id'] ?? '')
      const transcript = await this.svc.get(lessonId)
      sendSuccess(res, { transcript })
    } catch (err) { next(err) }
  }

  /* PATCH /admin/lessons/:id/transcript — admin / instructor */
  save = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const lessonId = String(req.params['id'] ?? '')
      const text     = String((req.body as { transcript?: unknown }).transcript ?? '')
      await this.svc.save(lessonId, text)
      sendSuccess(res, { saved: true })
    } catch (err) { next(err) }
  }

  /* POST /admin/lessons/:id/generate-transcript — admin / instructor */
  generate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const lessonId  = String(req.params['id'] ?? '')
      const transcript = await this.svc.generate(lessonId)
      sendSuccess(res, { transcript }, undefined, 201)
    } catch (err) { next(err) }
  }
}
