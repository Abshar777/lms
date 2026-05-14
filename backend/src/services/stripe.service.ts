import Stripe from 'stripe'
import { env } from '@/config/env.ts'
import { logger } from '@/utils/logger.ts'

/* ─────────────────────────────────────────────────────
   StripeService — thin wrapper around the Stripe SDK.
   All Stripe-specific logic lives here so the rest of
   the app never imports stripe directly.
───────────────────────────────────────────────────── */

function getStripe(): Stripe {
  if (!env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured. Add it to your .env file.')
  }
  return new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: '2026-04-22.dahlia',
    typescript: true,
  })
}

export interface CreateSessionParams {
  orderId:        string
  userId:         string
  courseId:       string
  courseTitle:    string
  thumbnailUrl?:  string
  description?:  string
  amountCents:    number    // final price after coupon (in cents)
  currency:       string
  successUrl:     string
  cancelUrl:      string
}

export class StripeService {

  async createCheckoutSession(p: CreateSessionParams): Promise<Stripe.Checkout.Session> {
    const stripe = getStripe()
    return stripe.checkout.sessions.create({
      mode:               'payment',
      client_reference_id: p.orderId,
      metadata:           { orderId: p.orderId, userId: p.userId, courseId: p.courseId },
      line_items: [{
        quantity: 1,
        price_data: {
          currency:     p.currency,
          unit_amount:  p.amountCents,
          product_data: {
            name:   p.courseTitle,
            ...(p.description && { description: p.description.slice(0, 500) }),
            ...(p.thumbnailUrl && { images: [p.thumbnailUrl] }),
          },
        },
      }],
      success_url: p.successUrl,
      cancel_url:  p.cancelUrl,
      /* Keep session open for 30 min (Stripe default); expired sessions
         are ignored by the webhook — our pending Order stays pending
         and does not block re-purchase. */
      expires_at:  Math.floor(Date.now() / 1000) + 30 * 60,
    })
  }

  constructWebhookEvent(rawBody: Buffer, signature: string, secret: string): Stripe.Event {
    const stripe = getStripe()
    return stripe.webhooks.constructEvent(rawBody, signature, secret)
  }

  async refundPaymentIntent(paymentIntentId: string): Promise<Stripe.Refund> {
    const stripe = getStripe()
    return stripe.refunds.create({ payment_intent: paymentIntentId })
  }

  async retrieveSession(sessionId: string): Promise<Stripe.Checkout.Session> {
    const stripe = getStripe()
    return stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['payment_intent', 'invoice'],
    })
  }
}
