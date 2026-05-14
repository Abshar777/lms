'use client'
import { useMutation, useQuery } from '@tanstack/react-query'
import { apiPost, apiGet } from '@/lib/axios'

/* ─── Checkout session ──────────────────────────────── */
export interface CheckoutSession {
  url: string
}

export function useCheckout() {
  return useMutation({
    mutationFn: ({ courseId, couponCode }: { courseId: string; couponCode?: string }) =>
      apiPost<CheckoutSession>('/checkout', { courseId, couponCode }),
    onSuccess: ({ url }) => {
      /* Redirect to Stripe hosted checkout */
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
  id:                      string
  courseId:                string | { id: string; title: string; slug: string; thumbnailUrl?: string }
  amount:                  number  // cents
  currency:                string
  status:                  'pending' | 'paid' | 'refunded'
  discountAmount:          number  // cents
  stripeInvoiceUrl?:       string
  refundedAt?:             string
  createdAt:               string
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
