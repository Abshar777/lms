import crypto from 'node:crypto'
import Razorpay from 'razorpay'
import { env } from '@/config/env.ts'
import { logger } from '@/utils/logger.ts'

/* Lazily initialised so the server doesn't crash when RAZORPAY_KEY_ID is absent */
let _instance: Razorpay | null = null

function getInstance(): Razorpay {
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
    throw new Error('Razorpay is not configured — add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to .env')
  }
  if (!_instance) {
    _instance = new Razorpay({
      key_id:     env.RAZORPAY_KEY_ID,
      key_secret: env.RAZORPAY_KEY_SECRET,
    })
  }
  return _instance
}

export interface RazorpayOrderParams {
  amountPaise: number   // 1 INR = 100 paise
  currency:    string   // 'INR'
  receipt:     string   // max 40 chars, unique per order
  notes?:      Record<string, string>
}

export interface RazorpayOrderResult {
  id:       string
  amount:   number
  currency: string
  receipt:  string
}

export class RazorpayService {
  /* Create an order on Razorpay's side — returns the order_id the frontend needs */
  async createOrder(params: RazorpayOrderParams): Promise<RazorpayOrderResult> {
    const rz = getInstance()
    const order = await rz.orders.create({
      amount:   params.amountPaise,
      currency: params.currency,
      receipt:  params.receipt.slice(0, 40),
      notes:    params.notes ?? {},
    }) as any
    return {
      id:       order.id,
      amount:   order.amount as number,
      currency: order.currency as string,
      receipt:  order.receipt as string,
    }
  }

  /* HMAC-SHA256 signature verification — must match before marking order paid */
  verifySignature(razorpayOrderId: string, razorpayPaymentId: string, razorpaySignature: string): boolean {
    if (!env.RAZORPAY_KEY_SECRET) return false
    const body    = `${razorpayOrderId}|${razorpayPaymentId}`
    const expected = crypto
      .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex')
    return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(razorpaySignature, 'hex'))
  }

  /* Verify webhook signature (X-Razorpay-Signature header) */
  verifyWebhookSignature(rawBody: string, signature: string, secret: string): boolean {
    const expected = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex')
    return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'))
  }

  /* Full refund for a captured payment */
  async refundPayment(paymentId: string): Promise<void> {
    const rz = getInstance()
    await (rz.payments as any).refund(paymentId)
    logger.info({ paymentId }, '[razorpay] refund initiated')
  }
}
