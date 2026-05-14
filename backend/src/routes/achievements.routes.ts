import { Router } from 'express'
import { AchievementController } from '@/controllers/achievement.controller.ts'
import { authenticate } from '@/middleware/auth.middleware.ts'

const router = Router()
const ctrl   = new AchievementController()

router.get('/me', authenticate, ctrl.myAchievements)

export default router
