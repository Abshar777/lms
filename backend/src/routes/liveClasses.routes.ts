import { Router, type Request, type Response, type NextFunction } from 'express'
import express from 'express'
import { z } from 'zod'
import { LiveClassController } from '@/controllers/liveClass.controller.ts'
import { authenticate, requireEnrollmentApproval } from '@/middleware/auth.middleware.ts'
import { validate } from '@/middleware/validate.middleware.ts'
import { resolveLiveStatus } from '@/utils/liveStatus.ts'

const router = Router()
const ctrl   = new LiveClassController()

/* ── Helper ─────────────────────────────────── */
function sendSuccess(res: Response, data: unknown, message = 'OK', status = 200) {
  res.status(status).json({ success: true, data, message })
}

/* ── GET /live-classes — ALL sessions visible to logged-in students ────────────
   Returns every live class (no enrollment filter) so students can browse what's
   coming up. Each session is annotated with `isEnrolled: boolean` so the UI can
   show a "Purchase to join" prompt instead of the join button for non-enrolled users.
   Optionally filter by ?status=scheduled|live|ended|all
──────────────────────────────────────────────────────────────────────────────── */
router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { LiveClassModel, EnrollmentModel } = await import('@/models/schema.ts')
    const { Types } = await import('mongoose')
    const userId = req.user!.id
    const status = String(req.query['status'] ?? '')

    // Find which courses this student has purchased
    const enrollments = await EnrollmentModel.find(
      { userId: new Types.ObjectId(userId), status: 'active' },
      { courseId: 1 },
    ).lean()
    const enrolledCourseIds = new Set(enrollments.map((e: any) => String(e.courseId)))

    // Return ALL sessions — effective status is computed from the clock below,
    // so we must fetch every session rather than filter by raw DB status.
    const classes = await LiveClassModel.find({})
      .populate('instructorId', 'id name avatarUrl')
      .populate('courseId', 'id title slug thumbnailUrl')
      .populate('sectionId', 'id title')
      .sort({ scheduledStart: 1 })
      .lean({ virtuals: true })

    const now = Date.now()

    // Annotate with isEnrolled + the effective (clock-based) status:
    // a scheduled session reads 'live' within [start-30m, start+15m], 'ended' after.
    let annotated = (classes as any[]).map(c => {
      const courseId = c.courseId
        ? String((c.courseId as any)?._id ?? (c.courseId as any)?.id ?? c.courseId)
        : null
      const isEnrolled = courseId ? enrolledCourseIds.has(courseId) : false
      return {
        ...c,
        id:         c.id ?? String(c._id),
        status:     resolveLiveStatus(c.status, c.scheduledStart, now),
        isEnrolled,
      }
    })

    // An optional ?status= filter applies to the EFFECTIVE status.
    if (status && status !== 'all') {
      annotated = annotated.filter(c => c.status === status)
    }

    sendSuccess(res, annotated)
  } catch (err) { next(err) }
})

/* Upcoming sessions for authenticated user's enrolled courses */
router.get('/upcoming', authenticate, ctrl.upcomingForMe)

/* Student watch access — checks enrollment approval then returns playback/meeting URL */
router.get('/:id/watch', authenticate, requireEnrollmentApproval, ctrl.watchAccess)

/* Mux webhook — must use raw body parser BEFORE json parser for signature verification */
router.post(
  '/mux-webhook',
  express.raw({ type: 'application/json' }),
  ctrl.muxWebhook,
)

/* ─────────────────────────────────────────────────────
   STUDENT HOMEWORK ENDPOINTS
   GET  /live-classes/:id/homework    — view homework for a session
   POST /live-classes/homework/:id/submit — submit homework
─────────────────────────────────────────────────────── */
router.get('/:id/homework', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { SessionHomeworkModel } = await import('@/models/schema.ts')
    const liveClassId = String(req.params['id'] ?? '')
    const list = await SessionHomeworkModel.find({ liveClassId }).lean({ virtuals: true })
    sendSuccess(res, list)
  } catch (err) { next(err) }
})

const submitHomeworkSchema = z.object({
  submissionText: z.string().max(10000).optional(),
  submissionUrl:  z.string().url().max(500).optional(),
}).refine(d => d.submissionText || d.submissionUrl, { message: 'Provide text or URL' })

router.post('/homework/:id/submit', authenticate, validate(submitHomeworkSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { HomeworkSubmissionModel, SessionHomeworkModel } = await import('@/models/schema.ts')
    const homeworkId = String(req.params['id'] ?? '')
    const hw = await SessionHomeworkModel.findById(homeworkId)
    if (!hw) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Homework not found' } }); return }

    const { submissionText, submissionUrl } = req.body as { submissionText?: string; submissionUrl?: string }
    const existing = await HomeworkSubmissionModel.findOne({ homeworkId, userId: req.user!.id })
    if (existing) {
      // Update existing submission
      existing.submissionText = submissionText
      existing.submissionUrl  = submissionUrl
      existing.status         = 'submitted'
      await existing.save()
      sendSuccess(res, existing, 'Submission updated')
      return
    }
    const sub = await HomeworkSubmissionModel.create({
      homeworkId,
      userId: req.user!.id,
      submissionText,
      submissionUrl,
    })
    sendSuccess(res, sub, 'Homework submitted', 201)
  } catch (err) { next(err) }
})

export default router
