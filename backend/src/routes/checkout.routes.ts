import { Router } from 'express'
import { z } from 'zod'
import { authenticate, requireEnrollmentApproval } from '@/middleware/auth.middleware.ts'
import { validate } from '@/middleware/validate.middleware.ts'
import { OrderService } from '@/services/order.service.ts'
import { sendSuccess, sendError } from '@/utils/response.ts'
import { env } from '@/config/env.ts'
import type { Request, Response, NextFunction } from 'express'

const router   = Router()
const orderSvc = new OrderService()

const checkoutSchema = z.object({
  courseId:   z.string().min(1),
  couponCode: z.string().trim().optional(),
})

/* POST /checkout — create a Stripe hosted checkout session
   Returns { url } to redirect the browser to. */
router.post('/', authenticate, requireEnrollmentApproval, validate(checkoutSchema), async (req: Request, res: Response, next: NextFunction) => {
  /* Bail early with a friendly error when Stripe isn't configured */
  if (!env.STRIPE_SECRET_KEY) {
    sendError(res, 'STRIPE_NOT_CONFIGURED', 'Payments are not configured on this server. Add STRIPE_SECRET_KEY to the backend .env file.', 503)
    return
  }
  try {
    const { courseId, couponCode } = req.body as { courseId: string; couponCode?: string }
    const result = await orderSvc.createCheckoutSession(req.user!.id, courseId, couponCode)
    sendSuccess(res, result, 'Checkout session created', 201)
  } catch (err) { next(err) }
})

export default router
