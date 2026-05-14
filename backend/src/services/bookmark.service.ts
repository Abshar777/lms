import { Types } from 'mongoose'
import { BookmarkRepository } from '@/repositories/bookmark.repository.ts'
import { LessonModel } from '@/models/schema.ts'

export class BookmarkError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 400,
  ) {
    super(message)
    this.name = 'BookmarkError'
  }
}

export class BookmarkService {
  private readonly bookmarkRepo = new BookmarkRepository()

  async create(userId: string, lessonId: string, dto: { timeSecs: number; label?: string }) {
    if (!Types.ObjectId.isValid(lessonId)) {
      throw new BookmarkError('INVALID_LESSON_ID', 'Invalid lesson id', 400)
    }
    if (dto.timeSecs < 0) {
      throw new BookmarkError('INVALID_TIME', 'timeSecs must be >= 0', 400)
    }
    const lesson = await LessonModel.findById(lessonId).select('courseId').exec()
    if (!lesson) throw new BookmarkError('LESSON_NOT_FOUND', 'Lesson not found', 404)

    return this.bookmarkRepo.create({
      userId,
      lessonId,
      courseId: lesson.courseId.toString(),
      timeSecs: Math.round(dto.timeSecs),
      label:    dto.label,
    })
  }

  async listForLesson(userId: string, lessonId: string) {
    if (!Types.ObjectId.isValid(lessonId)) {
      throw new BookmarkError('INVALID_LESSON_ID', 'Invalid lesson id', 400)
    }
    return this.bookmarkRepo.listByUserLesson(userId, lessonId)
  }

  async listForCourse(userId: string, courseId: string) {
    if (!Types.ObjectId.isValid(courseId)) {
      throw new BookmarkError('INVALID_COURSE_ID', 'Invalid course id', 400)
    }
    return this.bookmarkRepo.listByUserCourse(userId, courseId)
  }

  async delete(userId: string, bookmarkId: string) {
    if (!Types.ObjectId.isValid(bookmarkId)) {
      throw new BookmarkError('INVALID_BOOKMARK_ID', 'Invalid bookmark id', 400)
    }
    const deleted = await this.bookmarkRepo.deleteByIdAndUser(bookmarkId, userId)
    if (!deleted) {
      throw new BookmarkError('BOOKMARK_NOT_FOUND', 'Bookmark not found', 404)
    }
  }
}
