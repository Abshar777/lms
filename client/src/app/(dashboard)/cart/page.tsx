'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import {
  ShoppingCart, Trash2, ArrowRight, BookOpen,
  Sparkles, X, Tag, AlertCircle,
  CheckCircle2, GraduationCap,
} from 'lucide-react'
import { useCartStore, type CartItem } from '@/store/cart.store'
import { useRazorpayCheckout, useValidateCoupon } from '@/lib/api/checkout'
import Spinner from '@/components/ui/Spinner'

/* ── helpers ─────────────────────────────────────────── */
function fmt(cents: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents)
}

/* ── Coupon input ────────────────────────────────────── */
function CouponRow({
  courseId,
  onApply,
}: {
  courseId: string
  onApply: (code: string, discount: number) => void
}) {
  const [code,    setCode]    = useState('')
  const [applied, setApplied] = useState(false)
  const { data, isLoading, isError } = useValidateCoupon(code, courseId)

  const handleApply = () => {
    if (!data) return
    const savings = data.discountType === 'percent'
      ? data.discountValue   // percent value
      : data.discountValue   // fixed cents
    onApply(code, savings)
    setApplied(true)
  }

  return (
    <div className="flex items-center gap-2 mt-2">
      <div className="relative flex-1">
        <Tag size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: '#9CA3AF' }} />
        <input
          value={code}
          onChange={e => { setCode(e.target.value.toUpperCase()); setApplied(false) }}
          placeholder="Coupon code"
          className="w-full rounded-xl py-1.5 pl-8 pr-3 text-xs"
          style={{ background: '#F4F5F8', border: '1px solid #E5E7EB', color: '#111827' }}
        />
      </div>
      <button
        onClick={handleApply}
        disabled={!data || applied || isLoading}
        className="flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all disabled:opacity-50"
        style={{ background: applied ? '#F0FDF4' : 'rgba(0,87,184,0.10)', color: applied ? '#16A34A' : '#0057b8' }}>
        {isLoading
          ? <Spinner size={10} />
          : applied
            ? <><CheckCircle2 size={10} />Applied</>
            : 'Apply'}
      </button>
      {isError && code.length >= 2 && (
        <span className="text-[10px]" style={{ color: '#EF4444' }}>Invalid</span>
      )}
      {data && !applied && (
        <span className="text-[10px] font-semibold" style={{ color: '#16A34A' }}>
          {data.discountType === 'percent' ? `${data.discountValue}% off` : `$${data.discountValue / 100} off`}
        </span>
      )}
    </div>
  )
}

/* ── Single cart item card ───────────────────────────── */
function CartItemCard({ item, onRemove }: { item: CartItem; onRemove: () => void }) {
  const checkout  = useRazorpayCheckout()
  const isFree    = item.isFree || !item.price || item.price === 0
  const [coupon,  setCoupon]  = useState<string | undefined>(undefined)
  const [buying,  setBuying]  = useState(false)

  const handleBuy = async () => {
    if (isFree) return
    setBuying(true)
    try {
      await checkout.mutateAsync({ courseId: item.id, couponCode: coupon })
    } catch {
      setBuying(false)
    }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20, scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      className="rounded-2xl bg-white p-4"
      style={{ border: '1px solid #E5E7EB', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>

      <div className="flex gap-3">
        {/* Thumbnail */}
        <Link href={`/courses/${item.slug}`} className="flex-shrink-0">
          <div className="h-16 w-24 overflow-hidden rounded-xl"
            style={{ background: '#F3F4F6' }}>
            {item.thumbnailUrl
              ? <img src={item.thumbnailUrl} alt={item.title} className="h-full w-full object-cover" />
              : <div className="flex h-full w-full items-center justify-center">
                  <BookOpen size={20} style={{ color: '#D1D5DB' }} />
                </div>}
          </div>
        </Link>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <Link href={`/courses/${item.slug}`}>
                <h3 className="line-clamp-2 text-sm font-bold leading-snug hover:text-[#0057b8] transition-colors"
                  style={{ color: '#111827' }}>
                  {item.title}
                </h3>
              </Link>
              {item.instructorName && (
                <p className="mt-0.5 text-xs" style={{ color: '#9CA3AF' }}>{item.instructorName}</p>
              )}
            </div>
            <button onClick={onRemove} aria-label="Remove from cart"
              className="flex-shrink-0 flex h-7 w-7 items-center justify-center rounded-xl transition-colors hover:bg-red-50"
              style={{ color: '#D1D5DB' }}>
              <X size={13} />
            </button>
          </div>

          {/* Price + action */}
          <div className="mt-2.5 flex items-center justify-between gap-2 flex-wrap">
            <div>
              {isFree ? (
                <span className="text-base font-bold" style={{ color: '#16A34A' }}>Free</span>
              ) : (
                <span className="text-base font-bold" style={{ color: '#111827' }}>
                  ${item.price}
                </span>
              )}
            </div>

            {isFree ? (
              <Link href={`/courses/${item.slug}`}>
                <motion.button
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  className="flex items-center gap-1.5 rounded-xl px-4 py-1.5 text-xs font-bold text-white"
                  style={{ background: '#22C55E' }}>
                  <GraduationCap size={11} />Enroll Free
                </motion.button>
              </Link>
            ) : (
              <motion.button
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onClick={handleBuy}
                disabled={buying || checkout.isPending}
                className="flex items-center gap-1.5 rounded-xl px-4 py-1.5 text-xs font-bold text-white disabled:opacity-60 transition-all"
                style={{ background: '#0057b8', boxShadow: '0 2px 8px rgba(0,87,184,0.25)' }}>
                {buying || checkout.isPending
                  ? <><Spinner size={11} />Processing…</>
                  : <><ArrowRight size={11} />Checkout</>}
              </motion.button>
            )}
          </div>
        </div>
      </div>

      {/* Coupon row — only for paid courses */}
      {!isFree && (
        <CouponRow
          courseId={item.id}
          onApply={(code) => setCoupon(code)}
        />
      )}

      {checkout.isError && (
        <p className="mt-2 flex items-center gap-1 text-xs" style={{ color: '#EF4444' }}>
          <AlertCircle size={10} />
          {(checkout.error as any)?.message ?? 'Checkout failed. Please try again.'}
        </p>
      )}
    </motion.div>
  )
}

/* ── Page ────────────────────────────────────────────── */
export default function CartPage() {
  const items     = useCartStore(s => s.items)
  const removeItem = useCartStore(s => s.removeItem)
  const clearCart = useCartStore(s => s.clearCart)

  const paidItems = items.filter(i => !i.isFree && i.price && i.price > 0)
  const freeItems = items.filter(i => i.isFree || !i.price || i.price === 0)
  const total     = paidItems.reduce((sum, i) => sum + (i.price ?? 0), 0)

  return (
    <div className="mx-auto max-w-2xl">
      {/* ── Header ──────────────────────── */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="mb-6 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShoppingCart size={14} style={{ color: '#0057b8' }} />
            <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: '#0057b8' }}>
              Cart
            </span>
          </div>
          <h1 className="text-2xl font-bold" style={{ color: '#111827', fontFamily: 'Bricolage Grotesque, sans-serif' }}>
            Your Cart
            {items.length > 0 && (
              <span className="ml-2 inline-flex items-center justify-center rounded-lg px-2 py-0.5 text-sm font-bold"
                style={{ background: '#F3F4F6', color: '#374151' }}>
                {items.length}
              </span>
            )}
          </h1>
        </div>

        {items.length > 0 && (
          <button onClick={clearCart}
            className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-red-50"
            style={{ color: '#EF4444', border: '1px solid rgba(239,68,68,0.18)' }}>
            <Trash2 size={11} />Clear all
          </button>
        )}
      </motion.div>

      {/* ── Empty state ─────────────────── */}
      {items.length === 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-4 py-20">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl"
            style={{ background: '#F3F4F6', border: '1px solid #E5E7EB' }}>
            <ShoppingCart size={32} style={{ color: '#D1D5DB' }} />
          </div>
          <div className="text-center">
            <p className="text-base font-bold" style={{ color: '#111827' }}>Your cart is empty</p>
            <p className="mt-1 text-sm" style={{ color: '#9CA3AF' }}>Browse the catalog to find courses you love</p>
          </div>
          <Link href="/courses">
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              className="flex items-center gap-2 rounded-2xl px-6 py-2.5 text-sm font-bold text-white"
              style={{ background: '#0057b8', boxShadow: '0 4px 14px rgba(0,87,184,0.30)' }}>
              <Sparkles size={14} />Browse Catalog
            </motion.button>
          </Link>
        </motion.div>
      )}

      {/* ── Cart items ──────────────────── */}
      {items.length > 0 && (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {items.map(item => (
              <CartItemCard
                key={item.id}
                item={item}
                onRemove={() => removeItem(item.id)}
              />
            ))}
          </AnimatePresence>

          {/* ── Order summary ─────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="mt-4 rounded-2xl p-5"
            style={{ background: 'white', border: '1px solid #E5E7EB', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <h2 className="mb-3 text-sm font-bold" style={{ color: '#111827' }}>Order Summary</h2>

            <div className="space-y-2 text-sm">
              {paidItems.length > 0 && (
                <div className="flex justify-between" style={{ color: '#6B7280' }}>
                  <span>{paidItems.length} paid course{paidItems.length !== 1 ? 's' : ''}</span>
                  <span className="font-semibold" style={{ color: '#111827' }}>${total.toFixed(2)}</span>
                </div>
              )}
              {freeItems.length > 0 && (
                <div className="flex justify-between" style={{ color: '#6B7280' }}>
                  <span>{freeItems.length} free course{freeItems.length !== 1 ? 's' : ''}</span>
                  <span className="font-semibold" style={{ color: '#16A34A' }}>Free</span>
                </div>
              )}
            </div>

            {paidItems.length > 0 && (
              <div className="mt-3 flex items-center justify-between pt-3"
                style={{ borderTop: '1px solid #F3F4F6' }}>
                <span className="text-sm font-bold" style={{ color: '#111827' }}>Total</span>
                <span className="text-xl font-bold" style={{ color: '#111827' }}>${total.toFixed(2)}</span>
              </div>
            )}

            <p className="mt-3 text-[11px] text-center" style={{ color: '#9CA3AF' }}>
              Each course has its own checkout. Click <strong>Checkout</strong> on individual paid courses above.
            </p>

            <div className="mt-3 pt-3" style={{ borderTop: '1px solid #F3F4F6' }}>
              <Link href="/courses" className="flex items-center justify-center gap-1.5 text-xs font-semibold transition-colors hover:opacity-70"
                style={{ color: '#0057b8' }}>
                <Sparkles size={11} />Continue shopping
              </Link>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
