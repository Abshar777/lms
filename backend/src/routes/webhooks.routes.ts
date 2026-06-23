import { Router } from 'express'
import { OrderService } from '@/services/order.service.ts'
import { StripeService } from '@/services/stripe.service.ts'
import { RazorpayService } from '@/services/razorpay.service.ts'
import { env } from '@/config/env.ts'
import { logger } from '@/utils/logger.ts'
import type { Request, Response } from 'express'

/* ─────────────────────────────────────────────────────
   Stripe webhook router
   ─────────────────────────────────────────────────────
   IMPORTANT: this route uses express.raw() so the body
   arrives as a Buffer. It is mounted in app.ts BEFORE
   the global express.json() so the stream isn't lost.
   We never throw from here — always respond 200 so
   Stripe doesn't retry on programming errors. Critical
   fulfillment failures are logged for manual recovery.
───────────────────────────────────────────────────── */

const router      = Router()
const orderSvc    = new OrderService()
const stripeSvc   = new StripeService()
const razorpaySvc = new RazorpayService()

router.post('/stripe', async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature']

  /* ── Guard: no Stripe key configured ────────────── */
  if (!env.STRIPE_SECRET_KEY) {
    logger.warn('Stripe webhook received but STRIPE_SECRET_KEY is not configured')
    res.status(200).json({ received: true })
    return
  }

  let event: import('stripe').Stripe.Event

  /* ── Verify signature ────────────────────────────── */
  try {
    if (env.STRIPE_WEBHOOK_SECRET) {
      /* Production: always verify */
      const rawBody = req.body as Buffer
      if (!Buffer.isBuffer(rawBody)) {
        logger.error('Webhook: body is not a Buffer — ensure express.raw() is applied before express.json()')
        res.status(400).json({ error: 'Invalid body format' })
        return
      }
      event = stripeSvc.constructWebhookEvent(rawBody, String(sig), env.STRIPE_WEBHOOK_SECRET)
    } else {
      /* Dev without STRIPE_WEBHOOK_SECRET: parse body directly */
      if (env.NODE_ENV === 'production') {
        logger.error('Webhook: STRIPE_WEBHOOK_SECRET required in production')
        res.status(400).json({ error: 'Webhook secret not configured' })
        return
      }
      logger.warn('Webhook: no STRIPE_WEBHOOK_SECRET — skipping signature verification (dev only)')
      event = typeof req.body === 'string'
        ? JSON.parse(req.body)
        : (req.body as import('stripe').Stripe.Event)
    }
  } catch (err) {
    logger.warn({ err }, 'Webhook signature verification failed')
    res.status(400).json({ error: 'Webhook signature verification failed' })
    return
  }

  /* ── Handle events ───────────────────────────────── */
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as import('stripe').Stripe.Checkout.Session
        if (session.payment_status === 'paid') {
          const paymentIntentId = typeof session.payment_intent === 'string'
            ? session.payment_intent
            : session.payment_intent?.id ?? ''
          await orderSvc.fulfillOrder(session.id, paymentIntentId)
          logger.info({ sessionId: session.id }, 'Order fulfilled via webhook')
        }
        break
      }
      /* Add other event types here as needed */
      default:
        logger.debug({ type: event.type }, 'Unhandled Stripe event type')
    }
  } catch (err) {
    /* Log but don't throw — Stripe should not retry on business-logic errors */
    logger.error({ err, eventType: event.type }, 'Webhook handler error')
  }

  res.status(200).json({ received: true })
})

/* ─────────────────────────────────────────────────────
   Razorpay webhook
   ─────────────────────────────────────────────────────
   Backup fulfillment path — in case the user closes the
   browser before /verify completes. Always returns 200.
───────────────────────────────────────────────────── */
router.post('/razorpay', async (req: Request, res: Response) => {
  /* Verify X-Razorpay-Signature when webhook secret is configured */
  if (env.RAZORPAY_WEBHOOK_SECRET) {
    const sig     = req.headers['x-razorpay-signature'] as string | undefined
    const rawBody = req.body as Buffer
    if (!sig || !Buffer.isBuffer(rawBody)) {
      logger.warn('Razorpay webhook: missing signature or body')
      res.status(200).json({ received: true })
      return
    }
    const valid = razorpaySvc.verifyWebhookSignature(rawBody.toString(), sig, env.RAZORPAY_WEBHOOK_SECRET)
    if (!valid) {
      logger.warn('Razorpay webhook: signature mismatch')
      res.status(200).json({ received: true })
      return
    }
  }

  let payload: any
  try {
    payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
  } catch {
    res.status(200).json({ received: true })
    return
  }

  try {
    if (payload?.event === 'payment.captured') {
      const payment       = payload.payload?.payment?.entity
      const razorpayOrderId   = payment?.order_id
      const razorpayPaymentId = payment?.id
      if (razorpayOrderId && razorpayPaymentId) {
        await orderSvc.fulfillFromWebhook(razorpayOrderId, razorpayPaymentId)
        logger.info({ razorpayOrderId }, 'Razorpay order fulfilled via webhook')
      }
    }
  } catch (err) {
    logger.error({ err, event: payload?.event }, 'Razorpay webhook handler error')
  }

  res.status(200).json({ received: true })
})

export default router
