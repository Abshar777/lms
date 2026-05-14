import { Router } from 'express'
import { z } from 'zod'
import { FavoriteController } from '@/controllers/favorite.controller.ts'
import { authenticate } from '@/middleware/auth.middleware.ts'
import { validate } from '@/middleware/validate.middleware.ts'

const router = Router()
const ctrl   = new FavoriteController()

const addSchema = z.object({
  courseId: z.string().min(1),
})

router.use(authenticate)
router.get   ('/me',                       ctrl.listMine)
router.get   ('/exists/:courseId',         ctrl.exists)
router.post  ('/',                         validate(addSchema), ctrl.add)
router.delete('/:courseId',                ctrl.remove)

export default router
