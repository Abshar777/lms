import { Router } from 'express'
import { z } from 'zod'
import { authenticate } from '@/middleware/auth.middleware.ts'
import { validate } from '@/middleware/validate.middleware.ts'
import { AssignmentService } from '@/services/assignment.service.ts'
import { sendSuccess } from '@/utils/response.ts'
import type { Request, Response, NextFunction } from 'express'

const router     = Router()
const assignSvc  = new AssignmentService()

const submitSchema = z.object({
  submissionUrl:  z.string().url().max(2048).optional(),
  submissionText: z.string().max(20000).optional(),
}).refine(d => d.submissionUrl || d.submissionText, {
  message: 'Provide a URL or text submission',
})

/* GET /assignments/lessons/:lessonId — get assignment details */
router.get('/lessons/:lessonId', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const assignment = await assignSvc.getByLesson(String(req.params['lessonId'] ?? ''))
    sendSuccess(res, assignment ?? null)
  } catch (err) { next(err) }
})

/* GET /assignments/lessons/:lessonId/my-submission — student's own submission */
router.get('/lessons/:lessonId/my-submission', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const submission = await assignSvc.getMySubmission(req.user!.id, String(req.params['lessonId'] ?? ''))
    sendSuccess(res, submission ?? null)
  } catch (err) { next(err) }
})

/* POST /assignments/lessons/:lessonId/submit — submit assignment */
router.post('/lessons/:lessonId/submit', authenticate, validate(submitSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const lessonId = String(req.params['lessonId'] ?? '')
    const submission = await assignSvc.submit(req.user!.id, lessonId, req.body)
    sendSuccess(res, submission, 'Assignment submitted', 201)
  } catch (err) { next(err) }
})

export default router
