import { Types } from 'mongoose'
import type { AchievementKind } from '@/types/index.ts'
import { BaseRepository } from './base.repository.ts'
import { UserAchievementModel, type IUserAchievement } from '@/models/schema.ts'

export class AchievementRepository extends BaseRepository<IUserAchievement> {
  constructor() {
    super(UserAchievementModel)
  }

  async listForUser(userId: string): Promise<IUserAchievement[]> {
    return this.model.find({ userId: new Types.ObjectId(userId) }).sort({ earnedAt: -1 }).exec()
  }

  /** Returns true if the achievement was newly awarded, false if already existed */
  async awardIfNew(
    userId: string,
    kind: AchievementKind,
    data: { title: string; description: string; icon: string; metadata?: Record<string, unknown> },
  ): Promise<{ awarded: boolean; achievement: IUserAchievement }> {
    const existing = await this.model.findOne({
      userId: new Types.ObjectId(userId),
      kind,
    }).exec()
    if (existing) return { awarded: false, achievement: existing }

    const achievement = await this.model.create({
      userId: new Types.ObjectId(userId),
      kind,
      ...data,
      earnedAt: new Date(),
    })
    return { awarded: true, achievement }
  }

  async hasAchievement(userId: string, kind: AchievementKind): Promise<boolean> {
    const doc = await this.model.exists({ userId: new Types.ObjectId(userId), kind }).exec()
    return !!doc
  }
}
