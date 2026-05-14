import { Types } from 'mongoose'
import { BaseRepository } from './base.repository.ts'
import { QuizAttemptModel, type IQuizAttempt } from '@/models/schema.ts'

export class QuizAttemptRepository extends BaseRepository<IQuizAttempt> {
  constructor() {
    super(QuizAttemptModel)
  }

  /** Count how many attempts a user has made on a quiz */
  async countByUserQuiz(userId: string, quizId: string): Promise<number> {
    return this.model.countDocuments({
      userId:  new Types.ObjectId(userId),
      quizId:  new Types.ObjectId(quizId),
    }).exec()
  }

  /** Get all attempts by a user for a quiz, newest first */
  async listByUserQuiz(userId: string, quizId: string): Promise<IQuizAttempt[]> {
    return this.model.find({
      userId:  new Types.ObjectId(userId),
      quizId:  new Types.ObjectId(quizId),
    }).sort({ attemptNumber: -1 }).exec()
  }

  /** Get best attempt (highest scorePercent) for a user/quiz */
  async bestAttempt(userId: string, quizId: string): Promise<IQuizAttempt | null> {
    return this.model.findOne({
      userId:  new Types.ObjectId(userId),
      quizId:  new Types.ObjectId(quizId),
    }).sort({ scorePercent: -1 }).exec()
  }

  /** Has the user ever passed this quiz? */
  async hasPassed(userId: string, quizId: string): Promise<boolean> {
    const doc = await this.model.exists({
      userId: new Types.ObjectId(userId),
      quizId: new Types.ObjectId(quizId),
      passed: true,
    }).exec()
    return !!doc
  }

  /** Analytics: per-quiz stats for admin (attempt count, avg score, pass rate) */
  async analyticsForCourse(courseId: string): Promise<Array<{
    quizId:     string
    attempts:   number
    avgScore:   number
    passRate:   number
  }>> {
    return this.model.aggregate([
      { $match: { courseId: new Types.ObjectId(courseId) } },
      { $group: {
          _id:        '$quizId',
          attempts:   { $sum: 1 },
          avgScore:   { $avg: '$scorePercent' },
          passCount:  { $sum: { $cond: ['$passed', 1, 0] } },
      }},
      { $project: {
          quizId:   { $toString: '$_id' },
          attempts:  1,
          avgScore:  { $round: ['$avgScore', 1] },
          passRate:  { $round: [{ $multiply: [{ $divide: ['$passCount', '$attempts'] }, 100] }, 1] },
      }},
    ]).exec()
  }

  /** Get all attempts from a user across a course (for progress tracking) */
  async listByCourseUser(userId: string, courseId: string): Promise<IQuizAttempt[]> {
    return this.model.find({
      userId:  new Types.ObjectId(userId),
      courseId: new Types.ObjectId(courseId),
    }).sort({ completedAt: -1 }).exec()
  }
}
