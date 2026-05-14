import { Types } from 'mongoose'
import { BaseRepository } from './base.repository.ts'
import { QuizModel, type IQuiz } from '@/models/schema.ts'

export class QuizRepository extends BaseRepository<IQuiz> {
  constructor() {
    super(QuizModel)
  }

  /** Find quiz by the lesson it belongs to */
  async findByLesson(lessonId: string): Promise<IQuiz | null> {
    return this.model.findOne({ lessonId: new Types.ObjectId(lessonId) }).exec()
  }

  /** Find all quizzes for a course (admin analytics) */
  async findByCourse(courseId: string): Promise<IQuiz[]> {
    return this.model.find({ courseId: new Types.ObjectId(courseId) }).exec()
  }

  /** Upsert quiz for a lesson — replaces the whole document */
  async upsertForLesson(
    lessonId: string,
    courseId: string,
    data: Omit<Partial<IQuiz>, 'lessonId' | 'courseId'>,
  ): Promise<IQuiz> {
    return this.model.findOneAndUpdate(
      { lessonId: new Types.ObjectId(lessonId) },
      { $set: { ...data, lessonId: new Types.ObjectId(lessonId), courseId: new Types.ObjectId(courseId) } },
      { new: true, upsert: true, runValidators: true },
    ).exec() as Promise<IQuiz>
  }

  /** Delete quiz tied to a lesson (cascade when lesson is deleted) */
  async deleteByLesson(lessonId: string): Promise<void> {
    await this.model.deleteOne({ lessonId: new Types.ObjectId(lessonId) }).exec()
  }
}
