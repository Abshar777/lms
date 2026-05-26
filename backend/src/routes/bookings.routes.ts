/**
 * bookings.routes.ts — Student class-slot booking endpoints (Phase 3)
 *
 * POST   /bookings              — book a live-class session
 * GET    /bookings/me           — list my bookings (upcoming + past)
 * DELETE /bookings/:id          — cancel a booking
 */
import { Router, type Request, type Response, type NextFunction } from 'express'
import { z } from 'zod'
import { authenticate } from '@/middleware/auth.middleware.ts'
import { validate } from '@/middleware/validate.middleware.ts'

const router = Router()

/* ── Validation ─────────────────────────────── */
const createBookingSchema = z.object({
  liveClassId: z.string().min(1),
})

const bookingQuerySchema = z.object({
  status:   z.enum(['booked', 'attended', 'missed', 'cancelled']).optional(),
  page:     z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(20),
})

/* ── Helper ─────────────────────────────────── */
function sendSuccess(res: Response, data: unknown, message = 'OK', status = 200) {
  res.status(status).json({ success: true, data, message })
}

/* ── POST /bookings ─────────────────────────── */
router.post('/', authenticate, validate(createBookingSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { ClassBookingModel, LiveClassModel, BatchModel, EnrollmentModel } =
      await import('@/models/schema.ts')
    const { Types } = await import('mongoose')

    const userId      = req.user!.id
    const { liveClassId } = req.body as { liveClassId: string }

    if (!Types.ObjectId.isValid(liveClassId)) {
      res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Invalid liveClassId' } }); return
    }

    /* Fetch the session */
    const session = await LiveClassModel.findById(liveClassId).lean()
    if (!session) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Session not found' } }); return
    }
    if (session.status === 'cancelled' || session.status === 'ended') {
      res.status(400).json({ success: false, error: { code: 'SESSION_UNAVAILABLE', message: 'Session is no longer available for booking' } }); return
    }

    /* Session must be linked to a batch */
    if (!session.batchId) {
      res.status(400).json({ success: false, error: { code: 'NO_BATCH', message: 'This session is not part of a batch' } }); return
    }

    /* Student must be in the batch */
    const batch = await BatchModel.findById(session.batchId).lean()
    if (!batch) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Batch not found' } }); return
    }
    const inBatch = (batch.studentIds as any[]).some(
      (id: any) => id.toString() === userId,
    )
    if (!inBatch) {
      res.status(403).json({ success: false, error: { code: 'NOT_IN_BATCH', message: 'You are not enrolled in this batch' } }); return
    }

    /* Payment gate — if batch is linked to a course, student must be enrolled */
    if (batch.courseId) {
      const enrollment = await EnrollmentModel.findOne({
        userId: new Types.ObjectId(userId),
        courseId: batch.courseId,
        status: 'active',
      }).lean()
      if (!enrollment) {
        res.status(403).json({ success: false, error: { code: 'NOT_ENROLLED', message: 'You must be enrolled in the linked course to book sessions' } }); return
      }
    }

    /* 2× attendance cap — count sessions where student was attended for this liveClassId */
    const attendedCount = await ClassBookingModel.countDocuments({
      userId: new Types.ObjectId(userId),
      liveClassId: new Types.ObjectId(liveClassId),
      status: 'attended',
    })
    if (attendedCount >= 2) {
      res.status(403).json({
        success: false,
        error: {
          code:    'CONTACT_ADMIN',
          message: 'You have already attended this class twice. Please contact the admin team to arrange more access.',
        },
      }); return
    }

    /* Capacity check */
    if (session.bookedCount >= session.sessionCapacity) {
      res.status(400).json({ success: false, error: { code: 'SESSION_FULL', message: 'This session is fully booked' } }); return
    }

    /* Check for existing booking (avoid duplicate) */
    const existing = await ClassBookingModel.findOne({
      userId: new Types.ObjectId(userId),
      liveClassId: new Types.ObjectId(liveClassId),
    }).lean()

    if (existing) {
      if (existing.status === 'cancelled') {
        /* Re-book after cancel */
        await ClassBookingModel.findByIdAndUpdate(existing._id, {
          status: 'booked',
          bookedAt: new Date(),
          cancelledAt: undefined,
        })
        await LiveClassModel.findByIdAndUpdate(liveClassId, { $inc: { bookedCount: 1 } })
        const updated = await ClassBookingModel.findById(existing._id).lean({ virtuals: true })
        sendSuccess(res, updated, 'Booking created', 201); return
      }
      res.status(409).json({ success: false, error: { code: 'ALREADY_BOOKED', message: 'You already have a booking for this session' } }); return
    }

    /* Create booking + increment bookedCount atomically */
    const [booking] = await Promise.all([
      ClassBookingModel.create({
        userId:      new Types.ObjectId(userId),
        liveClassId: new Types.ObjectId(liveClassId),
        batchId:     session.batchId,
        status:      'booked',
        bookedAt:    new Date(),
      }),
      LiveClassModel.findByIdAndUpdate(liveClassId, { $inc: { bookedCount: 1 } }),
    ])

    const populated = await booking.populate([
      { path: 'liveClassId', select: 'id title scheduledStart durationMins meetingUrl muxPlaybackId' },
      { path: 'batchId',     select: 'id name' },
    ])

    /* Send booking confirmation email (non-blocking) */
    const { UserModel } = await import('@/models/schema.ts')
    UserModel.findById(userId).then(user => {
      if (user?.email) {
        const lc = populated.get('liveClassId') as any
        import('@/services/email.service.ts').then(({ sendBookingConfirmation }) => {
          sendBookingConfirmation(
            user.email,
            user.name,
            lc?.title ?? 'Session',
            lc?.scheduledStart ? new Date(lc.scheduledStart).toLocaleString() : 'TBD',
            lc?.meetingUrl ?? `${process.env.CLIENT_URL ?? 'http://localhost:3000'}/live-classes`,
          ).catch(e => console.error('[Booking] confirmation email failed:', e))
        })
      }
    }).catch(() => {/* non-fatal */})

    sendSuccess(res, populated, 'Booking created', 201)
  } catch (err: any) {
    if (err.code === 11000) {
      res.status(409).json({ success: false, error: { code: 'ALREADY_BOOKED', message: 'You already have a booking for this session' } }); return
    }
    next(err)
  }
})

/* ── GET /bookings/me ───────────────────────── */
router.get('/me', authenticate, validate(bookingQuerySchema, 'query'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { ClassBookingModel } = await import('@/models/schema.ts')
    const { Types } = await import('mongoose')
    const userId = req.user!.id
    const q = req.query as unknown as z.infer<typeof bookingQuerySchema>
    const filter: Record<string, any> = { userId: new Types.ObjectId(userId) }
    if (q.status) filter['status'] = q.status
    const page     = Number(q.page)     || 1
    const per_page = Number(q.per_page) || 20
    const skip     = (page - 1) * per_page
    const [docs, total] = await Promise.all([
      ClassBookingModel.find(filter)
        .populate('liveClassId', 'id title scheduledStart durationMins status meetingUrl muxPlaybackId type')
        .populate('batchId', 'id name')
        .sort({ bookedAt: -1 })
        .skip(skip).limit(per_page)
        .lean({ virtuals: true }),
      ClassBookingModel.countDocuments(filter),
    ])
    res.json({
      success: true,
      data: docs,
      meta: { page, per_page, total_count: total, total_pages: Math.ceil(total / per_page) },
    })
  } catch (err) { next(err) }
})

/* ── DELETE /bookings/:id ───────────────────── */
router.delete('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { ClassBookingModel, LiveClassModel } = await import('@/models/schema.ts')
    const userId = req.user!.id
    const id = String(req.params['id'] ?? '')
    const booking = await ClassBookingModel.findOne({ _id: id, userId }).lean()
    if (!booking) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Booking not found' } }); return
    }
    if (booking.status !== 'booked') {
      res.status(400).json({ success: false, error: { code: 'CANNOT_CANCEL', message: 'Only active bookings can be cancelled' } }); return
    }
    await Promise.all([
      ClassBookingModel.findByIdAndUpdate(id, { status: 'cancelled', cancelledAt: new Date() }),
      LiveClassModel.findByIdAndUpdate(booking.liveClassId, { $inc: { bookedCount: -1 } }),
    ])
    sendSuccess(res, null, 'Booking cancelled')
  } catch (err) { next(err) }
})

export default router
