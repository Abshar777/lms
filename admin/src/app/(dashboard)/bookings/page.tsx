'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft, ChevronRight, Calendar, Clock, Users,
  CheckCircle2, XCircle, AlertCircle, Loader2, Search,
  BookOpen, User, GraduationCap, LayoutList, X,
} from 'lucide-react'
import {
  useAdminBookings, useUpdateAttendance,
  type ClassBooking, type BookingStatus,
} from '@/lib/api/liveClasses'
import { useCurrentUser } from '@/lib/api/user'

/* ─────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────── */
function toYMD(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function fmtHeading(ymd: string): string {
  const d    = new Date(ymd + 'T00:00:00')
  const today    = toYMD(new Date())
  const tomorrow = toYMD(new Date(Date.now() + 86_400_000))
  const yesterday = toYMD(new Date(Date.now() - 86_400_000))
  const label = ymd === today     ? 'Today'
              : ymd === tomorrow  ? 'Tomorrow'
              : ymd === yesterday ? 'Yesterday'
              : d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  return label
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function fmtDuration(mins: number): string {
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60); const m = mins % 60
  return m ? `${h}h ${m}m` : `${h}h`
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d); r.setDate(r.getDate() + n); return r
}

/* ─────────────────────────────────────────────────────────
   STATUS BADGE
───────────────────────────────────────────────────────── */
const STATUS_PAL: Record<BookingStatus, { bg: string; color: string; label: string }> = {
  booked:    { bg: 'rgba(16,185,129,0.10)',  color: '#059669', label: 'Booked'    },
  attended:  { bg: 'rgba(59,130,246,0.10)',  color: '#2563EB', label: 'Attended'  },
  missed:    { bg: 'rgba(245,158,11,0.10)',  color: '#B45309', label: 'Missed'    },
  cancelled: { bg: 'rgba(107,114,128,0.10)', color: '#6B7280', label: 'Cancelled' },
}

function StatusBadge({ status }: { status: BookingStatus }) {
  const p = STATUS_PAL[status]
  return (
    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
      style={{ background: p.bg, color: p.color }}>
      {p.label}
    </span>
  )
}

/* ─────────────────────────────────────────────────────────
   AVATAR INITIALS
───────────────────────────────────────────────────────── */
function Avatar({ name, url, size = 28 }: { name: string; url?: string; size?: number }) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  if (url) return <img src={url} alt={name} className="rounded-full object-cover flex-shrink-0" style={{ width: size, height: size }} />
  return (
    <div className="flex items-center justify-center rounded-full flex-shrink-0 font-bold text-white"
      style={{ width: size, height: size, fontSize: size * 0.38, background: 'linear-gradient(135deg,#FF6B1A,#FF8C42)' }}>
      {initials}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────
   ATTENDANCE TOGGLE  (inline)
───────────────────────────────────────────────────────── */
function AttendanceToggle({ booking }: { booking: ClassBooking }) {
  const update = useUpdateAttendance()
  const isPast = new Date(booking.liveClassId.scheduledStart) < new Date()

  if (!isPast || booking.status === 'cancelled') return null

  return (
    <div className="flex gap-1">
      <button
        onClick={() => update.mutate({ id: booking.id, status: 'attended' })}
        disabled={update.isPending}
        title="Mark attended"
        className="flex h-6 w-6 items-center justify-center rounded-lg transition-colors"
        style={{
          background: booking.status === 'attended' ? 'rgba(59,130,246,0.15)' : 'rgba(0,0,0,0.04)',
          color: booking.status === 'attended' ? '#2563EB' : '#9CA3AF',
        }}>
        <CheckCircle2 size={13} />
      </button>
      <button
        onClick={() => update.mutate({ id: booking.id, status: 'missed' })}
        disabled={update.isPending}
        title="Mark missed"
        className="flex h-6 w-6 items-center justify-center rounded-lg transition-colors"
        style={{
          background: booking.status === 'missed' ? 'rgba(245,158,11,0.15)' : 'rgba(0,0,0,0.04)',
          color: booking.status === 'missed' ? '#B45309' : '#9CA3AF',
        }}>
        <XCircle size={13} />
      </button>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────
   STATS STRIP
───────────────────────────────────────────────────────── */
function StatsStrip({ bookings }: { bookings: ClassBooking[] }) {
  const total    = bookings.length
  const booked   = bookings.filter(b => b.status === 'booked').length
  const attended = bookings.filter(b => b.status === 'attended').length
  const missed   = bookings.filter(b => b.status === 'missed').length

  const pills = [
    { label: 'Total',    value: total,    color: '#374151', bg: '#F9FAFB',                  border: '#E5E7EB' },
    { label: 'Booked',   value: booked,   color: '#059669', bg: 'rgba(16,185,129,0.06)',     border: 'rgba(16,185,129,0.15)' },
    { label: 'Attended', value: attended, color: '#2563EB', bg: 'rgba(59,130,246,0.06)',     border: 'rgba(59,130,246,0.15)' },
    { label: 'Missed',   value: missed,   color: '#B45309', bg: 'rgba(245,158,11,0.06)',     border: 'rgba(245,158,11,0.15)' },
  ]
  return (
    <div className="mb-5 grid grid-cols-4 gap-3">
      {pills.map((p, i) => (
        <motion.div key={p.label}
          initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.04, type: 'spring', stiffness: 320, damping: 28 }}
          className="rounded-2xl px-4 py-3 bg-white"
          style={{ border: `1px solid ${p.border}` }}>
          <p className="text-2xl font-bold" style={{ color: p.color, fontFamily: 'Bricolage Grotesque, sans-serif' }}>
            {p.value}
          </p>
          <p className="text-[11px] font-medium mt-0.5" style={{ color: '#9CA3AF' }}>{p.label}</p>
        </motion.div>
      ))}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────
   BOOKING TABLE ROW
───────────────────────────────────────────────────────── */
function BookingRow({ booking, index }: { booking: ClassBooking; index: number }) {
  const lc         = booking.liveClassId
  const student    = booking.userId
  const instructor = lc.instructorId
  const course     = lc.courseId
  const section    = lc.sectionId

  return (
    <motion.tr
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.02, duration: 0.15 }}
      className="group border-b last:border-b-0 hover:bg-orange-50/30 transition-colors"
      style={{ borderColor: '#F3F4F6' }}
    >
      {/* Student */}
      <td className="py-3 pl-4 pr-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <Avatar name={student.name} url={student.avatarUrl} size={30} />
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: '#111827' }}>{student.name}</p>
            <p className="text-[11px] truncate" style={{ color: '#9CA3AF' }}>{student.email}</p>
          </div>
        </div>
      </td>

      {/* Session */}
      <td className="py-3 px-3">
        <p className="text-sm font-medium line-clamp-1" style={{ color: '#111827' }}>{lc.title}</p>
        <p className="text-[11px] mt-0.5" style={{ color: '#9CA3AF' }}>
          {fmtTime(lc.scheduledStart)} · {fmtDuration(lc.durationMins)}
        </p>
      </td>

      {/* Course */}
      <td className="py-3 px-3">
        {course ? (
          <div className="flex items-center gap-1 min-w-0">
            <BookOpen size={11} className="flex-shrink-0" style={{ color: '#FF6B1A' }} />
            <span className="text-[12px] truncate" style={{ color: '#374151' }}>{course.title}</span>
          </div>
        ) : (
          <span className="text-[11px]" style={{ color: '#D1D5DB' }}>—</span>
        )}
      </td>

      {/* Module */}
      <td className="py-3 px-3">
        {section ? (
          <span className="text-[12px] truncate" style={{ color: '#374151' }}>{section.title}</span>
        ) : (
          <span className="text-[11px]" style={{ color: '#D1D5DB' }}>—</span>
        )}
      </td>

      {/* Instructor */}
      <td className="py-3 px-3">
        {instructor ? (
          <div className="flex items-center gap-1.5 min-w-0">
            <Avatar name={instructor.name} url={instructor.avatarUrl} size={22} />
            <span className="text-[12px] truncate" style={{ color: '#374151' }}>{instructor.name}</span>
          </div>
        ) : (
          <span className="text-[11px]" style={{ color: '#D1D5DB' }}>—</span>
        )}
      </td>

      {/* Status */}
      <td className="py-3 px-3">
        <StatusBadge status={booking.status} />
      </td>

      {/* Actions */}
      <td className="py-3 pl-3 pr-4">
        <AttendanceToggle booking={booking} />
      </td>
    </motion.tr>
  )
}

/* ─────────────────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────────────────── */
export default function BookingsPage() {
  const { data: user } = useCurrentUser()
  const isInstructor   = user?.role === 'instructor'

  /* ── Date range — default to today ── */
  const [dateFrom, setDateFrom] = useState<Date>(() => {
    const d = new Date(); d.setHours(0, 0, 0, 0); return d
  })
  const [dateTo, setDateTo] = useState<Date>(() => {
    const d = new Date(); d.setHours(23, 59, 59, 999); return d
  })

  /* ── Filters ── */
  const [statusFilter, setStatusFilter] = useState<BookingStatus | ''>('')
  const [search,       setSearch]       = useState('')
  const [page,         setPage]         = useState(1)

  const queryParams = {
    dateFrom:  toYMD(dateFrom),
    dateTo:    toYMD(dateTo),
    status:    statusFilter || undefined,
    page,
    per_page:  100,
  }

  const { data, isLoading } = useAdminBookings(queryParams)
  const bookings: ClassBooking[] = data?.docs ?? []
  const meta       = data?.meta
  const totalPages = meta?.total_pages ?? 1

  /* ── Client-side search ── */
  const filtered = useMemo(() => {
    if (!search.trim()) return bookings
    const q = search.toLowerCase()
    return bookings.filter(b =>
      b.userId.name.toLowerCase().includes(q)
      || b.userId.email.toLowerCase().includes(q)
      || b.liveClassId.title.toLowerCase().includes(q)
      || (b.liveClassId.courseId?.title.toLowerCase().includes(q) ?? false)
      || (b.liveClassId.instructorId?.name.toLowerCase().includes(q) ?? false)
    )
  }, [bookings, search])

  /* ── Group by session date ── */
  const dateGroups = useMemo(() => {
    const map = new Map<string, ClassBooking[]>()
    filtered.forEach(b => {
      const key = toYMD(new Date(b.liveClassId.scheduledStart))
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(b)
    })
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, rows]) => ({
        date,
        heading: fmtHeading(date),
        rows: rows.sort((a, b) =>
          new Date(a.liveClassId.scheduledStart).getTime() - new Date(b.liveClassId.scheduledStart).getTime()
        ),
      }))
  }, [filtered])

  /* ── Single-day check for heading ── */
  const isSingleDay = toYMD(dateFrom) === toYMD(dateTo)

  /* ── Nav helpers ── */
  function shiftDay(n: number) {
    setDateFrom(d => addDays(d, n))
    setDateTo(d  => addDays(d, n))
    setPage(1)
  }
  function goToday() {
    const d = new Date(); d.setHours(0, 0, 0, 0)
    const e = new Date(); e.setHours(23, 59, 59, 999)
    setDateFrom(d); setDateTo(e); setPage(1)
  }
  const isToday = toYMD(dateFrom) === toYMD(new Date())

  const STATUS_OPTS: { value: BookingStatus | ''; label: string }[] = [
    { value: '',          label: 'All statuses' },
    { value: 'booked',    label: 'Booked'       },
    { value: 'attended',  label: 'Attended'     },
    { value: 'missed',    label: 'Missed'       },
    { value: 'cancelled', label: 'Cancelled'    },
  ]

  /* ── Input style ── */
  const sel = 'rounded-xl px-3 py-1.5 text-xs font-medium border border-gray-200 bg-white outline-none focus:border-orange-300 cursor-pointer'

  return (
    <div className="mx-auto max-w-7xl pb-16">

      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 26 }}
        className="mb-6 flex flex-wrap items-end justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#111827', fontFamily: 'Bricolage Grotesque, sans-serif' }}>
            {isInstructor ? 'My Bookings' : 'Bookings'}
          </h1>
          <p className="mt-0.5 text-sm" style={{ color: '#9CA3AF' }}>
            {isInstructor ? 'Students booked into your sessions' : 'All student session bookings'}
          </p>
        </div>

        {/* Date navigation */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Date range inputs */}
          <input
            type="date"
            value={toYMD(dateFrom)}
            onChange={e => { setDateFrom(new Date(e.target.value + 'T00:00:00')); setPage(1) }}
            className={sel}
            style={{ color: '#374151' }}
          />
          <span className="text-xs" style={{ color: '#9CA3AF' }}>to</span>
          <input
            type="date"
            value={toYMD(dateTo)}
            onChange={e => { setDateTo(new Date(e.target.value + 'T23:59:59')); setPage(1) }}
            className={sel}
            style={{ color: '#374151' }}
          />

          {/* Prev/Next day */}
          {isSingleDay && (
            <div className="flex items-center gap-1 rounded-2xl p-1" style={{ background: 'white', border: '1px solid #E5E7EB' }}>
              <button type="button" onClick={() => shiftDay(-1)}
                className="flex h-7 w-7 items-center justify-center rounded-xl transition-colors hover:bg-gray-100"
                style={{ color: '#6B7280' }}>
                <ChevronLeft size={14} />
              </button>
              {!isToday && (
                <button type="button" onClick={goToday}
                  className="px-2 text-xs font-semibold"
                  style={{ color: '#FF6B1A' }}>
                  Today
                </button>
              )}
              <button type="button" onClick={() => shiftDay(1)}
                className="flex h-7 w-7 items-center justify-center rounded-xl transition-colors hover:bg-gray-100"
                style={{ color: '#6B7280' }}>
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      </motion.div>

      {/* ── Filter bar ── */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#9CA3AF' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search student, session, course…"
            className="rounded-xl pl-8 pr-3 py-1.5 text-xs border border-gray-200 bg-white outline-none focus:border-orange-300 w-64"
            style={{ color: '#374151' }}
          />
          {search && (
            <button type="button" onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2">
              <X size={11} style={{ color: '#9CA3AF' }} />
            </button>
          )}
        </div>

        {/* Status filter */}
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value as any); setPage(1) }}
          className={sel} style={{ color: '#374151' }}>
          {STATUS_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        {(search || statusFilter) && (
          <button type="button"
            onClick={() => { setSearch(''); setStatusFilter(''); setPage(1) }}
            className="flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-medium transition-colors hover:bg-red-50"
            style={{ color: '#EF4444', border: '1px solid rgba(239,68,68,0.20)' }}>
            <X size={11} /> Clear
          </button>
        )}

        <div className="ml-auto flex items-center gap-1.5 text-xs" style={{ color: '#9CA3AF' }}>
          <LayoutList size={13} />
          {filtered.length} booking{filtered.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* ── Stats ── */}
      {!isLoading && bookings.length > 0 && (
        <StatsStrip bookings={filtered} />
      )}

      {/* ── Loading ── */}
      {isLoading && (
        <div className="flex items-center justify-center gap-2 py-24 text-sm" style={{ color: '#9CA3AF' }}>
          <Loader2 size={20} className="animate-spin" style={{ color: '#FF6B1A' }} />
          Loading bookings…
        </div>
      )}

      {/* ── Empty ── */}
      {!isLoading && filtered.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-3 rounded-3xl py-20 text-center bg-white"
          style={{ border: '1px solid #E5E7EB' }}>
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl"
            style={{ background: 'rgba(255,107,26,0.08)', border: '1px solid rgba(255,107,26,0.15)' }}>
            <Calendar size={24} style={{ color: '#FF6B1A' }} />
          </div>
          <p className="font-bold" style={{ color: '#111827' }}>No bookings found</p>
          <p className="max-w-xs text-sm" style={{ color: '#9CA3AF' }}>
            {search || statusFilter
              ? 'Try clearing the filters.'
              : 'No sessions are booked for the selected date range.'}
          </p>
        </motion.div>
      )}

      {/* ── Day groups ── */}
      <AnimatePresence mode="wait">
        {!isLoading && dateGroups.length > 0 && (
          <motion.div
            key={`${toYMD(dateFrom)}-${toYMD(dateTo)}-${search}-${statusFilter}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {dateGroups.map(group => (
              <div key={group.date}>
                {/* Date heading */}
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-xl"
                      style={{ background: 'rgba(255,107,26,0.10)' }}>
                      <Calendar size={13} style={{ color: '#FF6B1A' }} />
                    </div>
                    <h2 className="text-sm font-bold" style={{ color: '#111827', fontFamily: 'Bricolage Grotesque, sans-serif' }}>
                      {group.heading}
                    </h2>
                  </div>
                  <span className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                    style={{ background: 'rgba(255,107,26,0.08)', color: '#FF6B1A' }}>
                    {group.rows.length} booking{group.rows.length !== 1 ? 's' : ''}
                  </span>
                  <div className="flex-1 h-px" style={{ background: '#F3F4F6' }} />
                </div>

                {/* Table */}
                <div className="rounded-2xl bg-white overflow-hidden" style={{ border: '1px solid #E5E7EB', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[700px]">
                      <thead>
                        <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
                          {[
                            { label: 'Student',    icon: <User size={11} /> },
                            { label: 'Session',    icon: <Clock size={11} /> },
                            { label: 'Course',     icon: <BookOpen size={11} /> },
                            { label: 'Module',     icon: null },
                            { label: 'Instructor', icon: <GraduationCap size={11} /> },
                            { label: 'Status',     icon: null },
                            { label: '',           icon: null },
                          ].map(col => (
                            <th key={col.label}
                              className="py-2.5 px-3 text-left text-[10px] font-semibold uppercase tracking-widest first:pl-4 last:pr-4"
                              style={{ color: '#9CA3AF', background: '#FAFAFA' }}>
                              <span className="flex items-center gap-1">
                                {col.icon}{col.label}
                              </span>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {group.rows.map((b, i) => (
                          <BookingRow key={b.id} booking={b} index={i} />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ))}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 pt-2">
                <button type="button" onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="flex h-8 w-8 items-center justify-center rounded-xl border transition-colors hover:bg-gray-50 disabled:opacity-40"
                  style={{ borderColor: '#E5E7EB' }}>
                  <ChevronLeft size={14} style={{ color: '#6B7280' }} />
                </button>
                <span className="text-xs font-medium" style={{ color: '#6B7280' }}>
                  Page {page} of {totalPages}
                </span>
                <button type="button" onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="flex h-8 w-8 items-center justify-center rounded-xl border transition-colors hover:bg-gray-50 disabled:opacity-40"
                  style={{ borderColor: '#E5E7EB' }}>
                  <ChevronRight size={14} style={{ color: '#6B7280' }} />
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
}
