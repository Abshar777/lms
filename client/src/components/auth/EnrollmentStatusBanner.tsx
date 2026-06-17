'use client'

import { motion } from 'framer-motion'
import { Clock, XCircle, ChevronRight } from 'lucide-react'
import { useCurrentUser } from '@/lib/api/user'

const CATEGORY_LABEL: Record<string, string> = {
  '4x-trading':        '4x Trading',
  'digital-marketing': 'Digital Marketing',
}

export function EnrollmentStatusBanner() {
  const { data: user } = useCurrentUser()

  if (!user || user.role !== 'student' || !user.category) return null
  if (user.enrollmentStatus === 'approved' || !user.enrollmentStatus) return null

  const prog = CATEGORY_LABEL[user.category] ?? user.category

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
          <Clock size={14} style={{ color: '#F59E0B' }} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold" style={{ color: '#0D0F1A' }}>
            Your {prog} access is pending approval
          </p>
          <p className="mt-0.5 text-xs" style={{ color: '#6B7280' }}>
            An admin is reviewing your request. You can browse courses in the meantime, but live session access will be unlocked once approved.
          </p>
        </div>
        <ChevronRight size={14} className="mt-0.5 flex-shrink-0" style={{ color: '#D1D5DB' }} />
      </motion.div>
    )
  }

  if (user.enrollmentStatus === 'cancelled') {
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
            <p className="text-sm font-semibold" style={{ color: '#0D0F1A' }}>
              Your {prog} access request was not approved
            </p>
            <p className="mt-0.5 text-xs" style={{ color: '#6B7280' }}>
              You can still browse course content, but live session access is restricted.
            </p>
          </div>
        </div>
        {user.enrollmentCancellationReason && (
          <div className="mt-3 rounded-xl px-3 py-2.5"
            style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.12)' }}>
            <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: '#EF4444' }}>
              Reason from admin
            </p>
            <p className="mt-1 text-xs" style={{ color: '#374151' }}>
              {user.enrollmentCancellationReason}
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
