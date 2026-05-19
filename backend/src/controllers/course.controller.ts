import type { Request, Response, NextFunction } from 'express'
import { CourseService } from '@/services/course.service.ts'
import { AINotesService } from '@/services/aiNotes.service.ts'
import { LessonRepository } from '@/repositories/lesson.repository.ts'
import { EnrollmentRepository } from '@/repositories/enrollment.repository.ts'
import { sendSuccess, buildPaginationMeta, parsePagination } from '@/utils/response.ts'
import { toCourseDTO, toSectionDTO, toLessonDTO } from '@/utils/courseDTO.ts'

export class CourseController {
  private readonly service      = new CourseService()
  private readonly aiNotes      = new AINotesService()
  private readonly lessonRepo   = new LessonRepository()
  private readonly enrollRepo   = new EnrollmentRepository()

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { page, per_page } = parsePagination(req.query as Record<string, unknown>)
      const q = req.query as Record<string, string | undefined>
      const toNum = (v?: string) => (v !== undefined && v !== '' && !isNaN(Number(v))) ? Number(v) : undefined
      const { docs, totalCount } = await this.service.listPublished({
        page,
        perPage:      per_page,
        search:       q['search']?.trim() || undefined,
        searchMode:   q['search_mode'] === 'prefix' ? 'prefix' : undefined,
        level:        q['level'] as 'beginner' | 'intermediate' | 'advanced' | undefined,
        category:     q['category']?.trim() || undefined,
        free:         q['free'] === 'true',
        instructorId: q['instructor']?.trim() || undefined,
        durationMin:  toNum(q['duration_min']),
        durationMax:  toNum(q['duration_max']),
        priceMin:     toNum(q['price_min']),
        priceMax:     toNum(q['price_max']),
        sort:         q['sort'],
      })

      /* For list view, fetch lesson counts in bulk so cards can show "N lessons" */
      const counts = await Promise.all(docs.map(c => this.lessonRepo.countByCourse(c.id)))
      const dtos = docs.map((c, i) => toCourseDTO(c, counts[i]))

      const meta = buildPaginationMeta(totalCount, page, per_page)
      sendSuccess(res, dtos, undefined, 200, meta)
    } catch (err) {
      next(err)
    }
  }

  getBySlug = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const slug = String(req.params['slug'] ?? '')
      const { course, sections, lessons } = await this.service.getBySlug(slug)

      /* Check enrollment so we can expose contentUrl for enrolled users */
      let isEnrolled = false
      if (req.user) {
        const enrollment = await this.enrollRepo.findByUserCourse(req.user.id, course.id)
        isEnrolled = !!enrollment
      }

      sendSuccess(res, {
        course:   toCourseDTO(course, lessons.length),
        sections: sections.map(toSectionDTO),
        lessons:  lessons.map(l => {
          const j = l.toJSON() as Record<string, unknown>
          return toLessonDTO(l, isEnrolled || (j['isFree'] as boolean) === true)
        }),
      })
    } catch (err) {
      next(err)
    }
  }

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params['id'] ?? '')
      const { course, sections, lessons } = await this.service.getByIdPublic(id)

      /* Check enrollment so we can expose contentUrl for enrolled users */
      let isEnrolled = false
      if (req.user) {
        const enrollment = await this.enrollRepo.findByUserCourse(req.user.id, course.id)
        isEnrolled = !!enrollment
      }

      sendSuccess(res, {
        course:   toCourseDTO(course, lessons.length),
        sections: sections.map(toSectionDTO),
        lessons:  lessons.map(l => {
          const j = l.toJSON() as Record<string, unknown>
          return toLessonDTO(l, isEnrolled || (j['isFree'] as boolean) === true)
        }),
      })
    } catch (err) {
      next(err)
    }
  }

  getAINotes = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const slug = String(req.params['slug'] ?? '')
      const notes = await this.aiNotes.getForSlug(slug)
      sendSuccess(res, notes)
    } catch (err) {
      next(err)
    }
  }

  getRatingHistogram = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const slug = String(req.params['slug'] ?? '')
      sendSuccess(res, await this.service.getRatingHistogram(slug))
    } catch (err) {
      next(err)
    }
  }

  /* 7.5 — Similar course recommendations */
  getRecommendations = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const slug = String(req.params['slug'] ?? '')
      const docs = await this.service.getRecommendations(slug)
      const counts = await Promise.all(docs.map(c => this.lessonRepo.countByCourse(c.id)))
      const dtos = docs.map((c, i) => toCourseDTO(c, counts[i]))
      sendSuccess(res, dtos)
    } catch (err) {
      next(err)
    }
  }
}
