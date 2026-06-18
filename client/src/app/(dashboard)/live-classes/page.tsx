'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Video, Radio, Calendar, Clock, Users, Loader2,
  AlertCircle, Tv2, ExternalLink, BookOpen, ChevronRight,
  GraduationCap, X as XIcon, Phone, Search,
} from 'lucide-react'
import {
  useUpcomingLiveClasses, isLive, isUpcoming, isEnded, hasRecording,
  fmtCountdown, type LiveClass,
} from '@/lib/api/liveClasses'
import { Button, MotionButton } from '@/components/ui/button'

/* ── Helpers ─────────────────────────────────────────── */
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}
function fmtDate(iso: string) {
  const d   = new Date(iso)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) return 'Today'
  const tom = new Date(Date.now() + 86_400_000)
  if (d.toDateString() === tom.toDateString()) return 'Tomorrow'
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}
function fmtDuration(mins: number) {
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60), m = mins % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}
function daysInMonth(y: number, m: number) {
  return new Date(y, m + 1, 0).getDate()
}
function firstDayOfMonth(y: number, m: number) {
  return new Date(y, m, 1).getDay() // 0=Sun
}

/* Gradient fallbacks by index */
const GRADIENTS = [
  'linear-gradient(135deg,#FF6B1A,#FF3D77)',
  'linear-gradient(135deg,#6366F1,#818CF8)',
  'linear-gradient(135deg,#0EA5E9,#6366F1)',
  'linear-gradient(135deg,#22C55E,#0EA5E9)',
  'linear-gradient(135deg,#F59E0B,#EF4444)',
  'linear-gradient(135deg,#EC4899,#8B5CF6)',
]

type FilterKey = 'all' | 'live' | 'upcoming' | 'recordings'
const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all',        label: 'All' },
  { key: 'live',       label: 'Live Now' },
  { key: 'upcoming',   label: 'Upcoming' },
  { key: 'recordings', label: 'Recordings' },
]

/* ── Mini month calendar ─────────────────────────────── */
function MiniCalendar({
  classes, selectedDate, onSelect,
}: {
  classes:      LiveClass[]
  selectedDate: string | null
  onSelect:     (d: string | null) => void
}) {
  const today = new Date()
  const [viewYear,  setViewYear]  = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())

  /* Days that have sessions */
  const activeDays = useMemo(() => {
    const s = new Set<string>()
    classes.forEach(l => {
      const d = new Date(l.scheduledStart)
      if (d.getFullYear() === viewYear && d.getMonth() === viewMonth) {
        s.add(String(d.getDate()))
      }
    })
    return s
  }, [classes, viewYear, viewMonth])

  const dim    = daysInMonth(viewYear, viewMonth)
  const first  = firstDayOfMonth(viewYear, viewMonth)    // 0=Sun
  const offset = first === 0 ? 6 : first - 1             // shift to Mon-start

  const monthLabel = new Date(viewYear, viewMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  const handleDay = (day: number) => {
    const d = new Date(viewYear, viewMonth, day).toDateString()
    onSelect(selectedDate === d ? null : d)
  }

  return (
    <div className="rounded-2xl p-4"
      style={{ background: '#fff', border: '1px solid #E4E7ED' }}>
      {/* Month nav */}
      <div className="mb-3 flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
            else setViewMonth(m => m - 1)
          }}
          className="h-7 w-7 rounded-lg">
          <ChevronRight size={13} className="rotate-180" style={{ color: '#6B7280' }} />
        </Button>
        <p className="text-sm font-bold" style={{ color: '#0D0F1A' }}>{monthLabel}</p>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
            else setViewMonth(m => m + 1)
          }}
          className="h-7 w-7 rounded-lg">
          <ChevronRight size={13} style={{ color: '#6B7280' }} />
        </Button>
      </div>

      {/* Weekday headers */}
      <div className="mb-1 grid grid-cols-7 gap-0.5">
        {['M','T','W','T','F','S','S'].map((d, i) => (
          <div key={i} className="text-center text-[10px] font-bold" style={{ color: '#9CA3AF' }}>{d}</div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {Array.from({ length: offset }).map((_, i) => <div key={`e${i}`} />)}
        {Array.from({ length: dim }).map((_, i) => {
          const day      = i + 1
          const isToday  = today.getFullYear() === viewYear && today.getMonth() === viewMonth && today.getDate() === day
          const hasEvent = activeDays.has(String(day))
          const dateStr  = new Date(viewYear, viewMonth, day).toDateString()
          const isSel    = selectedDate === dateStr

          return (
            <Button
              key={day}
              variant="ghost"
              onClick={() => handleDay(day)}
              className="relative flex h-7 w-full flex-col items-center justify-center rounded-lg p-0 text-xs font-semibold transition-all"
              style={{
                background: isSel ? '#FF6B1A' : isToday ? 'rgba(255,107,26,0.10)' : 'transparent',
                color:      isSel ? '#fff'    : isToday ? '#FF6B1A' : '#374151',
              }}>
              {day}
              {hasEvent && (
                <span
                  className="absolute bottom-0.5 h-1 w-1 rounded-full"
                  style={{ background: isSel ? 'rgba(255,255,255,0.7)' : '#FF6B1A' }}
                />
              )}
            </Button>
          )
        })}
      </div>

      {selectedDate && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onSelect(null)}
          className="mt-3 w-full rounded-xl text-xs font-semibold"
          style={{ color: '#6B7280' }}>
          Clear filter
        </Button>
      )}
    </div>
  )
}

/* ── Hero card (Live Now) ────────────────────────────── */
function LiveHeroCard({ live, index }: { live: LiveClass; index: number }) {
  const thumb    = live.thumbnailUrl ?? live.course?.thumbnailUrl
  const gradient = GRADIENTS[index % GRADIENTS.length]!
  const isInt    = live.type === 'internal'

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, type: 'spring', stiffness: 280, damping: 26 }}
      className="relative overflow-hidden rounded-3xl"
      style={{ aspectRatio: '16/7', minHeight: 180 }}>

      {/* Background */}
      {thumb ? (
        <img src={thumb} alt={live.title} className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div className="absolute inset-0" style={{ background: gradient }} />
      )}

      {/* Dark overlay */}
      <div className="absolute inset-0"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.45) 55%, rgba(0,0,0,0.15) 100%)' }} />

      {/* LIVE badge */}
      <div className="absolute left-4 top-4">
        <motion.div
          animate={{ opacity: [1, 0.5, 1] }}
          transition={{ duration: 1.4, repeat: Infinity }}
          className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold text-white"
          style={{ background: '#EF4444', boxShadow: '0 2px 12px rgba(239,68,68,0.5)' }}>
          <span className="h-2 w-2 rounded-full bg-white" />LIVE NOW
        </motion.div>
      </div>

      {/* Viewer count */}
      {live.viewerCount > 0 && (
        <div className="absolute right-4 top-4 flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold text-white"
          style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)' }}>
          <Users size={11} />{live.viewerCount.toLocaleString()} watching
        </div>
      )}

      {/* Bottom content */}
      <div className="absolute inset-x-0 bottom-0 p-5">
        {live.course && (
          <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold"
            style={{ color: 'rgba(255,255,255,0.65)' }}>
            <GraduationCap size={11} />{live.course.title}
          </p>
        )}
        <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Bricolage Grotesque, sans-serif' }}>
          {live.title}
        </h2>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <p className="flex items-center gap-1.5 text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>
            <Clock size={11} />{fmtTime(live.scheduledStart)} – {fmtTime(new Date(new Date(live.scheduledStart).getTime() + live.durationMins * 60_000).toISOString())}
          </p>
          {live.language && (
            <span className="rounded-lg px-2 py-0.5 text-[10px] font-bold"
              style={{ background: 'rgba(16,185,129,0.20)', color: '#6EE7B7' }}>
              {live.language}
            </span>
          )}
          {live.instructor?.name && (
            <div className="flex items-center gap-1.5">
              {live.instructor.avatarUrl ? (
                <img src={live.instructor.avatarUrl} alt=""
                  className="h-5 w-5 rounded-full object-cover" />
              ) : (
                <div className="flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold text-white"
                  style={{ background: 'rgba(255,107,26,0.7)' }}>
                  {live.instructor.name[0]}
                </div>
              )}
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>{live.instructor.name}</p>
            </div>
          )}
          <span className="ml-auto flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[10px] font-bold"
            style={{ background: 'rgba(239,68,68,0.15)', color: '#EF4444' }}>
            🔗 Link sent by email
          </span>
        </div>
      </div>
    </motion.div>
  )
}

/* ── Contact Admin modal (2× attendance cap) ─────────── */
function ContactAdminModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.92 }}
        className="relative max-w-sm w-full rounded-3xl bg-white p-6 text-center"
        style={{ boxShadow: '0 24px 60px rgba(0,0,0,0.15)' }}>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="absolute right-4 top-4 h-7 w-7 rounded-full"
          style={{ color: '#9CA3AF' }}>
          <XIcon size={14} />
        </Button>
        <div className="flex h-16 w-16 mx-auto mb-4 items-center justify-center rounded-3xl"
          style={{ background: 'rgba(255,107,26,0.08)', border: '1px solid rgba(255,107,26,0.20)' }}>
          <Phone size={26} style={{ color: '#FF6B1A' }} />
        </div>
        <h3 className="text-lg font-bold mb-2" style={{ color: '#0D0F1A', fontFamily: 'Bricolage Grotesque, sans-serif' }}>
          Maximum Sessions Reached
        </h3>
        <p className="text-sm mb-5" style={{ color: '#6B7280' }}>
          You've attended this class twice. To attend additional sessions, please contact the admin team.
        </p>
        <Button
          variant="default"
          size="lg"
          onClick={onClose}
          className="w-full rounded-2xl">
          Got it
        </Button>
      </motion.div>
    </div>
  )
}


/* ── Immersive session card ──────────────────────────── */
function SessionCard({ live, index, now }: { live: LiveClass; now: number; index: number }) {
  const thumb    = live.thumbnailUrl ?? live.course?.thumbnailUrl
  const gradient = GRADIENTS[index % GRADIENTS.length]!
  const liveNow  = isLive(live)
  const upcoming = isUpcoming(live)
  const ended    = isEnded(live)
  const rec      = hasRecording(live)
  const isInt    = live.type === 'internal'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, type: 'spring', stiffness: 280, damping: 26 }}
      className="overflow-hidden rounded-2xl bg-white"
      style={{ border: '1px solid #E4E7ED', boxShadow: liveNow ? '0 0 0 2px rgba(239,68,68,0.25)' : 'none' }}>

      {/* Thumbnail strip */}
      <div className="relative overflow-hidden" style={{ height: 120 }}>
        {thumb ? (
          <img src={thumb} alt={live.course?.title ?? live.title}
            className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full" style={{ background: gradient }} />
        )}
        {/* Overlay */}
        <div className="absolute inset-0"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 60%)' }} />

        {/* Status badge */}
        <div className="absolute left-3 top-3">
          {liveNow && (
            <motion.span
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ duration: 1.4, repeat: Infinity }}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold text-white"
              style={{ background: '#EF4444' }}>
              <span className="h-1.5 w-1.5 rounded-full bg-white" />LIVE
            </motion.span>
          )}
          {upcoming && (
            <span className="rounded-lg px-2 py-1 text-[10px] font-bold text-white"
              style={{ background: 'rgba(0,0,0,0.50)', backdropFilter: 'blur(6px)' }}>
              {fmtDate(live.scheduledStart)}
            </span>
          )}
          {ended && rec && (
            <span className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold"
              style={{ background: 'rgba(34,197,94,0.90)', color: 'white' }}>
              <BookOpen size={9} />REC
            </span>
          )}
        </div>

        {/* Duration chip */}
        <div className="absolute bottom-2 right-3 rounded-lg px-2 py-0.5 text-[10px] font-bold text-white"
          style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}>
          {fmtDuration(live.durationMins)}
        </div>
      </div>

      {/* Body */}
      <div className="p-3.5">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className="rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider"
              style={{
                background: isInt ? 'rgba(255,107,26,0.09)' : 'rgba(99,102,241,0.09)',
                color:      isInt ? '#FF6B1A' : '#6366F1',
              }}>
              {isInt ? 'In-App' : 'External'}
            </span>
            {live.language && (
              <span className="rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider"
                style={{ background: 'rgba(16,185,129,0.10)', color: '#10B981' }}>
                {live.language}
              </span>
            )}
          </div>
          {liveNow && live.viewerCount > 0 && (
            <span className="flex items-center gap-1 text-[10px] font-bold" style={{ color: '#EF4444' }}>
              <Users size={9} />{live.viewerCount.toLocaleString()}
            </span>
          )}
        </div>

        <h3 className="line-clamp-2 text-sm font-bold leading-snug" style={{ color: '#0D0F1A' }}>
          {live.title}
        </h3>

        {live.course && (
          <p className="mt-0.5 flex items-center gap-1 truncate text-[11px]" style={{ color: '#9CA3AF' }}>
            <GraduationCap size={9} />{live.course.title}
          </p>
        )}

        <div className="mt-2 flex items-center justify-between gap-2">
          <p className="flex items-center gap-1 text-[11px]" style={{ color: '#9CA3AF' }}>
            <Clock size={9} />{fmtTime(live.scheduledStart)} – {fmtTime(new Date(new Date(live.scheduledStart).getTime() + live.durationMins * 60_000).toISOString())}
            {upcoming && (
              <span className="ml-1 font-semibold" style={{ color: '#FF6B1A' }}>
                {fmtCountdown(live.scheduledStart, now)}
              </span>
            )}
          </p>

          {/* CTA — locked for non-enrolled users */}
          {live.isEnrolled === false ? (
            /* Not purchased — show lock + link to course */
            live.course?.slug ? (
              <Link href={`/courses/${live.course.slug}`}>
                <MotionButton
                  variant="ghost"
                  size="sm"
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  className="flex items-center gap-1 rounded-xl px-3 py-1.5 text-[10px] font-bold h-auto"
                  style={{ background: 'rgba(99,102,241,0.09)', color: '#6366F1', border: '1px solid rgba(99,102,241,0.20)' }}>
                  <XIcon size={9} />Enroll
                </MotionButton>
              </Link>
            ) : null
          ) : (
            <>
              {/* Internal — recording only (live-now is view-only, no watch button) */}
              {isInt && liveNow && (
                <span className="flex items-center gap-1 rounded-xl px-2 py-1 text-[9px] font-bold"
                  style={{ background: 'rgba(239,68,68,0.10)', color: '#EF4444' }}>
                  🔗 Link by email
                </span>
              )}
              {isInt && upcoming && (
                <Link href={`/live-classes/${live.id}/watch`}>
                  <MotionButton
                    variant="ghost"
                    size="sm"
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.97 }}
                    className="rounded-xl px-3 py-1.5 text-[10px] font-bold h-auto"
                    style={{ background: 'rgba(255,107,26,0.09)', color: '#FF6B1A', border: '1px solid rgba(255,107,26,0.20)' }}>
                    Details
                  </MotionButton>
                </Link>
              )}
              {isInt && rec && (
                <Link href={`/live-classes/${live.id}/watch`}>
                  <MotionButton
                    variant="ghost"
                    size="sm"
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.97 }}
                    className="flex items-center gap-1 rounded-xl px-3 py-1.5 text-[10px] font-bold h-auto"
                    style={{ background: 'rgba(34,197,94,0.10)', color: '#16A34A', border: '1px solid rgba(34,197,94,0.22)' }}>
                    <BookOpen size={9} />Watch
                  </MotionButton>
                </Link>
              )}
              {/* External — live-now is view-only; upcoming shows details link */}
              {!isInt && liveNow && (
                <span className="flex items-center gap-1 rounded-xl px-2 py-1 text-[9px] font-bold"
                  style={{ background: 'rgba(239,68,68,0.10)', color: '#EF4444' }}>
                  🔗 Link by email
                </span>
              )}
              {!isInt && upcoming && (
                <Link href={`/live-classes/${live.id}/watch`}>
                  <MotionButton
                    variant="ghost"
                    size="sm"
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.97 }}
                    className="flex items-center gap-1 rounded-xl px-3 py-1.5 text-[10px] font-bold text-white h-auto"
                    style={{ background: 'linear-gradient(135deg,#6366F1,#818CF8)' }}>
                    <ExternalLink size={9} />Open
                  </MotionButton>
                </Link>
              )}
            </>
          )}
        </div>
      </div>
    </motion.div>
  )
}

/* ── Page ─────────────────────────────────────────────── */
export default function LiveClassesPage() {
  const { data, isLoading, isError } = useUpcomingLiveClasses(50)
  const [now,             setNow]          = useState(() => Date.now())
  const [filter,          setFilter]       = useState<FilterKey>('all')
  const [typeFilter,      setTypeFilter]   = useState<'all' | 'internal' | 'external'>('all')
  const [search,          setSearch]       = useState('')
  const [selectedDate,    setSelectedDate] = useState<string | null>(null)
  const [showContactAdmin, setShowContactAdmin] = useState(false)

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(t)
  }, [])

  const all = useMemo(() => (data ?? []).filter(l => l.status !== 'cancelled'), [data])

  const liveNow    = useMemo(() => all.filter(l => isLive(l)),   [all])
  const upcoming   = useMemo(() => all.filter(l => isUpcoming(l)), [all])
  const recordings = useMemo(() => all.filter(l => hasRecording(l)), [all])

  /* Apply filter + optional date + type + search */
  const filtered = useMemo(() => {
    let list: LiveClass[]
    switch (filter) {
      case 'live':       list = liveNow;    break
      case 'upcoming':   list = upcoming;   break
      case 'recordings': list = recordings; break
      default:           list = [...liveNow, ...upcoming, ...recordings]
    }
    if (selectedDate) {
      list = list.filter(l => new Date(l.scheduledStart).toDateString() === selectedDate)
    }
    if (typeFilter !== 'all') {
      list = list.filter(l => l.type === typeFilter)
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(l =>
        l.title.toLowerCase().includes(q) ||
        l.course?.title?.toLowerCase().includes(q),
      )
    }
    return list.sort((a, b) => new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime())
  }, [filter, liveNow, upcoming, recordings, selectedDate, typeFilter, search])

  const filterCounts: Record<FilterKey, number> = {
    all:        liveNow.length + upcoming.length + recordings.length,
    live:       liveNow.length,
    upcoming:   upcoming.length,
    recordings: recordings.length,
  }

  return (
    <div className="mx-auto max-w-6xl">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#0D0F1A', fontFamily: 'Bricolage Grotesque, sans-serif' }}>
            Live Classes
          </h1>
          <p className="mt-0.5 text-sm" style={{ color: '#9CA3AF' }}>
            {upcoming.length > 0
              ? `${upcoming.length} upcoming · ${liveNow.length > 0 ? `${liveNow.length} live now` : 'none live'}`
              : 'Your enrolled sessions'}
          </p>
        </div>

        {liveNow.length > 0 && (
          <motion.div
            animate={{ opacity: [1, 0.55, 1] }}
            transition={{ duration: 1.6, repeat: Infinity }}
            className="flex items-center gap-2 rounded-2xl px-4 py-2"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: '#EF4444' }} />
            <span className="text-sm font-bold" style={{ color: '#EF4444' }}>{liveNow.length} live now</span>
          </motion.div>
        )}
      </motion.div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center gap-2 py-20 text-sm" style={{ color: '#9CA3AF' }}>
          <Loader2 size={16} className="animate-spin" />Loading your schedule…
        </div>
      )}

      {/* Error */}
      {isError && !isLoading && (
        <div className="flex flex-col items-center gap-3 py-16">
          <AlertCircle size={28} style={{ color: '#EF4444' }} />
          <p className="text-sm font-semibold" style={{ color: '#0D0F1A' }}>Couldn't load live classes</p>
        </div>
      )}

      {!isLoading && !isError && (
        <>
          {/* Live Now hero strip */}
          <AnimatePresence>
            {liveNow.length > 0 && (
              <motion.div key="hero"
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                className="mb-6 space-y-3">
                {liveNow.map((l, i) => <LiveHeroCard key={l.id} live={l} index={i} />)}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
            {/* ── Left: filters + cards ── */}
            <div className="flex-1 min-w-0">
              {/* Filter tabs */}
              <div className="mb-3 flex flex-wrap gap-1.5">
                {FILTERS.map(f => (
                  <Button
                    key={f.key}
                    variant={filter === f.key ? 'ghost' : 'outline'}
                    size="sm"
                    onClick={() => setFilter(f.key)}
                    className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold h-auto"
                    style={filter === f.key
                      ? { background: '#0D0F1A', color: '#fff', border: 'none' }
                      : { background: '#fff', color: '#6B7280', border: '1px solid #E4E7ED' }}>
                    {f.label}
                    {filterCounts[f.key] > 0 && (
                      <span className="rounded-md px-1.5 py-0.5 text-[9px] font-bold"
                        style={filter === f.key
                          ? { background: 'rgba(255,255,255,0.15)', color: '#fff' }
                          : { background: 'rgba(0,0,0,0.07)', color: '#374151' }}>
                        {filterCounts[f.key]}
                      </span>
                    )}
                  </Button>
                ))}
              </div>

              {/* Search + type row */}
              <div className="mb-5 flex flex-wrap items-center gap-2">
                {/* Search */}
                <div className="relative flex-1 min-w-[180px]">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#9CA3AF' }} />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search sessions…"
                    className="w-full rounded-xl py-2 pl-9 pr-8 text-sm outline-none transition-all"
                    style={{ background: '#fff', border: '1px solid #E4E7ED', color: '#0D0F1A' }}
                    onFocus={e => { e.currentTarget.style.border = '1px solid #FF6B1A'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(255,107,26,0.10)' }}
                    onBlur={e => { e.currentTarget.style.border = '1px solid #E4E7ED'; e.currentTarget.style.boxShadow = 'none' }}
                  />
                  {search && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 h-5 w-5 transition-opacity hover:opacity-70"
                      style={{ color: '#9CA3AF' }}>
                      <XIcon size={12} />
                    </Button>
                  )}
                </div>
                {/* Type toggle */}
                <div className="flex gap-1">
                  {([['all', 'All Types'], ['internal', 'In-App'], ['external', 'External']] as const).map(([val, label]) => (
                    <Button
                      key={val}
                      variant={typeFilter === val ? 'ghost' : 'outline'}
                      size="sm"
                      onClick={() => setTypeFilter(val)}
                      className="rounded-xl px-3 py-2 text-xs font-semibold h-auto"
                      style={typeFilter === val
                        ? { background: '#0D0F1A', color: '#fff', border: 'none' }
                        : { background: '#fff', color: '#6B7280', border: '1px solid #E4E7ED' }}>
                      {label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Cards grid */}
              <AnimatePresence mode="wait">
                {filtered.length === 0 ? (
                  <motion.div key="empty"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="flex flex-col items-center gap-4 rounded-2xl py-16 text-center"
                    style={{ background: '#fff', border: '1px solid #E4E7ED' }}>
                    <div className="flex h-14 w-14 items-center justify-center rounded-3xl"
                      style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)' }}>
                      <Calendar size={24} style={{ color: '#6366F1' }} />
                    </div>
                    <div>
                      <p className="font-bold" style={{ color: '#0D0F1A' }}>No sessions found</p>
                      <p className="mt-1 text-sm" style={{ color: '#9CA3AF' }}>
                        {selectedDate ? 'No sessions on this day' : 'Enroll in courses to see live classes here.'}
                      </p>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key="grid"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {filtered.map((l, i) => (
                      <SessionCard key={l.id} live={l} index={i} now={now} />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* ── Right: mini calendar ── */}
            <div className="w-full lg:w-64 lg:flex-shrink-0">
              <MiniCalendar
                classes={all}
                selectedDate={selectedDate}
                onSelect={setSelectedDate}
              />

              {/* Upcoming next 3 */}
              {upcoming.slice(0, 3).length > 0 && (
                <div className="mt-4 rounded-2xl p-4"
                  style={{ background: '#fff', border: '1px solid #E4E7ED' }}>
                  <p className="mb-3 text-[10px] font-bold uppercase tracking-widest" style={{ color: '#9CA3AF' }}>
                    Next up
                  </p>
                  <div className="space-y-2.5">
                    {upcoming.slice(0, 3).map(l => (
                      <div key={l.id} className="flex items-start gap-2.5">
                        <div
                          className="mt-0.5 h-8 w-8 flex-shrink-0 overflow-hidden rounded-lg"
                          style={{
                            background: l.thumbnailUrl ?? l.course?.thumbnailUrl
                              ? undefined
                              : GRADIENTS[0],
                          }}>
                          {(l.thumbnailUrl ?? l.course?.thumbnailUrl) && (
                            <img
                              src={l.thumbnailUrl ?? l.course?.thumbnailUrl}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold" style={{ color: '#0D0F1A' }}>{l.title}</p>
                          <p className="text-[10px]" style={{ color: '#FF6B1A' }}>
                            {fmtDate(l.scheduledStart)} · {fmtTime(l.scheduledStart)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Contact Admin modal */}
      <AnimatePresence>
        {showContactAdmin && (
          <ContactAdminModal onClose={() => setShowContactAdmin(false)} />
        )}
      </AnimatePresence>
    </div>
  )
}
