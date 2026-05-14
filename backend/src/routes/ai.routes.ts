import { Router, type Request, type Response, type NextFunction } from 'express'
import { z } from 'zod'
import { authenticate } from '@/middleware/auth.middleware.ts'
import { validate } from '@/middleware/validate.middleware.ts'
import { sendSuccess } from '@/utils/response.ts'
import { AIService } from '@/services/ai.service.ts'

const router = Router()
const svc    = new AIService()

const chatSchema = z.object({
  message:    z.string().min(1).max(4000),
  lessonId:   z.string().optional(),
  courseSlug: z.string().optional(),
  history:    z.array(z.object({
    role:    z.enum(['user', 'assistant']),
    content: z.string().max(4000),
  })).max(20).optional().default([]),
})

/* POST /ai/chat */
router.post(
  '/chat',
  authenticate,
  validate(chatSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { message, lessonId, courseSlug, history } = req.body as z.infer<typeof chatSchema>
      const reply = await svc.chat(history, message, lessonId, courseSlug)
      sendSuccess(res, { reply })
    } catch (err) {
      next(err)
    }
  },
)

export default router
