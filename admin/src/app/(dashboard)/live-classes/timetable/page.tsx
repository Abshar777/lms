'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft, ChevronRight, Calendar, Clock, Users,
  Plus, X, Radio, Tv2, ExternalLink, Loader2,
  AlertCircle, Link as LinkIcon, CalendarDays, Monitor, Pencil,
} from 'lucide-react'
import { useAllLiveClasses, useCreateLiveClass, type LiveClass, type LiveClassType } from '@/lib/api/liveClasses'
import { useCourses } from '@/lib/api/courses'
import { useCourseOutline } from '@/lib/api/outline'
import { useUsers } from '@/lib/api/users'
import { EditLiveClassModal } from '@/components/live-classes/EditLiveClassModal'

/* ── Constants ──────────────────────────────────────── */
const DAY_START_HOUR = 9          // 9 AM
const DAY_END_HOUR   = 22         // 10 PM
const TOTAL_HOURS    = DAY_END_HOUR - DAY_START_HOUR   // 13
const PX_PER_HOUR    = 80         // pixels per hour
const PX_PER_MIN     = PX_PER_HOUR / 60
const GRID_HEIGHT    = TOTAL_HOURS * PX_PER_HOUR        // 1040px
const SLOT_MINS      = 30
const DAYS           = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const FULL_DAYS      = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

/* ── Helpers ─────────────────────────────────────────── */
function getMonday(d: Date): Date {
  const date = new Date(d)
  const day  = date.getDay()                          // 0=Sun
  const diff = (day === 0 ? -6 : 1 - day)
  date.setDate(date.getDate() + diff)
  date.setHours(0, 0, 0, 0)
  return date
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}

function isoLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function fmtWeekRange(monday: Date): string {
  const sunday = addDays(monday, 6)
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  if (monday.getMonth() === sunday.getMonth()) {
    return `${monday.toLocaleDateString('en-US', opts)} – ${sunday.getDate()}, ${sunday.getFullYear()}`
  }
  return `${monday.toLocaleDateString('en-US', opts)} – ${sunday.toLocaleDateString('en-US', opts)}, ${sunday.getFullYear()}`
}

function topForTime(date: Date): number {
  const mins = (date.getHours() - DAY_START_HOUR) * 60 + date.getMinutes()
  return mins * PX_PER_MIN
}

function heightForMins(mins: number): number {
  return Math.max(mins * PX_PER_MIN, 28)
}

function statusColor(s: LiveClass['status']): { bg: string; border: string; text: string; dot: string } {
  switch (s) {
    case 'live':      return { bg: 'rgba(239,68,68,0.13)',  border: 'rgba(239,68,68,0.40)',  text: '#EF4444', dot: '#EF4444' }
    case 'ended':     return { bg: 'rgba(34,197,94,0.10)',  border: 'rgba(34,197,94,0.30)',  text: '#22C55E', dot: '#22C55E' }
    case 'cancelled': return { bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.10)', text: 'rgba(255,255,255,0.35)', dot: 'rgba(255,255,255,0.3)' }
    default:          return { bg: 'rgba(255,107,26,0.12)', border: 'rgba(255,107,26,0.35)', text: '#FF6B1A', dot: '#FF6B1A' }
  }
}

function fmtHour(h: number): string {
  if (h === 0)  return '12 AM'
  if (h < 12)   return `${h} AM`
  if (h === 12) return '12 PM'
  return `${h - 12} PM`
}

/* ── Now line ──────────────────────────────────────── */
function NowLine() {
  const now  = new Date()
  const top  = topForTime(now)
  if (top < 0 || top > GRID_HEIGHT) return null
  return (
    <div className="pointer-events-none absolute inset-x-0 z-20 flex items-center"
      style={{ top }}>
      <div className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ background: '#EF4444', marginLeft: -5 }} />
      <div className="h-px flex-1" style={{ background: '#EF4444', opacity: 0.7 }} />
    </div>
  )
}

/* ── Event block ───────────────────────────────────── */
function EventBlock({
  live, onClick,
}: {
  live:    LiveClass
  onClick: (l: LiveClass) => void
}) {
  const start  = new Date(live.scheduledStart)
  const top    = topForTime(start)
  const height = heightForMins(live.durationMins)
  const colors = statusColor(live.status)
  const isLiveNow = live.status === 'live'

  if (top < 0 || top > GRID_HEIGHT) return null

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02, zIndex: 30 }}
      onClick={() => onClick(live)}
      className="absolute inset-x-1 cursor-pointer overflow-hidden rounded-lg px-2 py-1 text-left"
      style={{
        top,
        height,
        background:  colors.bg,
        border:      `1px solid ${colors.border}`,
        zIndex:      10,
      }}
    >
      {isLiveNow && (
        <motion.div
          animate={{ opacity: [1, 0.5, 1] }}
          transition={{ duration: 1.4, repeat: Infinity }}
          className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full"
          style={{ background: '#EF4444' }}
        />
      )}
      <p className="truncate text-[10px] font-bold leading-tight" style={{ color: colors.text }}>
        {live.title}
      </p>
      {height > 36 && live.course && (
        <p className="truncate text-[9px] leading-tight" style={{ color: 'rgba(255,255,255,0.45)' }}>
          {live.course.title}
        </p>
      )}
      {height > 52 && (
        <p className="text-[9px] leading-tight" style={{ color: 'rgba(255,255,255,0.3)' }}>
          {start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
          {' · '}{live.durationMins}m
        </p>
      )}
    </motion.button>
  )
}

/* ── Event detail popover ──────────────────────────── */
function EventPopover({
  live, onClose, onEdit,
}: {
  live:    LiveClass
  onClose: () => void
  onEdit:  (l: LiveClass) => void
}) {
  const router = useRouter()
  const colors = statusColor(live.status)
  const start  = new Date(live.scheduledStart)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.55)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 6 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 4 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl p-5 shadow-2xl"
        style={{ background: '#161829', border: '1px solid rgba(255,255,255,0.10)' }}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ background: colors.dot }} />
            <span className="rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-widest"
              style={{ background: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}>
              {live.status}
            </span>
            <span className="rounded-md px-1.5 py-0.5 text-[10px] font-semibold"
              style={{ background: 'rgba(255,107,26,0.12)', color: '#FF6B1A' }}>
              {live.type === 'internal' ? 'In-App' : 'External'}
            </span>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 transition-colors hover:bg-white/10"
            style={{ color: 'rgba(255,255,255,0.4)' }}>
            <X size={14} />
          </button>
        </div>

        <h3 className="text-base font-bold text-white" style={{ fontFamily: 'Bricolage Grotesque, sans-serif' }}>
          {live.title}
        </h3>
        {live.course && (
          <p className="mt-0.5 text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
            {live.course.title}
          </p>
        )}

        <div className="mt-3 space-y-1.5 text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
          <p className="flex items-center gap-2">
            <Calendar size={11} style={{ color: '#818CF8' }} />
            {start.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
          <p className="flex items-center gap-2">
            <Clock size={11} style={{ color: '#818CF8' }} />
            {start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} · {live.durationMins}m
          </p>
          {live.viewerCount > 0 && (
            <p className="flex items-center gap-2">
              <Users size={11} style={{ color: '#818CF8' }} />{live.viewerCount.toLocaleString()} viewers
            </p>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {live.type === 'internal' && (live.status === 'scheduled' || live.status === 'live') && (
            <button
              onClick={() => { router.push(`/live-classes/${live.id}/monitor`); onClose() }}
              className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold text-white transition-all hover:brightness-110"
              style={{ background: live.status === 'live' ? '#EF4444' : 'linear-gradient(135deg,#FF6B1A,#FF8C42)' }}>
              {live.status === 'live' ? <Radio size={11} /> : <Monitor size={11} />}
              {live.status === 'live' ? 'Monitor' : 'Go Live'}
            </button>
          )}
          {/* Edit button */}
          <button
            onClick={() => { onEdit(live); onClose() }}
            className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-white/10"
            style={{ color: 'rgba(255,255,255,0.65)', border: '1px solid rgba(255,255,255,0.12)' }}>
            <Pencil size={11} />Edit
          </button>
          {live.course?.id && (
            <Link
              href={`/courses/${live.course.id}/edit`}
              onClick={onClose}
              className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-white/10"
              style={{ color: 'rgba(255,255,255,0.45)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <ExternalLink size={11} />Course
            </Link>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ── Quick create modal ────────────────────────────── */
interface SlotDraft {
  dayIndex:  number   // 0=Mon … 6=Sun
  dateISO:   string   // YYYY-MM-DDTHH:MM (local)
}

function QuickCreateModal({
  draft, weekDays, onClose, onSuccess,
}: {
  draft:     SlotDraft
  weekDays:  Date[]
  onClose:   () => void
  onSuccess: () => void
}) {
  const { data: coursesData, isLoading: cLoading } = useCourses({ per_page: 200 })
  const { data: instructorsData } = useUsers('instructor', { per_page: 200 })
  const createMutation = useCreateLiveClass()

  const courses     = coursesData?.docs ?? []
  const instructors = instructorsData?.docs ?? []

  const [courseId,        setCourseId]        = useState('')
  const [sectionId,       setSectionId]       = useState('')
  const [title,           setTitle]           = useState('')
  const [start,           setStart]           = useState(draft.dateISO)
  const [durationMins,    setDurationMins]    = useState(60)
  const [sessionCapacity, setSessionCapacity] = useState<number | ''>(500)
  const [type,            setType]            = useState<LiveClassType>('external')
  const [meetingUrl,      setMeetingUrl]      = useState('')
  const [instructorId,    setInstructorId]    = useState('')
  const [error,           setError]           = useState<string | null>(null)

  const { data: outline } = useCourseOutline(courseId)
  const sections = outline?.sections ?? []
  const base    = 'w-full rounded-xl px-3 py-2 text-sm text-white outline-none placeholder:text-white/30'
  const iStyle  = { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' } as const

  const handle = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!courseId) { setError('Select a course'); return }
    if (!title.trim()) { setError('Enter a title'); return }
    if (type === 'external' && !meetingUrl.trim()) { setError('Enter the meeting URL'); return }
    setError(null)
    try {
      await createMutation.mutateAsync({
        courseId,
        title:           title.trim(),
        scheduledStart:  new Date(start).toISOString(),
        durationMins,
        sessionCapacity: sessionCapacity !== '' ? sessionCapacity : undefined,
        type,
        meetingUrl:      type === 'external' ? meetingUrl.trim() : undefined,
        sectionId:       sectionId || undefined,
        instructorId:    instructorId || undefined,
      })
      onSuccess()
    } catch (err: any) {
      setError(
        err?.response?.data?.error?.message
        ?? err?.response?.data?.error?.details?.[0]?.message
        ?? 'Failed to schedule session.',
      )
    }
  }

  const day = weekDays[draft.dayIndex]
  const dayLabel = day
    ? day.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
    : ''

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.65)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl p-6 shadow-2xl"
        style={{ background: '#161829', border: '1px solid rgba(255,255,255,0.10)' }}
      >
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white" style={{ fontFamily: 'Bricolage Grotesque, sans-serif' }}>
              Schedule Session
            </h2>
            <p className="mt-0.5 text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{dayLabel}</p>
          </div>
          <button onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl transition-colors hover:bg-white/10"
            style={{ color: 'rgba(255,255,255,0.4)' }}>
            <X size={15} />
          </button>
        </div>

        <form onSubmit={handle} className="space-y-3">
          {/* Course */}
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest"
              style={{ color: 'rgba(255,255,255,0.35)' }}>Course</label>
            {cLoading ? (
              <div className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs"
                style={{ ...iStyle, color: 'rgba(255,255,255,0.4)' }}>
                <Loader2 size={11} className="animate-spin" />Loading courses…
              </div>
            ) : (
              <select
                value={courseId}
                onChange={e => { setCourseId(e.target.value); setSectionId('') }}
                required
                className={`${base} cursor-pointer`}
                style={{ ...iStyle, color: courseId ? 'white' : 'rgba(255,255,255,0.3)' }}>
                <option value="">Select a course…</option>
                {courses.map(c => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            )}
          </div>

          {/* Module (Section) — shown once a course is selected */}
          {courseId && sections.length > 0 && (
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest"
                style={{ color: 'rgba(255,255,255,0.35)' }}>Module (optional)</label>
              <select
                value={sectionId}
                onChange={e => setSectionId(e.target.value)}
                className={`${base} cursor-pointer`}
                style={{ ...iStyle, color: sectionId ? 'white' : 'rgba(255,255,255,0.3)' }}>
                <option value="">No specific module</option>
                {sections.map(s => (
                  <option key={s.id} value={s.id}>{s.title}</option>
                ))}
              </select>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest"
              style={{ color: 'rgba(255,255,255,0.35)' }}>Session title</label>
            <input
              value={title} onChange={e => setTitle(e.target.value)}
              required minLength={3} maxLength={255}
              placeholder="e.g. Week 3 Q&A"
              className={base} style={iStyle} />
          </div>

          {/* Date + Duration + Max seats */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest"
                style={{ color: 'rgba(255,255,255,0.35)' }}>Start time</label>
              <input
                type="datetime-local" value={start} onChange={e => setStart(e.target.value)}
                required className={base} style={iStyle} />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest"
                style={{ color: 'rgba(255,255,255,0.35)' }}>Duration (mins)</label>
              <input
                type="number" min={5} max={600} step={5}
                value={durationMins} onChange={e => setDurationMins(Number(e.target.value))}
                className={base} style={iStyle} />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest"
                style={{ color: 'rgba(255,255,255,0.35)' }}>Max seats</label>
              <input
                type="number" min={1} max={10000} step={1}
                value={sessionCapacity}
                onChange={e => setSessionCapacity(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="1000"
                className={base} style={iStyle} />
            </div>
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
                        color: t === 'internal' ? '#FF6B1A' : '#818CF8',
                        border: `1px solid ${t === 'internal' ? 'rgba(255,107,26,0.35)' : 'rgba(99,102,241,0.35)'}` }
                    : { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.45)',
                        border: '1px solid rgba(255,255,255,0.08)' }}>
                  {t === 'internal' ? <Tv2 size={11} /> : <ExternalLink size={11} />}
                  {t === 'internal' ? 'In-App Stream' : 'External Link'}
                </button>
              ))}
            </div>
          </div>

          {/* Meeting URL */}
          {type === 'external' && (
            <div className="relative">
              <LinkIcon size={13} className="absolute left-3 top-1/2 -translate-y-1/2"
                style={{ color: 'rgba(255,255,255,0.35)' }} />
              <input
                value={meetingUrl} onChange={e => setMeetingUrl(e.target.value)}
                type="url" required placeholder="https://zoom.us/j/…"
                className={`${base} pl-9`} style={iStyle} />
            </div>
          )}

          {/* Instructor */}
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest"
              style={{ color: 'rgba(255,255,255,0.35)' }}>Instructor</label>
            <select value={instructorId} onChange={e => setInstructorId(e.target.value)}
              className={`${base} cursor-pointer`}
              style={{ ...iStyle, color: instructorId ? 'white' : 'rgba(255,255,255,0.3)' }}>
              <option value="">Default (you)</option>
              {instructors.map(i => (
                <option key={i.id} value={i.id}>{i.name}</option>
              ))}
            </select>
          </div>

          {error && (
            <p className="flex items-center gap-1.5 text-xs" style={{ color: '#F87171' }}>
              <AlertCircle size={11} />{error}
            </p>
          )}

          <button type="submit" disabled={createMutation.isPending}
            className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold text-white disabled:opacity-60 transition-all hover:brightness-110"
            style={{ background: 'linear-gradient(135deg,#FF6B1A,#FF8C42)' }}>
            {createMutation.isPending
              ? <><Loader2 size={14} className="animate-spin" />Scheduling…</>
              : <><Plus size={14} />Schedule Session</>}
          </button>
        </form>
      </motion.div>
    </motion.div>
  )
}

/* ── Page ─────────────────────────────────────────── */
export default function TimetablePage() {
  const today    = new Date()
  const [weekStart,    setWeekStart]    = useState(() => getMonday(today))
  const [selected,     setSelected]     = useState<LiveClass | null>(null)
  const [draft,        setDraft]        = useState<SlotDraft | null>(null)
  const [editTarget,   setEditTarget]   = useState<LiveClass | null>(null)

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const { data: allClasses, isLoading } = useAllLiveClasses('all')

  /* Classes for this week, keyed by day-of-week (0=Mon) */
  const byDay = weekDays.map(day =>
    (allClasses ?? []).filter(l => sameDay(new Date(l.scheduledStart), day))
  )

  const liveNowCount = (allClasses ?? []).filter(l => l.status === 'live').length

  /* Time labels */
  const timeLabels = Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => ({
    hour:  DAY_START_HOUR + i,
    label: fmtHour(DAY_START_HOUR + i),
    top:   i * PX_PER_HOUR,
  }))

  /* Slot click → open create modal */
  const handleSlotClick = (dayIndex: number, slotTop: number) => {
    const day  = weekDays[dayIndex]
    if (!day) return
    const totalMins = Math.round(slotTop / PX_PER_MIN)
    const hour      = DAY_START_HOUR + Math.floor(totalMins / 60)
    const min       = totalMins % 60
    const snapped   = Math.round(min / SLOT_MINS) * SLOT_MINS
    const d         = new Date(day)
    d.setHours(hour, snapped === 60 ? 0 : snapped, 0, 0)
    if (snapped === 60) d.setHours(hour + 1, 0, 0, 0)
    setDraft({ dayIndex, dateISO: isoLocal(d) })
  }

  const handleColClick = (dayIndex: number, e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const y    = e.clientY - rect.top
    handleSlotClick(dayIndex, y)
  }

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col overflow-hidden">

      {/* ── Top bar ── */}
      <div className="flex flex-shrink-0 flex-wrap items-center justify-between gap-3 px-1 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl"
            style={{ background: 'rgba(255,107,26,0.15)', border: '1px solid rgba(255,107,26,0.25)' }}>
            <CalendarDays size={16} style={{ color: '#FF6B1A' }} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white" style={{ fontFamily: 'Bricolage Grotesque, sans-serif' }}>
              Live Timetable
            </h1>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>{fmtWeekRange(weekStart)}</p>
          </div>
          {liveNowCount > 0 && (
            <motion.div
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold text-white"
              style={{ background: 'rgba(239,68,68,0.20)', border: '1px solid rgba(239,68,68,0.35)' }}>
              <span className="h-1.5 w-1.5 rounded-full bg-red-500" />{liveNowCount} live
            </motion.div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Week nav */}
          <div className="flex items-center rounded-xl overflow-hidden"
            style={{ border: '1px solid rgba(255,255,255,0.10)' }}>
            <button
              onClick={() => setWeekStart(w => addDays(w, -7))}
              className="flex h-8 w-8 items-center justify-center transition-colors hover:bg-white/10"
              style={{ color: 'rgba(255,255,255,0.6)' }}>
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={() => setWeekStart(getMonday(today))}
              className="h-8 px-3 text-xs font-semibold transition-colors hover:bg-white/10"
              style={{ color: sameDay(weekStart, getMonday(today)) ? '#FF6B1A' : 'rgba(255,255,255,0.6)' }}>
              Today
            </button>
            <button
              onClick={() => setWeekStart(w => addDays(w, 7))}
              className="flex h-8 w-8 items-center justify-center transition-colors hover:bg-white/10"
              style={{ color: 'rgba(255,255,255,0.6)' }}>
              <ChevronRight size={14} />
            </button>
          </div>

          <Link href="/live-classes"
            className="flex h-8 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold transition-colors hover:bg-white/10"
            style={{ color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.10)' }}>
            <CalendarDays size={12} />Overview
          </Link>
        </div>
      </div>

      {/* ── Grid ── */}
      <div className="flex flex-1 overflow-hidden rounded-2xl"
        style={{ border: '1px solid rgba(255,255,255,0.07)', background: '#0D0F1A' }}>

        {/* Day columns — scrollable body */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Day headers */}
          <div className="flex flex-shrink-0"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', height: 48 }}>
            {weekDays.map((day, i) => {
              const isToday   = sameDay(day, today)
              const hasEvents = byDay[i] && byDay[i]!.length > 0
              return (
                <div key={i}
                  className="flex flex-1 flex-col items-center justify-center"
                  style={{
                    borderRight: i < 6 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                    background:  isToday ? 'rgba(255,107,26,0.05)' : 'transparent',
                  }}>
                  <p className="text-[10px] font-semibold uppercase tracking-widest"
                    style={{ color: isToday ? '#FF6B1A' : 'rgba(255,255,255,0.3)' }}>
                    {DAYS[i]}
                  </p>
                  <div className="flex items-center gap-1">
                    <p className={`text-sm font-bold ${isToday ? 'text-white' : ''}`}
                      style={{ color: isToday ? 'white' : 'rgba(255,255,255,0.5)' }}>
                      {day.getDate()}
                    </p>
                    {hasEvents && (
                      <span className="h-1.5 w-1.5 rounded-full"
                        style={{ background: isToday ? '#FF6B1A' : 'rgba(255,255,255,0.25)' }} />
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Scrollable day grid */}
          <div
            className="scrollbar-hide flex flex-1 overflow-y-scroll"
            id="timetable-scroll"
            style={{ height: 0 }}>
            <div className="flex" style={{ height: GRID_HEIGHT, width: '100%' }}>
              {weekDays.map((day, dayIndex) => {
                const isToday = sameDay(day, today)
                return (
                  <div key={dayIndex}
                    className="relative flex-1 cursor-cell overflow-hidden"
                    style={{
                      borderRight:  dayIndex < 6 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                      background:   isToday ? 'rgba(255,107,26,0.02)' : 'transparent',
                      height:       GRID_HEIGHT,
                    }}
                    onClick={e => handleColClick(dayIndex, e)}
                  >
                    {/* Horizontal hour lines with time labels */}
                    {timeLabels.map(t => (
                      <div key={t.hour}
                        className="pointer-events-none absolute inset-x-0 flex items-start"
                        style={{ top: t.top, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                        <span
                          className="select-none pl-1 text-[9px] font-semibold leading-none"
                          style={{ color: 'rgba(255,255,255,0.22)', marginTop: 2 }}>
                          {t.label}
                        </span>
                      </div>
                    ))}

                    {/* Current time line */}
                    {isToday && <NowLine />}

                    {/* Event blocks */}
                    {(byDay[dayIndex] ?? []).map(live => (
                      <EventBlock
                        key={live.id}
                        live={live}
                        onClick={l => { setSelected(l); setDraft(null); setEditTarget(null) }}
                      />
                    ))}

                    {/* Loading shimmer */}
                    {isLoading && (
                      <div className="absolute inset-2 animate-pulse rounded-lg"
                        style={{ background: 'rgba(255,255,255,0.03)' }} />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Hint ── */}
      <p className="mt-2 flex-shrink-0 text-center text-[10px]" style={{ color: 'rgba(255,255,255,0.18)' }}>
        Click any empty slot to schedule a session · Click an existing session for details
      </p>

      {/* ── Modals ── */}
      <AnimatePresence>
        {selected && (
          <EventPopover
            key="popover"
            live={selected}
            onClose={() => setSelected(null)}
            onEdit={l => { setSelected(null); setEditTarget(l) }}
          />
        )}
        {draft && (
          <QuickCreateModal
            key="create"
            draft={draft}
            weekDays={weekDays}
            onClose={() => setDraft(null)}
            onSuccess={() => setDraft(null)}
          />
        )}
        {editTarget && (
          <EditLiveClassModal
            key="edit"
            live={editTarget}
            onClose={() => setEditTarget(null)}
            onSuccess={() => setEditTarget(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
