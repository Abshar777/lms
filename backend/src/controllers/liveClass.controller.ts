import type { Request, Response, NextFunction } from 'express'
import { LiveClassService } from '@/services/liveClass.service.ts'
import { verifyWebhookSignature } from '@/services/mux.service.ts'
import { sendSuccess } from '@/utils/response.ts'

function isPopulated(v: unknown): v is Record<string, unknown> & { id: string } {
  return !!v && typeof v === 'object' && typeof (v as { id?: unknown }).id === 'string'
}

function toDTO(doc: any) {
  const j              = doc.toJSON ? doc.toJSON() : doc
  const courseRef      = j.courseId
  const instructorRef  = j.instructorId
  const batchRef       = j.batchId
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

    /* Batch / capacity fields (Phase 2–3) */
    batchId:         batchRef
                       ? (isPopulated(batchRef) ? batchRef : String(batchRef))
                       : undefined,
    sessionCapacity: j.sessionCapacity ?? 30,
    bookedCount:     j.bookedCount     ?? 0,

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
      const docs  = await this.service.listUpcomingForUser(req.user!.id, limit)
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
      const docs   = await this.service.listAll({ status, limit })
      sendSuccess(res, docs.map(toDTO))
    } catch (err) { next(err) }
  }

  adminGetById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id   = String(req.params['id'] ?? '')
      const live = await this.service.getById(id)
      sendSuccess(res, toDTO(live))
    } catch (err) { next(err) }
  }

  adminListForCourse = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const courseId = String(req.params['courseId'] ?? '')
      const docs = await this.service.listForCourseId(courseId)
      sendSuccess(res, docs.map(toDTO))
    } catch (err) { next(err) }
  }

  adminCreate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = req.body as {
        courseId:        string
        title:           string
        description?:    string
        scheduledStart:  string | Date
        durationMins:    number
        type?:           'external' | 'internal'
        meetingUrl?:     string
        instructorId?:   string
        batchId?:        string
        sessionCapacity?: number
      }
      const live = await this.service.create({
        courseId:        dto.courseId,
        instructorId:    dto.instructorId ?? req.user!.id,
        title:           dto.title,
        description:     dto.description,
        scheduledStart:  new Date(dto.scheduledStart),
        durationMins:    dto.durationMins,
        type:            dto.type ?? 'external',
        meetingUrl:      dto.meetingUrl,
        batchId:         dto.batchId,
        sessionCapacity: dto.sessionCapacity,
      })
      sendSuccess(res, toDTO(live), 'Live class scheduled', 201)
    } catch (err) { next(err) }
  }

  adminUpdate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id  = String(req.params['id'] ?? '')
      const dto = req.body as Record<string, unknown>
      const data: Parameters<LiveClassService['update']>[1] = {}
      if (typeof dto['title']           === 'string')  data.title           = dto['title']
      if (typeof dto['description']     === 'string')  data.description     = dto['description']
      if (typeof dto['scheduledStart']  === 'string')  data.scheduledStart  = new Date(dto['scheduledStart'])
      if (typeof dto['durationMins']    === 'number')  data.durationMins    = dto['durationMins']
      if (typeof dto['meetingUrl']      === 'string')  data.meetingUrl      = dto['meetingUrl']
      if (typeof dto['status']          === 'string')  data.status          = dto['status'] as any
      if (typeof dto['batchId']         === 'string')  data.batchId         = dto['batchId']
      if (dto['batchId'] === null)                      data.batchId         = null
      if (typeof dto['sessionCapacity'] === 'number')  data.sessionCapacity = dto['sessionCapacity']
      if (typeof dto['mentorNotes']     === 'string')  data.mentorNotes     = dto['mentorNotes']

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
      await this.service.delete(String(req.params['id'] ?? ''))
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
