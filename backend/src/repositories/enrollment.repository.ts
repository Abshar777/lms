import { Types } from 'mongoose'
import { BaseRepository } from './base.repository.ts'
import { EnrollmentModel, type IEnrollment } from '@/models/schema.ts'

export class EnrollmentRepository extends BaseRepository<IEnrollment> {
  constructor() {
    super(EnrollmentModel)
  }

  async findByUserCourse(
    userId: string | Types.ObjectId,
    courseId: string | Types.ObjectId,
  ): Promise<IEnrollment | null> {
    return EnrollmentModel.findOne({ userId, courseId }).exec()
  }

  async listForUser(userId: string | Types.ObjectId): Promise<IEnrollment[]> {
    return EnrollmentModel
      .find({ userId })
      .sort({ updatedAt: -1 })
      .populate({
        path: 'courseId',
        populate: [
          { path: 'instructorId', select: 'name avatarUrl' },
          { path: 'categoryId',   select: 'name slug' },
        ],
      })
      .exec()
  }

  async create_(data: {
    userId:   string | Types.ObjectId
    courseId: string | Types.ObjectId
  }): Promise<IEnrollment> {
    return EnrollmentModel.create({
      userId:          data.userId,
      courseId:        data.courseId,
      status:          'active',
      progressPercent: 0,
      enrolledAt:      new Date(),
    })
  }

  async updateProgress(
    enrollmentId: string | Types.ObjectId,
    update: { progressPercent: number; status?: 'active' | 'completed' | 'dropped'; completedAt?: Date; lastLessonId?: string | Types.ObjectId },
  ): Promise<void> {
    await EnrollmentModel.updateOne({ _id: enrollmentId }, { $set: update }).exec()
  }

  async setLastLesson(
    enrollmentId: string | Types.ObjectId,
    lessonId: string | Types.ObjectId,
  ): Promise<void> {
    await EnrollmentModel.updateOne(
      { _id: enrollmentId },
      { $set: { lastLessonId: lessonId } },
    ).exec()
  }
}
