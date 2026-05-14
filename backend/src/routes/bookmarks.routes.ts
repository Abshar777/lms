import { Router, type Request, type Response, type NextFunction } from 'express'
import { z } from 'zod'
import { authenticate } from '@/middleware/auth.middleware.ts'
import { validate } from '@/middleware/validate.middleware.ts'
import { sendSuccess } from '@/utils/response.ts'
import { BookmarkService } from '@/services/bookmark.service.ts'

const router = Router()
const svc    = new BookmarkService()

const createBookmarkSchema = z.object({
  timeSecs: z.number().min(0),
  label:    z.string().max(200).optional(),
})

/* GET /lessons/:lessonId/bookmarks */
router.get(
  '/lessons/:lessonId/bookmarks',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const bookmarks = await svc.listForLesson(req.user!.id, String(req.params['lessonId'] ?? ''))
      sendSuccess(res, { bookmarks })
    } catch (err) {
      next(err)
    }
  },
)

/* POST /lessons/:lessonId/bookmarks */
router.post(
  '/lessons/:lessonId/bookmarks',
  authenticate,
  validate(createBookmarkSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const bookmark = await svc.create(req.user!.id, String(req.params['lessonId'] ?? ''), req.body)
      sendSuccess(res, { bookmark }, 'Bookmark created', 201)
    } catch (err) {
      next(err)
    }
  },
)

/* DELETE /bookmarks/:bookmarkId */
router.delete(
  '/bookmarks/:bookmarkId',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await svc.delete(req.user!.id, String(req.params['bookmarkId'] ?? ''))
      res.status(204).end()
    } catch (err) {
      next(err)
    }
  },
)

/* GET /courses/:courseId/bookmarks */
router.get(
  '/courses/:courseId/bookmarks',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const bookmarks = await svc.listForCourse(req.user!.id, String(req.params['courseId'] ?? ''))
      sendSuccess(res, { bookmarks })
    } catch (err) {
      next(err)
    }
  },
)

export default router
