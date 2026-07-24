'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  CheckCircle2, XCircle, AlertCircle,
  ArrowRight, BookOpen, RotateCcw,
} from 'lucide-react'
import Spinner from '@/components/ui/Spinner'

/* ── helpers ─────────────────────────────────────────── */
function fmt(amount: string | null, currency: string | null) {
  if (!amount || !currency) return null
  return new Intl.NumberFormat('en-AE', { style: 'currency', currency: currency ?? 'AED' }).format(parseFloat(amount))
}

/* ── inner component (needs Suspense for useSearchParams) ── */
function ReturnContent() {
  const params      = useSearchParams()
  const status      = params.get('status')
  const amount      = params.get('amount')
  const currency    = params.get('currencyCode')
  const orderId     = params.get('orderId')
  const txId        = params.get('transactionId')
  const docRef      = params.get('docRefNumber')

  const isSuccess  = status === 'PAYMENT_GATEWAY_SUCCESS'
  const isCancelled = status === 'PAYMENT_GATEWAY_CANCEL'
  const isFailure  = !isSuccess && !isCancelled

  /* ── Success ──────────────────────────────────────── */
  if (isSuccess) {
    return (
      <div className="flex flex-col items-center text-center gap-6 max-w-md mx-auto">
        <motion.div
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 220, damping: 14 }}
          className="w-24 h-24 rounded-full flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg,#F0FDF4,#DCFCE7)', border: '2px solid #86EFAC' }}>
          <CheckCircle2 size={44} style={{ color: '#16A34A' }} strokeWidth={1.8} />
        </motion.div>

        <div>
          <h1 className="text-2xl font-bold mb-2" style={{ color: '#111827', fontFamily: 'Bricolage Grotesque, sans-serif' }}>
            Payment Successful!
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: '#6B7280' }}>
            Your payment has been received. Your course enrollment will be
            activated within a few minutes.
          </p>
        </div>

        {/* Receipt card */}
        {(amount || orderId || txId) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="w-full rounded-2xl p-5 text-left space-y-2.5"
            style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
            {amount && currency && (
              <div className="flex justify-between text-sm">
                <span style={{ color: '#6B7280' }}>Amount paid</span>
                <span className="font-bold" style={{ color: '#111827' }}>{fmt(amount, currency)}</span>
              </div>
            )}
            {orderId && (
              <div className="flex justify-between text-sm">
                <span style={{ color: '#6B7280' }}>Order ID</span>
                <span className="font-mono text-xs" style={{ color: '#374151' }}>{orderId}</span>
              </div>
            )}
            {txId && (
              <div className="flex justify-between text-sm">
                <span style={{ color: '#6B7280' }}>Transaction ID</span>
                <span className="font-mono text-xs truncate max-w-[180px]" style={{ color: '#374151' }}>{txId}</span>
              </div>
            )}
            {docRef && (
              <div className="flex justify-between text-sm">
                <span style={{ color: '#6B7280' }}>Reference</span>
                <span className="font-mono text-xs" style={{ color: '#374151' }}>{docRef}</span>
              </div>
            )}
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          className="flex flex-col gap-3 w-full">
          <Link href="/my-learning">
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              className="w-full flex items-center justify-center gap-2 rounded-2xl px-6 py-3 text-sm font-bold text-white"
              style={{ background: '#0057b8', boxShadow: '0 4px 16px rgba(0,87,184,0.30)' }}>
              <BookOpen size={15} />Go to My Learning
              <ArrowRight size={14} />
            </motion.button>
          </Link>
          <Link href="/courses">
            <button className="w-full text-sm font-semibold py-2 rounded-2xl transition-colors hover:bg-gray-50"
              style={{ color: '#6B7280' }}>
              Browse more courses
            </button>
          </Link>
        </motion.div>

        <p className="text-xs" style={{ color: '#9CA3AF' }}>
          A confirmation email will be sent to your registered address.
        </p>
      </div>
    )
  }

  /* ── Cancelled ────────────────────────────────────── */
  if (isCancelled) {
    return (
      <div className="flex flex-col items-center text-center gap-6 max-w-md mx-auto">
        <motion.div
          initial={{ scale: 0 }} animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 220, damping: 14 }}
          className="w-24 h-24 rounded-full flex items-center justify-center"
          style={{ background: '#FFFBEB', border: '2px solid #FCD34D' }}>
          <AlertCircle size={44} style={{ color: '#D97706' }} strokeWidth={1.8} />
        </motion.div>

        <div>
          <h1 className="text-2xl font-bold mb-2" style={{ color: '#111827', fontFamily: 'Bricolage Grotesque, sans-serif' }}>
            Payment Cancelled
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: '#6B7280' }}>
            You cancelled the payment. No charge was made. You can try again whenever you're ready.
          </p>
        </div>

        <div className="flex flex-col gap-3 w-full">
          <Link href="/courses">
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              className="w-full flex items-center justify-center gap-2 rounded-2xl px-6 py-3 text-sm font-bold text-white"
              style={{ background: '#0057b8', boxShadow: '0 4px 16px rgba(0,87,184,0.30)' }}>
              <RotateCcw size={14} />Back to Courses
            </motion.button>
          </Link>
        </div>
      </div>
    )
  }

  /* ── Failure ──────────────────────────────────────── */
  return (
    <div className="flex flex-col items-center text-center gap-6 max-w-md mx-auto">
      <motion.div
        initial={{ scale: 0 }} animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 220, damping: 14 }}
        className="w-24 h-24 rounded-full flex items-center justify-center"
        style={{ background: '#FEF2F2', border: '2px solid #FECACA' }}>
        <XCircle size={44} style={{ color: '#DC2626' }} strokeWidth={1.8} />
      </motion.div>

      <div>
        <h1 className="text-2xl font-bold mb-2" style={{ color: '#111827', fontFamily: 'Bricolage Grotesque, sans-serif' }}>
          Payment Failed
        </h1>
        <p className="text-sm leading-relaxed" style={{ color: '#6B7280' }}>
          Your payment could not be processed. No charge was made.
          Please check your card details and try again.
        </p>
      </div>

      {orderId && (
        <div className="w-full rounded-xl p-4 text-left text-sm"
          style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
          <span style={{ color: '#DC2626' }}>Reference: </span>
          <span className="font-mono text-xs" style={{ color: '#7F1D1D' }}>{orderId}</span>
        </div>
      )}

      <div className="flex flex-col gap-3 w-full">
        <Link href="/courses">
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            className="w-full flex items-center justify-center gap-2 rounded-2xl px-6 py-3 text-sm font-bold text-white"
            style={{ background: '#0057b8', boxShadow: '0 4px 16px rgba(0,87,184,0.30)' }}>
            <RotateCcw size={14} />Try Again
          </motion.button>
        </Link>
        <Link href="/my-learning">
          <button className="w-full text-sm font-semibold py-2 rounded-2xl transition-colors hover:bg-gray-50"
            style={{ color: '#6B7280' }}>
            Go to My Learning
          </button>
        </Link>
      </div>

      <p className="text-xs" style={{ color: '#9CA3AF' }}>
        If the issue persists, please contact support.
      </p>
    </div>
  )
}

/* ── Page wrapper ─────────────────────────────────── */
export default function PaymentReturnPage() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-12">
      <Suspense fallback={
        <div className="flex flex-col items-center gap-4">
          <Spinner size={32} />
          <p className="text-sm" style={{ color: '#9CA3AF' }}>Loading payment status…</p>
        </div>
      }>
        <ReturnContent />
      </Suspense>
    </div>
  )
}
