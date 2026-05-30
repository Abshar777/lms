'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  BarChart3, Users, CheckCircle, XCircle, Loader2, Download, Calendar,
  TrendingUp, UsersRound, UserCheck,
} from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { useCurrentUser } from '@/lib/api/user'
import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/axios'

/* ── Types ─────────────────────────────────────────────── */
interface AttendanceRow {
  user:     { id: string; name: string; email: string }
  total:    number
  attended: number
  missed:   number
  booked:   number
}

interface MentorScheduleRow {
  mentor:         { id: string; name: string; email: string }
  assigned:       number
  conducted:      number
  cancelled:      number
  completionPct:  number
}

interface BatchPerformance {
  batch:          { id: string; name: string; status: string }
  sessions:       number
  totalBookings:  number
  attended:       number
  attendanceRate: number
  activeStudents: number
}

/* ── Hooks ─────────────────────────────────────────────── */
function useAttendanceReport(batchId: string, from: string, to: string) {
  return useQuery({
    queryKey: ['admin', 'reports', 'attendance', { batchId, from, to }],
    queryFn:  () => {
      const params: Record<string, string> = {}
      if (batchId) params.batchId = batchId
      if (from) params.from = from
      if (to)   params.to   = to
      return apiGet<AttendanceRow[]>('/admin/reports/attendance', params as any)
    },
    staleTime: 60_000,
  })
}

function useMentorScheduleReport(mentorId: string, from: string, to: string) {
  return useQuery({
    queryKey: ['admin', 'reports', 'mentor-schedule', { mentorId, from, to }],
    queryFn:  () => {
      const params: Record<string, string> = {}
      if (mentorId) params.mentorId = mentorId
      if (from) params.from = from
      if (to)   params.to   = to
      return apiGet<MentorScheduleRow[]>('/admin/reports/mentor-schedule', params as any)
    },
    staleTime: 60_000,
  })
}

function useBatchPerformance(batchId: string) {
  return useQuery({
    queryKey: ['admin', 'reports', 'batch-performance', batchId],
    queryFn:  () => {
      const params: Record<string, string> = {}
      if (batchId) params.batchId = batchId
      return apiGet<BatchPerformance[]>('/admin/reports/batch-performance', params as any)
    },
    staleTime: 60_000,
  })
}

/* ── CSV export ────────────────────────────────────────── */
function downloadCsv(rows: AttendanceRow[]) {
  const header = 'Name,Email,Total,Attended,Missed,Pending,Attendance %'
  const lines  = rows.map(r => {
    const pct = r.total > 0 ? Math.round((r.attended / r.total) * 100) : 0
    return `"${r.user.name}","${r.user.email}",${r.total},${r.attended},${r.missed},${r.booked},${pct}%`
  })
  const csv  = [header, ...lines].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = 'attendance-report.csv'
  a.click()
  URL.revokeObjectURL(url)
}

function downloadMentorCsv(rows: MentorScheduleRow[]) {
  const header = 'Mentor,Email,Assigned,Conducted,Cancelled,Completion %'
  const lines  = rows.map(r =>
    `"${r.mentor.name}","${r.mentor.email}",${r.assigned},${r.conducted},${r.cancelled},${r.completionPct}%`
  )
  const csv  = [header, ...lines].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = 'mentor-schedule-report.csv'
  a.click()
  URL.revokeObjectURL(url)
}

/* ── Rate ring ─────────────────────────────────────────── */
function RateRing({ pct, size = 52 }: { pct: number; size?: number }) {
  const r   = (size / 2) - 5
  const circ = 2 * Math.PI * r
  const fill = (pct / 100) * circ
  const color = pct >= 80 ? '#10B981' : pct >= 50 ? '#F59E0B' : '#EF4444'

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
      <circle key="bg" cx={size/2} cy={size/2} r={r} fill="none" stroke="#F3F4F6" strokeWidth={5} />
      <circle key="fill" cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={5}
        strokeDasharray={`${fill} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`} />
      <text key="label" x={size/2} y={size/2 + 4} textAnchor="middle" fontSize={11} fontWeight="bold" fill={color}>
        {`${pct}%`}
      </text>
    </svg>
  )
}

/* ── Page ──────────────────────────────────────────────── */
export default function ReportsPage() {
  const { data: me } = useCurrentUser()

  const [batchId,  setBatchId]  = useState('')
  const [mentorId, setMentorId] = useState('')
  const [from,     setFrom]     = useState('')
  const [to,       setTo]       = useState('')

  const attendance     = useAttendanceReport(batchId, from, to)
  const performance    = useBatchPerformance(batchId)
  const mentorSchedule = useMentorScheduleReport(mentorId, from, to)

  const attendanceRows     = Array.isArray(attendance.data)     ? attendance.data     : []
  const performanceRows    = Array.isArray(performance.data)    ? performance.data    : []
  const mentorScheduleRows = Array.isArray(mentorSchedule.data) ? mentorSchedule.data : []

  const inputBase  = 'rounded-xl border border-[#E4E7ED] bg-white px-3 py-2 text-sm outline-none focus:border-[#FF6B1A] focus:ring-2 focus:ring-orange-100'

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <PageHeader
          title="Reports"
          subtitle="Attendance and performance analytics"
          badge={{ label: 'Analytics', color: '#FF6B1A' }}
        />
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <input type="date" value={from} onChange={e => setFrom(e.target.value)}
          className={inputBase} style={{ color: '#0D0F1A' }} title="From date" />
        <input type="date" value={to} onChange={e => setTo(e.target.value)}
          className={inputBase} style={{ color: '#0D0F1A' }} title="To date" />
        {(from || to || batchId || mentorId) && (
          <button onClick={() => { setFrom(''); setTo(''); setBatchId(''); setMentorId('') }}
            className="rounded-xl border border-[#E4E7ED] bg-white px-3 py-2 text-sm text-[#6B7280] hover:bg-gray-50">
            Clear filters
          </button>
        )}
      </div>

      {/* ── Mentor Schedule ─────────────────────────────── */}
      <section className="mb-8">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            <UserCheck size={16} style={{ color: '#FF6B1A' }} />
            <h2 className="text-base font-bold" style={{ color: '#0D0F1A', fontFamily: 'Bricolage Grotesque, sans-serif' }}>
              Mentor Schedule
            </h2>
            {mentorScheduleRows.length > 0 && (
              <span className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                style={{ background: 'rgba(255,107,26,0.10)', color: '#FF6B1A' }}>
                {mentorScheduleRows.length} mentors
              </span>
            )}
          </div>
          {mentorScheduleRows.length > 0 && (
            <button onClick={() => downloadMentorCsv(mentorScheduleRows)}
              className="flex items-center gap-1.5 rounded-xl border border-[#E4E7ED] bg-white px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-gray-50"
              style={{ color: '#374151' }}>
              <Download size={12} /><span>CSV</span>
            </button>
          )}
        </div>

        {mentorSchedule.isLoading ? (
          <div className="flex h-24 items-center justify-center gap-2 text-sm" style={{ color: '#9CA3AF' }}>
            <Loader2 size={15} className="animate-spin" /><span>Loading…</span>
          </div>
        ) : mentorScheduleRows.length === 0 ? (
          <p className="text-sm py-8 text-center" style={{ color: '#9CA3AF' }}>No mentor schedule data yet</p>
        ) : (
          <div className="overflow-hidden rounded-2xl bg-white" style={{ border: '1px solid #E4E7ED' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
                  {['Mentor', 'Assigned', 'Conducted', 'Cancelled', 'Completion'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide"
                      style={{ color: '#9CA3AF' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {mentorScheduleRows.map((row, i) => (
                  <motion.tr key={row.mentor.id}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className="transition-colors hover:bg-gray-50"
                    style={{ borderBottom: i < mentorScheduleRows.length - 1 ? '1px solid #F9FAFB' : 'none' }}>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-sm" style={{ color: '#0D0F1A' }}>{row.mentor.name}</p>
                      <p className="text-xs" style={{ color: '#9CA3AF' }}>{row.mentor.email}</p>
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: '#374151' }}>{row.assigned}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold" style={{ color: '#10B981' }}>
                        <CheckCircle size={11} /><span>{row.conducted}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold" style={{ color: '#EF4444' }}>
                        <XCircle size={11} /><span>{row.cancelled}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 overflow-hidden rounded-full" style={{ background: '#F3F4F6' }}>
                          <div className="h-full rounded-full"
                            style={{ width: `${row.completionPct}%`, background: row.completionPct >= 80 ? '#10B981' : row.completionPct >= 50 ? '#F59E0B' : '#EF4444' }} />
                        </div>
                        <span className="text-xs font-bold"
                          style={{ color: row.completionPct >= 80 ? '#10B981' : row.completionPct >= 50 ? '#F59E0B' : '#EF4444' }}>
                          {`${row.completionPct}%`}
                        </span>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Batch Performance ─────────────────────────────── */}
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <UsersRound size={16} style={{ color: '#FF6B1A' }} />
          <h2 className="text-base font-bold" style={{ color: '#0D0F1A', fontFamily: 'Bricolage Grotesque, sans-serif' }}>
            Batch Performance
          </h2>
        </div>

        {performance.isLoading ? (
          <div className="flex h-24 items-center justify-center gap-2 text-sm" style={{ color: '#9CA3AF' }}>
            <Loader2 size={15} className="animate-spin" /><span>Loading…</span>
          </div>
        ) : performanceRows.length === 0 ? (
          <p className="text-sm py-8 text-center" style={{ color: '#9CA3AF' }}>No batch data yet</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {performanceRows.map((p, i) => (
              <motion.div key={(p.batch as any).id ?? (p.batch as any)._id ?? i}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="rounded-2xl bg-white p-4 flex items-center gap-4"
                style={{ border: '1px solid #E4E7ED' }}>
                <RateRing pct={p.attendanceRate} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold truncate" style={{ color: '#0D0F1A' }}>{p.batch.name}</p>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px]" style={{ color: '#6B7280' }}>
                    <span className="flex items-center gap-1"><Calendar size={10} /><span>{p.sessions} sessions</span></span>
                    <span className="flex items-center gap-1"><Users size={10} /><span>{p.activeStudents} students</span></span>
                    <span className="flex items-center gap-1"><TrendingUp size={10} /><span>{p.totalBookings} bookings</span></span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* ── Attendance Report ──────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            <BarChart3 size={16} style={{ color: '#FF6B1A' }} />
            <h2 className="text-base font-bold" style={{ color: '#0D0F1A', fontFamily: 'Bricolage Grotesque, sans-serif' }}>
              Attendance
            </h2>
            {attendanceRows.length > 0 && (
              <span className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                style={{ background: 'rgba(255,107,26,0.10)', color: '#FF6B1A' }}>
                {attendanceRows.length} students
              </span>
            )}
          </div>
          {attendanceRows.length > 0 && (
            <button onClick={() => downloadCsv(attendanceRows)}
              className="flex items-center gap-1.5 rounded-xl border border-[#E4E7ED] bg-white px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-gray-50"
              style={{ color: '#374151' }}>
              <Download size={12} /><span>CSV</span>
            </button>
          )}
        </div>

        {attendance.isLoading ? (
          <div className="flex h-24 items-center justify-center gap-2 text-sm" style={{ color: '#9CA3AF' }}>
            <Loader2 size={15} className="animate-spin" /><span>Loading…</span>
          </div>
        ) : attendanceRows.length === 0 ? (
          <p className="text-sm py-8 text-center" style={{ color: '#9CA3AF' }}>No attendance data for the selected filters</p>
        ) : (
          <div className="overflow-hidden rounded-2xl bg-white" style={{ border: '1px solid #E4E7ED' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
                  {['Student', 'Attended', 'Missed', 'Pending', 'Rate'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide"
                      style={{ color: '#9CA3AF' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {attendanceRows.map((row, i) => {
                  const pct   = row.total > 0 ? Math.round((row.attended / row.total) * 100) : 0
                  const color = pct >= 80 ? '#10B981' : pct >= 50 ? '#F59E0B' : '#EF4444'
                  return (
                    <motion.tr key={(row.user as any).id ?? (row.user as any)._id ?? i}
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className="transition-colors hover:bg-gray-50"
                      style={{ borderBottom: i < attendanceRows.length - 1 ? '1px solid #F9FAFB' : 'none' }}>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-sm" style={{ color: '#0D0F1A' }}>{row.user.name}</p>
                        <p className="text-xs" style={{ color: '#9CA3AF' }}>{row.user.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold" style={{ color: '#10B981' }}>
                          <CheckCircle size={11} /><span>{row.attended}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold" style={{ color: '#EF4444' }}>
                          <XCircle size={11} /><span>{row.missed}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: '#9CA3AF' }}>{row.booked}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 overflow-hidden rounded-full" style={{ background: '#F3F4F6' }}>
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                          </div>
                          <span className="text-xs font-bold" style={{ color }}>{`${pct}%`}</span>
                        </div>
                      </td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
