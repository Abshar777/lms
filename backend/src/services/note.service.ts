import { Types } from 'mongoose'
import { NoteRepository } from '@/repositories/note.repository.ts'
import { LessonModel } from '@/models/schema.ts'

export class NoteError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 400,
  ) {
    super(message)
    this.name = 'NoteError'
  }
}

export class NoteService {
  private readonly noteRepo = new NoteRepository()

  async upsert(userId: string, lessonId: string, body: string) {
    if (!Types.ObjectId.isValid(lessonId)) {
      throw new NoteError('INVALID_LESSON_ID', 'Invalid lesson id', 400)
    }
    const lesson = await LessonModel.findById(lessonId).select('courseId').exec()
    if (!lesson) throw new NoteError('LESSON_NOT_FOUND', 'Lesson not found', 404)

    return this.noteRepo.upsert(userId, lessonId, lesson.courseId.toString(), body)
  }

  async getForLesson(userId: string, lessonId: string) {
    if (!Types.ObjectId.isValid(lessonId)) {
      throw new NoteError('INVALID_LESSON_ID', 'Invalid lesson id', 400)
    }
    return this.noteRepo.findByUserLesson(userId, lessonId)
  }

  async listForCourse(userId: string, courseId: string) {
    if (!Types.ObjectId.isValid(courseId)) {
      throw new NoteError('INVALID_COURSE_ID', 'Invalid course id', 400)
    }
    return this.noteRepo.listByUserCourse(userId, courseId)
  }

  async delete(userId: string, lessonId: string) {
    if (!Types.ObjectId.isValid(lessonId)) {
      throw new NoteError('INVALID_LESSON_ID', 'Invalid lesson id', 400)
    }
    await this.noteRepo.deleteByUserLesson(userId, lessonId)
  }
}
