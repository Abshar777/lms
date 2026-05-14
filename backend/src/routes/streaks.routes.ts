import { Router } from 'express'
import { z } from 'zod'
import { authenticate } from '@/middleware/auth.middleware.ts'
import { validate } from '@/middleware/validate.middleware.ts'
import { StreakService } from '@/services/streak.service.ts'
import { sendSuccess } from '@/utils/response.ts'
import type { Request, Response, NextFunction } from 'express'

const router    = Router()
const streakSvc = new StreakService()

/* GET /streaks/me — current user's streak data */
router.get('/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const streak = await streakSvc.getStreak(req.user!.id)
    sendSuccess(res, streak ?? {
      currentStreak:   0,
      longestStreak:   0,
      lastActiveDate:  '',
      totalDaysActive: 0,
      weeklyGoal:      5,
      weekProgress:    0,
      weekStartDate:   '',
    })
  } catch (err) { next(err) }
})

/* PATCH /streaks/me/goal — update weekly lesson goal */
const goalSchema = z.object({
  weeklyGoal: z.coerce.number().int().min(1).max(50),
})

router.patch('/me/goal', authenticate, validate(goalSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { weeklyGoal } = req.body as { weeklyGoal: number }
    const streak = await streakSvc.updateGoal(req.user!.id, weeklyGoal)
    sendSuccess(res, streak, 'Goal updated')
  } catch (err) { next(err) }
})

export default router
