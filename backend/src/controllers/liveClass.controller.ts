import type { Request, Response, NextFunction } from 'express'
import { LiveClassService } from '@/services/liveClass.service.ts'
import { sendSuccess } from '@/utils/response.ts'

/* A populated doc looks like { id, name, ... }; a raw ObjectId
   serializes as { type:'Buffer', data:[...] } or similar via toJSON.
   We treat anything without an `id` field as not-populated. */
function isPopulated(v: unknown): v is Record<string, unknown> & { id: string } {
  return !!v && typeof v === 'object' && typeof (v as { id?: unknown }).id === 'string'
}

function toDTO(doc: any) {
  const j = doc.toJSON ? doc.toJSON() : doc
  const courseRef     = j.courseId
  const instructorRef = j.instructorId
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
    meetingUrl:     j.meetingUrl,
    cancelled:      j.cancelled,
    createdAt:      j.createdAt,
    updatedAt:      j.updatedAt,
  }
}

export class LiveClassController {
  private readonly service = new LiveClassService()

  /* GET /courses/:slug/live-classes — public, all sessions for a course */
  listForCourseSlug = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const slug = String(req.params['slug'] ?? '')
      const docs = await this.service.listForCourseSlug(slug)
      sendSuccess(res, docs.map(toDTO))
    } catch (err) { next(err) }
  }

  /* GET /live-classes/upcoming — auth, sessions for the user's enrollments */
  upcomingForMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const limit = Math.min(Number(req.query['limit'] ?? 5), 20)
      const docs  = await this.service.listUpcomingForUser(req.user!.id, limit)
      sendSuccess(res, docs.map(toDTO))
    } catch (err) { next(err) }
  }

  /* ── Admin / instructor handlers ─────────────────── */

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
        meetingUrl:     string
        instructorId?:  string
      }
      const live = await this.service.create({
        courseId:       dto.courseId,
        instructorId:   dto.instructorId ?? req.user!.id,
        title:          dto.title,
        description:    dto.description,
        scheduledStart: new Date(dto.scheduledStart),
        durationMins:   dto.durationMins,
        meetingUrl:     dto.meetingUrl,
      })
      sendSuccess(res, toDTO(live), 'Live class scheduled', 201)
    } catch (err) { next(err) }
  }

  adminUpdate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id   = String(req.params['id'] ?? '')
      const dto  = req.body as Record<string, unknown>
      const data: Parameters<LiveClassService['update']>[1] = {}
      if (typeof dto['title']          === 'string')  data.title          = dto['title']
      if (typeof dto['description']    === 'string')  data.description    = dto['description']
      if (typeof dto['scheduledStart'] === 'string')  data.scheduledStart = new Date(dto['scheduledStart'])
      if (typeof dto['durationMins']   === 'number')  data.durationMins   = dto['durationMins']
      if (typeof dto['meetingUrl']     === 'string')  data.meetingUrl     = dto['meetingUrl']
      if (typeof dto['cancelled']      === 'boolean') data.cancelled      = dto['cancelled']
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
}
