import type { Request, Response, NextFunction } from 'express'
import { CourseService } from '@/services/course.service.ts'
import { CategoryService } from '@/services/category.service.ts'
import { UserService } from '@/services/user.service.ts'
import { ReviewService } from '@/services/review.service.ts'
import { AdminService } from '@/services/admin.service.ts'
import { SectionService } from '@/services/section.service.ts'
import { LessonService } from '@/services/lesson.service.ts'
import { LessonRepository } from '@/repositories/lesson.repository.ts'
import { SectionRepository } from '@/repositories/section.repository.ts'
import { sendSuccess, buildPaginationMeta, parsePagination } from '@/utils/response.ts'
import { toCourseDTO } from '@/utils/courseDTO.ts'
import type { UserRole } from '@/types/index.ts'

export class AdminController {
  private readonly courseService   = new CourseService()
  private readonly categoryService = new CategoryService()
  private readonly userService     = new UserService()
  private readonly reviewService   = new ReviewService()
  private readonly admin           = new AdminService()
  private readonly sectionService  = new SectionService()
  private readonly lessonService   = new LessonService()
  private readonly lessonRepo      = new LessonRepository()
  private readonly sectionRepo     = new SectionRepository()

  /* ─── Dashboard stats ─────────────────────────── */
  stats = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      sendSuccess(res, await this.admin.getStats())
    } catch (err) { next(err) }
  }

  /* ─── Courses (any status) ──────────────────────
     Admins see everything; instructors only see their own. */
  listCourses = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { page, per_page } = parsePagination(req.query as Record<string, unknown>)
      const q = req.query as Record<string, string | undefined>
      const isInstructor = req.user!.role === 'instructor'
      const { docs, totalCount } = await this.courseService.listAdmin({
        page,
        perPage:      per_page,
        search:       q['search']?.trim() || undefined,
        status:       (q['status'] as 'draft' | 'published' | 'archived' | 'all' | undefined) ?? 'all',
        level:        q['level'] as 'beginner' | 'intermediate' | 'advanced' | undefined,
        category:     q['category']?.trim() || undefined,
        free:         q['free'] === 'true',
        sort:         q['sort'] as 'popular' | 'rating' | 'newest' | 'price_lo' | 'price_hi' | undefined,
        instructorId: isInstructor ? req.user!.id : undefined,
      })
      const counts = await Promise.all(docs.map(c => this.lessonRepo.countByCourse(c.id)))
      const dtos   = docs.map((c, i) => toCourseDTO(c, counts[i]))
      const meta   = buildPaginationMeta(totalCount, page, per_page)
      sendSuccess(res, dtos, undefined, 200, meta)
    } catch (err) { next(err) }
  }

  getCourse = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params['id'] ?? '')
      const course = await this.courseService.getById(id)
      /* Instructors may only read their own courses. */
      await this.sectionService.assertCourseEditable(course.id, req.user!.id, req.user!.role)
      const lessonCount = await this.lessonRepo.countByCourse(course.id)
      sendSuccess(res, toCourseDTO(course, lessonCount))
    } catch (err) { next(err) }
  }

  createCourse = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = req.body as {
        title:         string
        slug:          string
        description?:  string
        thumbnailUrl?: string
        previewUrl?:   string
        price:         number
        isFree:        boolean
        status:        'draft' | 'published' | 'archived'
        level?:        'beginner' | 'intermediate' | 'advanced'
        language:      string
        tags?:         string[] | string
        categoryId?:   string
        instructorId?: string
      }

      const tags = typeof dto.tags === 'string'
        ? dto.tags.split(',').map(t => t.trim()).filter(Boolean)
        : (dto.tags ?? [])

      /* Instructors can only author their own courses; admins may assign
         the course to any instructor (or default to themselves). */
      const isAdmin = req.user!.role === 'admin'
      const instructorId = isAdmin
        ? (dto.instructorId ?? req.user!.id)
        : req.user!.id

      const course = await this.courseService.create({
        title:        dto.title,
        slug:         dto.slug,
        description:  dto.description,
        thumbnailUrl: dto.thumbnailUrl,
        previewUrl:   dto.previewUrl,
        price:        dto.price,
        isFree:       dto.isFree,
        status:       dto.status,
        level:        dto.level,
        language:     dto.language,
        tags,
        instructorId,
        categoryId:   dto.categoryId,
      })
      sendSuccess(res, toCourseDTO(course, 0), 'Course created', 201)
    } catch (err) { next(err) }
  }

  updateCourse = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id  = String(req.params['id'] ?? '')
      await this.sectionService.assertCourseEditable(id, req.user!.id, req.user!.role)
      const dto = req.body as Record<string, unknown>
      /* Instructors cannot reassign their course to a different author. */
      if (req.user!.role !== 'admin') delete dto['instructorId']
      const tags = typeof dto['tags'] === 'string'
        ? (dto['tags'] as string).split(',').map(t => t.trim()).filter(Boolean)
        : (dto['tags'] as string[] | undefined)
      const course = await this.courseService.update(id, { ...dto, tags } as Parameters<CourseService['update']>[1])
      const lessonCount = await this.lessonRepo.countByCourse(course.id)
      sendSuccess(res, toCourseDTO(course, lessonCount), 'Course updated')
    } catch (err) { next(err) }
  }

  deleteCourse = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params['id'] ?? '')
      await this.sectionService.assertCourseEditable(id, req.user!.id, req.user!.role)
      await this.courseService.delete(id)
      sendSuccess(res, null, 'Course deleted')
    } catch (err) { next(err) }
  }

  /* ─── Categories CRUD ─────────────────────────── */
  listCategories = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { sendSuccess(res, await this.categoryService.listAll()) } catch (err) { next(err) }
  }

  createCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const c = await this.categoryService.create(req.body)
      sendSuccess(res, c, 'Category created', 201)
    } catch (err) { next(err) }
  }

  updateCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const c = await this.categoryService.update(String(req.params['id'] ?? ''), req.body)
      sendSuccess(res, c, 'Category updated')
    } catch (err) { next(err) }
  }

  deleteCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.categoryService.delete(String(req.params['id'] ?? ''))
      sendSuccess(res, null, 'Category deleted')
    } catch (err) { next(err) }
  }

  /* ─── Users ───────────────────────────────────── */
  listUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { page, per_page } = parsePagination(req.query as Record<string, unknown>)
      const role = ((req.query['role'] as string) ?? 'student') as UserRole
      const search = (req.query['search'] as string | undefined)?.trim() || undefined
      const { docs, totalCount } = await this.userService.listByRole(role, { page, perPage: per_page, search })
      const meta = buildPaginationMeta(totalCount, page, per_page)
      sendSuccess(res, docs, undefined, 200, meta)
    } catch (err) { next(err) }
  }

  /* ─── Reviews (global) ────────────────────────── */
  listReviews = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { page, per_page } = parsePagination(req.query as Record<string, unknown>)
      const { docs, totalCount } = await this.reviewService.listAll(page, per_page)
      const meta = buildPaginationMeta(totalCount, page, per_page)
      sendSuccess(res, docs, undefined, 200, meta)
    } catch (err) { next(err) }
  }

  deleteReview = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.reviewService.adminDelete(String(req.params['id'] ?? ''))
      sendSuccess(res, null, 'Review deleted')
    } catch (err) { next(err) }
  }

  /* ─── User actions ────────────────────────────── */
  updateUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params['id'] ?? '')
      const dto = req.body as { role?: UserRole; isActive?: boolean; isVerified?: boolean }
      const user = await this.userService.adminUpdate(id, dto)
      sendSuccess(res, user, 'User updated')
    } catch (err) { next(err) }
  }

  /* ─── Sections ────────────────────────────────── */
  listSections = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const courseId = String(req.params['courseId'] ?? '')
      const sections = await this.sectionService.list(courseId)
      sendSuccess(res, sections)
    } catch (err) { next(err) }
  }

  createSection = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const courseId = String(req.params['courseId'] ?? '')
      const { title } = req.body as { title: string }
      await this.sectionService.assertCourseEditable(courseId, req.user!.id, req.user!.role)
      const section = await this.sectionService.create({ courseId, title })
      sendSuccess(res, section, 'Section created', 201)
    } catch (err) { next(err) }
  }

  updateSection = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params['id'] ?? '')
      const dto = req.body as { title?: string; order?: number }
      /* Look up course to verify edit permission. */
      const section = await this.sectionRepo.findById(id)
      if (section) {
        await this.sectionService.assertCourseEditable(String(section.courseId), req.user!.id, req.user!.role)
      }
      const updated = await this.sectionService.update(id, dto)
      sendSuccess(res, updated, 'Section updated')
    } catch (err) { next(err) }
  }

  deleteSection = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params['id'] ?? '')
      const section = await this.sectionRepo.findById(id)
      if (section) {
        await this.sectionService.assertCourseEditable(String(section.courseId), req.user!.id, req.user!.role)
      }
      await this.sectionService.delete(id)
      sendSuccess(res, null, 'Section deleted')
    } catch (err) { next(err) }
  }

  reorderSections = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const courseId = String(req.params['courseId'] ?? '')
      const { ids } = req.body as { ids: string[] }
      await this.sectionService.assertCourseEditable(courseId, req.user!.id, req.user!.role)
      const sections = await this.sectionService.reorder(courseId, ids)
      sendSuccess(res, sections, 'Sections reordered')
    } catch (err) { next(err) }
  }

  /* ─── Lessons ─────────────────────────────────── */
  createLesson = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = req.body as Parameters<LessonService['create']>[0]
      /* Permission check via section → course */
      const section = await this.sectionRepo.findById(dto.sectionId)
      if (section) {
        await this.sectionService.assertCourseEditable(String(section.courseId), req.user!.id, req.user!.role)
      }
      const lesson = await this.lessonService.create(dto)
      sendSuccess(res, lesson, 'Lesson created', 201)
    } catch (err) { next(err) }
  }

  updateLesson = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params['id'] ?? '')
      const existing = await this.lessonRepo.findById(id)
      if (existing) {
        await this.sectionService.assertCourseEditable(String(existing.courseId), req.user!.id, req.user!.role)
      }
      const updated = await this.lessonService.update(id, req.body as Parameters<LessonService['update']>[1])
      sendSuccess(res, updated, 'Lesson updated')
    } catch (err) { next(err) }
  }

  deleteLesson = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params['id'] ?? '')
      const existing = await this.lessonRepo.findById(id)
      if (existing) {
        await this.sectionService.assertCourseEditable(String(existing.courseId), req.user!.id, req.user!.role)
      }
      await this.lessonService.delete(id)
      sendSuccess(res, null, 'Lesson deleted')
    } catch (err) { next(err) }
  }

  reorderLessons = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const sectionId = String(req.params['sectionId'] ?? '')
      const { ids } = req.body as { ids: string[] }
      const section = await this.sectionRepo.findById(sectionId)
      if (section) {
        await this.sectionService.assertCourseEditable(String(section.courseId), req.user!.id, req.user!.role)
      }
      const lessons = await this.lessonService.reorderInSection(sectionId, ids)
      sendSuccess(res, lessons, 'Lessons reordered')
    } catch (err) { next(err) }
  }

  moveLesson = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const lessonId = String(req.params['id'] ?? '')
      const { sectionId } = req.body as { sectionId: string }
      const existing = await this.lessonRepo.findById(lessonId)
      if (existing) {
        await this.sectionService.assertCourseEditable(String(existing.courseId), req.user!.id, req.user!.role)
      }
      const lesson = await this.lessonService.moveToSection(lessonId, sectionId)
      sendSuccess(res, lesson, 'Lesson moved')
    } catch (err) { next(err) }
  }

  /* ─── Course outline (sections + lessons in one call) ─── */
  getOutline = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const courseId = String(req.params['id'] ?? '')
      const [sections, lessons] = await Promise.all([
        this.sectionRepo.findByCourseOrdered(courseId),
        this.lessonRepo.findByCourseOrdered(courseId),
      ])
      sendSuccess(res, { sections, lessons })
    } catch (err) { next(err) }
  }

  /* ─── Analytics extensions ────────────────────── */
  enrollmentsTimeseries = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const days = Math.min(180, Math.max(7, Number(req.query['days'] ?? 30)))
      const data = await this.admin.enrollmentsTimeseries(days)
      sendSuccess(res, data)
    } catch (err) { next(err) }
  }

  topCourses = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const limit = Math.min(20, Math.max(1, Number(req.query['limit'] ?? 5)))
      const data  = await this.admin.topCourses(limit)
      sendSuccess(res, data)
    } catch (err) { next(err) }
  }

  completionStats = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { sendSuccess(res, await this.admin.completionStats()) } catch (err) { next(err) }
  }
}
