import { Router } from 'express'
import { LiveClassController } from '@/controllers/liveClass.controller.ts'
import { authenticate } from '@/middleware/auth.middleware.ts'

const router = Router()
const ctrl   = new LiveClassController()

router.get('/upcoming', authenticate, ctrl.upcomingForMe)

export default router
