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
        initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
        className="mb-4 flex items-center gap-2.5 rounded-xl px-3.5 py-2.5"
        style={{
          background: 'rgba(245,158,11,0.08)',
          border: '1px solid rgba(245,158,11,0.22)',
        }}>
        <Eye size={13} className="flex-shrink-0" style={{ color: '#D97706' }} />
        <p className="min-w-0 flex-1 text-xs font-medium" style={{ color: '#92400E' }}>
          <span className="font-semibold">Viewer mode</span>
          <span className="hidden sm:inline">
            {prog ? `: ${prog} approval pending` : ': account approval pending'}. Content locked until approved.
          </span>
          <span className="sm:hidden">: pending approval</span>
        </p>
        <ChevronRight size={13} className="flex-shrink-0" style={{ color: '#D1D5DB' }} />
      </motion.div>
    )
  }

  if (user.enrollmentStatus === 'cancelled' || (user.enrollmentStatus as string) === 'rejected') {
    const reason = user.enrollmentCancellationReason ?? (user as any).rejectionReason
    return (
      <motion.div
        initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
        className="mb-4 rounded-xl px-3.5 py-2.5"
        style={{
          background: 'rgba(239,68,68,0.06)',
          border: '1px solid rgba(239,68,68,0.20)',
        }}>
        <div className="flex items-center gap-2.5">
          <XCircle size={13} className="flex-shrink-0" style={{ color: '#EF4444' }} />
          <p className="min-w-0 flex-1 text-xs font-medium" style={{ color: '#991B1B' }}>
            <span className="font-semibold">Access not approved</span>
            <span className="hidden sm:inline">
              {prog ? `: ${prog} request was not approved` : ''}. Content and bookings restricted.
            </span>
          </p>
        </div>
        {reason && (
          <p className="mt-2 text-xs" style={{ color: '#374151' }}>
            <span className="font-semibold" style={{ color: '#EF4444' }}>Reason: </span>{reason}
          </p>
        )}
      </motion.div>
    )
  }

  return null
}
