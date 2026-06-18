import type { Request, Response, NextFunction } from 'express'
import { LiveClassService } from '@/services/liveClass.service.ts'
import { verifyWebhookSignature } from '@/services/mux.service.ts'
import { createGoogleMeetLink } from '@/services/googleMeet.service.ts'
import { sendSuccess } from '@/utils/response.ts'

function isPopulated(v: unknown): v is Record<string, unknown> & { id: string } {
  return !!v && typeof v === 'object' && typeof (v as { id?: unknown }).id === 'string'
}

function toDTO(doc: any) {
  const j              = doc.toJSON ? doc.toJSON() : doc
  const courseRef      = j.courseId
  const instructorRef  = j.instructorId
  const sectionRef     = j.sectionId
  const isInternal     = j.type === 'internal'

  return {
    id:             j.id,
    courseId:       isPopulated(courseRef)     ? courseRef.id     : String(courseRef),
    course:         isPopulated(courseRef)     ? courseRef        : undefined,
    instructorId:   isPopulated(instructorRef) ? instructorRef.id : String(instructorRef),
    instructor:     isPopulated(instructorRef) ? instructorRef    : undefined,
    title:          j.title,
    description:    j.description,
    scheduledStart: j.scheduledStart,
    durationMins:   j.durationMins,

    /* Type + status */
    type:           j.type   ?? 'external',
    status:         j.status ?? 'scheduled',

    /* External-only */
    meetingUrl:     !isInternal ? j.meetingUrl : undefined,

    /* Internal-only (public fields — no muxStreamKey) */
    muxPlaybackId:  isInternal ? j.muxPlaybackId  : undefined,
    playbackUrl:    isInternal && j.muxPlaybackId
                      ? `https://stream.mux.com/${j.muxPlaybackId}.m3u8`
                      : undefined,
    thumbnailUrl:   isInternal && j.muxPlaybackId
                      ? `https://image.mux.com/${j.muxPlaybackId}/thumbnail.jpg?time=0`
                      : undefined,
    recordingUrl:   j.recordingUrl  ?? undefined,
    viewerCount:    j.viewerCount   ?? 0,
    startedAt:      j.startedAt,
    endedAt:        j.endedAt,

    /* Module link */
    sectionId:       sectionRef
                       ? (isPopulated(sectionRef) ? sectionRef.id : String(sectionRef))
                       : undefined,
    section:         isPopulated(sectionRef) ? sectionRef : undefined,

    sessionCapacity: j.sessionCapacity ?? 30,
    bookedCount:     j.bookedCount     ?? 0,

    language:       j.language ?? 'English',

    createdAt:      j.createdAt,
    updatedAt:      j.updatedAt,
  }
}

export class LiveClassController {
  private readonly service = new LiveClassService()

  /* GET /courses/:slug/live-classes — public */
  listForCourseSlug = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const slug = String(req.params['slug'] ?? '')
      const docs = await this.service.listForCourseSlug(slug)
      sendSuccess(res, docs.map(toDTO))
    } catch (err) { next(err) }
  }

  /* GET /live-classes/upcoming — auth */
  upcomingForMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const limit = Math.min(Number(req.query['limit'] ?? 10), 100)
      const { UserModel } = await import('@/models/schema.ts')
      const user     = await UserModel.findById(req.user!.id).select('category').lean()
      const category = (user as any)?.category as string | undefined
      const docs     = await this.service.listUpcomingForUser(req.user!.id, limit, category)
      sendSuccess(res, docs.map(toDTO))
    } catch (err) { next(err) }
  }

  /* GET /live-classes/:id/watch — auth, checks enrollment */
  watchAccess = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id     = String(req.params['id'] ?? '')
      const result = await this.service.getWatchAccess(id, req.user!.id)
      sendSuccess(res, result)
    } catch (err) { next(err) }
  }

  /* POST /webhooks/mux — no auth, signature verified inside */
  muxWebhook = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const sig     = req.headers['mux-signature'] as string | undefined
      const rawBody = req.body as Buffer

      if (!verifyWebhookSignature(rawBody, sig)) {
        res.status(401).json({ error: 'Invalid Mux webhook signature' })
        return
      }

      const event = JSON.parse(rawBody.toString('utf8')) as { type: string; data: Record<string, unknown> }

      /* Respond immediately — Mux requires < 30s response */
      res.status(200).json({ received: true })

      /* Process async without blocking the response */
      void this.service.handleMuxWebhook(event).catch(err =>
        console.error('[mux-webhook]', err),
      )
    } catch (err) { next(err) }
  }

  /* ── Admin handlers ─────────────────────────────── */

  adminListAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const status = typeof req.query['status'] === 'string' ? req.query['status'] : 'all'
      const limit  = Math.min(Number(req.query['limit'] ?? 100), 200)
      const scope  = req.user?.categoryScope
      let courseIds: string[] | undefined
      if (scope) {
        const CourseModel = (await import('@/models/schema.ts')).CourseModel
        const courses = await CourseModel.find({ program: scope }, { _id: 1 }).lean()
        courseIds = courses.map((c: any) => String(c._id))
        // No courses in this category → return empty, don't leak other categories' sessions
        if (courseIds.length === 0) { sendSuccess(res, []); return }
      }
      const docs = await this.service.listAll({ status, limit, courseIds })
      sendSuccess(res, docs.map(toDTO))
    } catch (err) { next(err) }
  }

  adminGetById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id    = String(req.params['id'] ?? '')
      const scope = req.user?.categoryScope as string | undefined
      const live  = await this.service.getById(id)
      if (scope) {
        const { CourseModel } = await import('@/models/schema.ts')
        const courseIdStr = isPopulated(live.courseId as any) ? (live.courseId as any).id : String(live.courseId)
        const course = await CourseModel.findById(courseIdStr).select('program').lean()
        if (!course || (course as any).program !== scope) {
          res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied.' } }); return
        }
      }
      sendSuccess(res, toDTO(live))
    } catch (err) { next(err) }
  }

  adminListForCourse = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const courseId = String(req.params['courseId'] ?? '')
      const scope    = req.user?.categoryScope as string | undefined
      if (scope) {
        const { CourseModel } = await import('@/models/schema.ts')
        const course = await CourseModel.findById(courseId).select('program').lean()
        if (!course || (course as any).program !== scope) {
          res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied.' } }); return
        }
      }
      const docs = await this.service.listForCourseId(courseId)
      sendSuccess(res, docs.map(toDTO))
    } catch (err) { next(err) }
  }

  adminCreate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = req.body as {
        courseId:         string
        title:            string
        description?:     string
        scheduledStart:   string | Date
        durationMins:     number
        type?:            'external' | 'internal'
        instructorId?:    string
        sectionId?:       string
        sessionCapacity?: number
        language?:        string
      }

      /* Category scope check — 4x_admin / digital_marketing_admin can only create for their program */
      const scope = req.user?.categoryScope as string | undefined
      if (scope) {
        const { CourseModel } = await import('@/models/schema.ts')
        const course = await CourseModel.findById(dto.courseId).select('program').lean()
        if (!course) {
          res.status(404).json({ success: false, error: { code: 'COURSE_NOT_FOUND', message: 'Course not found' } }); return
        }
        if ((course as any).program !== scope) {
          res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You can only create sessions for your category courses.' } }); return
        }
      }

      const sessionType = dto.type ?? 'external'

      /* Auto-generate a Google Meet link for external sessions */
      let meetingUrl: string | undefined
      if (sessionType === 'external') {
        meetingUrl = await createGoogleMeetLink({
          title:        dto.title,
          startISO:     String(dto.scheduledStart),
          durationMins: dto.durationMins,
        })
      }

      const live = await this.service.create({
        courseId:        dto.courseId,
        instructorId:    dto.instructorId ?? req.user!.id,
        title:           dto.title,
        description:     dto.description,
        scheduledStart:  new Date(dto.scheduledStart),
        durationMins:    dto.durationMins,
        type:            sessionType,
        meetingUrl,
        sectionId:       dto.sectionId,
        sessionCapacity: dto.sessionCapacity,
        language:        dto.language,
      })
      sendSuccess(res, toDTO(live), 'Live class scheduled', 201)
    } catch (err) { next(err) }
  }

  adminUpdate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id    = String(req.params['id'] ?? '')
      const scope = req.user?.categoryScope as string | undefined
      if (scope) {
        const existing = await this.service.getById(id)
        const { CourseModel } = await import('@/models/schema.ts')
        const courseIdStr = isPopulated(existing.courseId as any) ? (existing.courseId as any).id : String(existing.courseId)
        const course = await CourseModel.findById(courseIdStr).select('program').lean()
        if (!course || (course as any).program !== scope) {
          res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You can only edit sessions for your category courses.' } }); return
        }
      }
      const dto = req.body as Record<string, unknown>
      const data: Parameters<LiveClassService['update']>[1] = {}
      if (typeof dto['title']           === 'string')  data.title           = dto['title']
      if (typeof dto['description']     === 'string')  data.description     = dto['description']
      if (typeof dto['scheduledStart']  === 'string')  data.scheduledStart  = new Date(dto['scheduledStart'])
      if (typeof dto['durationMins']    === 'number')  data.durationMins    = dto['durationMins']
      if (typeof dto['meetingUrl']      === 'string')  data.meetingUrl      = dto['meetingUrl']
      if (typeof dto['status']          === 'string')  data.status          = dto['status'] as any
      if (typeof dto['sessionCapacity'] === 'number')  data.sessionCapacity = dto['sessionCapacity']
      if (typeof dto['mentorNotes']     === 'string')  data.mentorNotes     = dto['mentorNotes']
      if (typeof dto['instructorId']    === 'string')  data.instructorId    = dto['instructorId']
      if (typeof dto['courseId']        === 'string')  data.courseId        = dto['courseId']
      if (typeof dto['sectionId']       === 'string')  data.sectionId       = dto['sectionId']
      if (typeof dto['language']        === 'string')  data.language        = dto['language']

      /* Snapshot old session BEFORE update for notification comparison */
      const { LiveClassModel, ClassBookingModel, UserModel } = await import('@/models/schema.ts')
      const oldSession = await LiveClassModel.findById(id).lean()

      const live = await this.service.update(id, data)

      /* ── Trigger notifications on status/schedule changes (non-blocking) ── */
      const wasCancelled    = oldSession?.status !== 'cancelled' && data.status === 'cancelled'
      const wasRescheduled  = data.scheduledStart && oldSession?.scheduledStart &&
        new Date(oldSession.scheduledStart).getTime() !== new Date(data.scheduledStart).getTime()

      if (wasCancelled || wasRescheduled) {
        ;(async () => {
          try {
            const { sendCancelledNotification, sendRescheduledNotification } = await import('@/services/email.service.ts')
            const bookings = await ClassBookingModel.find({
              liveClassId: id, status: { $in: ['booked', 'attended'] },
            }).lean()
            for (const booking of bookings) {
              const user = await UserModel.findById(booking.userId).lean()
              if (!user?.email) continue
              const title   = live.title
              const oldDate = oldSession?.scheduledStart ? new Date(oldSession.scheduledStart).toLocaleString() : 'TBD'
              const newDate = live.scheduledStart ? new Date(live.scheduledStart).toLocaleString() : 'TBD'
              if (wasCancelled) {
                sendCancelledNotification(user.email, user.name, title, oldDate).catch(() => {})
              } else {
                sendRescheduledNotification(user.email, user.name, title, oldDate, newDate).catch(() => {})
              }
            }
          } catch (e) { console.error('[Notification] update notification failed:', e) }
        })()
      }

      sendSuccess(res, toDTO(live), 'Live class updated')
    } catch (err) { next(err) }
  }

  adminDelete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id    = String(req.params['id'] ?? '')
      const scope = req.user?.categoryScope as string | undefined
      if (scope) {
        const live = await this.service.getById(id)
        const { CourseModel } = await import('@/models/schema.ts')
        const courseIdStr = isPopulated(live.courseId as any) ? (live.courseId as any).id : String(live.courseId)
        const course = await CourseModel.findById(courseIdStr).select('program').lean()
        if (!course || (course as any).program !== scope) {
          res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You can only delete sessions for your category courses.' } }); return
        }
      }
      await this.service.delete(id)
      sendSuccess(res, null, 'Live class deleted')
    } catch (err) { next(err) }
  }

  adminStart = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const live = await this.service.startStream(String(req.params['id'] ?? ''))
      sendSuccess(res, toDTO(live), 'Stream started')
    } catch (err) { next(err) }
  }

  adminEnd = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const live = await this.service.endStream(String(req.params['id'] ?? ''))
      sendSuccess(res, toDTO(live), 'Stream ended')
    } catch (err) { next(err) }
  }

  adminGetStreamCredentials = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const creds = await this.service.getStreamCredentials(String(req.params['id'] ?? ''))
      sendSuccess(res, creds)
    } catch (err) { next(err) }
  }

  adminRecreate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const live = await this.service.recreateStream(String(req.params['id'] ?? ''))
      sendSuccess(res, toDTO(live), 'Stream credentials recreated')
    } catch (err) { next(err) }
  }
}
