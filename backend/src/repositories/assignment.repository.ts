import { Types } from 'mongoose'
import { BaseRepository } from './base.repository.ts'
import { AssignmentModel, AssignmentSubmissionModel, type IAssignment, type IAssignmentSubmission } from '@/models/schema.ts'

export class AssignmentRepository extends BaseRepository<IAssignment> {
  constructor() {
    super(AssignmentModel)
  }

  async findByLesson(lessonId: string): Promise<IAssignment | null> {
    return this.model.findOne({ lessonId: new Types.ObjectId(lessonId) }).exec()
  }

  async upsertForLesson(
    lessonId: string,
    courseId: string,
    data: Pick<IAssignment, 'title' | 'instructions'> & Partial<Pick<IAssignment, 'dueDate' | 'maxScore'>>,
  ): Promise<IAssignment> {
    return this.model.findOneAndUpdate(
      { lessonId: new Types.ObjectId(lessonId) },
      { $set: { ...data, lessonId: new Types.ObjectId(lessonId), courseId: new Types.ObjectId(courseId) } },
      { new: true, upsert: true, runValidators: true },
    ).exec() as Promise<IAssignment>
  }

  async deleteByLesson(lessonId: string): Promise<void> {
    await this.model.deleteOne({ lessonId: new Types.ObjectId(lessonId) }).exec()
  }
}

export class AssignmentSubmissionRepository extends BaseRepository<IAssignmentSubmission> {
  constructor() {
    super(AssignmentSubmissionModel)
  }

  async findByUserAssignment(userId: string, assignmentId: string): Promise<IAssignmentSubmission | null> {
    return this.model.findOne({
      userId:       new Types.ObjectId(userId),
      assignmentId: new Types.ObjectId(assignmentId),
    }).exec()
  }

  async listByAssignment(assignmentId: string): Promise<IAssignmentSubmission[]> {
    return this.model.find({ assignmentId: new Types.ObjectId(assignmentId) })
      .populate('userId', 'name avatarUrl email')
      .sort({ createdAt: -1 })
      .exec()
  }

  async upsertSubmission(
    userId: string,
    assignmentId: string,
    courseId: string,
    data: { submissionUrl?: string; submissionText?: string },
  ): Promise<IAssignmentSubmission> {
    return this.model.findOneAndUpdate(
      { userId: new Types.ObjectId(userId), assignmentId: new Types.ObjectId(assignmentId) },
      { $set: { ...data, courseId: new Types.ObjectId(courseId), status: 'submitted' } },
      { new: true, upsert: true, runValidators: true },
    ).exec() as Promise<IAssignmentSubmission>
  }

  async grade(
    submissionId: string,
    graderId: string,
    grade: number,
    feedback?: string,
  ): Promise<IAssignmentSubmission | null> {
    return this.model.findByIdAndUpdate(
      submissionId,
      { $set: { grade, feedback, gradedBy: new Types.ObjectId(graderId), gradedAt: new Date(), status: 'graded' } },
      { new: true, runValidators: true },
    ).exec()
  }
}
