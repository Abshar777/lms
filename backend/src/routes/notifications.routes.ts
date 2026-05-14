import { Router } from 'express'
import { NotificationController } from '@/controllers/notification.controller.ts'
import { authenticate } from '@/middleware/auth.middleware.ts'

const router = Router()
const ctrl   = new NotificationController()

router.use(authenticate)
router.get ('/',              ctrl.list)
router.get ('/unread-count',  ctrl.unreadCount)
router.post('/read-all',      ctrl.markAllRead)
router.post('/:id/read',      ctrl.markRead)

export default router
