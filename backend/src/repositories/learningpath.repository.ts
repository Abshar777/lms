import { Types } from 'mongoose'
import { LearningPathModel, type ILearningPath } from '@/models/schema.ts'

export class LearningPathRepository {
  private readonly populateOpts = [
    { path: 'instructorId', select: 'name avatarUrl headline' },
    { path: 'categoryId',   select: 'name slug' },
    { path: 'courses.courseId', select: 'title slug thumbnailUrl isFree price level durationMins enrolledCount ratingAvg' },
  ]

  async create(data: Partial<ILearningPath>): Promise<ILearningPath> {
    const doc = new LearningPathModel(data)
    return doc.save()
  }

  async findBySlug(slug: string, populateCourses = false): Promise<ILearningPath | null> {
    const q = LearningPathModel.findOne({ slug })
    if (populateCourses) {
      for (const opt of this.populateOpts) q.populate(opt)
    }
    return q.exec()
  }

  async findById(id: string | Types.ObjectId, populateCourses = false): Promise<ILearningPath | null> {
    const q = LearningPathModel.findById(id)
    if (populateCourses) {
      for (const opt of this.populateOpts) q.populate(opt)
    }
    return q.exec()
  }

  async listPublished(
    page:    number,
    perPage: number,
    categoryId?: string,
  ): Promise<{ docs: ILearningPath[]; total: number }> {
    const filter: Record<string, unknown> = { status: 'published' }
    if (categoryId) filter['categoryId'] = new Types.ObjectId(categoryId)

    const [docs, total] = await Promise.all([
      LearningPathModel
        .find(filter)
        .populate({ path: 'instructorId', select: 'name avatarUrl' })
        .populate({ path: 'categoryId',   select: 'name slug' })
        .sort({ enrolledCount: -1, createdAt: -1 })
        .skip((page - 1) * perPage)
        .limit(perPage)
        .exec(),
      LearningPathModel.countDocuments(filter),
    ])
    return { docs, total }
  }

  async listAll(page: number, perPage: number): Promise<{ docs: ILearningPath[]; total: number }> {
    const [docs, total] = await Promise.all([
      LearningPathModel
        .find()
        .populate({ path: 'instructorId', select: 'name avatarUrl' })
        .sort({ createdAt: -1 })
        .skip((page - 1) * perPage)
        .limit(perPage)
        .exec(),
      LearningPathModel.countDocuments(),
    ])
    return { docs, total }
  }

  async update(id: string | Types.ObjectId, patch: Partial<ILearningPath>): Promise<ILearningPath | null> {
    return LearningPathModel.findByIdAndUpdate(id, patch, { new: true }).exec()
  }

  async deleteById(id: string | Types.ObjectId): Promise<void> {
    await LearningPathModel.findByIdAndDelete(id).exec()
  }

  async incrementEnrollment(id: string | Types.ObjectId, delta: number): Promise<void> {
    await LearningPathModel.findByIdAndUpdate(id, { $inc: { enrolledCount: delta } }).exec()
  }
}
