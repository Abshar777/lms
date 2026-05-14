import { Router, type Request, type Response, type NextFunction } from 'express'
import { z } from 'zod'
import { authenticate } from '@/middleware/auth.middleware.ts'
import { validate } from '@/middleware/validate.middleware.ts'
import { sendSuccess } from '@/utils/response.ts'
import { NoteService } from '@/services/note.service.ts'

const router = Router()
const svc    = new NoteService()

/* GET /lessons/:lessonId/my-note */
router.get(
  '/lessons/:lessonId/my-note',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const note = await svc.getForLesson(req.user!.id, String(req.params['lessonId'] ?? ''))
      sendSuccess(res, { note: note ?? null })
    } catch (err) {
      next(err)
    }
  },
)

/* PUT /lessons/:lessonId/my-note */
router.put(
  '/lessons/:lessonId/my-note',
  authenticate,
  validate(z.object({ body: z.string().min(1).max(50000) })),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const note = await svc.upsert(req.user!.id, String(req.params['lessonId'] ?? ''), req.body.body)
      sendSuccess(res, { note })
    } catch (err) {
      next(err)
    }
  },
)

/* DELETE /lessons/:lessonId/my-note */
router.delete(
  '/lessons/:lessonId/my-note',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await svc.delete(req.user!.id, String(req.params['lessonId'] ?? ''))
      res.status(204).end()
    } catch (err) {
      next(err)
    }
  },
)

/* GET /courses/:courseId/my-notes */
router.get(
  '/courses/:courseId/my-notes',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const notes = await svc.listForCourse(req.user!.id, String(req.params['courseId'] ?? ''))
      sendSuccess(res, { notes })
    } catch (err) {
      next(err)
    }
  },
)

export default router
