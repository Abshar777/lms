import { Types } from 'mongoose'
import { BaseRepository } from './base.repository.ts'
import { FavoriteModel, type IFavorite } from '@/models/schema.ts'

export class FavoriteRepository extends BaseRepository<IFavorite> {
  constructor() {
    super(FavoriteModel)
  }

  async upsert(userId: string | Types.ObjectId, courseId: string | Types.ObjectId): Promise<IFavorite | null> {
    /* `upsert: true` + ignore duplicate-key on unique compound index. */
    return FavoriteModel.findOneAndUpdate(
      { userId, courseId },
      { $setOnInsert: { userId, courseId } },
      { upsert: true, new: true },
    ).exec()
  }

  async remove(userId: string | Types.ObjectId, courseId: string | Types.ObjectId): Promise<boolean> {
    const r = await FavoriteModel.deleteOne({ userId, courseId }).exec()
    return (r.deletedCount ?? 0) > 0
  }

  async exists_(userId: string | Types.ObjectId, courseId: string | Types.ObjectId): Promise<boolean> {
    const f = await FavoriteModel.exists({ userId, courseId }).exec()
    return !!f
  }

  async listForUser(
    userId: string | Types.ObjectId,
    params: { page: number; perPage: number },
  ): Promise<{ docs: IFavorite[]; totalCount: number }> {
    const filter = { userId }
    const [docs, totalCount] = await Promise.all([
      FavoriteModel.find(filter)
        .sort({ createdAt: -1 })
        .skip((params.page - 1) * params.perPage)
        .limit(params.perPage)
        .populate({
          path: 'courseId',
          populate: [
            { path: 'instructorId', select: 'name avatarUrl' },
            { path: 'categoryId',   select: 'name slug' },
          ],
        })
        .exec(),
      FavoriteModel.countDocuments(filter).exec(),
    ])
    return { docs, totalCount }
  }

  async idsForUser(userId: string | Types.ObjectId, courseIds: Array<string | Types.ObjectId>): Promise<string[]> {
    if (courseIds.length === 0) return []
    const favs = await FavoriteModel.find({ userId, courseId: { $in: courseIds } })
      .select('courseId')
      .exec()
    return favs.map(f => String(f.courseId))
  }
}
