import { Types } from 'mongoose'
import { BaseRepository } from './base.repository.ts'
import { LiveClassModel, type ILiveClass } from '@/models/schema.ts'

export class LiveClassRepository extends BaseRepository<ILiveClass> {
  constructor() {
    super(LiveClassModel)
  }

  async listForCourse(courseId: string | Types.ObjectId): Promise<ILiveClass[]> {
    return LiveClassModel
      .find({ courseId })
      .sort({ scheduledStart: 1 })
      .populate('instructorId', 'name avatarUrl')
      .exec()
  }

  /* Upcoming sessions in a set of courses (used for "my upcoming" feed) */
  async listUpcomingForCourses(courseIds: Array<string | Types.ObjectId>, limit = 10): Promise<ILiveClass[]> {
    if (courseIds.length === 0) return []
    return LiveClassModel
      .find({
        courseId:       { $in: courseIds },
        cancelled:      false,
        scheduledStart: { $gte: new Date(Date.now() - 60 * 60_000) }, // include sessions starting in the last hour (might be live)
      })
      .sort({ scheduledStart: 1 })
      .limit(limit)
      .populate('courseId',     'title slug thumbnailUrl')
      .populate('instructorId', 'name avatarUrl')
      .exec()
  }

  async createOne(data: Partial<ILiveClass>): Promise<ILiveClass> {
    const created = await LiveClassModel.create(data)
    return (await this.findByIdPopulated(created.id)) as ILiveClass
  }

  async findByIdPopulated(id: string): Promise<ILiveClass | null> {
    return LiveClassModel
      .findById(id)
      .populate('courseId',     'title slug thumbnailUrl')
      .populate('instructorId', 'name avatarUrl')
      .exec()
  }

  async updateByIdPopulated(id: string, data: Partial<ILiveClass>): Promise<ILiveClass | null> {
    return LiveClassModel
      .findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true })
      .populate('courseId',     'title slug thumbnailUrl')
      .populate('instructorId', 'name avatarUrl')
      .exec()
  }
}
