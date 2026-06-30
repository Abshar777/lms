import crypto from 'node:crypto'
import { env } from '@/config/env.ts'
import { logger } from '@/utils/logger.ts'

const RAZORPAY_BASE = 'https://api.razorpay.com/v1'

function getAuthHeader(): string {
  const id     = env.RAZORPAY_KEY_ID
  const secret = env.RAZORPAY_KEY_SECRET
  if (!id || !secret) {
    throw Object.assign(
      new Error('Razorpay is not configured — add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to .env'),
      { statusCode: 503 },
    )
  }
  return 'Basic ' + Buffer.from(`${id}:${secret}`).toString('base64')
}

async function rzPost<T>(path: string, body: Record<string, unknown>): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${RAZORPAY_BASE}${path}`, {
      method:  'POST',
      headers: { Authorization: getAuthHeader(), 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    })
  } catch (networkErr) {
    logger.error({ networkErr }, '[razorpay] network error reaching api.razorpay.com')
    throw new Error('Razorpay: unable to reach payment gateway — check internet connectivity')
  }

  const data = await res.json() as any
  if (!res.ok) {
    const msg = data?.error?.description ?? data?.error?.code ?? `HTTP ${res.status}`
    logger.error({ data, status: res.status }, `[razorpay] ${path} failed: ${msg}`)
    throw new Error(`Razorpay: ${msg}`)
  }
  return data as T
}

/* ── Types ──────────────────────────────────────────── */

export interface RazorpayOrderParams {
  amountPaise: number
  currency:    string
  receipt:     string
  notes?:      Record<string, string>
}

export interface RazorpayOrderResult {
  id:       string
  amount:   number
  currency: string
  receipt:  string
}

/* ── Service ────────────────────────────────────────── */

export class RazorpayService {
  async createOrder(params: RazorpayOrderParams): Promise<RazorpayOrderResult> {
    const order = await rzPost<any>('/orders', {
      amount:   params.amountPaise,
      currency: params.currency,
      receipt:  params.receipt.slice(0, 40),
      notes:    params.notes ?? {},
    })
    return {
      id:       order.id       as string,
      amount:   order.amount   as number,
      currency: order.currency as string,
      receipt:  order.receipt  as string,
    }
  }

  verifySignature(
    razorpayOrderId:   string,
    razorpayPaymentId: string,
    razorpaySignature: string,
  ): boolean {
    if (!env.RAZORPAY_KEY_SECRET) return false
    const expected = crypto
      .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex')
    try {
      return crypto.timingSafeEqual(
        Buffer.from(expected,         'hex'),
        Buffer.from(razorpaySignature, 'hex'),
      )
    } catch {
      return false  // buffer length mismatch → invalid signature
    }
  }

  verifyWebhookSignature(rawBody: string, signature: string, secret: string): boolean {
    const expected = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex')
    try {
      return crypto.timingSafeEqual(
        Buffer.from(expected,  'hex'),
        Buffer.from(signature, 'hex'),
      )
    } catch {
      return false
    }
  }

  async refundPayment(paymentId: string): Promise<void> {
    await rzPost(`/payments/${paymentId}/refund`, {})
    logger.info({ paymentId }, '[razorpay] refund initiated')
  }
}
