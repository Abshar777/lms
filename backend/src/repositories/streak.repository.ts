import { Types } from 'mongoose'
import { BaseRepository } from './base.repository.ts'
import { UserStreakModel, type IUserStreak } from '@/models/schema.ts'

export class StreakRepository extends BaseRepository<IUserStreak> {
  constructor() {
    super(UserStreakModel)
  }

  async findByUser(userId: string): Promise<IUserStreak | null> {
    return this.model.findOne({ userId: new Types.ObjectId(userId) }).exec()
  }

  async upsertForUser(userId: string, update: Partial<IUserStreak>): Promise<IUserStreak> {
    return this.model.findOneAndUpdate(
      { userId: new Types.ObjectId(userId) },
      { $set: update },
      { new: true, upsert: true, runValidators: true },
    ).exec() as Promise<IUserStreak>
  }

  async incrementWeekProgress(userId: string): Promise<void> {
    await this.model.updateOne(
      { userId: new Types.ObjectId(userId) },
      { $inc: { weekProgress: 1 } },
    ).exec()
  }
}
