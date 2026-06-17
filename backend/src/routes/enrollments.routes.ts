import { Router } from 'express'
import { z } from 'zod'
import { EnrollmentController } from '@/controllers/enrollment.controller.ts'
import { authenticate, requireEnrollmentApproval } from '@/middleware/auth.middleware.ts'
import { validate } from '@/middleware/validate.middleware.ts'

const router = Router()
const enroll = new EnrollmentController()

const enrollSchema = z.object({
  courseId: z.string().min(1),
})

router.post('/',         authenticate, requireEnrollmentApproval, validate(enrollSchema), enroll.enroll)
router.get ('/me',       authenticate, enroll.listMine)
router.get ('/activity', authenticate, enroll.myActivity)

export default router
