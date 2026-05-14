import { Types } from 'mongoose'
import { LessonRepository } from '@/repositories/lesson.repository.ts'
import { SectionRepository } from '@/repositories/section.repository.ts'
import { CourseRepository } from '@/repositories/course.repository.ts'
import { OutlineError } from './section.service.ts'
import type { ILesson } from '@/models/schema.ts'
import type { LessonType } from '@/types/index.ts'

interface CreateInput {
  sectionId:    string
  title:        string
  type?:        LessonType
  contentUrl?:  string
  contentBody?: string
  durationMins?: number
  isFree?:      boolean
}

interface UpdateInput {
  title?:        string
  type?:         LessonType
  contentUrl?:   string
  contentBody?:  string
  durationMins?: number
  isFree?:       boolean
  order?:        number
}

export class LessonService {
  private readonly repo        = new LessonRepository()
  private readonly sectionRepo = new SectionRepository()
  private readonly courseRepo  = new CourseRepository()

  async create(input: CreateInput): Promise<ILesson> {
    if (!Types.ObjectId.isValid(input.sectionId)) {
      throw new OutlineError('INVALID_ID', 'Invalid section id', 400)
    }
    const section = await this.sectionRepo.findById(input.sectionId)
    if (!section) throw new OutlineError('SECTION_NOT_FOUND', 'Section not found.', 404)

    const order = await this.repo.count({ sectionId: section.id })
    const lesson = await this.repo.create({
      sectionId:    new Types.ObjectId(section.id) as unknown as ILesson['sectionId'],
      courseId:     section.courseId,
      title:        input.title.trim(),
      type:         input.type ?? 'video',
      contentUrl:   input.contentUrl,
      contentBody:  input.contentBody,
      durationMins: input.durationMins ?? 0,
      order,
      isFree:       input.isFree ?? false,
    } as Partial<ILesson>)
    await this.recomputeCourseDuration(String(section.courseId))
    return lesson
  }

  async update(id: string, input: UpdateInput): Promise<ILesson> {
    if (!Types.ObjectId.isValid(id)) {
      throw new OutlineError('INVALID_ID', 'Invalid lesson id', 400)
    }
    const existing = await this.repo.findById(id)
    if (!existing) throw new OutlineError('LESSON_NOT_FOUND', 'Lesson not found.', 404)

    const update: Partial<ILesson> = {}
    if (input.title        !== undefined) update.title        = input.title.trim()
    if (input.type         !== undefined) update.type         = input.type
    if (input.contentUrl   !== undefined) update.contentUrl   = input.contentUrl || undefined
    if (input.contentBody  !== undefined) update.contentBody  = input.contentBody || undefined
    if (input.durationMins !== undefined) update.durationMins = Math.max(0, input.durationMins)
    if (input.isFree       !== undefined) update.isFree       = input.isFree
    if (input.order        !== undefined) update.order        = input.order

    const updated = await this.repo.updateById(id, update)
    if (!updated) throw new OutlineError('LESSON_NOT_FOUND', 'Lesson not found.', 404)

    if (input.durationMins !== undefined) {
      await this.recomputeCourseDuration(String(existing.courseId))
    }
    return updated
  }

  async delete(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new OutlineError('INVALID_ID', 'Invalid lesson id', 400)
    }
    const existing = await this.repo.findById(id)
    if (!existing) throw new OutlineError('LESSON_NOT_FOUND', 'Lesson not found.', 404)
    await this.repo.deleteCascade(id)
    await this.recomputeCourseDuration(String(existing.courseId))
  }

  /* Reorder lessons within a single section (drag-to-reorder within a section). */
  async reorderInSection(sectionId: string, lessonIds: string[]): Promise<ILesson[]> {
    if (!Types.ObjectId.isValid(sectionId)) {
      throw new OutlineError('INVALID_ID', 'Invalid section id', 400)
    }
    if (!Array.isArray(lessonIds) || lessonIds.some(id => !Types.ObjectId.isValid(id))) {
      throw new OutlineError('INVALID_ID', 'Invalid lesson id list', 400)
    }
    try {
      await this.repo.reorderInSection(sectionId, lessonIds)
    } catch (err) {
      throw new OutlineError('REORDER_MISMATCH', (err as Error).message, 400)
    }
    return this.repo.findBySectionOrdered(sectionId)
  }

  /* Move a lesson to a different section while preserving total ordering.
     Lands the lesson at the end of its new section. */
  async moveToSection(lessonId: string, newSectionId: string): Promise<ILesson> {
    if (!Types.ObjectId.isValid(lessonId) || !Types.ObjectId.isValid(newSectionId)) {
      throw new OutlineError('INVALID_ID', 'Invalid id', 400)
    }
    const lesson = await this.repo.findById(lessonId)
    if (!lesson) throw new OutlineError('LESSON_NOT_FOUND', 'Lesson not found.', 404)

    const section = await this.sectionRepo.findById(newSectionId)
    if (!section) throw new OutlineError('SECTION_NOT_FOUND', 'Target section not found.', 404)

    /* Must stay within the same course — moving across courses isn't supported. */
    if (String(section.courseId) !== String(lesson.courseId)) {
      throw new OutlineError(
        'SECTION_MISMATCH',
        'Lesson can only move to a section in the same course.',
        400,
      )
    }

    const newOrder = await this.repo.count({ sectionId: section.id })
    const updated  = await this.repo.updateById(lessonId, {
      sectionId: new Types.ObjectId(section.id) as unknown as ILesson['sectionId'],
      order:     newOrder,
    } as Partial<ILesson>)
    if (!updated) throw new OutlineError('LESSON_NOT_FOUND', 'Lesson not found.', 404)
    return updated
  }

  private async recomputeCourseDuration(courseId: string): Promise<void> {
    const lessons = await this.repo.findByCourseOrdered(courseId)
    const total   = lessons.reduce((acc, l) => acc + (l.durationMins ?? 0), 0)
    await this.courseRepo.updateOne_(courseId, { durationMins: total })
  }
}
