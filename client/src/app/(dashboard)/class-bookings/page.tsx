'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft, ChevronRight, Calendar, Clock, Users,
  ExternalLink, Radio, CheckCircle2, Loader2, Video,
  BookOpen, AlertCircle, User, X, CalendarDays, Filter, Search,
} from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/store/ui.store'
import { useAllLiveClasses, type LiveClass } from '@/lib/api/liveClasses'
import { useMyBookings, useCreateBooking, useCancelBooking, type MyBooking } from '@/lib/api/bookings'
import { useCourse } from '@/lib/api/courses'
import { APP_TIMEZONE } from '@/lib/timezone'
import { useServerNow } from '@/hooks/useServerNow'

/* ─────────────────────────────────────────────────────────
   DATE HELPERS
───────────────────────────────────────────────────────── */
/** Weekday + day-of-month for a slot, read in UAE time (e.g. "Mon 5").
 *  Uses an explicit timeZone because getDay()/getDate() would otherwise
 *  use the viewer's device timezone and could disagree with the UAE time shown. */
function zonedDayLabel(iso: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: APP_TIMEZONE,
    weekday:  'short',
    day:      'numeric',
  }).formatToParts(new Date(iso))
  const weekday = parts.find(p => p.type === 'weekday')?.value ?? ''
  const day     = parts.find(p => p.type === 'day')?.value ?? ''
  return `${weekday} ${day}`
}

function getMondayOfWeek(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth()    === b.getMonth()    &&
    a.getDate()     === b.getDate()
  )
}

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function fmtTime(iso: string): string {
  // Hardcoded to Dubai (GST) — every user worldwide sees the same wall-clock time.
  return new Date(iso).toLocaleTimeString('en-US', {
    timeZone: APP_TIMEZONE, hour: 'numeric', minute: '2-digit', hour12: true,
  })
}

function fmtSlotLabel(iso: string, durationMins: number): string {
  const end = new Date(new Date(iso).getTime() + durationMins * 60_000)
  return `${zonedDayLabel(iso)} · ${fmtTime(iso)}–${fmtTime(end.toISOString())}`
}

function fmtShortSlot(iso: string): string {
  return `${zonedDayLabel(iso)}, ${fmtTime(iso)}`
}

function fmtDateRange(start: Date, end: Date): string {
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  if (isSameDay(start, end)) {
    return start.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  }
  if (start.getFullYear() === end.getFullYear()) {
    if (start.getMonth() === end.getMonth()) {
      return `${start.toLocaleDateString('en-US', { month: 'long' })} ${start.getDate()} – ${end.getDate()}, ${end.getFullYear()}`
    }
    return `${start.toLocaleDateString('en-US', opts)} – ${end.toLocaleDateString('en-US', { ...opts, year: 'numeric' })}`
  }
  return `${start.toLocaleDateString('en-US', { ...opts, year: 'numeric' })} – ${end.toLocaleDateString('en-US', { ...opts, year: 'numeric' })}`
}

function fmtDuration(mins: number): string {
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m ? `${h}h ${m}m` : `${h}h`
}

/* ─────────────────────────────────────────────────────────
   STATUS
───────────────────────────────────────────────────────── */
type SlotStatus =
  | 'live' | 'booked' | 'bookable' | 'full' | 'locked'
  | 'attended' | 'missed' | 'cancelled' | 'ended'

/** Live-Now window: a session shows as "Live Now" from 30 min before its start
 *  (when the reminder email goes out) until 15 min after start (the booking cutoff)
 *  — a 45-minute window. After that it's ended; before it, upcoming. */
const LIVE_LEAD_MINS     = 30   // minutes before start the session goes "Live Now"
const BOOKING_GRACE_MINS = 15   // minutes after start that the live window stays open

function isWithinLiveWindow(lc: LiveClass): boolean {
  const start = new Date(lc.scheduledStart).getTime()
  const now   = Date.now()
  return now >= start - LIVE_LEAD_MINS * 60_000 && now <= start + BOOKING_GRACE_MINS * 60_000
}

function isPastBookingCutoff(lc: LiveClass): boolean {
  return Date.now() > new Date(lc.scheduledStart).getTime() + BOOKING_GRACE_MINS * 60_000
}

function getSlotStatus(
  lc: LiveClass,
  booking: MyBooking | undefined,
  hasOtherGroupBooking: boolean,
): SlotStatus {
  if (lc.status === 'cancelled') return 'cancelled'

  const endedStatus = (): SlotStatus => {
    if (booking?.status === 'attended') return 'attended'
    if (booking?.status === 'missed')   return 'missed'
    return 'ended'
  }

  if (lc.status === 'ended') return endedStatus()

  // Live Now: actively streaming, or within the 45-min window (30m before → 15m after start).
  if (lc.status === 'live' || isWithinLiveWindow(lc)) return 'live'

  // Past the 15-min grace and never went live → ended.
  if (isPastBookingCutoff(lc)) return endedStatus()

  if (booking) {
    if (booking.status === 'booked')    return 'booked'
    if (booking.status === 'attended')  return 'attended'
    if (booking.status === 'missed')    return 'missed'
    if (booking.status === 'cancelled') {
      if (hasOtherGroupBooking) return 'locked'
      if (lc.sessionCapacity > 0 && lc.bookedCount >= lc.sessionCapacity) return 'full'
      return 'bookable'
    }
  }
  if (hasOtherGroupBooking) return 'locked'
  if (lc.sessionCapacity > 0 && lc.bookedCount >= lc.sessionCapacity) return 'full'
  return 'bookable'
}

/* ─────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────── */
interface ClassGroup {
  title:         string
  instructor:    { id: string; name: string; avatarUrl?: string } | null
  slots:         LiveClass[]
  bookedSlot:    LiveClass | undefined
  courseSlug?:   string
  courseTitle?:  string
  moduleTitle?:  string
}

interface DateSection {
  dateKey:   string   // "2025-06-02"
  dateLabel: string   // "Monday, Jun 2"
  isToday:   boolean
  groups:    ClassGroup[]
}

interface GroupKey {
  title:   string
  dateKey: string
}

/* ─────────────────────────────────────────────────────────
   MINI CALENDAR  (inline date-range picker)
───────────────────────────────────────────────────────── */
function MiniCalendar({
  rangeStart, rangeEnd, onRangeChange, onClose,
}: {
  rangeStart: Date
  rangeEnd:   Date
  onRangeChange: (start: Date, end: Date) => void
  onClose:    () => void
}) {
  const [month,  setMonth]  = useState(() => new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1))
  const [anchor, setAnchor] = useState<Date | null>(null)
  const [hover,  setHover]  = useState<Date | null>(null)

  const today        = new Date()
  const firstDay     = new Date(month.getFullYear(), month.getMonth(), 1).getDay()
  const daysInMonth  = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()

  const cells: (Date | null)[] = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(new Date(month.getFullYear(), month.getMonth(), d))
  }

  const handleDay = (day: Date) => {
    if (!anchor) {
      setAnchor(day)
    } else {
      const [s, e] = day < anchor ? [day, anchor] : [anchor, day]
      onRangeChange(s, e)
      setAnchor(null)
      setHover(null)
      onClose()
    }
  }

  const previewEnd = anchor ? (hover ?? anchor) : null

  function inRange(day: Date): boolean {
    if (anchor && previewEnd) {
      const [s, e] = previewEnd < anchor ? [previewEnd, anchor] : [anchor, previewEnd]
      return day > s && day < e
    }
    return day > rangeStart && day < rangeEnd
  }

  function isEndpoint(day: Date): boolean {
    if (anchor) {
      return isSameDay(day, anchor) || (previewEnd ? isSameDay(day, previewEnd) : false)
    }
    return isSameDay(day, rangeStart) || isSameDay(day, rangeEnd)
  }

  const presets: { label: string; fn: () => void }[] = [
    {
      label: 'This week',
      fn: () => {
        const m = getMondayOfWeek(new Date())
        onRangeChange(m, addDays(m, 6))
        onClose()
      },
    },
    {
      label: 'Next 7 days',
      fn: () => {
        const t = new Date(); t.setHours(0, 0, 0, 0)
        onRangeChange(t, addDays(t, 6))
        onClose()
      },
    },
    {
      label: 'This month',
      fn: () => {
        const t = new Date()
        const s = new Date(t.getFullYear(), t.getMonth(), 1)
        const e = new Date(t.getFullYear(), t.getMonth() + 1, 0)
        onRangeChange(s, e)
        onClose()
      },
    },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
      className="absolute right-0 top-full mt-2 z-30 w-72 rounded-2xl bg-white p-4 shadow-xl"
      style={{ border: '1px solid #E5E7EB' }}
    >
      {/* Month navigation */}
      <div className="mb-3 flex items-center justify-between">
        <button type="button"
          onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
          className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-gray-100">
          <ChevronLeft size={14} style={{ color: '#6B7280' }} />
        </button>
        <span className="text-sm font-bold"
          style={{ color: '#111827', fontFamily: 'Bricolage Grotesque, sans-serif' }}>
          {month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </span>
        <button type="button"
          onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
          className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-gray-100">
          <ChevronRight size={14} style={{ color: '#6B7280' }} />
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="mb-1 grid grid-cols-7">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
          <div key={d} className="py-1 text-center text-[10px] font-bold" style={{ color: '#9CA3AF' }}>{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7">
        {cells.map((day, i) => {
          if (!day) return <div key={`e-${i}`} className="h-7" />
          const endpoint = isEndpoint(day)
          const range    = inRange(day)
          const tod      = isSameDay(day, today)
          return (
            <button key={day.toISOString()} type="button"
              onClick={() => handleDay(day)}
              onMouseEnter={() => anchor && setHover(day)}
              onMouseLeave={() => anchor && setHover(null)}
              className="flex h-7 w-full items-center justify-center text-xs font-medium transition-all"
              style={{
                background:   endpoint ? '#FF6B1A' : range ? 'rgba(255,107,26,0.10)' : 'transparent',
                color:        endpoint ? 'white'   : tod   ? '#FF6B1A'               : '#374151',
                borderRadius: '6px',
                fontWeight:   tod && !endpoint ? 700 : 500,
              }}>
              {day.getDate()}
            </button>
          )
        })}
      </div>

      {/* Hint */}
      <p className="my-2 text-center text-[10px]" style={{ color: '#9CA3AF' }}>
        {anchor ? 'Now click an end date' : 'Click a start date'}
      </p>

      {/* Quick presets */}
      <div className="flex flex-wrap gap-1.5">
        {presets.map(p => (
          <button key={p.label} type="button" onClick={p.fn}
            className="rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors hover:brightness-95"
            style={{
              background: 'rgba(255,107,26,0.06)',
              color:      '#FF6B1A',
              border:     '1px solid rgba(255,107,26,0.15)',
            }}>
            {p.label}
          </button>
        ))}
      </div>
    </motion.div>
  )
}

/* ─────────────────────────────────────────────────────────
   SLOT CHIP  (inside modal)
───────────────────────────────────────────────────────── */
function SlotChip({ lc, status, isSelected, onClick }: {
  lc: LiveClass; status: SlotStatus; isSelected: boolean; onClick: () => void
}) {
  const d       = new Date(lc.scheduledStart)
  const isToday = isSameDay(d, new Date())
  const clickable = ['bookable', 'live', 'booked', 'attended', 'ended'].includes(status)

  const colors: Record<SlotStatus, { border: string; bg: string; label: string }> = {
    booked:    { border: '#10B981', bg: 'rgba(16,185,129,0.06)',  label: '#10B981' },
    live:      { border: '#EF4444', bg: 'rgba(239,68,68,0.06)',   label: '#EF4444' },
    bookable:  { border: isSelected ? '#FF6B1A' : '#E5E7EB', bg: isSelected ? 'rgba(255,107,26,0.05)' : 'white', label: '#FF6B1A' },
    full:      { border: '#E5E7EB', bg: '#F9FAFB', label: '#9CA3AF' },
    locked:    { border: '#E5E7EB', bg: '#F9FAFB', label: '#9CA3AF' },
    attended:  { border: '#3B82F6', bg: 'rgba(59,130,246,0.05)',  label: '#3B82F6' },
    missed:    { border: '#F59E0B', bg: 'rgba(245,158,11,0.05)',  label: '#F59E0B' },
    cancelled: { border: '#E5E7EB', bg: '#F9FAFB', label: '#D1D5DB' },
    ended:     { border: '#E5E7EB', bg: '#F9FAFB', label: '#9CA3AF' },
  }
  const c      = colors[status]
  const capPct = lc.sessionCapacity > 0 ? Math.min(100, (lc.bookedCount / lc.sessionCapacity) * 100) : 0

  const statusLabel: Record<SlotStatus, string> = {
    live:      '🔴 LIVE',
    booked:    '✓ Booked',
    bookable:  lc.sessionCapacity > 0 ? `${lc.sessionCapacity - lc.bookedCount} left` : 'Open',
    full:      'Full',
    locked:    '—',
    attended:  '✓ Attended',
    missed:    'Missed',
    cancelled: 'Cancelled',
    ended:     'Ended',
  }

  return (
    <motion.button
      type="button"
      onClick={clickable ? onClick : undefined}
      whileHover={clickable ? { scale: 1.02 } : undefined}
      whileTap={clickable ? { scale: 0.97 } : undefined}
      className="relative flex flex-col rounded-2xl p-3 text-left"
      style={{
        background: c.bg,
        border: `1.5px solid ${isSelected && status === 'bookable' ? '#FF6B1A' : c.border}`,
        boxShadow: isSelected && status === 'bookable' ? '0 0 0 3px rgba(255,107,26,0.12)' : 'none',
        cursor: clickable ? 'pointer' : 'default',
        opacity: ['full', 'cancelled', 'ended', 'locked'].includes(status) ? 0.55 : 1,
        minWidth: 0,
      }}
    >
      <div className="mb-0.5 flex items-center gap-1">
        {isToday && (
          <span className="rounded px-1 text-[8px] font-bold uppercase text-white" style={{ background: '#FF6B1A' }}>
            Today
          </span>
        )}
        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#9CA3AF' }}>
          {zonedDayLabel(lc.scheduledStart)}
        </span>
      </div>

      <div className="mb-2 flex items-center gap-1">
        <Clock size={10} style={{ color: '#9CA3AF' }} />
        <span className="text-[13px] font-bold leading-none" style={{ color: '#111827' }}>
          {fmtTime(lc.scheduledStart)}
        </span>
      </div>

      <div className="flex items-center gap-1">
        {status === 'live' && (
          <motion.span animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.2, repeat: Infinity }}
            className="h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ background: '#EF4444' }} />
        )}
        {status === 'booked' && <CheckCircle2 size={9} style={{ color: '#10B981' }} strokeWidth={3} />}
        <span className="text-[9px] font-bold" style={{ color: c.label }}>{statusLabel[status]}</span>
      </div>

      {lc.sessionCapacity > 0 && ['bookable', 'booked', 'full', 'live'].includes(status) && (
        <div className="mt-2">
          <div className="h-1 overflow-hidden rounded-full" style={{ background: '#F3F4F6' }}>
            <motion.div initial={{ width: 0 }} animate={{ width: `${capPct}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="h-full rounded-full"
              style={{ background: capPct >= 100 ? '#EF4444' : capPct >= 80 ? '#F59E0B' : '#10B981' }} />
          </div>
          <span className="mt-0.5 text-[9px]" style={{ color: '#D1D5DB' }}>
            <Users size={7} className="mr-0.5 inline" />{lc.bookedCount}/{lc.sessionCapacity}
          </span>
        </div>
      )}

      {isSelected && status === 'bookable' && (
        <div className="absolute right-2 top-2 h-2 w-2 rounded-full" style={{ background: '#FF6B1A' }} />
      )}
    </motion.button>
  )
}

/* ─────────────────────────────────────────────────────────
   CLASS CARD  (grid item — opens modal on click)
───────────────────────────────────────────────────────── */
function ClassCard({ group, bookingMap, onClick }: {
  group: ClassGroup; bookingMap: Map<string, MyBooking>; onClick: () => void
}) {
  const { slots, bookedSlot, instructor, courseTitle, moduleTitle } = group
  const hasLive = slots.some(s => s.status === 'live')

  const nextSlot =
    bookedSlot ??
    slots.find(s => s.status === 'live') ??
    slots.find(s => s.status === 'scheduled')

  const bookableCount = slots.filter(s =>
    getSlotStatus(s, bookingMap.get(s.id), false) === 'bookable'
  ).length

  type CardState = 'live' | 'booked' | 'open'
  const state: CardState =
    hasLive    ? 'live'   :
    bookedSlot ? 'booked' : 'open'

  const pal: Record<CardState, { border: string; iconBg: string; iconColor: string }> = {
    live:   { border: 'rgba(239,68,68,0.22)',  iconBg: 'rgba(239,68,68,0.10)',  iconColor: '#EF4444' },
    booked: { border: 'rgba(16,185,129,0.22)', iconBg: 'rgba(16,185,129,0.10)', iconColor: '#10B981' },
    open:   { border: '#E5E7EB',               iconBg: 'rgba(255,107,26,0.08)', iconColor: '#FF6B1A' },
  }
  const p = pal[state]

  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ y: -3, boxShadow: '0 10px 28px rgba(0,0,0,0.09)' }}
      whileTap={{ scale: 0.97 }}
      className="flex w-full flex-col rounded-2xl bg-white p-4 text-left"
      style={{ border: `1px solid ${p.border}`, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
    >
      {/* Top row: icon + pill */}
      <div className="mb-3 flex items-start justify-between">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl"
          style={{ background: p.iconBg }}>
          {hasLive     ? <Radio        size={15} style={{ color: p.iconColor }} />
           : bookedSlot ? <CheckCircle2 size={15} style={{ color: p.iconColor }} />
           :              <BookOpen    size={15} style={{ color: p.iconColor }} />}
        </div>

        {hasLive ? (
          <motion.span animate={{ opacity: [1, 0.45, 1] }} transition={{ duration: 1.4, repeat: Infinity }}
            className="rounded-full px-1.5 py-0.5 text-[9px] font-bold"
            style={{ background: 'rgba(239,68,68,0.10)', color: '#EF4444' }}>
            LIVE
          </motion.span>
        ) : bookedSlot ? (
          <span className="rounded-full px-1.5 py-0.5 text-[9px] font-bold"
            style={{ background: 'rgba(16,185,129,0.10)', color: '#10B981' }}>
            BOOKED
          </span>
        ) : bookableCount > 0 ? (
          <span className="rounded-full px-1.5 py-0.5 text-[9px] font-bold"
            style={{ background: 'rgba(255,107,26,0.08)', color: '#FF6B1A' }}>
            {bookableCount} open
          </span>
        ) : null}
      </div>

      {/* Title */}
      <h3 className="mb-1 line-clamp-2 text-sm font-bold leading-snug"
        style={{ color: '#111827', fontFamily: 'Bricolage Grotesque, sans-serif' }}>
        {group.title}
      </h3>

      {/* Instructor */}
      {instructor && (
        <p className="mb-1 flex min-w-0 items-center gap-1 text-[11px]" style={{ color: '#9CA3AF' }}>
          <User size={9} className="flex-shrink-0" />
          <span className="truncate">{instructor.name}</span>
        </p>
      )}

      {/* Course */}
      {courseTitle && (
        <p className="mb-1 flex min-w-0 items-center gap-1 text-[11px]" style={{ color: '#9CA3AF' }}>
          <BookOpen size={9} className="flex-shrink-0" />
          <span className="truncate">{courseTitle}</span>
        </p>
      )}

      {/* Module */}
      {moduleTitle && (
        <p className="mb-3 flex min-w-0 items-center gap-1 text-[11px]" style={{ color: '#FF6B1A' }}>
          <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ background: '#FF6B1A' }} />
          <span className="truncate">{moduleTitle}</span>
        </p>
      )}

      {/* Spacer when no module (keeps footer alignment) */}
      {!moduleTitle && <div className="mb-3" />}

      {/* Footer */}
      <div className="mt-auto flex flex-col gap-1 pt-3" style={{ borderTop: '1px solid #F3F4F6' }}>
        {nextSlot && (
          <div className="flex items-center gap-1.5">
            <Clock size={10} style={{ color: state === 'booked' ? '#10B981' : '#9CA3AF' }} />
            <span className="truncate text-[11px] font-medium"
              style={{ color: state === 'booked' ? '#10B981' : '#374151' }}>
              {fmtShortSlot(nextSlot.scheduledStart)}
            </span>
          </div>
        )}
        <div className="flex items-center gap-1">
          <CalendarDays size={9} style={{ color: '#D1D5DB' }} />
          <span className="text-[10px]" style={{ color: '#D1D5DB' }}>
            {slots.length} slot{slots.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
    </motion.button>
  )
}

/* ─────────────────────────────────────────────────────────
   SLOT MODAL
───────────────────────────────────────────────────────── */
interface SlotModalProps {
  group:         ClassGroup
  bookingMap:    Map<string, MyBooking>
  onBook:        (liveClassId: string) => Promise<void>
  onCancel:      (bookingId: string, label: string) => Promise<void>
  bookPending:   Set<string>
  cancelPending: Set<string>
  onClose:       () => void
}

function SlotModal({ group, bookingMap, onBook, onCancel, bookPending, cancelPending, onClose }: SlotModalProps) {
  const { slots, bookedSlot, instructor, courseTitle } = group

  const defaultId = useMemo(() => {
    if (bookedSlot) return bookedSlot.id
    return slots.find(s => {
      const st = getSlotStatus(s, bookingMap.get(s.id), false)
      return st === 'bookable' || st === 'live'
    })?.id ?? slots[0]?.id ?? null
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [selectedId, setSelectedId] = useState<string | null>(defaultId)

  /* Server-anchored clock (ticks every 30 s). The link gate / countdown compare
   * the class start against the SERVER's current time, so they're correct even if
   * the user's device clock is wrong — and independent of their timezone. */
  const now = useServerNow(30_000)

  useEffect(() => {
    if (bookedSlot) setSelectedId(bookedSlot.id)
  }, [bookedSlot?.id])

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  const selectedSlot    = slots.find(s => s.id === selectedId) ?? null
  const selectedBooking = selectedSlot ? bookingMap.get(selectedSlot.id) : undefined
  const selectedStatus  = selectedSlot
    ? getSlotStatus(selectedSlot, selectedBooking, !!bookedSlot && selectedSlot.id !== bookedSlot.id)
    : null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        onClick={e => e.stopPropagation()}
        className="relative w-full rounded-t-3xl bg-white sm:max-w-md sm:rounded-3xl"
        style={{ boxShadow: '0 -8px 40px rgba(0,0,0,0.14)', maxHeight: '88vh', overflowY: 'auto' }}
      >
        <div className="flex justify-center pb-1 pt-3 sm:hidden">
          <div className="h-1 w-9 rounded-full" style={{ background: '#E5E7EB' }} />
        </div>

        <div className="flex items-start justify-between gap-3 px-5 pb-4 pt-4"
          style={{ borderBottom: '1px solid #F3F4F6' }}>
          <div className="min-w-0">
            <h2 className="text-base font-bold leading-snug"
              style={{ color: '#111827', fontFamily: 'Bricolage Grotesque, sans-serif' }}>
              {group.title}
            </h2>
            {instructor && (
              <p className="mt-0.5 flex items-center gap-1 text-xs" style={{ color: '#9CA3AF' }}>
                <User size={10} />{instructor.name}
              </p>
            )}
            {courseTitle && (
              <p className="mt-0.5 flex items-center gap-1 text-[11px]" style={{ color: '#9CA3AF' }}>
                <BookOpen size={9} />{courseTitle}
              </p>
            )}
            {(() => {
              const sec = slots[0]?.sectionId
              const secTitle = sec && typeof sec === 'object' ? sec.title : null
              return secTitle ? (
                <p className="mt-0.5 flex items-center gap-1 text-[11px]" style={{ color: '#D1D5DB' }}>
                  <span style={{ color: '#FF6B1A', fontWeight: 600 }}>·</span>{secTitle}
                </p>
              ) : null
            })()}
          </div>
          <button type="button" onClick={onClose}
            className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-xl transition-colors hover:bg-gray-100">
            <X size={15} style={{ color: '#6B7280' }} />
          </button>
        </div>

        <div className="px-5 pb-3 pt-4">
          <p className="mb-3 text-xs font-semibold" style={{ color: '#6B7280' }}>
            {bookedSlot ? 'Your booking · other available times:' : 'Select a time slot:'}
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {slots.map(lc => {
              const booking      = bookingMap.get(lc.id)
              const isThisBooked = lc.id === bookedSlot?.id
              const hasOther     = !!bookedSlot && !isThisBooked
              const st           = getSlotStatus(lc, booking, hasOther)
              return (
                <SlotChip key={lc.id} lc={lc} status={st}
                  isSelected={selectedId === lc.id}
                  onClick={() => setSelectedId(lc.id)} />
              )
            })}
          </div>
        </div>

        <div className="px-5 pb-6 pt-2">
          <AnimatePresence>
            {selectedSlot && selectedStatus && (
              <motion.div
                key={selectedSlot.id + '-' + selectedStatus}
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.14 }}
              >
                {selectedStatus === 'bookable' && (
                  <motion.button type="button"
                    whileHover={{ scale: 1.01, boxShadow: '0 6px 20px rgba(255,107,26,0.35)' }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onBook(selectedSlot.id)}
                    disabled={bookPending.has(selectedSlot.id)}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold text-white transition-all disabled:opacity-60"
                    style={{ background: 'linear-gradient(135deg,#FF6B1A,#FF8C42)', boxShadow: '0 4px 14px rgba(255,107,26,0.28)' }}>
                    {bookPending.has(selectedSlot.id)
                      ? <><Loader2 size={14} className="animate-spin" /> Booking…</>
                      : <><BookOpen size={14} /> Book {fmtShortSlot(selectedSlot.scheduledStart)}</>}
                  </motion.button>
                )}

                {selectedStatus === 'live' && (
                  <div className="flex flex-col gap-2">
                    {selectedSlot.type === 'internal' && (
                      <Link href={`/live-classes/${selectedSlot.id}/watch`}>
                        <button type="button"
                          className="flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold text-white"
                          style={{ background: 'linear-gradient(135deg,#EF4444,#DC2626)', boxShadow: '0 4px 14px rgba(239,68,68,0.30)' }}>
                          <Radio size={14} /> Watch Live
                        </button>
                      </Link>
                    )}
                    {selectedSlot.meetingUrl && (
                      <a href={selectedSlot.meetingUrl} target="_blank" rel="noreferrer">
                        <button type="button"
                          className="flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold text-white"
                          style={{ background: 'linear-gradient(135deg,#EF4444,#DC2626)', boxShadow: '0 4px 14px rgba(239,68,68,0.30)' }}>
                          <ExternalLink size={14} /> Join Live →
                        </button>
                      </a>
                    )}
                  </div>
                )}

                {selectedStatus === 'booked' && selectedBooking && (() => {
                  const msUntil   = new Date(selectedSlot.scheduledStart).getTime() - now
                  const linkReady = msUntil <= 5 * 60_000   // ≤ 5 min before start
                  const minsLeft  = Math.max(0, Math.ceil(msUntil / 60_000))
                  return (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 rounded-2xl px-4 py-2.5"
                      style={{ background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.18)' }}>
                      <CheckCircle2 size={14} style={{ color: '#10B981' }} />
                      <p className="text-[12px] font-semibold" style={{ color: '#059669' }}>
                        Booked · {fmtSlotLabel(selectedSlot.scheduledStart, selectedSlot.durationMins)}
                      </p>
                    </div>
                    {selectedSlot.meetingUrl && linkReady && (
                      <a href={selectedSlot.meetingUrl} target="_blank" rel="noreferrer">
                        <button type="button"
                          className="flex w-full items-center justify-center gap-2 rounded-2xl py-2.5 text-sm font-semibold"
                          style={{ background: 'rgba(16,185,129,0.08)', color: '#10B981', border: '1px solid rgba(16,185,129,0.20)' }}>
                          <ExternalLink size={13} /> Get Class Link
                        </button>
                      </a>
                    )}
                    {selectedSlot.meetingUrl && !linkReady && (
                      <div className="flex items-center gap-2 rounded-2xl px-4 py-2.5"
                        style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
                        <Clock size={13} style={{ color: '#9CA3AF' }} />
                        <p className="text-[11px]" style={{ color: '#6B7280' }}>
                          Class link unlocks <strong>{minsLeft >= 60 ? `${Math.floor(minsLeft/60)}h ${minsLeft%60}m` : `${minsLeft} min`}</strong> before start
                        </p>
                      </div>
                    )}
                    <button type="button"
                      onClick={() => onCancel(selectedBooking.id, fmtShortSlot(selectedSlot.scheduledStart))}
                      disabled={cancelPending.has(selectedBooking.id)}
                      className="flex w-full items-center justify-center gap-1.5 rounded-2xl py-2 text-xs font-medium transition-colors hover:bg-red-50 disabled:opacity-50"
                      style={{ color: '#EF4444', border: '1px solid rgba(239,68,68,0.18)' }}>
                      {cancelPending.has(selectedBooking.id)
                        ? <Loader2 size={11} className="animate-spin" />
                        : <X size={11} />}
                      Cancel booking
                    </button>
                  </div>
                  )
                })()}

                {selectedStatus === 'full' && (
                  <div className="flex items-center justify-center gap-2 rounded-2xl py-3 text-sm"
                    style={{ background: '#F9FAFB', color: '#9CA3AF', border: '1px solid #E5E7EB' }}>
                    <Users size={14} /> This slot is fully booked
                  </div>
                )}

                {selectedStatus === 'locked' && (
                  <div className="flex items-center gap-2 rounded-2xl px-4 py-3"
                    style={{ background: '#FFF7ED', border: '1px solid rgba(245,158,11,0.25)' }}>
                    <AlertCircle size={14} style={{ color: '#F59E0B' }} className="flex-shrink-0" />
                    <span className="text-xs" style={{ color: '#92400E' }}>
                      You already have a booking for this class. Cancel your current slot to pick a different time.
                    </span>
                  </div>
                )}

                {selectedStatus === 'attended' && (
                  <div className="flex items-center justify-center gap-2 rounded-2xl py-3 text-sm"
                    style={{ background: 'rgba(59,130,246,0.07)', color: '#2563EB', border: '1px solid rgba(59,130,246,0.18)' }}>
                    <CheckCircle2 size={14} /> Attended — great work!
                  </div>
                )}

                {selectedStatus === 'missed' && (
                  <div className="flex items-center justify-center gap-2 rounded-2xl py-3 text-sm"
                    style={{ background: 'rgba(245,158,11,0.07)', color: '#92400E', border: '1px solid rgba(245,158,11,0.20)' }}>
                    <AlertCircle size={14} /> Missed this session
                  </div>
                )}

                {selectedStatus === 'ended' && selectedSlot.recordingUrl && (
                  <a href={selectedSlot.recordingUrl} target="_blank" rel="noreferrer">
                    <button type="button"
                      className="flex w-full items-center justify-center gap-2 rounded-2xl py-2.5 text-sm font-medium"
                      style={{ background: '#F9FAFB', color: '#6B7280', border: '1px solid #E5E7EB' }}>
                      <Video size={13} /> Watch Recording
                    </button>
                  </a>
                )}
                {selectedStatus === 'ended' && !selectedSlot.recordingUrl && (
                  <div className="flex items-center justify-center rounded-2xl py-3 text-xs"
                    style={{ background: '#F9FAFB', color: '#D1D5DB', border: '1px solid #F3F4F6' }}>
                    Session ended
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────
   GLOBAL STATS  (counts across ALL classes, not date-filtered)
───────────────────────────────────────────────────────── */
function GlobalStats({ allClasses, bookingMap }: {
  allClasses: LiveClass[]
  bookingMap: Map<string, MyBooking>
}) {
  const liveNow   = allClasses.filter(lc => getSlotStatus(lc, bookingMap.get(lc.id), false) === 'live').length
  const myBooked  = Array.from(bookingMap.values()).filter(b => b.status === 'booked').length
  const openSlots = allClasses.filter(lc =>
    getSlotStatus(lc, bookingMap.get(lc.id), false) === 'bookable'
  ).length

  const pills = [
    { label: 'Total Classes', value: allClasses.length, color: '#374151', bg: '#F9FAFB',               border: '#E5E7EB' },
    { label: 'Live Now',      value: liveNow,            color: '#EF4444', bg: 'rgba(239,68,68,0.05)',  border: 'rgba(239,68,68,0.15)' },
    { label: 'My Bookings',   value: myBooked,           color: '#10B981', bg: 'rgba(16,185,129,0.05)', border: 'rgba(16,185,129,0.15)' },
    { label: 'Open Slots',    value: openSlots,          color: '#FF6B1A', bg: 'rgba(255,107,26,0.05)', border: 'rgba(255,107,26,0.15)' },
  ]

  return (
    <div className="mb-5 grid grid-cols-4 gap-2">
      {pills.map((p, i) => (
        <motion.div key={p.label}
          initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.04, type: 'spring', stiffness: 320, damping: 28 }}
          className="rounded-2xl px-3 py-2.5"
          style={{ background: p.bg, border: `1px solid ${p.border}` }}>
          <p className="text-xl font-bold" style={{ color: p.color, fontFamily: 'Bricolage Grotesque, sans-serif' }}>
            {p.value}
          </p>
          <p className="text-[10px] font-medium" style={{ color: '#9CA3AF' }}>{p.label}</p>
        </motion.div>
      ))}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────
   CONTACT ADMIN MODAL
───────────────────────────────────────────────────────── */
function ContactAdminModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 12 }}
        transition={{ type: 'spring', stiffness: 360, damping: 30 }}
        onClick={e => e.stopPropagation()}
        className="relative w-full max-w-sm rounded-3xl bg-white p-6 text-center"
        style={{ boxShadow: '0 24px 64px rgba(0,0,0,0.14)' }}>
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
          style={{ background: 'rgba(255,107,26,0.08)', border: '1px solid rgba(255,107,26,0.20)' }}>
          <AlertCircle size={24} style={{ color: '#FF6B1A' }} />
        </div>
        <h3 className="mb-2 text-lg font-bold"
          style={{ fontFamily: 'Bricolage Grotesque, sans-serif', color: '#111827' }}>
          Attendance Limit Reached
        </h3>
        <p className="mb-5 text-sm leading-relaxed" style={{ color: '#6B7280' }}>
          You&apos;ve already attended this class twice. Please contact the admin team to arrange additional access.
        </p>
        <button type="button" onClick={onClose}
          className="w-full rounded-2xl py-3 text-sm font-bold text-white"
          style={{ background: 'linear-gradient(135deg,#FF6B1A,#FF8C42)' }}>
          Got it, I&apos;ll contact admin
        </button>
      </motion.div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────────────────── */
export default function ClassBookingsPage() {
  /* ── Date range state ── */
  const [rangeStart, setRangeStart] = useState<Date>(() => getMondayOfWeek(new Date()))
  const [rangeEnd,   setRangeEnd]   = useState<Date>(() => addDays(getMondayOfWeek(new Date()), 6))
  const [showCalendar, setShowCalendar] = useState(false)
  const calendarRef = useRef<HTMLDivElement>(null)

  /* ── Filter state ── */
  const [search,           setSearch]           = useState('')
  const [filterCourse,     setFilterCourse]     = useState('')
  const [filterModule,     setFilterModule]      = useState('')
  const [filterInstructor, setFilterInstructor] = useState('')

  /* ── Modal state ── */
  const [openGroupKey,      setOpenGroupKey]      = useState<GroupKey | null>(null)
  const [showContactAdmin,  setShowContactAdmin]  = useState(false)
  const [bookPending,       setBookPending]        = useState<Set<string>>(new Set())
  const [cancelPending,     setCancelPending]      = useState<Set<string>>(new Set())
  const toast = useToast()

  /* ── Data ── */
  const { data: allClasses = [], isLoading: loadingClasses } = useAllLiveClasses()
  const { data: bookingsData, isLoading: loadingBookings }   = useMyBookings({ per_page: 100 })
  const myBookings: MyBooking[] = bookingsData?.docs ?? []

  const bookingMap = useMemo(() => {
    const m = new Map<string, MyBooking>()
    myBookings.forEach(b => {
      const lcId = typeof b.liveClassId === 'object'
        ? (b.liveClassId?.id ?? (b.liveClassId as any)?._id)
        : b.liveClassId
      if (lcId) m.set(lcId, b)
    })
    return m
  }, [myBookings])

  /* ── Close calendar on outside click ── */
  useEffect(() => {
    if (!showCalendar) return
    const h = (e: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(e.target as Node)) {
        setShowCalendar(false)
      }
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [showCalendar])

  /* ── Filter options — courses derived from live class data ──
     Avoids a separate /courses API call and guarantees that the IDs in the
     dropdown exactly match lc.courseId used in the filter. */
  const availableCourses = useMemo(() => {
    const seen = new Map<string, { id: string; title: string; slug: string }>()
    allClasses.forEach(lc => {
      const id    = lc.courseId
      const title = lc.course?.title
      const slug  = lc.course?.slug ?? ''
      if (id && title && !seen.has(id)) seen.set(id, { id, title, slug })
    })
    return Array.from(seen.values()).sort((a, b) => a.title.localeCompare(b.title))
  }, [allClasses])

  // When a course is selected, find its slug so we can fetch its sections
  const selectedCourseSlug = useMemo(
    () => availableCourses.find(c => c.id === filterCourse)?.slug ?? '',
    [availableCourses, filterCourse],
  )
  const { data: courseDetail } = useCourse(selectedCourseSlug)
  const availableModules       = courseDetail?.sections ?? []

  // Instructors derived from (now-normalized) live class data
  const availableInstructors = useMemo(() => {
    const seen = new Map<string, { id: string; name: string }>()
    allClasses.forEach(lc => {
      const id   = lc.instructor?.id
      const name = lc.instructor?.name
      if (id && name && !seen.has(id)) seen.set(id, { id, name })
    })
    return Array.from(seen.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [allClasses])

  /* ── Apply search + course/module/instructor filters ── */
  const filteredClasses = useMemo(() => {
    const q = search.trim().toLowerCase()
    return allClasses.filter(lc => {
      /* Use lc.courseId (always a plain string after normalization) rather than
         lc.course?.id — course may be undefined when courseId wasn't populated */
      if (filterCourse && lc.courseId !== filterCourse) return false
      if (filterModule) {
        const secId = typeof lc.sectionId === 'object' ? lc.sectionId?.id : lc.sectionId
        if (secId !== filterModule) return false
      }
      if (filterInstructor && lc.instructor?.id !== filterInstructor) return false
      if (q) {
        const sec = lc.sectionId
        const moduleTitle = typeof sec === 'object' && sec ? (sec as any).title ?? '' : ''
        const haystack = [
          lc.title,
          lc.instructor?.name ?? '',
          lc.course?.title    ?? '',
          moduleTitle,
        ].join(' ').toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
  }, [allClasses, search, filterCourse, filterModule, filterInstructor])

  /* ── Apply date range ── */
  const rangeEndInclusive = useMemo(() => {
    const d = new Date(rangeEnd)
    d.setHours(23, 59, 59, 999)
    return d
  }, [rangeEnd])

  const windowClasses = useMemo(() =>
    filteredClasses.filter(lc => {
      const d = new Date(lc.scheduledStart)
      return d >= rangeStart && d <= rangeEndInclusive
    }),
    [filteredClasses, rangeStart, rangeEndInclusive]
  )

  /* ── Group windowClasses by title ── */
  const allGroups = useMemo((): ClassGroup[] => {
    const map = new Map<string, LiveClass[]>()
    windowClasses.forEach(lc => {
      const key = lc.title.trim()
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(lc)
    })

    const result: ClassGroup[] = []
    map.forEach((slots, title) => {
      slots.sort((a, b) => new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime())

      const instr       = slots[0].instructor ?? null
      const bookedSlot  = slots.find(s => bookingMap.get(s.id)?.status === 'booked')
      const courseTitle = slots[0].course?.title
      const courseSlug  = slots[0].course?.slug
      const sec         = slots[0].sectionId
      const moduleTitle = typeof sec === 'object' && sec ? sec.title : undefined

      result.push({ title, instructor: instr, slots, bookedSlot, courseSlug, courseTitle, moduleTitle })
    })

    result.sort((a, b) => {
      const rank = (g: ClassGroup) => {
        if (g.slots.some(s => s.status === 'live')) return 0
        if (g.bookedSlot)                           return 1
        return 2
      }
      return rank(a) - rank(b)
    })

    return result
  }, [windowClasses, bookingMap])

  /* ── Organize groups into date sections ── */
  const dateSections = useMemo((): DateSection[] => {
    const byDate = new Map<string, ClassGroup[]>()
    const today  = new Date()

    allGroups.forEach(group => {
      const firstSlot = group.slots
        .filter(s => {
          const d = new Date(s.scheduledStart)
          return d >= rangeStart && d <= rangeEndInclusive
        })
        .sort((a, b) => new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime())[0]

      if (!firstSlot) return

      const dk = toDateKey(new Date(firstSlot.scheduledStart))
      if (!byDate.has(dk)) byDate.set(dk, [])
      byDate.get(dk)!.push(group)
    })

    return Array.from(byDate.keys())
      .sort()
      .map(dk => {
        const [y, mo, d] = dk.split('-').map(Number)
        const date = new Date(y, mo - 1, d)
        return {
          dateKey:   dk,
          dateLabel: date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }),
          isToday:   isSameDay(date, today),
          groups:    byDate.get(dk)!,
        }
      })
  }, [allGroups, rangeStart, rangeEndInclusive])

  /* ── Re-derive open group from fresh data so bookingMap updates flow in ── */
  const openGroup = useMemo(() => {
    if (!openGroupKey) return null
    const section = dateSections.find(s => s.dateKey === openGroupKey.dateKey)
    return section?.groups.find(g => g.title === openGroupKey.title) ?? null
  }, [openGroupKey, dateSections])

  /* ── Mutations ── */
  const createBooking = useCreateBooking()
  const cancelBooking = useCancelBooking()

  async function handleBook(liveClassId: string) {
    setBookPending(prev => new Set(prev).add(liveClassId))
    try {
      await createBooking.mutateAsync(liveClassId)
      toast.success('Seat booked!')
      setOpenGroupKey(null)
    } catch (err: any) {
      const code = err?.response?.data?.error?.code
      if (code === 'CONTACT_ADMIN')    { setShowContactAdmin(true) }
      else if (code === 'SESSION_FULL')    { toast.error('This slot is full.') }
      else if (code === 'ALREADY_BOOKED') { toast.info('You already have a booking for this slot.') }
      else if (code === 'NOT_ENROLLED')   { toast.error('You must be enrolled in this course to book.') }
      else { toast.error(err?.response?.data?.error?.message ?? 'Could not book seat.') }
    } finally {
      setBookPending(prev => { const s = new Set(prev); s.delete(liveClassId); return s })
    }
  }

  async function handleCancel(bookingId: string, label: string) {
    setCancelPending(prev => new Set(prev).add(bookingId))
    try {
      await cancelBooking.mutateAsync(bookingId)
      toast.success(`Booking for ${label} cancelled.`)
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? 'Could not cancel booking.')
    } finally {
      setCancelPending(prev => { const s = new Set(prev); s.delete(bookingId); return s })
    }
  }

  /* ── Helpers ── */
  const isCurrentWeek = (
    isSameDay(rangeStart, getMondayOfWeek(new Date())) &&
    isSameDay(rangeEnd,   addDays(getMondayOfWeek(new Date()), 6))
  )

  function shiftRange(dir: 1 | -1) {
    const span = Math.round((rangeEnd.getTime() - rangeStart.getTime()) / 86_400_000) + 1
    setRangeStart(addDays(rangeStart, dir * span))
    setRangeEnd(addDays(rangeEnd,   dir * span))
  }

  const hasFilters = !!(search || filterCourse || filterModule || filterInstructor)
  const isLoading  = loadingClasses || loadingBookings

  const selectStyle = (active: boolean) => ({
    background: active ? 'rgba(255,107,26,0.07)' : 'white',
    color:      active ? '#FF6B1A'                : '#6B7280',
    border:     `1px solid ${active ? 'rgba(255,107,26,0.25)' : '#E5E7EB'}`,
  })

  return (
    <div className="mx-auto max-w-4xl pb-16">

      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 26 }}
        className="mb-5 flex flex-wrap items-end justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold"
            style={{ color: '#111827', fontFamily: 'Bricolage Grotesque, sans-serif' }}>
            Class Schedule
          </h1>
          <p className="mt-0.5 text-sm" style={{ color: '#9CA3AF' }}>
            {fmtDateRange(rangeStart, rangeEnd)}
          </p>
        </div>

        {/* Date range navigation */}
        <div className="relative flex items-center gap-2" ref={calendarRef}>
          {!isCurrentWeek && (
            <button type="button"
              onClick={() => {
                const m = getMondayOfWeek(new Date())
                setRangeStart(m)
                setRangeEnd(addDays(m, 6))
              }}
              className="rounded-xl px-3 py-2 text-xs font-semibold transition-all hover:brightness-105"
              style={{ background: 'rgba(255,107,26,0.08)', color: '#FF6B1A', border: '1px solid rgba(255,107,26,0.20)' }}>
              This week
            </button>
          )}

          <div className="flex items-center gap-1 rounded-2xl p-1"
            style={{ background: 'white', border: '1px solid #E5E7EB' }}>
            <button type="button" onClick={() => shiftRange(-1)}
              className="flex h-8 w-8 items-center justify-center rounded-xl transition-colors hover:bg-gray-100"
              style={{ color: '#6B7280' }}>
              <ChevronLeft size={15} />
            </button>

            <button type="button"
              onClick={() => setShowCalendar(v => !v)}
              className="flex items-center gap-1.5 rounded-xl px-2 py-1 transition-colors hover:bg-gray-50"
              style={{ color: '#374151' }}>
              <Calendar size={12} style={{ color: showCalendar ? '#FF6B1A' : '#9CA3AF' }} />
              <span className="whitespace-nowrap text-xs font-semibold">
                {rangeStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                {' – '}
                {rangeEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            </button>

            <button type="button" onClick={() => shiftRange(1)}
              className="flex h-8 w-8 items-center justify-center rounded-xl transition-colors hover:bg-gray-100"
              style={{ color: '#6B7280' }}>
              <ChevronRight size={15} />
            </button>
          </div>

          {/* Inline calendar dropdown */}
          <AnimatePresence>
            {showCalendar && (
              <MiniCalendar
                rangeStart={rangeStart}
                rangeEnd={rangeEnd}
                onRangeChange={(s, e) => { setRangeStart(s); setRangeEnd(e) }}
                onClose={() => setShowCalendar(false)}
              />
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* ── Filters ── */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {/* Search input */}
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: search ? '#FF6B1A' : '#9CA3AF' }} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search classes…"
            className="w-full rounded-xl py-1.5 pl-8 pr-3 text-xs font-medium outline-none"
            style={{
              background: search ? 'rgba(255,107,26,0.06)' : 'white',
              color:      '#374151',
              border:     `1px solid ${search ? 'rgba(255,107,26,0.30)' : '#E5E7EB'}`,
            }}
          />
          {search && (
            <button type="button" onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 flex h-4 w-4 items-center justify-center rounded-full hover:bg-gray-100">
              <X size={9} style={{ color: '#9CA3AF' }} />
            </button>
          )}
        </div>

        <Filter size={12} style={{ color: '#9CA3AF' }} className="shrink-0" />

        {/* Course filter */}
        <select value={filterCourse}
          onChange={e => { setFilterCourse(e.target.value); setFilterModule('') }}
          className="rounded-xl px-3 py-1.5 text-xs font-medium outline-none cursor-pointer"
          style={selectStyle(!!filterCourse)}>
          <option value="">All courses</option>
          {availableCourses.map(c => (
            <option key={c.id} value={c.id}>{c.title}</option>
          ))}
        </select>

        {/* Module filter — only when a course is selected and has sections */}
        {availableModules.length > 0 && (
          <select value={filterModule}
            onChange={e => setFilterModule(e.target.value)}
            className="rounded-xl px-3 py-1.5 text-xs font-medium outline-none cursor-pointer"
            style={selectStyle(!!filterModule)}>
            <option value="">All modules</option>
            {availableModules.map(m => (
              <option key={m.id} value={m.id}>{m.title}</option>
            ))}
          </select>
        )}

        {/* Instructor filter */}
        <select value={filterInstructor}
          onChange={e => setFilterInstructor(e.target.value)}
          className="rounded-xl px-3 py-1.5 text-xs font-medium outline-none cursor-pointer"
          style={selectStyle(!!filterInstructor)}>
          <option value="">All instructors</option>
          {availableInstructors.map(i => (
            <option key={i.id} value={i.id}>{i.name}</option>
          ))}
        </select>

        {hasFilters && (
          <button type="button"
            onClick={() => { setSearch(''); setFilterCourse(''); setFilterModule(''); setFilterInstructor('') }}
            className="shrink-0 text-xs font-medium transition-colors hover:opacity-80"
            style={{ color: '#EF4444' }}>
            × Clear
          </button>
        )}
      </div>

      {/* ── Loading ── */}
      {isLoading && (
        <div className="flex items-center justify-center gap-2 py-24 text-sm" style={{ color: '#9CA3AF' }}>
          <Loader2 size={20} className="animate-spin" style={{ color: '#FF6B1A' }} />
          Loading your schedule…
        </div>
      )}

      {!isLoading && (
        <>
          {/* Global stats — always based on all classes, not filtered by date */}
          <GlobalStats allClasses={allClasses} bookingMap={bookingMap} />

          <AnimatePresence mode="wait">
            <motion.div
              key={`${rangeStart.toISOString()}-${search}-${filterCourse}-${filterModule}-${filterInstructor}`}
              initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.16 }}
            >
              {/* ── Empty state ── */}
              {dateSections.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center gap-3 rounded-3xl bg-white py-16 text-center"
                  style={{ border: '1px solid #E5E7EB' }}
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl"
                    style={{ background: 'rgba(255,107,26,0.08)', border: '1px solid rgba(255,107,26,0.15)' }}>
                    <Calendar size={22} style={{ color: '#FF6B1A' }} />
                  </div>

                  {allClasses.length === 0 ? (
                    <>
                      <p className="font-bold" style={{ color: '#111827' }}>No upcoming classes</p>
                      <p className="max-w-xs text-sm" style={{ color: '#9CA3AF' }}>
                        Enroll in a course to see your live class schedule here.
                      </p>
                    </>
                  ) : hasFilters ? (
                    <>
                      <p className="font-bold" style={{ color: '#111827' }}>No classes match your filters</p>
                      <button type="button"
                        onClick={() => { setSearch(''); setFilterCourse(''); setFilterModule(''); setFilterInstructor('') }}
                        className="rounded-xl px-4 py-2 text-sm font-semibold"
                        style={{ background: 'rgba(255,107,26,0.10)', color: '#FF6B1A', border: '1px solid rgba(255,107,26,0.20)' }}>
                        Clear filters
                      </button>
                    </>
                  ) : (
                    <>
                      <p className="font-bold" style={{ color: '#111827' }}>No classes in this period</p>
                      {(() => {
                        const futureCount = filteredClasses.filter(lc => new Date(lc.scheduledStart) > rangeEndInclusive).length
                        return futureCount > 0 ? (
                          <div className="flex flex-col items-center gap-2">
                            <p className="text-sm" style={{ color: '#9CA3AF' }}>No sessions in the selected date range.</p>
                            <button type="button"
                              onClick={() => shiftRange(1)}
                              className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold"
                              style={{ background: 'rgba(255,107,26,0.10)', color: '#FF6B1A', border: '1px solid rgba(255,107,26,0.20)' }}>
                              <Calendar size={13} />
                              {futureCount} upcoming — go forward →
                            </button>
                          </div>
                        ) : (
                          <p className="text-sm" style={{ color: '#9CA3AF' }}>
                            No sessions scheduled for this period.
                          </p>
                        )
                      })()}
                    </>
                  )}
                </motion.div>
              ) : (
                /* ── Date-grouped class sections ── */
                <div className="space-y-6">
                  {dateSections.map((section, si) => (
                    <motion.div key={section.dateKey}
                      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: si * 0.05, type: 'spring', stiffness: 300, damping: 28 }}>

                      {/* Date heading */}
                      <div className="mb-3 flex items-center gap-3">
                        <span
                          className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold"
                          style={{
                            background: section.isToday ? 'rgba(255,107,26,0.08)' : '#F9FAFB',
                            color:      section.isToday ? '#FF6B1A'                : '#6B7280',
                            border:     `1px solid ${section.isToday ? 'rgba(255,107,26,0.20)' : '#E5E7EB'}`,
                          }}>
                          {section.isToday && (
                            <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: '#FF6B1A' }} />
                          )}
                          {section.dateLabel}
                        </span>
                        <div className="h-px flex-1" style={{ background: '#F3F4F6' }} />
                        <span className="text-[11px]" style={{ color: '#D1D5DB' }}>
                          {section.groups.length} class{section.groups.length !== 1 ? 'es' : ''}
                        </span>
                      </div>

                      {/* Class cards for this date */}
                      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                        {section.groups.map((group, i) => (
                          <motion.div key={group.title}
                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: si * 0.05 + i * 0.04, type: 'spring', stiffness: 300, damping: 28 }}>
                            <ClassCard
                              group={group}
                              bookingMap={bookingMap}
                              onClick={() => setOpenGroupKey({ title: group.title, dateKey: section.dateKey })}
                            />
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </>
      )}

      {/* ── Slot modal ── */}
      <AnimatePresence>
        {openGroup && (
          <SlotModal
            key={openGroupKey!.title + ':' + openGroupKey!.dateKey}
            group={openGroup}
            bookingMap={bookingMap}
            onBook={handleBook}
            onCancel={handleCancel}
            bookPending={bookPending}
            cancelPending={cancelPending}
            onClose={() => setOpenGroupKey(null)}
          />
        )}
      </AnimatePresence>

      {/* ── Contact admin modal ── */}
      <AnimatePresence>
        {showContactAdmin && (
          <ContactAdminModal onClose={() => setShowContactAdmin(false)} />
        )}
      </AnimatePresence>
    </div>
  )
}
