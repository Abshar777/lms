/**
 * feedback.routes.ts — Student class feedback endpoints
 *
 * POST /feedback          — submit feedback for an attended class
 * GET  /feedback/me       — my feedback history
 */
import { Router, type Request, type Response, type NextFunction } from 'express'
import { z } from 'zod'
import { authenticate } from '@/middleware/auth.middleware.ts'
import { validate } from '@/middleware/validate.middleware.ts'

const router = Router()

function sendSuccess(res: Response, data: unknown, message = 'OK', status = 200) {
  res.status(status).json({ success: true, data, message })
}

const feedbackSchema = z.object({
  liveClassId: z.string().min(1),
  rating:      z.coerce.number().int().min(1).max(5),
  comment:     z.string().max(1000).optional(),
})

/* ── POST /feedback ─────────────────────────────────────── */
router.post('/', authenticate, validate(feedbackSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { ClassFeedbackModel, ClassBookingModel, LiveClassModel } = await import('@/models/schema.ts')
    const { Types } = await import('mongoose')

    const userId      = req.user!.id
    const { liveClassId, rating, comment } = req.body as z.infer<typeof feedbackSchema>

    if (!Types.ObjectId.isValid(liveClassId)) {
      res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Invalid liveClassId' } }); return
    }

    // Must have attended the class
    const booking = await ClassBookingModel.findOne({
      userId:      new Types.ObjectId(userId),
      liveClassId: new Types.ObjectId(liveClassId),
      status:      'attended',
    }).lean()

    if (!booking) {
      res.status(403).json({ success: false, error: { code: 'NOT_ATTENDED', message: 'You must attend the class before submitting feedback' } }); return
    }

    // Upsert — student can update their feedback
    const feedback = await ClassFeedbackModel.findOneAndUpdate(
      { liveClassId: new Types.ObjectId(liveClassId), userId: new Types.ObjectId(userId) },
      { rating, comment },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    )

    sendSuccess(res, feedback, 'Feedback submitted', 201)
  } catch (err) { next(err) }
})

/* ── GET /feedback/me ───────────────────────────────────── */
router.get('/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { ClassFeedbackModel } = await import('@/models/schema.ts')
    const { Types } = await import('mongoose')
    const userId = req.user!.id
    const docs = await ClassFeedbackModel.find({ userId: new Types.ObjectId(userId) })
      .populate('liveClassId', 'id title scheduledStart')
      .sort({ createdAt: -1 })
      .lean({ virtuals: true })
    res.json({ success: true, data: docs })
  } catch (err) { next(err) }
})

export default router
