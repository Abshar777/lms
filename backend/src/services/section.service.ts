import { Types } from 'mongoose'
import { SectionRepository } from '@/repositories/section.repository.ts'
import { CourseRepository } from '@/repositories/course.repository.ts'
import { LessonRepository } from '@/repositories/lesson.repository.ts'
import type { ISection } from '@/models/schema.ts'

/* ─── Domain error ──────────────────────────────────── */
export class OutlineError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 400,
  ) {
    super(message)
    this.name = 'OutlineError'
  }
}

interface CreateInput {
  courseId: string
  title:    string
}

interface UpdateInput {
  title?: string
  order?: number
}

export class SectionService {
  private readonly repo       = new SectionRepository()
  private readonly courseRepo = new CourseRepository()
  private readonly lessonRepo = new LessonRepository()

  /* Ownership check: throws if the course is not editable by this user.
     - Admins always pass.
     - Instructors must own the course. */
  async assertCourseEditable(courseId: string, userId: string, role: string, categoryScope?: string): Promise<void> {
    if (!Types.ObjectId.isValid(courseId)) {
      throw new OutlineError('INVALID_ID', 'Invalid course id', 400)
    }
    const course = await this.courseRepo.findById_(courseId)
    if (!course) throw new OutlineError('COURSE_NOT_FOUND', 'Course not found.', 404)

    // Full-platform admins — no restrictions
    if (role === 'super_admin' || role === 'admin') return

    // Category-scoped admins — can only edit their program's courses
    if ((role === '4x_admin' || role === 'digital_marketing_admin') && categoryScope) {
      if ((course as any).program === categoryScope) return
      throw new OutlineError('FORBIDDEN', 'You can only edit courses in your program.', 403)
    }

    // Teaching staff — only own courses
    if (role === 'instructor' && String((course as any).instructorId?._id ?? course.instructorId) === userId) return

    throw new OutlineError('FORBIDDEN', 'You do not have permission to edit this course.', 403)
  }

  /** Convenience: look up lesson → course, then assertCourseEditable. */
  async assertLessonEditable(lessonId: string, userId: string, role: string, categoryScope?: string): Promise<void> {
    if (!Types.ObjectId.isValid(lessonId)) {
      throw new OutlineError('INVALID_ID', 'Invalid lesson id', 400)
    }
    const lesson = await this.lessonRepo.findById(lessonId)
    if (!lesson) throw new OutlineError('LESSON_NOT_FOUND', 'Lesson not found', 404)
    await this.assertCourseEditable(String(lesson.courseId), userId, role, categoryScope)
  }

  async list(courseId: string): Promise<ISection[]> {
    if (!Types.ObjectId.isValid(courseId)) {
      throw new OutlineError('INVALID_ID', 'Invalid course id', 400)
    }
    return this.repo.findByCourseOrdered(courseId)
  }

  async create(input: CreateInput): Promise<ISection> {
    if (!Types.ObjectId.isValid(input.courseId)) {
      throw new OutlineError('INVALID_ID', 'Invalid course id', 400)
    }
    const existingCount = await this.repo.countByCourse(input.courseId)
    return this.repo.create({
      courseId: new Types.ObjectId(input.courseId) as unknown as ISection['courseId'],
      title:    input.title.trim(),
      order:    existingCount,
    } as Partial<ISection>)
  }

  async update(id: string, input: UpdateInput): Promise<ISection> {
    if (!Types.ObjectId.isValid(id)) {
      throw new OutlineError('INVALID_ID', 'Invalid section id', 400)
    }
    const update: Partial<ISection> = {}
    if (input.title !== undefined) update.title = input.title.trim()
    if (input.order !== undefined) update.order = input.order
    const doc = await this.repo.updateById(id, update)
    if (!doc) throw new OutlineError('SECTION_NOT_FOUND', 'Section not found.', 404)
    return doc
  }

  async delete(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new OutlineError('INVALID_ID', 'Invalid section id', 400)
    }
    const existing = await this.repo.findById(id)
    if (!existing) throw new OutlineError('SECTION_NOT_FOUND', 'Section not found.', 404)
    await this.repo.deleteCascade(id)
    /* Recompute course duration after removing lessons. */
    await this.recomputeCourseDuration(String(existing.courseId))
  }

  async reorder(courseId: string, sectionIds: string[]): Promise<ISection[]> {
    if (!Types.ObjectId.isValid(courseId)) {
      throw new OutlineError('INVALID_ID', 'Invalid course id', 400)
    }
    if (!Array.isArray(sectionIds) || sectionIds.some(id => !Types.ObjectId.isValid(id))) {
      throw new OutlineError('INVALID_ID', 'Invalid section id list', 400)
    }
    try {
      await this.repo.reorder(courseId, sectionIds)
    } catch (err) {
      throw new OutlineError('REORDER_MISMATCH', (err as Error).message, 400)
    }
    return this.repo.findByCourseOrdered(courseId)
  }

  /* Sum lesson durations into Course.durationMins. Called after any
     outline mutation that can change total length. */
  private async recomputeCourseDuration(courseId: string): Promise<void> {
    const lessons = await this.lessonRepo.findByCourseOrdered(courseId)
    const total = lessons.reduce((acc, l) => acc + (l.durationMins ?? 0), 0)
    await this.courseRepo.updateOne_(courseId, { durationMins: total })
  }
}
