'use client'

import { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft, ChevronRight, Calendar, Clock, Users,
  ExternalLink, Radio, CheckCircle2, Loader2, Video,
  BookOpen, AlertCircle, User, X, CalendarDays, Lock, ShoppingCart,
} from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/store/ui.store'
import { useMyBatchLiveClasses, type LiveClass } from '@/lib/api/liveClasses'
import { useMyBookings, useCreateBooking, useCancelBooking, type MyBooking } from '@/lib/api/bookings'

/* ─────────────────────────────────────────────────────────
   DATE HELPERS
───────────────────────────────────────────────────────── */
const DAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

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
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

function fmtSlotLabel(iso: string, durationMins: number): string {
  const d   = new Date(iso)
  const end = new Date(d.getTime() + durationMins * 60_000)
  return `${DAY_ABBR[d.getDay()]} ${d.getDate()} · ${fmtTime(iso)}–${fmtTime(end.toISOString())}`
}

function fmtShortSlot(iso: string): string {
  const d = new Date(iso)
  return `${DAY_ABBR[d.getDay()]} ${d.getDate()}, ${fmtTime(iso)}`
}

function fmtWeekRange(mon: Date): string {
  const sun  = addDays(mon, 6)
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  if (mon.getMonth() === sun.getMonth()) {
    return `${mon.toLocaleDateString('en-US', { month: 'long' })} ${mon.getDate()} – ${sun.getDate()}, ${sun.getFullYear()}`
  }
  return `${mon.toLocaleDateString('en-US', opts)} – ${sun.toLocaleDateString('en-US', { ...opts, year: 'numeric' })}`
}

function fmtDuration(mins: number): string {
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60); const m = mins % 60
  return m ? `${h}h ${m}m` : `${h}h`
}

/* ─────────────────────────────────────────────────────────
   STATUS
───────────────────────────────────────────────────────── */
type SlotStatus =
  | 'live' | 'booked' | 'bookable' | 'full' | 'locked'
  | 'not-enrolled' | 'attended' | 'missed' | 'cancelled' | 'ended'

function getSlotStatus(
  lc: LiveClass,
  booking: MyBooking | undefined,
  hasOtherGroupBooking: boolean,
): SlotStatus {
  if (lc.status === 'cancelled') return 'cancelled'
  if (lc.status === 'ended') {
    if (!booking)                      return 'ended'
    if (booking.status === 'attended') return 'attended'
    if (booking.status === 'missed')   return 'missed'
    return 'ended'
  }
  if (lc.status === 'live') return 'live'
  if (lc.isEnrolled === false) return 'not-enrolled'
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
  title:            string
  instructor:       { id: string; name: string; avatarUrl?: string } | null
  slots:            LiveClass[]
  bookedSlot:       LiveClass | undefined
  requiresPurchase: boolean
  courseSlug?:      string
  courseTitle?:     string
}

/* ─────────────────────────────────────────────────────────
   SLOT CHIP  (inside modal)
───────────────────────────────────────────────────────── */
function SlotChip({ lc, status, isSelected, onClick }: {
  lc: LiveClass; status: SlotStatus; isSelected: boolean; onClick: () => void
}) {
  const d       = new Date(lc.scheduledStart)
  const isToday = isSameDay(d, new Date())
  const clickable = ['bookable', 'live', 'booked', 'attended', 'ended', 'not-enrolled'].includes(status)

  const colors: Record<SlotStatus, { border: string; bg: string; label: string }> = {
    booked:         { border: '#10B981', bg: 'rgba(16,185,129,0.06)',  label: '#10B981' },
    live:           { border: '#EF4444', bg: 'rgba(239,68,68,0.06)',   label: '#EF4444' },
    bookable:       { border: isSelected ? '#FF6B1A' : '#E5E7EB', bg: isSelected ? 'rgba(255,107,26,0.05)' : 'white', label: '#FF6B1A' },
    full:           { border: '#E5E7EB', bg: '#F9FAFB', label: '#9CA3AF' },
    locked:         { border: '#E5E7EB', bg: '#F9FAFB', label: '#9CA3AF' },
    'not-enrolled': { border: '#C084FC', bg: 'rgba(192,132,252,0.05)', label: '#9333EA' },
    attended:       { border: '#3B82F6', bg: 'rgba(59,130,246,0.05)',  label: '#3B82F6' },
    missed:         { border: '#F59E0B', bg: 'rgba(245,158,11,0.05)',  label: '#F59E0B' },
    cancelled:      { border: '#E5E7EB', bg: '#F9FAFB', label: '#D1D5DB' },
    ended:          { border: '#E5E7EB', bg: '#F9FAFB', label: '#9CA3AF' },
  }
  const c      = colors[status]
  const capPct = lc.sessionCapacity > 0 ? Math.min(100, (lc.bookedCount / lc.sessionCapacity) * 100) : 0

  const statusLabel: Record<SlotStatus, string> = {
    live:           '🔴 LIVE',
    booked:         '✓ Booked',
    bookable:       lc.sessionCapacity > 0 ? `${lc.sessionCapacity - lc.bookedCount} left` : '∞ left',
    full:           'Full',
    locked:         '—',
    'not-enrolled': '🔒 Purchase',
    attended:       '✓ Attended',
    missed:         'Missed',
    cancelled:      'Cancelled',
    ended:          'Ended',
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
          {DAY_ABBR[d.getDay()]} {d.getDate()}
        </span>
      </div>

      <div className="mb-1 flex items-center gap-1">
        <Clock size={10} style={{ color: '#9CA3AF' }} />
        <span className="text-[13px] font-bold leading-none" style={{ color: '#111827' }}>
          {fmtTime(lc.scheduledStart)}
        </span>
      </div>

      <span className="mb-2 text-[10px]" style={{ color: '#9CA3AF' }}>{fmtDuration(lc.durationMins)}</span>

      <div className="flex items-center gap-1">
        {status === 'live' && (
          <motion.span animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.2, repeat: Infinity }}
            className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: '#EF4444' }} />
        )}
        {status === 'booked' && <CheckCircle2 size={9} style={{ color: '#10B981' }} strokeWidth={3} />}
        <span className="text-[9px] font-bold" style={{ color: c.label }}>{statusLabel[status]}</span>
      </div>

      {lc.sessionCapacity > 0 && ['bookable', 'booked', 'full', 'live'].includes(status) && (
        <div className="mt-2">
          <div className="h-1 overflow-hidden rounded-full" style={{ background: '#F3F4F6' }}>
            <motion.div initial={{ width: 0 }} animate={{ width: `${capPct}%` }} transition={{ duration: 0.5, ease: 'easeOut' }}
              className="h-full rounded-full"
              style={{ background: capPct >= 100 ? '#EF4444' : capPct >= 80 ? '#F59E0B' : '#10B981' }} />
          </div>
          <span className="mt-0.5 text-[9px]" style={{ color: '#D1D5DB' }}>
            <Users size={7} className="inline mr-0.5" />{lc.bookedCount}/{lc.sessionCapacity}
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
   COMPACT CLASS CARD  (grid item — opens modal on click)
───────────────────────────────────────────────────────── */
function ClassCard({ group, bookingMap, onClick }: {
  group: ClassGroup; bookingMap: Map<string, MyBooking>; onClick: () => void
}) {
  const { slots, bookedSlot, instructor, requiresPurchase } = group
  const hasLive = slots.some(s => s.status === 'live')

  const nextSlot =
    bookedSlot ??
    slots.find(s => s.status === 'live') ??
    slots.find(s => s.status === 'scheduled')

  const bookableCount = slots.filter(s =>
    getSlotStatus(s, bookingMap.get(s.id), false) === 'bookable'
  ).length

  type CardState = 'live' | 'booked' | 'open' | 'locked'
  const state: CardState =
    hasLive          ? 'live'   :
    bookedSlot       ? 'booked' :
    requiresPurchase ? 'locked' : 'open'

  const pal: Record<CardState, { border: string; iconBg: string; iconColor: string }> = {
    live:   { border: 'rgba(239,68,68,0.22)',  iconBg: 'rgba(239,68,68,0.10)',  iconColor: '#EF4444' },
    booked: { border: 'rgba(16,185,129,0.22)', iconBg: 'rgba(16,185,129,0.10)', iconColor: '#10B981' },
    open:   { border: '#E5E7EB',               iconBg: 'rgba(255,107,26,0.08)', iconColor: '#FF6B1A' },
    locked: { border: '#E5E7EB',               iconBg: 'rgba(147,51,234,0.08)', iconColor: '#9333EA' },
  }
  const p = pal[state]

  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ y: -3, boxShadow: '0 10px 28px rgba(0,0,0,0.09)' }}
      whileTap={{ scale: 0.97 }}
      className="flex flex-col rounded-2xl bg-white p-4 text-left w-full"
      style={{ border: `1px solid ${p.border}`, boxShadow: '0 1px 4px rgba(0,0,0,0.04)', opacity: state === 'locked' ? 0.72 : 1 }}
    >
      {/* Top row: icon + pill */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl flex-shrink-0" style={{ background: p.iconBg }}>
          {hasLive          ? <Radio        size={15} style={{ color: p.iconColor }} />
           : bookedSlot     ? <CheckCircle2 size={15} style={{ color: p.iconColor }} />
           : requiresPurchase ? <Lock       size={15} style={{ color: p.iconColor }} />
           :                   <BookOpen   size={15} style={{ color: p.iconColor }} />}
        </div>

        {hasLive ? (
          <motion.span animate={{ opacity: [1, 0.45, 1] }} transition={{ duration: 1.4, repeat: Infinity }}
            className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
            style={{ background: 'rgba(239,68,68,0.10)', color: '#EF4444' }}>
            LIVE
          </motion.span>
        ) : bookedSlot ? (
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
            style={{ background: 'rgba(16,185,129,0.10)', color: '#10B981' }}>
            BOOKED
          </span>
        ) : requiresPurchase ? (
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
            style={{ background: 'rgba(147,51,234,0.08)', color: '#9333EA' }}>
            LOCKED
          </span>
        ) : bookableCount > 0 ? (
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
            style={{ background: 'rgba(255,107,26,0.08)', color: '#FF6B1A' }}>
            {bookableCount} open
          </span>
        ) : null}
      </div>

      {/* Title */}
      <h3 className="text-sm font-bold leading-snug line-clamp-2 mb-1"
        style={{ color: '#111827', fontFamily: 'Bricolage Grotesque, sans-serif' }}>
        {group.title}
      </h3>

      {/* Instructor */}
      {instructor && (
        <p className="flex items-center gap-1 text-[11px] mb-3 min-w-0" style={{ color: '#9CA3AF' }}>
          <User size={9} className="flex-shrink-0" />
          <span className="truncate">{instructor.name}</span>
        </p>
      )}

      {/* Footer */}
      <div className="mt-auto pt-3 flex flex-col gap-1" style={{ borderTop: '1px solid #F3F4F6' }}>
        {nextSlot && (
          <div className="flex items-center gap-1.5">
            <Clock size={10} style={{ color: state === 'booked' ? '#10B981' : '#9CA3AF' }} />
            <span className="text-[11px] font-medium truncate"
              style={{ color: state === 'booked' ? '#10B981' : '#374151' }}>
              {fmtShortSlot(nextSlot.scheduledStart)}
            </span>
          </div>
        )}
        <div className="flex items-center gap-1">
          <CalendarDays size={9} style={{ color: '#D1D5DB' }} />
          <span className="text-[10px]" style={{ color: '#D1D5DB' }}>
            {slots.length} slot{slots.length !== 1 ? 's' : ''} this week
          </span>
        </div>
      </div>
    </motion.button>
  )
}

/* ─────────────────────────────────────────────────────────
   SLOT MODAL  (bottom-sheet on mobile, centered on desktop)
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
  const { slots, bookedSlot, instructor, requiresPurchase, courseSlug, courseTitle } = group

  const defaultId = useMemo(() => {
    if (bookedSlot) return bookedSlot.id
    return slots.find(s => {
      const st = getSlotStatus(s, bookingMap.get(s.id), false)
      return st === 'bookable' || st === 'live'
    })?.id ?? slots[0]?.id ?? null
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [selectedId, setSelectedId] = useState<string | null>(defaultId)

  useEffect(() => {
    if (bookedSlot) setSelectedId(bookedSlot.id)
  }, [bookedSlot?.id])

  // Close on Escape
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        onClick={e => e.stopPropagation()}
        className="relative w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl bg-white"
        style={{ boxShadow: '0 -8px 40px rgba(0,0,0,0.14)', maxHeight: '88vh', overflowY: 'auto' }}
      >
        {/* Drag handle — mobile only */}
        <div className="flex sm:hidden justify-center pt-3 pb-1">
          <div className="h-1 w-9 rounded-full" style={{ background: '#E5E7EB' }} />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-4"
          style={{ borderBottom: '1px solid #F3F4F6' }}>
          <div className="min-w-0">
            <h2 className="font-bold text-base leading-snug"
              style={{ color: '#111827', fontFamily: 'Bricolage Grotesque, sans-serif' }}>
              {group.title}
            </h2>
            {instructor && (
              <p className="flex items-center gap-1 text-xs mt-0.5" style={{ color: '#9CA3AF' }}>
                <User size={10} />{instructor.name}
              </p>
            )}
          </div>
          <button type="button" onClick={onClose}
            className="flex-shrink-0 flex h-7 w-7 items-center justify-center rounded-xl transition-colors hover:bg-gray-100">
            <X size={15} style={{ color: '#6B7280' }} />
          </button>
        </div>

        {/* Slot picker */}
        <div className="px-5 pt-4 pb-3">
          <p className="text-xs font-semibold mb-3" style={{ color: '#6B7280' }}>
            {bookedSlot
              ? 'Your booking · other available times:'
              : requiresPurchase
              ? 'Available sessions · purchase to unlock:'
              : 'Select a time slot:'}
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

        {/* Action area */}
        <div className="px-5 pb-6 pt-2">
          <AnimatePresence>
            {selectedSlot && selectedStatus && (
              <motion.div
                key={selectedSlot.id + '-' + selectedStatus}
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.14 }}
              >
                {/* BOOKABLE */}
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

                {/* LIVE */}
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

                {/* BOOKED */}
                {selectedStatus === 'booked' && selectedBooking && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 rounded-2xl px-4 py-2.5"
                      style={{ background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.18)' }}>
                      <CheckCircle2 size={14} style={{ color: '#10B981' }} />
                      <p className="text-[12px] font-semibold" style={{ color: '#059669' }}>
                        Booked · {fmtSlotLabel(selectedSlot.scheduledStart, selectedSlot.durationMins)}
                      </p>
                    </div>
                    {selectedSlot.meetingUrl && (
                      <a href={selectedSlot.meetingUrl} target="_blank" rel="noreferrer">
                        <button type="button"
                          className="flex w-full items-center justify-center gap-2 rounded-2xl py-2.5 text-sm font-semibold"
                          style={{ background: 'rgba(16,185,129,0.08)', color: '#10B981', border: '1px solid rgba(16,185,129,0.20)' }}>
                          <ExternalLink size={13} /> Get Class Link
                        </button>
                      </a>
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
                )}

                {/* NOT ENROLLED */}
                {selectedStatus === 'not-enrolled' && (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-start gap-2.5 rounded-2xl px-4 py-3"
                      style={{ background: 'rgba(147,51,234,0.05)', border: '1px solid rgba(147,51,234,0.20)' }}>
                      <Lock size={14} style={{ color: '#9333EA', flexShrink: 0, marginTop: 1 }} />
                      <span className="text-xs leading-relaxed" style={{ color: '#6B21A8' }}>
                        Purchase this course to book live class sessions.
                      </span>
                    </div>
                    {courseSlug && (
                      <Link href={`/courses/${courseSlug}`}>
                        <button type="button"
                          className="flex w-full items-center justify-center gap-2 rounded-2xl py-2.5 text-sm font-bold text-white"
                          style={{ background: 'linear-gradient(135deg,#9333EA,#A855F7)', boxShadow: '0 4px 14px rgba(147,51,234,0.28)' }}>
                          <ShoppingCart size={13} />
                          {courseTitle ? `Get ${courseTitle}` : 'View Course'}
                        </button>
                      </Link>
                    )}
                  </div>
                )}

                {/* FULL */}
                {selectedStatus === 'full' && (
                  <div className="flex items-center justify-center gap-2 rounded-2xl py-3 text-sm"
                    style={{ background: '#F9FAFB', color: '#9CA3AF', border: '1px solid #E5E7EB' }}>
                    <Users size={14} /> This slot is fully booked
                  </div>
                )}

                {/* LOCKED */}
                {selectedStatus === 'locked' && (
                  <div className="flex items-center gap-2 rounded-2xl px-4 py-3"
                    style={{ background: '#FFF7ED', border: '1px solid rgba(245,158,11,0.25)' }}>
                    <AlertCircle size={14} style={{ color: '#F59E0B' }} className="flex-shrink-0" />
                    <span className="text-xs" style={{ color: '#92400E' }}>
                      You already have a booking for this class. Cancel your current slot to pick a different time.
                    </span>
                  </div>
                )}

                {/* ATTENDED */}
                {selectedStatus === 'attended' && (
                  <div className="flex items-center justify-center gap-2 rounded-2xl py-3 text-sm"
                    style={{ background: 'rgba(59,130,246,0.07)', color: '#2563EB', border: '1px solid rgba(59,130,246,0.18)' }}>
                    <CheckCircle2 size={14} /> Attended — great work!
                  </div>
                )}

                {/* MISSED */}
                {selectedStatus === 'missed' && (
                  <div className="flex items-center justify-center gap-2 rounded-2xl py-3 text-sm"
                    style={{ background: 'rgba(245,158,11,0.07)', color: '#92400E', border: '1px solid rgba(245,158,11,0.20)' }}>
                    <AlertCircle size={14} /> Missed this session
                  </div>
                )}

                {/* ENDED */}
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
   WEEK SUMMARY STRIP
───────────────────────────────────────────────────────── */
function WeekSummary({ groups, bookingMap }: { groups: ClassGroup[]; bookingMap: Map<string, MyBooking> }) {
  const liveNow   = groups.reduce((s, g) => s + g.slots.filter(l => l.status === 'live').length, 0)
  const booked    = groups.filter(g => !!g.bookedSlot).length
  const available = groups.reduce((s, g) => {
    if (g.bookedSlot) return s
    return s + g.slots.filter(l => getSlotStatus(l, bookingMap.get(l.id), false) === 'bookable').length
  }, 0)

  const pills = [
    { label: 'Classes',    value: groups.length, color: '#374151', bg: '#F9FAFB',                  border: '#E5E7EB' },
    { label: 'Live Now',   value: liveNow,        color: '#EF4444', bg: 'rgba(239,68,68,0.05)',      border: 'rgba(239,68,68,0.15)' },
    { label: 'Booked',     value: booked,         color: '#10B981', bg: 'rgba(16,185,129,0.05)',     border: 'rgba(16,185,129,0.15)' },
    { label: 'Open Slots', value: available,      color: '#FF6B1A', bg: 'rgba(255,107,26,0.05)',     border: 'rgba(255,107,26,0.15)' },
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
        <h3 className="mb-2 text-lg font-bold" style={{ fontFamily: 'Bricolage Grotesque, sans-serif', color: '#111827' }}>
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
  const [weekStart,       setWeekStart]       = useState<Date>(() => getMondayOfWeek(new Date()))
  const [openGroupTitle,  setOpenGroupTitle]   = useState<string | null>(null)
  const [showContactAdmin, setShowContactAdmin] = useState(false)
  const [bookPending,     setBookPending]      = useState<Set<string>>(new Set())
  const [cancelPending,   setCancelPending]    = useState<Set<string>>(new Set())
  const toast = useToast()

  const { data: allClasses = [], isLoading: loadingClasses } = useMyBatchLiveClasses('all')
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

  const weekEnd    = useMemo(() => addDays(weekStart, 7), [weekStart])
  const weekClasses = useMemo(() =>
    allClasses.filter(lc => {
      const d = new Date(lc.scheduledStart)
      return d >= weekStart && d < weekEnd
    }),
    [allClasses, weekStart, weekEnd]
  )

  const groups = useMemo((): ClassGroup[] => {
    const map = new Map<string, LiveClass[]>()
    weekClasses.forEach(lc => {
      const key = lc.title.trim()
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(lc)
    })

    const result: ClassGroup[] = []
    map.forEach((slots, title) => {
      slots.sort((a, b) => new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime())

      const instr = typeof slots[0].instructorId === 'object' && slots[0].instructorId
        ? (slots[0].instructorId as any)
        : null

      const bookedSlot = slots.find(s => bookingMap.get(s.id)?.status === 'booked')

      const nonEndedSlots = slots.filter(s => s.status !== 'ended' && s.status !== 'cancelled')
      const requiresPurchase = nonEndedSlots.length > 0 && nonEndedSlots.every(s => s.isEnrolled === false)

      const courseRef  = slots.find(s => s.courseId)?.courseId
      const courseObj  = typeof courseRef === 'object' && courseRef ? (courseRef as any) : null
      const courseSlug  = courseObj?.slug  ?? (typeof courseRef === 'string' ? courseRef : undefined)
      const courseTitle = courseObj?.title ?? undefined

      result.push({ title, instructor: instr, slots, bookedSlot, requiresPurchase, courseSlug, courseTitle })
    })

    // Enrolled/purchased classes first, then locked ones last
    result.sort((a, b) => {
      const rank = (g: ClassGroup) =>
        g.slots.some(s => s.status === 'live') ? 0 :
        g.bookedSlot                           ? 1 :
        !g.requiresPurchase                    ? 2 : 3
      return rank(a) - rank(b)
    })

    return result
  }, [weekClasses, bookingMap])

  // Always derive open group from fresh groups (so bookingMap updates flow in)
  const openGroup = openGroupTitle ? (groups.find(g => g.title === openGroupTitle) ?? null) : null

  const createBooking = useCreateBooking()
  const cancelBooking = useCancelBooking()

  async function handleBook(liveClassId: string) {
    setBookPending(prev => new Set(prev).add(liveClassId))
    try {
      await createBooking.mutateAsync(liveClassId)
      toast.success('Seat booked!')
      setOpenGroupTitle(null)    // close modal on success
    } catch (err: any) {
      const code = err?.response?.data?.error?.code
      if (code === 'CONTACT_ADMIN')    { setShowContactAdmin(true) }
      else if (code === 'SESSION_FULL')    { toast.error('This slot is full.') }
      else if (code === 'ALREADY_BOOKED') { toast.info('You already have a booking for this slot.') }
      else if (code === 'NOT_IN_BATCH')   { toast.error('You are not enrolled in this batch.') }
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

  const isLoading     = loadingClasses || loadingBookings
  const isCurrentWeek = isSameDay(weekStart, getMondayOfWeek(new Date()))

  return (
    <div className="mx-auto max-w-4xl pb-16">

      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 26 }}
        className="mb-6 flex flex-wrap items-end justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#111827', fontFamily: 'Bricolage Grotesque, sans-serif' }}>
            Class Schedule
          </h1>
          <p className="mt-0.5 text-sm" style={{ color: '#9CA3AF' }}>{fmtWeekRange(weekStart)}</p>
        </div>

        {/* Week navigation */}
        <div className="flex items-center gap-2">
          {!isCurrentWeek && (
            <button type="button"
              onClick={() => setWeekStart(getMondayOfWeek(new Date()))}
              className="rounded-xl px-3 py-2 text-xs font-semibold transition-all hover:brightness-105"
              style={{ background: 'rgba(255,107,26,0.08)', color: '#FF6B1A', border: '1px solid rgba(255,107,26,0.20)' }}>
              Today
            </button>
          )}
          <div className="flex items-center gap-1 rounded-2xl p-1"
            style={{ background: 'white', border: '1px solid #E5E7EB' }}>
            <button type="button" onClick={() => setWeekStart(d => addDays(d, -7))}
              className="flex h-8 w-8 items-center justify-center rounded-xl transition-colors hover:bg-gray-100"
              style={{ color: '#6B7280' }}>
              <ChevronLeft size={15} />
            </button>
            <span className="px-2 text-xs font-semibold whitespace-nowrap" style={{ color: '#374151' }}>
              {weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              {' '}–{' '}
              {addDays(weekStart, 6).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
            <button type="button" onClick={() => setWeekStart(d => addDays(d, 7))}
              className="flex h-8 w-8 items-center justify-center rounded-xl transition-colors hover:bg-gray-100"
              style={{ color: '#6B7280' }}>
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </motion.div>

      {/* ── Loading ── */}
      {isLoading && (
        <div className="flex items-center justify-center gap-2 py-24 text-sm" style={{ color: '#9CA3AF' }}>
          <Loader2 size={20} className="animate-spin" style={{ color: '#FF6B1A' }} />
          Loading your schedule…
        </div>
      )}

      {!isLoading && (
        <AnimatePresence>
          <motion.div
            key={weekStart.toISOString()}
            initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.16 }}
          >
            <WeekSummary groups={groups} bookingMap={bookingMap} />

            {/* Empty state */}
            {groups.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center gap-3 rounded-3xl py-16 text-center bg-white"
                style={{ border: '1px solid #E5E7EB' }}
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl"
                  style={{ background: 'rgba(255,107,26,0.08)', border: '1px solid rgba(255,107,26,0.15)' }}>
                  <Calendar size={22} style={{ color: '#FF6B1A' }} />
                </div>
                <p className="font-bold" style={{ color: '#111827' }}>No classes this week</p>
                {(() => {
                  const futureCount = allClasses.filter(lc => new Date(lc.scheduledStart) >= weekEnd).length
                  return futureCount > 0 ? (
                    <div className="flex flex-col items-center gap-2">
                      <p className="text-sm" style={{ color: '#9CA3AF' }}>No sessions scheduled for this week.</p>
                      <button
                        onClick={() => setWeekStart(w => addDays(w, 7))}
                        className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold"
                        style={{ background: 'rgba(255,107,26,0.10)', color: '#FF6B1A', border: '1px solid rgba(255,107,26,0.20)' }}
                      >
                        <Calendar size={13} />
                        {futureCount} upcoming class{futureCount !== 1 ? 'es' : ''} — see next week →
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm" style={{ color: '#9CA3AF' }}>
                      {isCurrentWeek ? 'No sessions scheduled for this week. Check back later.' : 'No sessions scheduled for this week.'}
                    </p>
                  )
                })()}
              </motion.div>
            ) : (
              /* ── Class card grid ── */
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                {groups.map((group, i) => (
                  <motion.div key={group.title}
                    initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05, type: 'spring', stiffness: 300, damping: 28 }}>
                    <ClassCard
                      group={group}
                      bookingMap={bookingMap}
                      onClick={() => setOpenGroupTitle(group.title)}
                    />
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      )}

      {/* ── Slot modal ── */}
      <AnimatePresence>
        {openGroup && (
          <SlotModal
            key={openGroup.title}
            group={openGroup}
            bookingMap={bookingMap}
            onBook={handleBook}
            onCancel={handleCancel}
            bookPending={bookPending}
            cancelPending={cancelPending}
            onClose={() => setOpenGroupTitle(null)}
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
