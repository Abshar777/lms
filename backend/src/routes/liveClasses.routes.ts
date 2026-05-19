import { Router } from 'express'
import express from 'express'
import { LiveClassController } from '@/controllers/liveClass.controller.ts'
import { authenticate } from '@/middleware/auth.middleware.ts'

const router = Router()
const ctrl   = new LiveClassController()

/* Upcoming sessions for authenticated user's enrolled courses */
router.get('/upcoming', authenticate, ctrl.upcomingForMe)

/* Student watch access — checks enrollment, returns playback URL or meeting URL */
router.get('/:id/watch', authenticate, ctrl.watchAccess)

/* Mux webhook — must use raw body parser BEFORE json parser for signature verification */
router.post(
  '/mux-webhook',
  express.raw({ type: 'application/json' }),
  ctrl.muxWebhook,
)

export default router
