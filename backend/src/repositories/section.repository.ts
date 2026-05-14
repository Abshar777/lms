import { Types } from 'mongoose'
import { BaseRepository } from './base.repository.ts'
import { SectionModel, LessonModel, type ISection } from '@/models/schema.ts'

export class SectionRepository extends BaseRepository<ISection> {
  constructor() {
    super(SectionModel)
  }

  async findByCourseOrdered(courseId: string | Types.ObjectId): Promise<ISection[]> {
    return SectionModel.find({ courseId }).sort({ order: 1 }).exec()
  }

  async countByCourse(courseId: string | Types.ObjectId): Promise<number> {
    return SectionModel.countDocuments({ courseId }).exec()
  }

  async deleteCascade(sectionId: string | Types.ObjectId): Promise<void> {
    /* Remove the section and any lessons belonging to it. Progress
       documents for those lessons are best-effort cleaned up too. */
    await Promise.all([
      SectionModel.deleteOne({ _id: sectionId }).exec(),
      LessonModel.deleteMany({ sectionId }).exec(),
    ])
  }

  async reorder(courseId: string, ids: string[]): Promise<void> {
    /* All-or-nothing: validate IDs belong to the course first. */
    const docs = await SectionModel.find({ courseId, _id: { $in: ids } }).select('_id').exec()
    if (docs.length !== ids.length) {
      throw new Error('Some sections do not belong to this course')
    }
    await Promise.all(
      ids.map((id, idx) =>
        SectionModel.updateOne({ _id: id }, { $set: { order: idx } }).exec()
      ),
    )
  }
}
