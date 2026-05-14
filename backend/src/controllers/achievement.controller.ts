import type { Request, Response, NextFunction } from 'express'
import { AchievementService } from '@/services/achievement.service.ts'
import { sendSuccess } from '@/utils/response.ts'

export class AchievementController {
  private readonly service = new AchievementService()

  myAchievements = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const items = await this.service.getForUser(req.user!.id)
      const earnedCount = items.filter(a => a.earned).length
      sendSuccess(res, { items, earnedCount, total: items.length })
    } catch (err) { next(err) }
  }
}
