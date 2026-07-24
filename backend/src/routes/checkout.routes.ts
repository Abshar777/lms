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

/* ── Stripe ────────────────────────────────────────────── */
const checkoutSchema = z.object({
  courseId:   z.string().min(1),
  couponCode: z.string().trim().optional(),
})

router.post('/', authenticate, requireEnrollmentApproval, validate(checkoutSchema), async (req: Request, res: Response, next: NextFunction) => {
  if (!env.STRIPE_SECRET_KEY) {
    sendError(res, 'STRIPE_NOT_CONFIGURED', 'Payments are not configured on this server.', 503)
    return
  }
  try {
    const { courseId, couponCode } = req.body as { courseId: string; couponCode?: string }
    const result = await orderSvc.createCheckoutSession(req.user!.id, courseId, couponCode)
    sendSuccess(res, result, 'Checkout session created', 201)
  } catch (err) { next(err) }
})

/* ── Razorpay — create order ────────────────────────────── */
const razorpayCreateSchema = z.object({
  courseId:   z.string().min(1),
  couponCode: z.string().trim().optional(),
})

router.post('/razorpay/create-order', authenticate, validate(razorpayCreateSchema), async (req: Request, res: Response, next: NextFunction) => {
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
    sendError(res, 'RAZORPAY_NOT_CONFIGURED', 'Razorpay is not configured on this server.', 503)
    return
  }
  try {
    const { courseId, couponCode } = req.body as { courseId: string; couponCode?: string }
    const result = await orderSvc.createRazorpayOrder(req.user!.id, courseId, couponCode)
    sendSuccess(res, result, 'Razorpay order created', 201)
  } catch (err) { next(err) }
})

/* ── Razorpay — verify signature + enroll ───────────────── */
const razorpayVerifySchema = z.object({
  razorpayOrderId:   z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
})

router.post('/razorpay/verify', authenticate, validate(razorpayVerifySchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body as {
      razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string
    }
    const result = await orderSvc.verifyAndFulfillRazorpay(razorpayOrderId, razorpayPaymentId, razorpaySignature)
    sendSuccess(res, result, 'Payment verified and enrollment created')
  } catch (err) { next(err) }
})

/* ── Gateway config — which gateways are available for this user ── */
router.get('/config', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const config = await orderSvc.getGatewayConfig(req.user!.id)
    sendSuccess(res, config)
  } catch (err) { next(err) }
})

/* ── Tabby — create checkout (UAE) ──────────────────────── */
const tabbyCreateSchema = z.object({
  courseId:   z.string().min(1),
  slug:       z.string().min(1),
  couponCode: z.string().trim().optional(),
})

router.post('/tabby/create-order', authenticate, validate(tabbyCreateSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { courseId, slug, couponCode } = req.body as { courseId: string; slug: string; couponCode?: string }
    const result = await orderSvc.createTabbyOrder(req.user!.id, courseId, slug, couponCode)
    sendSuccess(res, result, 'Tabby checkout created', 201)
  } catch (err) { next(err) }
})

/* ── Abzer — create checkout (UAE) ──────────────────────── */
const abzerCreateSchema = z.object({
  courseId:   z.string().min(1),
  slug:       z.string().min(1),
  couponCode: z.string().trim().optional(),
})

router.post('/abzer/create-order', authenticate, validate(abzerCreateSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { courseId, slug, couponCode } = req.body as { courseId: string; slug: string; couponCode?: string }
    const result = await orderSvc.createAbzerOrder(req.user!.id, courseId, slug, couponCode)
    sendSuccess(res, result, 'Abzer checkout created', 201)
  } catch (err) { next(err) }
})

export default router
