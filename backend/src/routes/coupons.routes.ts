import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import { authenticate } from '@/middleware/auth.middleware.ts'
import { CouponService } from '@/services/coupon.service.ts'
import { sendSuccess } from '@/utils/response.ts'

const router = Router()
const couponSvc = new CouponService()

/* ─── Validate a coupon code (student-facing) ────────────
   Any authenticated user can validate before checkout.
   Returns only non-sensitive fields.
   GET /coupons/validate?code=SUMMER20&courseId=<id>          */
router.get('/validate', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const code     = String(req.query['code']     ?? '').trim().toUpperCase()
    const courseId = String(req.query['courseId'] ?? '').trim()
    if (!code || !courseId) {
      res.status(400).json({ success: false, error: { code: 'MISSING_PARAMS', message: 'code and courseId are required' } })
      return
    }
    const coupon = await couponSvc.validate(code, courseId)
    sendSuccess(res, {
      code:          coupon.code,
      discountType:  coupon.discountType,
      discountValue: coupon.discountValue,
    })
  } catch (err) { next(err) }
})

export default router
