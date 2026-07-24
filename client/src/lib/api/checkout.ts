'use client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiPost, apiGet } from '@/lib/axios'

/* ─── Razorpay types ────────────────────────────────── */

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance
  }
}

interface RazorpayOptions {
  key:          string
  amount:       number
  currency:     string
  order_id:     string
  name?:        string
  description?: string
  prefill?: { name?: string; email?: string }
  theme?:  { color?: string }
  handler: (response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => void
  modal?: { ondismiss?: () => void }
}

interface RazorpayInstance {
  open:  () => void
  close: () => void
  on:    (event: string, handler: (response: any) => void) => void
}

function loadRazorpayScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window !== 'undefined' && window.Razorpay) { resolve(); return }
    const s = document.createElement('script')
    s.src     = 'https://checkout.razorpay.com/v1/checkout.js'
    s.onload  = () => resolve()
    s.onerror = () => reject(new Error('Failed to load Razorpay checkout script'))
    document.head.appendChild(s)
  })
}

interface RazorpayCreateOrderResult {
  razorpayOrderId: string
  amount:          number
  currency:        string
  key:             string
  courseName:      string
  userEmail:       string
  userName:        string
}

interface UseRazorpayCheckoutOptions {
  onSuccess?: () => void
  onDismiss?: () => void
  onError?:   (msg: string) => void
}

export function useRazorpayCheckout(opts: UseRazorpayCheckoutOptions = {}) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ courseId, couponCode }: { courseId: string; couponCode?: string }) => {
      /* 1. Create Razorpay order on backend */
      const orderData = await apiPost<RazorpayCreateOrderResult>(
        '/checkout/razorpay/create-order',
        { courseId, couponCode },
      )

      /* 2. Load Razorpay JS if not already present */
      await loadRazorpayScript()

      /* 3. Open payment modal — resolve on success, reject on failure/dismiss */
      await new Promise<void>((resolve, reject) => {
        const rzp = new window.Razorpay({
          key:         orderData.key,
          amount:      orderData.amount,
          currency:    orderData.currency,
          order_id:    orderData.razorpayOrderId,
          name:        'Delta LMS',
          description: orderData.courseName,
          prefill: {
            name:  orderData.userName,
            email: orderData.userEmail,
          },
          theme: { color: '#FF6B1A' },
          handler: async (response) => {
            try {
              /* 4. Verify signature on backend */
              await apiPost('/checkout/razorpay/verify', {
                razorpayOrderId:   response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              })
              resolve()
            } catch (err: any) {
              reject(new Error(err?.response?.data?.error?.message ?? 'Payment verification failed'))
            }
          },
          modal: {
            ondismiss: () => {
              opts.onDismiss?.()
              reject(new Error('DISMISSED'))
            },
          },
        })

        rzp.on('payment.failed', (resp: any) => {
          reject(new Error(resp?.error?.description ?? 'Payment failed'))
        })

        rzp.open()
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['enrollments'] })
      qc.invalidateQueries({ queryKey: ['courseProgress'] })
      opts.onSuccess?.()
    },
    onError: (err: Error) => {
      if (err.message !== 'DISMISSED') {
        opts.onError?.(err.message)
      }
    },
  })
}

/* ─── Gateway config — which gateways this user should use ── */

export interface GatewayConfig {
  gateways: ('tabby' | 'abzer' | 'razorpay')[]
  currency: 'AED' | 'INR' | 'USD'
}

export function useGatewayConfig() {
  return useQuery({
    queryKey: ['checkout', 'config'],
    queryFn:  () => apiGet<GatewayConfig>('/checkout/config'),
    staleTime: 5 * 60_000,
    retry: false,
  })
}

/* ─── Tabby checkout (UAE redirect-based) ───────────── */

interface TabbyCreateOrderResult {
  checkoutUrl: string
  checkoutId:  string
}

interface UseTabbyCheckoutOptions {
  onError?: (msg: string) => void
}

export function useTabbyCheckout(opts: UseTabbyCheckoutOptions = {}) {
  return useMutation({
    mutationFn: async ({ courseId, slug, couponCode }: { courseId: string; slug: string; couponCode?: string }) => {
      const result = await apiPost<TabbyCreateOrderResult>(
        '/checkout/tabby/create-order',
        { courseId, slug, couponCode },
      )
      /* Redirect to Tabby hosted checkout page */
      window.location.href = result.checkoutUrl
    },
    onError: (err: Error) => {
      opts.onError?.(err.message)
    },
  })
}

/* ─── Abzer checkout (UAE redirect-based) ───────────── */

interface AbzerCreateOrderResult {
  checkoutUrl:  string
  abzerOrderId: string
}

interface UseAbzerCheckoutOptions {
  onError?: (msg: string) => void
}

export function useAbzerCheckout(opts: UseAbzerCheckoutOptions = {}) {
  return useMutation({
    mutationFn: async ({ courseId, slug, couponCode }: { courseId: string; slug: string; couponCode?: string }) => {
      const result = await apiPost<AbzerCreateOrderResult>(
        '/checkout/abzer/create-order',
        { courseId, slug, couponCode },
      )
      window.location.href = result.checkoutUrl
    },
    onError: (err: Error) => {
      opts.onError?.(err.message)
    },
  })
}

/* ─── Stripe checkout ───────────────────────────────── */
export interface CheckoutSession {
  url: string
}

export function useCheckout() {
  return useMutation({
    mutationFn: ({ courseId, couponCode }: { courseId: string; couponCode?: string }) =>
      apiPost<CheckoutSession>('/checkout', { courseId, couponCode }),
    onSuccess: ({ url }) => {
      window.location.href = url
    },
  })
}

/* ─── Coupon validation ──────────────────────────────── */
export interface CouponInfo {
  code:          string
  discountType:  'percent' | 'fixed'
  discountValue: number
}

export function useValidateCoupon(code: string, courseId: string) {
  return useQuery({
    queryKey: ['coupon', code, courseId],
    queryFn:  () => apiGet<CouponInfo>('/coupons/validate', { code, courseId }),
    enabled:  code.length >= 2 && !!courseId,
    retry:    false,
    staleTime: 60_000,
  })
}

/* ─── Order history ─────────────────────────────────── */
export interface MyOrder {
  id:                  string
  courseId:            string | { id: string; title: string; slug: string; thumbnailUrl?: string }
  gateway:             'razorpay' | 'stripe' | 'tabby' | 'abzer'
  amount:              number
  currency:            string
  status:              'pending' | 'paid' | 'refunded'
  discountAmount:      number
  razorpayPaymentId?:  string
  tabbyPaymentId?:     string
  abzerPaymentId?:     string
  stripeInvoiceUrl?:   string
  refundedAt?:         string
  createdAt:           string
}

export const orderKeys = {
  mine: ['orders', 'mine'] as const,
}

export function useMyOrders() {
  return useQuery({
    queryKey: orderKeys.mine,
    queryFn:  () => apiGet<MyOrder[]>('/orders/me'),
    staleTime: 30_000,
  })
}
