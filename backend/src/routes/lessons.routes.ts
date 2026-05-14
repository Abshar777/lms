import { Router } from 'express'
import { z } from 'zod'
import { ProgressController }    from '@/controllers/progress.controller.ts'
import { TranscriptController }  from '@/controllers/transcript.controller.ts'
import { authenticate, requireAdmin, requireInstructor } from '@/middleware/auth.middleware.ts'
import { validate } from '@/middleware/validate.middleware.ts'

const router   = Router()
const progress = new ProgressController()
const transcript = new TranscriptController()

const watchTimeSchema = z.object({
  secs: z.coerce.number().min(1).max(300),
})

const transcriptSaveSchema = z.object({
  transcript: z.string().max(100_000),
})

/* ── Progress ─────────────────────────────────────── */
router.get ('/:id/progress',    authenticate, progress.myLessonProgress)
router.post('/:id/complete',    authenticate, progress.markComplete)
router.post('/:id/watch-time',  authenticate, validate(watchTimeSchema), progress.recordWatchTime)

/* ── Transcript ───────────────────────────────────── */
/* Public read — any authenticated user (enrolled is checked by service) */
router.get('/:id/transcript', authenticate, transcript.get)
/* Admin/instructor write + AI generation */
router.patch('/:id/transcript',           authenticate, requireInstructor, validate(transcriptSaveSchema), transcript.save)
router.post ('/:id/generate-transcript',  authenticate, requireInstructor, transcript.generate)

export default router
