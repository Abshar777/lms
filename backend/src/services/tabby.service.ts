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
  }
  /* merchant_urls is at ROOT level, not inside payment */
  merchant_urls: {
    success: string
    cancel:  string
    failure: string
    webhook: string
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
      /* installments is an array of products, not a single object */
      installments?: Array<{ web_url: string; qr_code?: string }>
      pay_later?:    Array<{ web_url: string }>
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
  private readonly baseUrl    = 'https://api.tabby.ai/api/v2'
  private readonly webhookUrl = 'https://api.tabby.ai/api/v1'  // webhook registration is v1

  /* Register our webhook with Tabby (must be called once per merchant_code + key pair).
     Safe to call repeatedly — Tabby ignores duplicate registrations (same URL + header). */
  async registerWebhook(): Promise<void> {
    if (!env.TABBY_SECRET_KEY || !env.TABBY_WEBHOOK_SECRET || !env.BACKEND_PUBLIC_URL) return
    const url = `${env.BACKEND_PUBLIC_URL}/api/v1/webhooks/tabby`
    try {
      const resp = await fetch(`${this.webhookUrl}/webhooks`, {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${env.TABBY_SECRET_KEY}`,
        },
        body: JSON.stringify({
          url,
          is_test: !env.TABBY_SECRET_KEY.startsWith('sk_live_'),
          header: {
            title: 'Authorization',
            value: `Bearer ${env.TABBY_WEBHOOK_SECRET}`,
          },
        }),
      })
      if (resp.ok || resp.status === 409) {
        logger.info({ url }, 'Tabby webhook registered')
      } else {
        const text = await resp.text()
        logger.warn({ status: resp.status, text }, 'Tabby webhook registration failed (non-fatal)')
      }
    } catch (err) {
      logger.warn({ err }, 'Tabby webhook registration error (non-fatal)')
    }
  }

  /* Background pre-scoring: check if customer is eligible before showing Tabby.
     Uses the same /checkout endpoint but with a minimal payload (no merchant_urls).
     Returns available=true on API errors (fail-safe per Tabby's best practices). */
  async checkEligibility(amountAED: number, buyerEmail: string, buyerPhone?: string): Promise<{
    available:       boolean
    rejectionReason: string | null
  }> {
    if (!env.TABBY_SECRET_KEY || !env.TABBY_MERCHANT_CODE) {
      return { available: false, rejectionReason: null }
    }
    try {
      const resp = await fetch(`${this.baseUrl}/checkout`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${env.TABBY_SECRET_KEY}` },
        body: JSON.stringify({
          payment: {
            amount:   amountAED.toFixed(2),
            currency: env.TABBY_CURRENCY,
            buyer: { email: buyerEmail, phone: buyerPhone ?? '' },
          },
          merchant_code: env.TABBY_MERCHANT_CODE,
        }),
      })
      if (!resp.ok) return { available: true, rejectionReason: null }  // fail-safe
      const data = await resp.json() as { status: string; configuration?: { products?: { installments?: { rejection_reason?: string } } } }
      if (data.status === 'rejected') {
        const reason = data.configuration?.products?.installments?.rejection_reason ?? 'not_available'
        return { available: false, rejectionReason: reason }
      }
      return { available: true, rejectionReason: null }
    } catch {
      return { available: true, rejectionReason: null }  // fail-safe on network errors
    }
  }

  async createCheckout(opts: TabbyCreateCheckoutOptions): Promise<TabbyCheckoutResult> {
    if (!env.TABBY_SECRET_KEY || !env.TABBY_MERCHANT_CODE) {
      throw new Error('TABBY_SECRET_KEY and TABBY_MERCHANT_CODE must be configured')
    }

    const amountStr  = opts.amountAED.toFixed(2)
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
      },
      /* merchant_urls at ROOT level per Tabby API spec */
      merchant_urls: {
        success: opts.successUrl,
        cancel:  opts.cancelUrl,
        failure: opts.failureUrl,
        webhook: webhookUrl,
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

    /* installments is an array — take the first element's web_url */
    const checkoutUrl =
      data.configuration?.available_products?.installments?.[0]?.web_url ??
      data.configuration?.available_products?.pay_later?.[0]?.web_url

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

  /* Verify current payment status via server-to-server call (required before capture) */
  async getPayment(paymentId: string): Promise<{ id: string; status: string }> {
    if (!env.TABBY_SECRET_KEY) {
      throw new Error('TABBY_SECRET_KEY not configured')
    }
    const resp = await fetch(`${this.baseUrl}/payments/${paymentId}`, {
      headers: {
        'Authorization': `Bearer ${env.TABBY_SECRET_KEY}`,
      },
    })
    if (!resp.ok) {
      const text = await resp.text()
      logger.warn({ status: resp.status, paymentId, text }, 'Tabby getPayment failed')
      throw new Error(`Tabby getPayment ${resp.status}: ${text}`)
    }
    const data = await resp.json() as { id: string; status: string }
    return { id: data.id, status: data.status }
  }

  /* Capture an AUTHORIZED payment — must be called after webhook verification.
     amountAED: decimal string e.g. "199.00"
     ourOrderId: used as idempotency key (reference_id) */
  async capturePayment(paymentId: string, amountAED: string, ourOrderId: string): Promise<void> {
    if (!env.TABBY_SECRET_KEY) {
      throw new Error('TABBY_SECRET_KEY not configured')
    }
    const resp = await fetch(`${this.baseUrl}/payments/${paymentId}/captures`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${env.TABBY_SECRET_KEY}`,
      },
      body: JSON.stringify({
        amount:       amountAED,
        reference_id: ourOrderId,
      }),
    })
    if (!resp.ok) {
      const text = await resp.text()
      logger.warn({ status: resp.status, paymentId, text }, 'Tabby capture failed (non-fatal)')
    }
  }
}
