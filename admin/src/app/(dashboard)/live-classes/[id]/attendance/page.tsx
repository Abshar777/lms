'use client'

import { use } from 'react'
import { motion } from 'framer-motion'
import {
  CheckCircle, XCircle, Loader2, Users, ArrowLeft, Clock,
} from 'lucide-react'
import Link from 'next/link'
import {
  useAdminBookings, useUpdateAttendance, type BookingStatus,
} from '@/lib/api/liveClasses'
import { useLiveClassById } from '@/lib/api/liveClasses'

const STATUS_OPTIONS: { value: 'attended' | 'missed'; label: string; color: string; bg: string }[] = [
  { value: 'attended', label: 'Present', color: '#10B981', bg: 'rgba(16,185,129,0.10)' },
  { value: 'missed',   label: 'Absent',  color: '#EF4444', bg: 'rgba(239,68,68,0.10)' },
]

function statusBadge(status: BookingStatus) {
  switch (status) {
    case 'attended':  return { label: 'Present',   color: '#10B981', bg: 'rgba(16,185,129,0.10)' }
    case 'missed':    return { label: 'Absent',    color: '#EF4444', bg: 'rgba(239,68,68,0.10)' }
    case 'cancelled': return { label: 'Cancelled', color: '#9CA3AF', bg: 'rgba(156,163,175,0.10)' }
    default:          return { label: 'Booked',    color: '#6366F1', bg: 'rgba(99,102,241,0.10)' }
  }
}

export default function AttendancePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data: session, isLoading: sessionLoading } = useLiveClassById(id)
  const { data: bookings, isLoading: bookingsLoading } = useAdminBookings({ liveClassId: id, per_page: 100 })
  const attendanceMutation = useUpdateAttendance()

  const isLoading = sessionLoading || bookingsLoading
  const rows = Array.isArray(bookings) ? bookings : []

  const attended = rows.filter((b: any) => b.status === 'attended').length
  const total    = rows.length

  return (
    <div>
      {/* Back link */}
      <Link href="/live-classes"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium transition-colors hover:opacity-70"
        style={{ color: '#6B7280' }}>
        <ArrowLeft size={14} />Back to Live Classes
      </Link>

      {/* Header */}
      <div className="mb-6 rounded-2xl bg-white p-5" style={{ border: '1px solid #E4E7ED' }}>
        {session ? (
          <>
            <h1 className="text-lg font-bold" style={{ color: '#0D0F1A', fontFamily: 'Bricolage Grotesque, sans-serif' }}>
              {session.title}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs" style={{ color: '#6B7280' }}>
              <span className="flex items-center gap-1">
                <Clock size={11} />
                {new Date(session.scheduledStart).toLocaleString('en-US', {
                  weekday: 'short', month: 'short', day: 'numeric',
                  hour: 'numeric', minute: '2-digit',
                })}
              </span>
              <span>·</span>
              <span>{session.durationMins}m</span>
              {total > 0 && (
                <>
                  <span>·</span>
                  <span className="font-semibold" style={{ color: '#10B981' }}>
                    {attended}/{total} attended ({total > 0 ? Math.round((attended / total) * 100) : 0}%)
                  </span>
                </>
              )}
            </div>
          </>
        ) : (
          <div className="h-10 animate-pulse rounded-lg" style={{ background: '#F3F4F6' }} />
        )}
      </div>

      {/* Attendance sheet */}
      {isLoading ? (
        <div className="flex h-48 items-center justify-center gap-2 text-sm" style={{ color: '#9CA3AF' }}>
          <Loader2 size={16} className="animate-spin" />Loading attendance…
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16">
          <div className="flex h-14 w-14 items-center justify-center rounded-3xl"
            style={{ background: 'rgba(255,107,26,0.08)', border: '1px solid rgba(255,107,26,0.15)' }}>
            <Users size={22} style={{ color: '#FF6B1A' }} />
          </div>
          <p className="text-sm font-semibold" style={{ color: '#0D0F1A' }}>No bookings yet</p>
          <p className="text-xs" style={{ color: '#9CA3AF' }}>Students haven't booked this session</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-white" style={{ border: '1px solid #E4E7ED' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
                <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide" style={{ color: '#9CA3AF' }}>Student</th>
                <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide" style={{ color: '#9CA3AF' }}>Status</th>
                <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide" style={{ color: '#9CA3AF' }}>Mark</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((booking: any, i: number) => {
                const badge  = statusBadge(booking.status as BookingStatus)
                const isPending = attendanceMutation.isPending && attendanceMutation.variables?.id === booking.id
                const bookingKey = booking.id || booking._id
                return (
                  <motion.tr key={bookingKey}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className="transition-colors hover:bg-gray-50"
                    style={{ borderBottom: i < rows.length - 1 ? '1px solid #F9FAFB' : 'none' }}>
                    <td className="px-5 py-3">
                      <p className="font-semibold" style={{ color: '#0D0F1A' }}>{booking.userId?.name ?? '—'}</p>
                      <p className="text-xs" style={{ color: '#9CA3AF' }}>{booking.userId?.email ?? ''}</p>
                    </td>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold"
                        style={{ background: badge.bg, color: badge.color }}>
                        {booking.status === 'attended' ? <CheckCircle size={11} />
                          : booking.status === 'missed' ? <XCircle size={11} />
                          : null}
                        <span>{badge.label}</span>
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      {booking.status !== 'cancelled' && (
                        <div className="flex items-center gap-2">
                          {STATUS_OPTIONS.map(opt => (
                            <button key={opt.value}
                              onClick={() => attendanceMutation.mutate({ id: booking.id, status: opt.value })}
                              disabled={isPending || booking.status === opt.value}
                              className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all disabled:opacity-40"
                              style={{
                                background: booking.status === opt.value ? opt.bg : 'rgba(243,244,246,0.8)',
                                color:      booking.status === opt.value ? opt.color : '#6B7280',
                                border:     `1px solid ${booking.status === opt.value ? opt.color + '40' : '#E4E7ED'}`,
                              }}>
                              {isPending ? <Loader2 size={10} className="animate-spin" />
                                : opt.value === 'attended' ? <CheckCircle size={10} /> : <XCircle size={10} />}
                              <span>{opt.label}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </td>
                  </motion.tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
