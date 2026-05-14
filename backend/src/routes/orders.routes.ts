import { Router } from 'express'
import { OrderService } from '@/services/order.service.ts'
import { authenticate } from '@/middleware/auth.middleware.ts'
import { sendSuccess } from '@/utils/response.ts'
import type { Request, Response, NextFunction } from 'express'

const router   = Router()
const orderSvc = new OrderService()

/* GET /orders/me — student's purchase history */
router.get('/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orders = await orderSvc.listForUser(req.user!.id)
    sendSuccess(res, orders)
  } catch (err) { next(err) }
})

export default router
