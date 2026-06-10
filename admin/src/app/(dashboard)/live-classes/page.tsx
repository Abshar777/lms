'use client'

import React, { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Video, Radio, Calendar, Clock, Users, Loader2,
  AlertCircle, Tv2, ExternalLink, BookOpen, Star,
  ChevronRight, PlayCircle, CalendarDays, Pencil, Search, X, Plus,
  Link as LinkIcon, LayoutList, CalendarRange, ChevronLeft, GraduationCap,
  UserCheck,
} from 'lucide-react'
import { useAllLiveClasses, useCreateLiveClass, type LiveClass, type LiveClassType } from '@/lib/api/liveClasses'
import { datetimeLocalToISO } from '@/lib/timezone'
import { useCourses } from '@/lib/api/courses'
import { useCourseOutline } from '@/lib/api/outline'
import { useUsers } from '@/lib/api/users'
import { useCurrentUser } from '@/lib/api/user'
import { EditLiveClassModal } from '@/components/live-classes/EditLiveClassModal'

/* ── Helpers ─────────────────────────────────────────── */
function fmtDate(iso: string): string {
  const d = new Date(iso)
  const today    = new Date()
  const tomorrow = new Date(Date.now() + 86_400_000)
  if (d.toDateString() === today.toDateString())    return 'Today'
  if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow'
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function fmtDuration(mins: number): string {
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60), m = mins % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

function fmtCountdown(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now()
  if (diff <= 0) return 'now'
  const s = Math.floor(diff / 1000)
  if (s < 3600) return `in ${Math.floor(s / 60)}m`
  if (s < 86400) return `in ${Math.floor(s / 3600)}h`
  return `in ${Math.floor(s / 86400)}d`
}

const FILTERS = [
  { key: 'all',       label: 'All' },
  { key: 'live',      label: 'Live Now' },
  { key: 'scheduled', label: 'Upcoming' },
  { key: 'ended',     label: 'Ended' },
  { key: 'cancelled', label: 'Cancelled' },
] as const

type FilterKey = typeof FILTERS[number]['key']

/* ── Stats bar ───────────────────────────────────────── */
function StatsBar({ items }: { items: LiveClass[] }) {
  const liveNow   = items.filter(l => l.status === 'live').length
  const today     = items.filter(l => {
    const d = new Date(l.scheduledStart)
    return d.toDateString() === new Date().toDateString() && l.status === 'scheduled'
  }).length
  const totalViewers = items
    .filter(l => l.status === 'live')
    .reduce((s, l) => s + (l.viewerCount ?? 0), 0)

  const stats = [
    {
      label: 'Live now',
      value: liveNow,
      color: '#EF4444',
      bg:    'rgba(239,68,68,0.08)',
      border:'rgba(239,68,68,0.18)',
      pulse: liveNow > 0,
    },
    {
      label: 'Scheduled today',
      value: today,
      color: '#FF6B1A',
      bg:    'rgba(255,107,26,0.08)',
      border:'rgba(255,107,26,0.18)',
      pulse: false,
    },
    {
      label: 'Watching now',
      value: totalViewers,
      color: '#818CF8',
      bg:    'rgba(99,102,241,0.08)',
      border:'rgba(99,102,241,0.18)',
      pulse: false,
    },
    {
      label: 'Total sessions',
      value: items.length,
      color: 'rgba(255,255,255,0.6)',
      bg:    'rgba(255,255,255,0.04)',
      border:'rgba(255,255,255,0.08)',
      pulse: false,
    },
  ]

  return (
    <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {stats.map(s => (
        <motion.div
          key={s.label}
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-4"
          style={{ background: s.bg, border: `1px solid ${s.border}` }}>
          <div className="flex items-center gap-2">
            {s.pulse && (
              <motion.span
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1.4, repeat: Infinity }}
                className="h-2 w-2 flex-shrink-0 rounded-full"
                style={{ background: s.color }}
              />
            )}
            <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
          </div>
          <p className="mt-0.5 text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>{s.label}</p>
        </motion.div>
      ))}
    </div>
  )
}

/* ── Table row ───────────────────────────────────────── */
function TableRow({ live, index, showInstructor }: { live: LiveClass; index: number; showInstructor: boolean }) {
  const router      = useRouter()
  const isLiveNow   = live.status === 'live'
  const isScheduled = live.status === 'scheduled'
  const isEnded     = live.status === 'ended'
  const isCancelled = live.status === 'cancelled'
  const isInternal  = live.type === 'internal'
  const [editOpen, setEditOpen] = useState(false)

  const fillPct = live.sessionCapacity > 0 ? Math.min(100, (live.bookedCount / live.sessionCapacity) * 100) : 0
  const barColor = fillPct >= 90 ? '#EF4444' : fillPct >= 70 ? '#F59E0B' : '#22C55E'

  const sectionTitle = typeof live.sectionId === 'object' ? live.sectionId?.title : undefined

  return (
    <>
      <tr
        className="transition-colors hover:bg-white/[0.03]"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>

        {/* Session */}
        <td className="px-4 py-3">
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-1.5">
              {/* Status badge */}
              {isLiveNow && (
                <motion.span
                  animate={{ opacity: [1, 0.5, 1] }}
                  transition={{ duration: 1.4, repeat: Infinity }}
                  className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-white"
                  style={{ background: '#EF4444' }}>
                  <span className="h-1 w-1 rounded-full bg-white" />LIVE
                </motion.span>
              )}
              {isEnded && (
                <span className="rounded-md px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-widest"
                  style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.35)' }}>
                  Ended
                </span>
              )}
              {isCancelled && (
                <span className="rounded-md px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-widest"
                  style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.3)' }}>
                  Cancelled
                </span>
              )}
              {isScheduled && (
                <span className="rounded-md px-1.5 py-0.5 text-[9px] font-semibold"
                  style={{ background: 'rgba(255,107,26,0.12)', color: '#FF6B1A' }}>
                  {fmtCountdown(live.scheduledStart)}
                </span>
              )}
              {/* Type badge */}
              <span className="rounded-md px-1.5 py-0.5 text-[9px] font-semibold"
                style={{
                  background: isInternal ? 'rgba(255,107,26,0.10)' : 'rgba(99,102,241,0.10)',
                  color:      isInternal ? '#FF6B1A' : '#818CF8',
                }}>
                {isInternal ? 'In-App' : 'External'}
              </span>
            </div>
            <span className={`text-sm font-semibold text-white leading-tight max-w-[220px] truncate ${isCancelled ? 'line-through opacity-40' : ''}`}>
              {live.title}
            </span>
          </div>
        </td>

        {/* Course */}
        <td className="px-4 py-3 text-sm">
          {live.course
            ? <span className="flex items-center gap-1.5" style={{ color: 'rgba(255,255,255,0.55)' }}>
                <BookOpen size={12} className="flex-shrink-0" style={{ color: 'rgba(255,255,255,0.3)' }} />
                <span className="max-w-[160px] truncate">{live.course.title}</span>
              </span>
            : <span style={{ color: 'rgba(255,255,255,0.2)' }}>—</span>
          }
        </td>

        {/* Module */}
        <td className="px-4 py-3 text-sm">
          {sectionTitle
            ? <span className="text-[11px] font-semibold" style={{ color: '#FF6B1A' }}>{sectionTitle}</span>
            : <span style={{ color: 'rgba(255,255,255,0.2)' }}>—</span>
          }
        </td>

        {/* Instructor — conditional */}
        {showInstructor && (
          <td className="px-4 py-3 text-sm">
            <span className="flex items-center gap-1.5" style={{ color: 'rgba(255,255,255,0.55)' }}>
              <GraduationCap size={12} className="flex-shrink-0" style={{ color: 'rgba(255,255,255,0.3)' }} />
              <span className="max-w-[120px] truncate">{live.instructor?.name ?? '—'}</span>
            </span>
          </td>
        )}

        {/* Date & Time */}
        <td className="px-4 py-3 text-sm whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.55)' }}>
          <div className="flex flex-col gap-0.5">
            <span className="flex items-center gap-1">
              <Calendar size={11} style={{ color: 'rgba(255,255,255,0.3)' }} />
              {fmtDate(live.scheduledStart)}
            </span>
            <span className="flex items-center gap-1 text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
              <Clock size={10} />
              {fmtTime(live.scheduledStart)} · {fmtDuration(live.durationMins)}
            </span>
          </div>
        </td>

        {/* Seats */}
        <td className="px-4 py-3 text-sm">
          <div className="flex flex-col gap-1 min-w-[80px]">
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.55)' }}>
              {live.bookedCount} / {live.sessionCapacity}
            </span>
            <div className="h-1 w-full rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${fillPct}%`, background: barColor }}
              />
            </div>
          </div>
        </td>

        {/* Actions */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-1">
            {/* Attendance */}
            <Link
              href={`/live-classes/${live.id}/attendance`}
              className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-white/10"
              style={{ color: 'rgba(255,255,255,0.4)' }}
              title="Attendance">
              <UserCheck size={13} />
            </Link>

            {/* Monitor / Go Live — internal + live or scheduled only */}
            {isInternal && (isLiveNow || isScheduled) && (
              <button
                onClick={() => router.push(`/live-classes/${live.id}/monitor`)}
                className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-white/10"
                style={{ color: isLiveNow ? '#EF4444' : '#FF6B1A' }}
                title={isLiveNow ? 'Monitor' : 'Go Live'}>
                {isLiveNow ? <Radio size={13} /> : <PlayCircle size={13} />}
              </button>
            )}

            {/* Edit */}
            <button
              onClick={() => setEditOpen(true)}
              className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-white/10"
              style={{ color: 'rgba(255,255,255,0.4)' }}
              title="Edit session">
              <Pencil size={12} />
            </button>

            {/* Course link */}
            {live.course && (
              <Link
                href={`/courses/${typeof live.course === 'object' ? live.course.id : live.courseId}/edit`}
                className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-white/10"
                style={{ color: 'rgba(255,255,255,0.25)' }}
                title="Open course">
                <ChevronRight size={13} />
              </Link>
            )}
          </div>

          <AnimatePresence>
            {editOpen && (
              <EditLiveClassModal
                live={live}
                onClose={() => setEditOpen(false)}
                onSuccess={() => setEditOpen(false)}
              />
            )}
          </AnimatePresence>
        </td>
      </tr>
    </>
  )
}

/* ── Calendar view — premium monthly grid ─────────────── */
function CalendarView({ items, onSlotClick }: { items: LiveClass[]; onSlotClick: (date: Date) => void }) {
  const todayRef     = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d }, [])
  const [monthDate,  setMonthDate]  = useState<Date>(() => { const d = new Date(); d.setDate(1); d.setHours(0,0,0,0); return d })
  const [editLive,   setEditLive]   = useState<LiveClass | null>(null)
  const [hoveredDay, setHoveredDay] = useState<string | null>(null)

  const year  = monthDate.getFullYear()
  const month = monthDate.getMonth()

  const gridStart = useMemo(() => {
    const first = new Date(year, month, 1)
    const d = new Date(first); d.setDate(first.getDate() - first.getDay()); return d
  }, [year, month])

  const calDays = useMemo(() =>
    Array.from({ length: 42 }, (_, i) => { const d = new Date(gridStart); d.setDate(gridStart.getDate() + i); return d })
  , [gridStart])

  const weeks = useMemo(() =>
    Array.from({ length: 6 }, (_, wi) => calDays.slice(wi * 7, wi * 7 + 7))
  , [calDays])

  const prevMonth = () => { const d = new Date(monthDate); d.setMonth(month - 1); setMonthDate(d) }
  const nextMonth = () => { const d = new Date(monthDate); d.setMonth(month + 1); setMonthDate(d) }
  const goToday   = () => { const d = new Date(); d.setDate(1); d.setHours(0,0,0,0); setMonthDate(d) }

  const monthLabel = monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  const monthCount = useMemo(() =>
    items.filter(l => { const d = new Date(l.scheduledStart); return d.getMonth() === month && d.getFullYear() === year }).length
  , [items, month, year])

  const getSessionsForDay = (day: Date) =>
    items.filter(l => new Date(l.scheduledStart).toDateString() === day.toDateString())

  /* Event pill: separate border sides so left accent never fights the wrapper border */
  const eventStyle = (status: LiveClass['status']) => {
    switch (status) {
      case 'live':
        return { bg: 'rgba(239,68,68,0.09)', bar: '#EF4444', borderColor: 'rgba(239,68,68,0.20)', text: '#F87171', textMuted: 'rgba(248,113,113,0.60)' }
      case 'scheduled':
        return { bg: 'rgba(255,107,26,0.08)', bar: '#FF6B1A', borderColor: 'rgba(255,107,26,0.20)', text: '#FF9C5B', textMuted: 'rgba(255,156,91,0.60)' }
      case 'ended':
        return { bg: 'rgba(255,255,255,0.03)', bar: 'rgba(255,255,255,0.25)', borderColor: 'rgba(255,255,255,0.08)', text: 'rgba(255,255,255,0.40)', textMuted: 'rgba(255,255,255,0.22)' }
      default:
        return { bg: 'rgba(255,255,255,0.015)', bar: 'rgba(255,255,255,0.12)', borderColor: 'rgba(255,255,255,0.06)', text: 'rgba(255,255,255,0.24)', textMuted: 'rgba(255,255,255,0.14)' }
    }
  }

  const DAY_ABBRS   = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const CELL_BORDER = '1px solid rgba(255,255,255,0.055)'
  const MAX_VISIBLE = 2

  return (
    <div className="select-none">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="mb-6 flex items-start justify-between gap-4">

        {/* Left: month title + count badge + status legend */}
        <div className="flex flex-col gap-2.5">
          <div className="flex items-baseline gap-3">
            <h2 className="text-3xl font-bold tracking-tight text-white">{monthLabel}</h2>
            {monthCount > 0 && (
              <span className="rounded-full px-2.5 py-0.5 text-xs font-bold"
                style={{ background: 'rgba(255,107,26,0.14)', color: '#FF8040', border: '1px solid rgba(255,107,26,0.24)' }}>
                {monthCount} {monthCount === 1 ? 'session' : 'sessions'}
              </span>
            )}
          </div>
          <div className="flex items-center gap-4">
            {([
              { label: 'Live',      dot: '#EF4444' },
              { label: 'Upcoming',  dot: '#FF6B1A' },
              { label: 'Ended',     dot: 'rgba(255,255,255,0.30)' },
              { label: 'Cancelled', dot: 'rgba(255,255,255,0.15)' },
            ] as const).map(l => (
              <span key={l.label} className="flex items-center gap-1.5 text-[11px]"
                style={{ color: 'rgba(255,255,255,0.36)' }}>
                <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ background: l.dot }} />
                {l.label}
              </span>
            ))}
          </div>
        </div>

        {/* Right: nav pill */}
        <div className="flex items-center gap-1 rounded-xl p-1"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <button onClick={prevMonth}
            className="flex h-8 w-8 items-center justify-center rounded-lg transition-all hover:bg-white/10"
            style={{ color: 'rgba(255,255,255,0.55)' }}>
            <ChevronLeft size={14} />
          </button>
          <button onClick={goToday}
            className="h-8 rounded-lg px-3.5 text-xs font-semibold transition-all hover:bg-white/10"
            style={{ color: 'rgba(255,255,255,0.65)' }}>
            Today
          </button>
          <button onClick={nextMonth}
            className="flex h-8 w-8 items-center justify-center rounded-lg transition-all hover:bg-white/10"
            style={{ color: 'rgba(255,255,255,0.55)' }}>
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* ── Grid ───────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-2xl"
        style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(11,13,23,0.70)', backdropFilter: 'blur(6px)' }}>

        {/* Day-of-week header */}
        <div className="grid grid-cols-7"
          style={{ borderBottom: CELL_BORDER, background: 'rgba(255,255,255,0.018)' }}>
          {DAY_ABBRS.map((d, i) => {
            const isWknd = i === 0 || i === 6
            return (
              <div key={d} className="py-3 text-center"
                style={{
                  borderRight: i < 6 ? CELL_BORDER : 'none',
                  background: isWknd ? 'rgba(255,255,255,0.007)' : 'transparent',
                }}>
                <span className="text-[10px] font-bold uppercase tracking-[0.13em]"
                  style={{ color: isWknd ? 'rgba(255,255,255,0.20)' : 'rgba(255,255,255,0.34)' }}>
                  {d}
                </span>
              </div>
            )
          })}
        </div>

        {/* Week rows */}
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7"
            style={{ borderBottom: wi < 5 ? CELL_BORDER : 'none' }}>

            {week.map((day, di) => {
              const inMonth   = day.getMonth() === month
              const isToday   = day.toDateString() === todayRef.toDateString()
              const isWeekend = di === 0 || di === 6
              const dayKey    = day.toDateString()
              const hovered   = hoveredDay === dayKey && inMonth
              const sessions  = getSessionsForDay(day)
              const overflow  = sessions.length - MAX_VISIBLE

              /* Inset box-shadow encodes both the hover border glow and today glow without layout shift */
              const cellShadow = isToday && inMonth
                ? 'inset 0 0 0 1.5px rgba(255,107,26,0.50), inset 0 0 28px rgba(255,107,26,0.06)'
                : hovered
                ? 'inset 0 0 0 1px rgba(255,255,255,0.14), inset 0 0 16px rgba(255,255,255,0.025)'
                : 'none'

              return (
                <div key={di}
                  onMouseEnter={() => setHoveredDay(dayKey)}
                  onMouseLeave={() => setHoveredDay(null)}
                  onClick={() => onSlotClick(day)}
                  className="relative cursor-pointer"
                  style={{
                    borderRight: di < 6 ? CELL_BORDER : 'none',
                    minHeight:   118,
                    transition:  'background 0.16s ease, box-shadow 0.16s ease',
                    boxShadow:   cellShadow,
                    /* Out-of-month: darker overlay so current month pops; no cell-level opacity */
                    background: !inMonth
                      ? 'rgba(0,0,0,0.18)'
                      : isToday
                      ? 'rgba(255,107,26,0.055)'
                      : hovered
                      ? 'rgba(255,255,255,0.028)'
                      : isWeekend
                      ? 'rgba(255,255,255,0.007)'
                      : 'transparent',
                  }}>

                  {/* Today: thin top accent bar */}
                  {isToday && inMonth && (
                    <div className="absolute inset-x-0 top-0 h-[2px] rounded-t-sm"
                      style={{ background: 'linear-gradient(90deg, #FF6B1A 40%, rgba(255,107,26,0.15))' }} />
                  )}

                  {/* Day number + hover + button row */}
                  <div className="flex items-center justify-between px-2.5 pt-2.5 pb-1">
                    <span
                      className="inline-flex h-[26px] w-[26px] flex-shrink-0 items-center justify-center rounded-full text-[12px] font-bold leading-none"
                      style={isToday && inMonth
                        ? { background: '#FF6B1A', color: '#fff', boxShadow: '0 0 11px rgba(255,107,26,0.55)' }
                        : inMonth
                        ? { color: 'rgba(255,255,255,0.72)' }
                        /* Padding days: muted gray, clearly secondary */
                        : { color: 'rgba(255,255,255,0.18)' }}>
                      {day.getDate()}
                    </span>

                    <AnimatePresence>
                      {hovered && (
                        <motion.button
                          initial={{ opacity: 0, scale: 0.60 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.60 }}
                          transition={{ duration: 0.10 }}
                          onClick={e => { e.stopPropagation(); onSlotClick(day) }}
                          className="flex h-[18px] w-[18px] items-center justify-center rounded-full"
                          style={{ background: 'rgba(255,107,26,0.18)', color: '#FF6B1A', border: '1px solid rgba(255,107,26,0.30)' }}>
                          <Plus size={9} />
                        </motion.button>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Session pills — max 2 visible, then "+X more" */}
                  <div className="space-y-[2px] px-1.5 pb-1.5" onClick={e => e.stopPropagation()}>
                    {sessions.slice(0, MAX_VISIBLE).map(s => {
                      const es     = eventStyle(s.status)
                      const isLive = s.status === 'live'
                      return (
                        <button key={s.id}
                          onClick={() => setEditLive(s)}
                          className="w-full overflow-hidden text-left transition-all hover:brightness-125"
                          style={{
                            background:    es.bg,
                            borderTop:     `1px solid ${es.borderColor}`,
                            borderRight:   `1px solid ${es.borderColor}`,
                            borderBottom:  `1px solid ${es.borderColor}`,
                            borderLeft:    `3px solid ${es.bar}`,
                            borderRadius:  5,
                          }}>
                          <div className="flex items-center gap-1 py-[2.5px] pl-1.5 pr-1.5">
                            {isLive && (
                              <motion.span
                                animate={{ opacity: [1, 0.2, 1] }}
                                transition={{ duration: 1.1, repeat: Infinity }}
                                className="h-[5px] w-[5px] flex-shrink-0 rounded-full"
                                style={{ background: '#EF4444' }} />
                            )}
                            <span className="flex-shrink-0 text-[9px] font-bold tabular-nums" style={{ color: es.text }}>
                              {fmtTime(s.scheduledStart)}
                            </span>
                            <span className="min-w-0 flex-1 truncate text-[9px] leading-tight" style={{ color: es.textMuted }}>
                              {s.title}
                            </span>
                          </div>
                        </button>
                      )
                    })}

                    {overflow > 0 && (
                      <button
                        onClick={e => { e.stopPropagation(); onSlotClick(day) }}
                        className="w-full rounded-[4px] px-1.5 py-[2px] text-left transition-colors hover:bg-white/[0.06]"
                        style={{ color: 'rgba(255,255,255,0.30)' }}>
                        <span className="text-[9px] font-semibold">+{overflow} more</span>
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>

      <AnimatePresence>
        {editLive && (
          <EditLiveClassModal
            live={editLive}
            onClose={() => setEditLive(null)}
            onSuccess={() => setEditLive(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

/* ── Quick create modal ──────────────────────────────── */
function QuickCreateModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const createMutation = useCreateLiveClass()
  const { data: coursesData,     isLoading: loadingCourses }     = useCourses({ per_page: 200 })
  const { data: instructorsData, isLoading: loadingInstructors } = useUsers('instructor', { per_page: 200 })
  const courses     = coursesData?.docs     ?? []
  const instructors = instructorsData?.docs ?? []

  const [courseId,        setCourseId]        = useState(courses[0]?.id ?? '')
  const [title,           setTitle]           = useState('')
  const [start,           setStart]           = useState('')
  const [durationMins,    setDurationMins]    = useState(60)
  const [sessionCapacity, setSessionCapacity] = useState<number | ''>(500)
  const [type,            setType]            = useState<LiveClassType>('external')
  const [meetingUrl,      setMeetingUrl]      = useState('')
  const [sectionId,       setSectionId]       = useState('')
  const [instructorId,    setInstructorId]    = useState('')
  const [error,           setError]           = useState<string | null>(null)

  const { data: outline } = useCourseOutline(courseId)
  const sections = outline?.sections ?? []

  const handleCourseChange = (id: string) => { setCourseId(id); setSectionId('') }

  const base    = 'w-full rounded-xl px-3 py-2 text-sm text-white outline-none placeholder:text-white/30'
  const iStyle  = { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' } as const
  /* Selects need a solid dark bg so the browser-native dropdown popup renders dark (not white) */
  const selStyle = { background: '#1e2035', border: '1px solid rgba(255,255,255,0.12)', color: 'white' } as const

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      await createMutation.mutateAsync({
        courseId,
        title:           title.trim(),
        scheduledStart:  datetimeLocalToISO(start),
        durationMins,
        sessionCapacity: sessionCapacity !== '' ? sessionCapacity : undefined,
        type,
        meetingUrl:      type === 'external' ? meetingUrl.trim() || undefined : undefined,
        sectionId:       sectionId || undefined,
        instructorId:    instructorId || undefined,
      })
      onSuccess()
    } catch (err: any) {
      setError(
        err?.response?.data?.error?.message
        ?? err?.response?.data?.error?.details?.[0]?.message
        ?? 'Could not create session.',
      )
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.65)' }}
      onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl p-6 shadow-2xl overflow-y-auto"
        style={{ background: '#161829', border: '1px solid rgba(255,255,255,0.10)', maxHeight: '90vh' }}>

        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-white" style={{ fontFamily: 'Bricolage Grotesque, sans-serif' }}>
            New Session
          </h2>
          <button onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl transition-colors hover:bg-white/10"
            style={{ color: 'rgba(255,255,255,0.4)' }}>
            <X size={15} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Course */}
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest"
              style={{ color: 'rgba(255,255,255,0.35)' }}>Course</label>
            <select value={courseId} onChange={e => handleCourseChange(e.target.value)} required
              disabled={loadingCourses}
              className={base} style={{ ...selStyle, opacity: loadingCourses ? 0.5 : 1 }}>
              <option value="">{loadingCourses ? 'Loading courses…' : 'Select a course…'}</option>
              {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </div>

          {/* Type */}
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest"
              style={{ color: 'rgba(255,255,255,0.35)' }}>Type</label>
            <div className="flex gap-2">
              {(['external', 'internal'] as const).map(t => (
                <button key={t} type="button" onClick={() => setType(t)}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition-all"
                  style={type === t
                    ? { background: t === 'internal' ? 'rgba(255,107,26,0.20)' : 'rgba(99,102,241,0.20)',
                        color:      t === 'internal' ? '#FF6B1A' : '#818CF8',
                        border:     `1px solid ${t === 'internal' ? 'rgba(255,107,26,0.35)' : 'rgba(99,102,241,0.35)'}` }
                    : { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.45)',
                        border: '1px solid rgba(255,255,255,0.08)' }}>
                  {t === 'internal' ? <ExternalLink size={11} /> : <ExternalLink size={11} />}
                  {t === 'internal' ? 'In-App Stream' : 'External Link'}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <input value={title} onChange={e => setTitle(e.target.value)} required minLength={3} maxLength={255}
            placeholder="Session title…"
            className={base} style={iStyle} />

          {/* Start + Duration + Max seats */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest"
                style={{ color: 'rgba(255,255,255,0.35)' }}>Start time</label>
              <input type="datetime-local" value={start} onChange={e => setStart(e.target.value)} required
                className={base} style={iStyle} />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest"
                style={{ color: 'rgba(255,255,255,0.35)' }}>Duration (mins)</label>
              <input type="number" min={5} max={600} step={5} value={durationMins}
                onChange={e => setDurationMins(Number(e.target.value))}
                className={base} style={iStyle} />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest"
                style={{ color: 'rgba(255,255,255,0.35)' }}>Max seats</label>
              <input type="number" min={1} max={10000} step={1}
                value={sessionCapacity}
                onChange={e => setSessionCapacity(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="1000"
                className={base} style={iStyle} />
            </div>
          </div>

          {/* Meeting URL — external only */}
          {type === 'external' && (
            <div className="relative">
              <LinkIcon size={13} className="absolute left-3 top-1/2 -translate-y-1/2"
                style={{ color: 'rgba(255,255,255,0.35)' }} />
              <input value={meetingUrl} onChange={e => setMeetingUrl(e.target.value)}
                type="url" placeholder="https://zoom.us/j/…"
                className={`${base} pl-9`} style={iStyle} />
            </div>
          )}

          {/* Module */}
          {sections.length > 0 && (
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest"
                style={{ color: 'rgba(255,255,255,0.35)' }}>Module (optional)</label>
              <select value={sectionId} onChange={e => setSectionId(e.target.value)}
                className={base} style={{ ...selStyle }}>
                <option value="">No specific module</option>
                {sections.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
              </select>
            </div>
          )}

          {/* Instructor */}
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest"
              style={{ color: 'rgba(255,255,255,0.35)' }}>Instructor</label>
            <select value={instructorId} onChange={e => setInstructorId(e.target.value)}
              disabled={loadingInstructors}
              className={base} style={{ ...selStyle, opacity: loadingInstructors ? 0.5 : 1 }}>
              <option value="">{loadingInstructors ? 'Loading…' : 'Default (current user)'}</option>
              {instructors.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
          </div>

          {error && (
            <p className="flex items-center gap-1.5 text-xs" style={{ color: '#F87171' }}>
              <AlertCircle size={11} />{error}
            </p>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="rounded-xl px-4 py-2 text-sm font-medium transition-colors hover:bg-white/10"
              style={{ color: 'rgba(255,255,255,0.5)' }}>
              Cancel
            </button>
            <button type="submit" disabled={createMutation.isPending}
              className="flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-bold text-white disabled:opacity-60 transition-all hover:brightness-110"
              style={{ background: 'linear-gradient(135deg,#FF6B1A,#FF8C42)' }}>
              {createMutation.isPending
                ? <><Loader2 size={14} className="animate-spin" />Creating…</>
                : 'Create session'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}

/* ── Page ────────────────────────────────────────────── */
export default function LiveClassesPage() {
  const [activeFilter,  setActiveFilter]  = useState<FilterKey>('all')
  const [typeFilter,    setTypeFilter]    = useState<'all' | 'internal' | 'external'>('all')
  const [courseFilter,  setCourseFilter]  = useState('')
  const [search,        setSearch]        = useState('')
  const [createOpen,    setCreateOpen]    = useState(false)
  const [view,          setView]          = useState<'table' | 'calendar'>('table')
  const [mentorFilter,  setMentorFilter]  = useState('')

  const { data: me } = useCurrentUser()
  const isInstructor = me?.role === 'instructor'

  const { data: rawItems = [], isLoading, isError } = useAllLiveClasses(activeFilter)
  const { data: coursesData } = useCourses({ per_page: 200 })
  const courses = coursesData?.docs ?? []
  /* Pre-fetch instructors so they're in TanStack cache before the modal mounts */
  const { data: instructorsData } = useUsers('instructor', { per_page: 200 })
  const instructors = instructorsData?.docs ?? []

  /* For stats bar, always use the full unfiltered list */
  const { data: allItems = [] } = useAllLiveClasses('all')

  /* Apply type + course + search + mentor + instructor filters client-side */
  const items = useMemo(() => {
    let list = rawItems
    if (typeFilter !== 'all') list = list.filter(l => l.type === typeFilter)
    if (courseFilter) {
      list = list.filter(l => {
        const cId = typeof l.course === 'object' ? l.course?.id : l.courseId
        return cId === courseFilter
      })
    }
    if (mentorFilter) {
      list = list.filter(l => {
        const instrId = typeof l.instructor === 'object' ? l.instructor?.id : l.instructorId
        return instrId === mentorFilter
      })
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(l =>
        l.title.toLowerCase().includes(q) ||
        (typeof l.course === 'object' && l.course?.title?.toLowerCase().includes(q))
      )
    }
    if (isInstructor && me?.id) {
      list = list.filter(l => {
        const instrId = typeof l.instructor === 'object' ? l.instructor?.id : l.instructorId
        return instrId === me.id
      })
    }
    return list
  }, [rawItems, typeFilter, courseFilter, mentorFilter, search, isInstructor, me?.id])

  /* Group by date */
  const grouped = useMemo(() => {
    const map = new Map<string, LiveClass[]>()
    for (const item of items) {
      const key = new Date(item.scheduledStart).toDateString()
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(item)
    }
    return Array.from(map.entries())
      .map(([key, list]) => ({ key, label: fmtDate(list[0]!.scheduledStart), list }))
  }, [items])

  const liveNowCount = allItems.filter(l => l.status === 'live').length

  /* Open the quick-create modal pre-filled with a date when user clicks an empty calendar slot */
  const handleCalendarSlotClick = (_date: Date) => {
    setCreateOpen(true)
  }

  /* Table column count depends on showInstructor */
  const colSpan = isInstructor ? 6 : 7

  return (
    <div className="mx-auto max-w-6xl">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        className="mb-6 flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl"
          style={{ background: 'rgba(255,107,26,0.12)', border: '1px solid rgba(255,107,26,0.22)' }}>
          <Video size={20} style={{ color: '#FF6B1A' }} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Bricolage Grotesque, sans-serif' }}>
            {isInstructor ? 'My Live Classes' : 'Live Classes'}
          </h1>
          <p className="mt-0.5 text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>
            {isInstructor ? 'Your scheduled sessions' : 'All sessions across every course'}
          </p>
        </div>

        <div className="ml-auto flex items-center gap-3">
          {/* New session */}
          <motion.button
            onClick={() => setCreateOpen(true)}
            whileHover={{ y: -1, boxShadow: '0 6px 20px rgba(255,107,26,0.28)' }}
            whileTap={{ scale: 0.97 }}
            className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white"
            style={{ background: 'linear-gradient(135deg,#FF6B1A,#FF8C42)' }}>
            <Plus size={14} />New Session
          </motion.button>

          {/* View toggle */}
          <div className="flex items-center rounded-xl overflow-hidden"
            style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
            <button
              onClick={() => setView('table')}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold transition-colors"
              style={view === 'table'
                ? { background: 'rgba(255,255,255,0.10)', color: 'white' }
                : { background: 'transparent', color: 'rgba(255,255,255,0.40)' }}>
              <LayoutList size={13} />Table
            </button>
            <button
              onClick={() => setView('calendar')}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold transition-colors"
              style={view === 'calendar'
                ? { background: 'rgba(255,255,255,0.10)', color: 'white' }
                : { background: 'transparent', color: 'rgba(255,255,255,0.40)' }}>
              <CalendarRange size={13} />Calendar
            </button>
          </div>

          {/* Live now badge */}
          {liveNowCount > 0 && (
            <motion.div
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ duration: 1.6, repeat: Infinity }}
              className="flex items-center gap-2 rounded-2xl px-4 py-2"
              style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.25)' }}>
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: '#EF4444' }} />
              <span className="text-sm font-bold" style={{ color: '#EF4444' }}>
                {liveNowCount} live now
              </span>
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Stats */}
      <StatsBar items={allItems} />

      {/* Filter row */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {/* Status tabs */}
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              className="rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all"
              style={activeFilter === f.key
                ? { background: 'rgba(255,107,26,0.18)', color: '#FF6B1A', border: '1px solid rgba(255,107,26,0.30)' }
                : { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.45)', border: '1px solid rgba(255,255,255,0.07)' }}>
              {f.label}
              {f.key === 'live' && liveNowCount > 0 && (
                <motion.span animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 1.4, repeat: Infinity }}
                  className="ml-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-white"
                  style={{ background: '#EF4444' }}>
                  {liveNowCount}
                </motion.span>
              )}
            </button>
          ))}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Course filter */}
        {courses.length > 0 && (
          <select
            value={courseFilter}
            onChange={e => setCourseFilter(e.target.value)}
            className="rounded-xl px-3 py-1.5 text-xs font-semibold outline-none transition-all"
            style={{
              background: courseFilter ? '#2a1a0a' : '#1e2035',
              border: courseFilter ? '1px solid rgba(255,107,26,0.35)' : '1px solid rgba(255,255,255,0.10)',
              color: courseFilter ? '#FF6B1A' : 'rgba(255,255,255,0.65)',
            }}>
            <option value="">All courses</option>
            {courses.map(c => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
        )}

        {/* Mentor filter — hidden for instructors (they only see their own sessions) */}
        {!isInstructor && instructors.length > 0 && (
          <div className="relative flex items-center">
            <UserCheck
              size={11}
              className="pointer-events-none absolute left-2.5 z-10"
              style={{ color: mentorFilter ? '#818CF8' : 'rgba(255,255,255,0.35)' }}
            />
            <select
              value={mentorFilter}
              onChange={e => setMentorFilter(e.target.value)}
              className="rounded-xl py-1.5 pl-7 pr-3 text-xs font-semibold outline-none transition-all appearance-none"
              style={{
                background: mentorFilter ? '#0d0f22' : '#1e2035',
                border: mentorFilter ? '1px solid rgba(129,140,248,0.40)' : '1px solid rgba(255,255,255,0.10)',
                color: mentorFilter ? '#818CF8' : 'rgba(255,255,255,0.65)',
                minWidth: 120,
              }}>
              <option value="">All mentors</option>
              {instructors.map(i => (
                <option key={i.id} value={i.id}>{i.name}</option>
              ))}
            </select>
            {mentorFilter && (
              <button
                onClick={() => setMentorFilter('')}
                className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center rounded-full transition-opacity hover:opacity-70"
                style={{ background: 'rgba(129,140,248,0.20)', color: '#818CF8' }}>
                <X size={8} />
              </button>
            )}
          </div>
        )}

        {/* Type filter */}
        <div className="flex gap-1">
          {([['all','All'],['internal','In-App'],['external','External']] as const).map(([k, label]) => (
            <button key={k} onClick={() => setTypeFilter(k)}
              className="rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all"
              style={typeFilter === k
                ? k === 'internal'
                  ? { background: 'rgba(255,107,26,0.15)', color: '#FF6B1A', border: '1px solid rgba(255,107,26,0.25)' }
                  : k === 'external'
                  ? { background: 'rgba(99,102,241,0.15)', color: '#818CF8', border: '1px solid rgba(99,102,241,0.25)' }
                  : { background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.65)', border: '1px solid rgba(255,255,255,0.12)' }
                : { background: 'transparent', color: 'rgba(255,255,255,0.30)', border: '1px solid rgba(255,255,255,0.06)' }}>
              {k === 'internal' && <Tv2 className="mr-1 inline-block" size={9} />}
              {k === 'external' && <ExternalLink className="mr-1 inline-block" size={9} />}
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Search bar */}
      <div className="relative mb-5">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: 'rgba(255,255,255,0.3)' }} />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search sessions or courses…"
          className="w-full rounded-xl py-2 pl-9 pr-8 text-sm text-white outline-none placeholder:text-white/25"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
        />
        {search && (
          <button onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-70"
            style={{ color: 'rgba(255,255,255,0.4)' }}>
            <X size={13} />
          </button>
        )}
      </div>

      {/* Calendar view */}
      {view === 'calendar' && (
        <CalendarView items={items} onSlotClick={handleCalendarSlotClick} />
      )}

      {/* Table view */}
      {view === 'table' && (
        <AnimatePresence mode="wait">
          {isLoading && (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex items-center justify-center gap-2 py-20 text-sm"
              style={{ color: 'rgba(255,255,255,0.3)' }}>
              <Loader2 size={16} className="animate-spin" />Loading sessions…
            </motion.div>
          )}

          {isError && (
            <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-3 py-16 text-center">
              <AlertCircle size={28} style={{ color: '#EF4444' }} />
              <p className="text-sm font-semibold text-white">Couldn&apos;t load live classes</p>
            </motion.div>
          )}

          {!isLoading && !isError && items.length === 0 && (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-4 py-20 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl"
                style={{ background: 'rgba(255,107,26,0.08)', border: '1px solid rgba(255,107,26,0.15)' }}>
                <Video size={26} style={{ color: '#FF6B1A' }} />
              </div>
              <div>
                <p className="text-base font-bold text-white">No sessions found</p>
                <p className="mt-1 text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  {activeFilter === 'all'
                    ? 'Create a live class inside any course to get started.'
                    : activeFilter === 'live'      ? 'No streams are live right now.'
                    : activeFilter === 'scheduled' ? 'No upcoming sessions scheduled.'
                    : activeFilter === 'ended'     ? 'No ended sessions yet.'
                    : activeFilter === 'cancelled' ? 'No cancelled sessions.'
                    : 'No sessions found.'}
                </p>
              </div>
            </motion.div>
          )}

          {!isLoading && !isError && grouped.length > 0 && (
            <motion.div key="table" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="overflow-hidden rounded-2xl" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px]">
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}>
                        <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.30)' }}>Session</th>
                        <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.30)' }}>Course</th>
                        <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.30)' }}>Module</th>
                        {!isInstructor && (
                          <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.30)' }}>Instructor</th>
                        )}
                        <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.30)' }}>Date & Time</th>
                        <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.30)' }}>Seats</th>
                        <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.30)' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {grouped.map(group => (
                        <React.Fragment key={group.key}>
                          {/* Date divider row */}
                          <tr>
                            <td colSpan={colSpan} style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.05)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                              <div className="flex items-center gap-2 px-4 py-2">
                                <Calendar size={11} style={{ color: 'rgba(255,255,255,0.35)' }} />
                                <span className="text-[11px] font-bold" style={{ color: 'rgba(255,255,255,0.40)' }}>
                                  {group.label}
                                </span>
                                <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.2)' }}>
                                  · {group.list.length} {group.list.length === 1 ? 'session' : 'sessions'}
                                </span>
                              </div>
                            </td>
                          </tr>
                          {/* Session rows */}
                          {group.list.map((live, i) => (
                            <TableRow
                              key={live.id}
                              live={live}
                              index={i}
                              showInstructor={!isInstructor}
                            />
                          ))}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Quick create modal */}
      <AnimatePresence>
        {createOpen && (
          <QuickCreateModal
            onClose={() => setCreateOpen(false)}
            onSuccess={() => setCreateOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
