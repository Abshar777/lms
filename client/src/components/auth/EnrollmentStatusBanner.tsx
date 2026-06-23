'use client'

import { motion } from 'framer-motion'
import { Clock, XCircle, ChevronRight, Eye } from 'lucide-react'
import { useCurrentUser } from '@/lib/api/user'

const CATEGORY_LABEL: Record<string, string> = {
  '4x-trading':        'FOREX Trading',
  'digital-marketing': 'Digital Marketing',
  'ai':                'AI',
}

export function EnrollmentStatusBanner() {
  const { data: user } = useCurrentUser()

  if (!user || user.role !== 'student') return null
  if (user.enrollmentStatus === 'approved' || !user.enrollmentStatus) return null

  const prog = user.category ? (CATEGORY_LABEL[user.category] ?? user.category) : null

  if (user.enrollmentStatus === 'pending') {
    return (
      <motion.div
        initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        className="mb-5 flex items-start gap-3 rounded-2xl px-4 py-3.5"
        style={{
          background: 'linear-gradient(135deg, rgba(251,191,36,0.07) 0%, rgba(245,158,11,0.04) 100%)',
          border: '1px solid rgba(251,191,36,0.22)',
        }}
      >
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl"
          style={{ background: 'rgba(251,191,36,0.14)' }}>
          <Eye size={14} style={{ color: '#F59E0B' }} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold" style={{ color: '#92400E' }}>
            You're browsing in viewer mode
          </p>
          <p className="mt-0.5 text-xs" style={{ color: '#78350F' }}>
            {prog
              ? `Your ${prog} access is pending admin approval. `
              : 'Your account is pending admin approval. '}
            You can browse freely, but course content and live class booking are locked until approved.
          </p>
        </div>
        <ChevronRight size={14} className="mt-0.5 flex-shrink-0" style={{ color: '#D1D5DB' }} />
      </motion.div>
    )
  }

  if (user.enrollmentStatus === 'cancelled' || (user.enrollmentStatus as string) === 'rejected') {
    const reason = user.enrollmentCancellationReason ?? (user as any).rejectionReason
    return (
      <motion.div
        initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        className="mb-5 rounded-2xl px-4 py-3.5"
        style={{
          background: 'linear-gradient(135deg, rgba(239,68,68,0.06) 0%, rgba(220,38,38,0.03) 100%)',
          border: '1px solid rgba(239,68,68,0.2)',
        }}
      >
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl"
            style={{ background: 'rgba(239,68,68,0.12)' }}>
            <XCircle size={14} style={{ color: '#EF4444' }} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold" style={{ color: '#991B1B' }}>
              {prog ? `Your ${prog} access request was not approved` : 'Your access request was not approved'}
            </p>
            <p className="mt-0.5 text-xs" style={{ color: '#7F1D1D' }}>
              You can browse course listings, but content access and bookings are restricted.
            </p>
          </div>
        </div>
        {reason && (
          <div className="mt-3 rounded-xl px-3 py-2.5"
            style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.12)' }}>
            <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: '#EF4444' }}>
              Reason from admin
            </p>
            <p className="mt-1 text-xs" style={{ color: '#374151' }}>
              {reason}
            </p>
          </div>
        )}
        <p className="mt-2 text-xs" style={{ color: '#9CA3AF' }}>
          If you believe this is a mistake, please contact our support team.
        </p>
      </motion.div>
    )
  }

  return null
}
