import { createHmac, timingSafeEqual } from 'crypto'
import { env } from '@/config/env.ts'
import { logger } from '@/utils/logger.ts'

/* ─── Tabby API types ─────────────────────────────────── */

interface TabbyCheckoutRequest {
  payment: {
    amount:      string
    currency:    string
    description: string
    buyer: {
      phone: string
      email: string
      name:  string
    }
    buyer_history: {
      registered_since: string
      loyalty_level:    number
    }
    order: {
      tax_amount:      string
      shipping_amount: string
      discount_amount: string
      updated_at:      string
      reference_id:    string
      items: Array<{
        title:           string
        quantity:        number
        unit_price:      string
        discount_amount: string
        reference_id:    string
        category:        string
      }>
    }
    merchant_urls: {
      success: string
      cancel:  string
      failure: string
      webhook: string
    }
  }
  merchant_code: string
  lang:          string
}

interface TabbyCheckoutResponse {
  id:     string
  status: string
  payment?: {
    id:       string
    status:   string
    amount:   string
    currency: string
  }
  configuration?: {
    available_products?: {
      installments?: { web_url: string }
      pay_later?:    { web_url: string }
    }
  }
}

export interface TabbyCreateCheckoutOptions {
  amountAED:    number   // decimal AED amount e.g. 199.00
  orderId:      string
  courseTitle:  string
  courseId:     string
  buyerEmail:   string
  buyerName:    string
  buyerPhone?:  string
  successUrl:   string
  cancelUrl:    string
  failureUrl:   string
}

export interface TabbyCheckoutResult {
  checkoutId:  string
  paymentId:   string
  checkoutUrl: string
}

/* ─── TabbyService ────────────────────────────────────── */

export class TabbyService {
  private readonly baseUrl = 'https://api.tabby.ai/api/v2'

  async createCheckout(opts: TabbyCreateCheckoutOptions): Promise<TabbyCheckoutResult> {
    if (!env.TABBY_SECRET_KEY || !env.TABBY_MERCHANT_CODE) {
      throw new Error('TABBY_SECRET_KEY and TABBY_MERCHANT_CODE must be configured')
    }

    const amountStr = opts.amountAED.toFixed(2)
    const webhookUrl = `${env.BACKEND_PUBLIC_URL}/api/v1/webhooks/tabby`

    const body: TabbyCheckoutRequest = {
      payment: {
        amount:      amountStr,
        currency:    env.TABBY_CURRENCY,
        description: `Delta Academy — ${opts.courseTitle}`,
        buyer: {
          email: opts.buyerEmail,
          name:  opts.buyerName,
          phone: opts.buyerPhone ?? '',
        },
        buyer_history: {
          registered_since: new Date().toISOString(),
          loyalty_level:    0,
        },
        order: {
          tax_amount:      '0.00',
          shipping_amount: '0.00',
          discount_amount: '0.00',
          updated_at:      new Date().toISOString(),
          reference_id:    opts.orderId,
          items: [{
            title:           opts.courseTitle,
            quantity:        1,
            unit_price:      amountStr,
            discount_amount: '0.00',
            reference_id:    opts.courseId,
            category:        'Digital Services',
          }],
        },
        merchant_urls: {
          success: opts.successUrl,
          cancel:  opts.cancelUrl,
          failure: opts.failureUrl,
          webhook: webhookUrl,
        },
      },
      merchant_code: env.TABBY_MERCHANT_CODE,
      lang: 'en',
    }

    const resp = await fetch(`${this.baseUrl}/checkout`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${env.TABBY_SECRET_KEY}`,
      },
      body: JSON.stringify(body),
    })

    if (!resp.ok) {
      const text = await resp.text()
      logger.error({ status: resp.status, body: text }, 'Tabby createCheckout failed')
      throw new Error(`Tabby API error ${resp.status}: ${text}`)
    }

    const data = await resp.json() as TabbyCheckoutResponse

    /* Prefer installments, fall back to pay_later */
    const checkoutUrl =
      data.configuration?.available_products?.installments?.web_url ??
      data.configuration?.available_products?.pay_later?.web_url

    if (!checkoutUrl) {
      logger.error({ data }, 'Tabby: no checkout URL returned — product may not be available')
      throw new Error('Tabby checkout is not available for this transaction. Try another payment method.')
    }

    return {
      checkoutId:  data.id,
      paymentId:   data.payment?.id ?? '',
      checkoutUrl,
    }
  }

  /* Called after Tabby webhook confirms AUTHORIZED/CLOSED status */
  async capturePayment(paymentId: string): Promise<void> {
    if (!env.TABBY_SECRET_KEY) {
      throw new Error('TABBY_SECRET_KEY not configured')
    }
    const resp = await fetch(`${this.baseUrl}/payments/${paymentId}/captures`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${env.TABBY_SECRET_KEY}`,
      },
      body: JSON.stringify({}),
    })
    if (!resp.ok) {
      const text = await resp.text()
      logger.warn({ status: resp.status, paymentId, text }, 'Tabby capture failed (non-fatal)')
    }
  }

  /* Verify Tabby webhook HMAC — returns true when valid */
  verifyWebhookSignature(rawBody: string, signature: string, secret: string): boolean {
    try {
      const computed = createHmac('sha256', secret).update(rawBody).digest('hex')
      const a = Buffer.from(computed,   'hex')
      const b = Buffer.from(signature,  'hex')
      if (a.length !== b.length) return false
      return timingSafeEqual(a, b)
    } catch {
      return false
    }
  }
}
