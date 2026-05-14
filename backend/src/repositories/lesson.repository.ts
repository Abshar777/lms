import { Types } from 'mongoose'
import { BaseRepository } from './base.repository.ts'
import { LessonModel, LessonProgressModel, type ILesson } from '@/models/schema.ts'

export class LessonRepository extends BaseRepository<ILesson> {
  constructor() {
    super(LessonModel)
  }

  async findByCourseOrdered(courseId: string | Types.ObjectId): Promise<ILesson[]> {
    return LessonModel
      .find({ courseId })
      .sort({ order: 1 })
      .exec()
  }

  async findBySectionOrdered(sectionId: string | Types.ObjectId): Promise<ILesson[]> {
    return LessonModel
      .find({ sectionId })
      .sort({ order: 1 })
      .exec()
  }

  async countByCourse(courseId: string | Types.ObjectId): Promise<number> {
    return LessonModel.countDocuments({ courseId }).exec()
  }

  async deleteCascade(lessonId: string | Types.ObjectId): Promise<void> {
    /* Remove the lesson + any LessonProgress rows so completion math
       stays correct (orphan progress would inflate progressPercent). */
    await Promise.all([
      LessonModel.deleteOne({ _id: lessonId }).exec(),
      LessonProgressModel.deleteMany({ lessonId }).exec(),
    ])
  }

  async reorderInSection(sectionId: string, ids: string[]): Promise<void> {
    const docs = await LessonModel.find({ sectionId, _id: { $in: ids } }).select('_id').exec()
    if (docs.length !== ids.length) {
      throw new Error('Some lessons do not belong to this section')
    }
    await Promise.all(
      ids.map((id, idx) =>
        LessonModel.updateOne({ _id: id }, { $set: { order: idx } }).exec()
      ),
    )
  }
}
