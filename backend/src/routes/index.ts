import { Router, type Request, type Response } from 'express'
import { apiRateLimit } from '@/middleware/rateLimit.middleware.ts'
import authRoutes from './auth.routes.ts'

const router = Router()

/* ─── Global API rate limit ──────────────────────── */
router.use(apiRateLimit)

/* ─── Health check ───────────────────────────────── */
router.get('/health', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      status:    'ok',
      env:       process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
      uptime:    Math.floor(process.uptime()),
    },
  })
})

/* ─── Domain routers ─────────────────────────────── */
router.use('/auth', authRoutes)

// Future domains — uncomment as you build them:
// router.use('/courses',     courseRoutes)
// router.use('/enrollments', enrollmentRoutes)
// router.use('/lessons',     lessonRoutes)
// router.use('/users',       userRoutes)
// router.use('/reviews',     reviewRoutes)
// router.use('/categories',  categoryRoutes)

export default router
