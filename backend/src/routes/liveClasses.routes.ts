import { Router, type Request, type Response, type NextFunction } from 'express'
import express from 'express'
import { z } from 'zod'
import { LiveClassController } from '@/controllers/liveClass.controller.ts'
import { authenticate } from '@/middleware/auth.middleware.ts'
import { validate } from '@/middleware/validate.middleware.ts'

const router = Router()
const ctrl   = new LiveClassController()

/* ── Helper ─────────────────────────────────── */
function sendSuccess(res: Response, data: unknown, message = 'OK', status = 200) {
  res.status(status).json({ success: true, data, message })
}

/* ── GET /live-classes — all sessions visible to this student ──────────────────
   Shows ALL live classes from batches the student belongs to (visibility gate).
   Booking is separately gated by course enrollment in the POST /bookings route.
   Each class has `isEnrolled: boolean` so the UI can show "Purchase to book" vs "Book".
   Optionally filter by ?status=scheduled|live|ended
──────────────────────────────────────────────────────────────────────────────── */
router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { BatchModel, LiveClassModel, EnrollmentModel } = await import('@/models/schema.ts')
    const { Types } = await import('mongoose')
    const userId = req.user!.id
    const status = String(req.query['status'] ?? '')

    // Find ALL batches this student is in (no enrollment filter — just membership)
    const batches = await BatchModel.find({ studentIds: new Types.ObjectId(userId) }).lean()
    const batchIds = batches.map((b: any) => b._id)

    if (batchIds.length === 0) return sendSuccess(res, [])

    // Find the student's active enrollments to mark isEnrolled on each class
    const enrollments = await EnrollmentModel.find(
      { userId: new Types.ObjectId(userId), status: 'active' },
      { courseId: 1 },
    ).lean()
    const enrolledCourseIds = new Set(enrollments.map((e: any) => String(e.courseId)))

    // Build a map of batchId → courseId for quick lookup
    const batchCourseMap = new Map<string, string | null>()
    for (const b of batches as any[]) {
      batchCourseMap.set(String(b._id), b.courseId ? String(b.courseId) : null)
    }

    const filter: Record<string, any> = { batchId: { $in: batchIds } }
    if (status && status !== 'all') filter['status'] = status

    const classes = await LiveClassModel.find(filter)
      .populate('instructorId', 'id name avatarUrl')
      .populate('courseId', 'id title slug thumbnailUrl')
      .sort({ scheduledStart: 1 })
      .lean({ virtuals: true })

    // Annotate each class with isEnrolled:
    //  true  → student can book (batch has no course, OR student is enrolled)
    //  false → student must purchase first
    const annotated = (classes as any[]).map(c => {
      const courseId = batchCourseMap.get(String(c.batchId))
      const isEnrolled = !courseId || enrolledCourseIds.has(courseId)
      return { ...c, isEnrolled }
    })

    sendSuccess(res, annotated)
  } catch (err) { next(err) }
})

/* Upcoming sessions for authenticated user's enrolled courses */
router.get('/upcoming', authenticate, ctrl.upcomingForMe)

/* Student watch access — checks enrollment, returns playback URL or meeting URL */
router.get('/:id/watch', authenticate, ctrl.watchAccess)

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
