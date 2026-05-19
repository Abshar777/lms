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
      const limit = Math.min(Number(req.query['limit'] ?? 5), 20)
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
        courseId:       string
        title:          string
        description?:   string
        scheduledStart: string | Date
        durationMins:   number
        type?:          'external' | 'internal'
        meetingUrl?:    string
        instructorId?:  string
      }
      const live = await this.service.create({
        courseId:       dto.courseId,
        instructorId:   dto.instructorId ?? req.user!.id,
        title:          dto.title,
        description:    dto.description,
        scheduledStart: new Date(dto.scheduledStart),
        durationMins:   dto.durationMins,
        type:           dto.type ?? 'external',
        meetingUrl:     dto.meetingUrl,
      })
      sendSuccess(res, toDTO(live), 'Live class scheduled', 201)
    } catch (err) { next(err) }
  }

  adminUpdate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id  = String(req.params['id'] ?? '')
      const dto = req.body as Record<string, unknown>
      const data: Parameters<LiveClassService['update']>[1] = {}
      if (typeof dto['title']          === 'string')  data.title          = dto['title']
      if (typeof dto['description']    === 'string')  data.description    = dto['description']
      if (typeof dto['scheduledStart'] === 'string')  data.scheduledStart = new Date(dto['scheduledStart'])
      if (typeof dto['durationMins']   === 'number')  data.durationMins   = dto['durationMins']
      if (typeof dto['meetingUrl']     === 'string')  data.meetingUrl     = dto['meetingUrl']
      if (typeof dto['status']         === 'string')  data.status         = dto['status'] as any
      const live = await this.service.update(id, data)
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
