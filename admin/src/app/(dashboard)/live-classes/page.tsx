'use client'

import React, { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Video, Radio, Calendar, Clock, Users, Loader2,
  AlertCircle, Tv2, ExternalLink, BookOpen, Star,
  ChevronRight, PlayCircle, Eye, CalendarDays, Pencil, Search, X, Plus,
  Link as LinkIcon,
} from 'lucide-react'
import { useAllLiveClasses, useCreateLiveClass, type LiveClass, type LiveClassType } from '@/lib/api/liveClasses'
import { useCourses } from '@/lib/api/courses'
import { useCourseOutline } from '@/lib/api/outline'
import { useUsers } from '@/lib/api/users'
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

/* ── Single class row card ───────────────────────────── */
function ClassCard({ live, index }: { live: LiveClass; index: number }) {
  const router     = useRouter()
  const isLiveNow  = live.status === 'live'
  const isScheduled = live.status === 'scheduled'
  const isEnded    = live.status === 'ended'
  const isCancelled = live.status === 'cancelled'
  const isInternal = live.type === 'internal'
  const [editOpen, setEditOpen] = useState(false)

  const borderColor = isLiveNow ? 'rgba(239,68,68,0.30)' : 'rgba(255,255,255,0.06)'

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, type: 'spring', stiffness: 300, damping: 28 }}
      className="flex items-center gap-4 rounded-2xl p-4"
      style={{ background: 'rgba(255,255,255,0.025)', border: `1px solid ${borderColor}` }}>

      {/* Icon */}
      <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl"
        style={{
          background: isLiveNow ? 'rgba(239,68,68,0.12)' : isInternal ? 'rgba(255,107,26,0.10)' : 'rgba(99,102,241,0.10)',
          border: `1px solid ${isLiveNow ? 'rgba(239,68,68,0.25)' : isInternal ? 'rgba(255,107,26,0.20)' : 'rgba(99,102,241,0.20)'}`,
        }}>
        {isLiveNow
          ? <motion.div animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 1.4, repeat: Infinity }}>
              <Radio size={16} style={{ color: '#EF4444' }} />
            </motion.div>
          : isInternal
          ? <Tv2 size={16} style={{ color: isCancelled ? 'rgba(255,255,255,0.2)' : '#FF6B1A' }} />
          : <ExternalLink size={16} style={{ color: isCancelled ? 'rgba(255,255,255,0.2)' : '#818CF8' }} />}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Status badge */}
          {isLiveNow && (
            <motion.span animate={{ opacity: [1, 0.5, 1] }} transition={{ duration: 1.4, repeat: Infinity }}
              className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-white"
              style={{ background: '#EF4444' }}>
              <span className="h-1 w-1 rounded-full bg-white" />LIVE
            </motion.span>
          )}
          {isEnded && live.recordingUrl && (
            <span className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest"
              style={{ background: 'rgba(34,197,94,0.12)', color: '#22C55E' }}>
              <BookOpen size={8} />REC
            </span>
          )}
          {isCancelled && (
            <span className="rounded-md px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-widest"
              style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.3)' }}>
              Cancelled
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
          <p className={`truncate text-sm font-semibold text-white ${isCancelled ? 'line-through opacity-40' : ''}`}>
            {live.title}
          </p>
        </div>

        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs"
          style={{ color: 'rgba(255,255,255,0.35)' }}>
          {/* Course */}
          {live.course && (
            <span className="flex items-center gap-1">
              <BookOpen size={10} />
              <span className="max-w-[180px] truncate">{live.course.title}</span>
            </span>
          )}
          {/* Date + time */}
          <span className="flex items-center gap-1">
            <Calendar size={10} />{fmtDate(live.scheduledStart)} · {fmtTime(live.scheduledStart)}
          </span>
          {/* Duration */}
          <span className="flex items-center gap-1">
            <Clock size={10} />{fmtDuration(live.durationMins)}
          </span>
          {/* Countdown for upcoming */}
          {isScheduled && (
            <span style={{ color: '#FF6B1A', fontWeight: 600 }}>{fmtCountdown(live.scheduledStart)}</span>
          )}
          {/* Viewers for live */}
          {isLiveNow && (
            <span className="flex items-center gap-1 font-semibold" style={{ color: '#EF4444' }}>
              <Users size={10} />{live.viewerCount.toLocaleString()} watching
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-shrink-0 items-center gap-2">
        {/* Internal live → Monitor */}
        {isInternal && isLiveNow && (
          <button
            onClick={() => router.push(`/live-classes/${live.id}/monitor`)}
            className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold text-white transition-all hover:brightness-110"
            style={{ background: 'linear-gradient(135deg,#EF4444,#DC2626)', boxShadow: '0 3px 12px rgba(239,68,68,0.30)' }}>
            <Radio size={11} />Monitor
          </button>
        )}
        {/* Internal upcoming → Go to monitor (to go live) */}
        {isInternal && isScheduled && (
          <button
            onClick={() => router.push(`/live-classes/${live.id}/monitor`)}
            className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all hover:brightness-110"
            style={{ background: 'rgba(255,107,26,0.12)', color: '#FF6B1A', border: '1px solid rgba(255,107,26,0.22)' }}>
            <PlayCircle size={11} />Go Live
          </button>
        )}
        {/* Internal ended → View recording */}
        {isInternal && isEnded && live.recordingUrl && (
          <a href={live.recordingUrl} target="_blank" rel="noreferrer"
            className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all hover:brightness-110"
            style={{ background: 'rgba(34,197,94,0.10)', color: '#22C55E', border: '1px solid rgba(34,197,94,0.20)' }}>
            <BookOpen size={11} />Recording
          </a>
        )}
        {/* External live → open link */}
        {!isInternal && isLiveNow && live.meetingUrl && (
          <a href={live.meetingUrl} target="_blank" rel="noreferrer"
            className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold text-white transition-all hover:brightness-110"
            style={{ background: '#EF4444' }}>
            <ExternalLink size={11} />Join
          </a>
        )}
        {/* Homework — available for ended/live sessions */}
        {(live.status === 'ended' || live.status === 'live') && (
          <Link href={`/live-classes/${live.id}/homework`}
            className="flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-[10px] font-semibold transition-colors hover:bg-white/10"
            style={{ color: 'rgba(251,191,36,0.8)', border: '1px solid rgba(251,191,36,0.20)' }}
            title="Homework">
            <BookOpen size={10} /><span>Homework</span>
          </Link>
        )}
        {live.status === 'ended' && (
          <Link href={`/live-classes/${live.id}/feedback`}
            className="flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-[10px] font-semibold transition-colors hover:bg-white/10"
            style={{ color: 'rgba(245,158,11,0.85)', border: '1px solid rgba(245,158,11,0.20)' }}
            title="Student Feedback">
            <Star size={10} /><span>Feedback</span>
          </Link>
        )}
        {/* Edit */}
        <button
          onClick={() => setEditOpen(true)}
          className="flex h-8 w-8 items-center justify-center rounded-xl transition-colors hover:bg-white/10"
          style={{ color: 'rgba(255,255,255,0.4)' }}
          title="Edit session">
          <Pencil size={13} />
        </button>
        {/* Course link */}
        {live.course && (
          <Link href={`/courses/${typeof live.course === 'object' ? live.course.id : live.courseId}/edit`}
            className="flex h-8 w-8 items-center justify-center rounded-xl transition-colors hover:bg-white/10"
            style={{ color: 'rgba(255,255,255,0.25)' }}
            title="Open course">
            <ChevronRight size={14} />
          </Link>
        )}
      </div>

      {/* Edit modal — scoped to this card */}
      <AnimatePresence>
        {editOpen && (
          <EditLiveClassModal
            live={live}
            onClose={() => setEditOpen(false)}
            onSuccess={() => setEditOpen(false)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}

/* ── Quick create modal ──────────────────────────────── */
function QuickCreateModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const createMutation = useCreateLiveClass()
  const { data: coursesData } = useCourses({ per_page: 200 })
  const courses = coursesData?.docs ?? []
  const { data: instructorsData } = useUsers('instructor', { per_page: 200 })
  const instructors = instructorsData?.docs ?? []

  const [courseId,     setCourseId]     = useState(courses[0]?.id ?? '')
  const [title,        setTitle]        = useState('')
  const [start,        setStart]        = useState('')
  const [durationMins, setDurationMins] = useState(60)
  const [type,         setType]         = useState<LiveClassType>('external')
  const [meetingUrl,   setMeetingUrl]   = useState('')
  const [sectionId,    setSectionId]    = useState('')
  const [instructorId, setInstructorId] = useState('')
  const [error,        setError]        = useState<string | null>(null)

  const { data: outline } = useCourseOutline(courseId)
  const sections = outline?.sections ?? []

  const handleCourseChange = (id: string) => { setCourseId(id); setSectionId('') }

  const base   = 'w-full rounded-xl px-3 py-2 text-sm text-white outline-none placeholder:text-white/30'
  const iStyle = { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' } as const

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      await createMutation.mutateAsync({
        courseId,
        title:          title.trim(),
        scheduledStart: new Date(start).toISOString(),
        durationMins,
        type,
        meetingUrl:    type === 'external' ? meetingUrl.trim() || undefined : undefined,
        sectionId:     sectionId || undefined,
        instructorId:  instructorId || undefined,
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
              className={base} style={{ ...iStyle, color: courseId ? 'white' : 'rgba(255,255,255,0.3)' }}>
              <option value="">Select a course…</option>
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
                  {t === 'internal' ? <Eye size={11} /> : <ExternalLink size={11} />}
                  {t === 'internal' ? 'In-App Stream' : 'External Link'}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <input value={title} onChange={e => setTitle(e.target.value)} required minLength={3} maxLength={255}
            placeholder="Session title…"
            className={base} style={iStyle} />

          {/* Start + Duration */}
          <div className="grid grid-cols-2 gap-3">
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
                className={base} style={{ ...iStyle, color: sectionId ? 'white' : 'rgba(255,255,255,0.3)' }}>
                <option value="">No specific module</option>
                {sections.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
              </select>
            </div>
          )}

          {/* Instructor */}
          {instructors.length > 0 && (
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest"
                style={{ color: 'rgba(255,255,255,0.35)' }}>Instructor (optional)</label>
              <select value={instructorId} onChange={e => setInstructorId(e.target.value)}
                className={base} style={{ ...iStyle, color: instructorId ? 'white' : 'rgba(255,255,255,0.3)' }}>
                <option value="">Default (current user)</option>
                {instructors.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
              </select>
            </div>
          )}

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

  const { data: rawItems = [], isLoading, isError } = useAllLiveClasses(activeFilter)
  const { data: coursesData } = useCourses({ per_page: 200 })
  const courses = coursesData?.docs ?? []

  /* For stats bar, always use the full unfiltered list */
  const { data: allItems = [] } = useAllLiveClasses('all')

  /* Apply type + course + search filters client-side */
  const items = useMemo(() => {
    let list = rawItems
    if (typeFilter !== 'all') list = list.filter(l => l.type === typeFilter)
    if (courseFilter) {
      list = list.filter(l => {
        const cId = typeof l.course === 'object' ? l.course?.id : l.courseId
        return cId === courseFilter
      })
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(l =>
        l.title.toLowerCase().includes(q) ||
        (typeof l.course === 'object' && l.course?.title?.toLowerCase().includes(q))
      )
    }
    return list
  }, [rawItems, typeFilter, courseFilter, search])

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

  return (
    <div className="mx-auto max-w-5xl">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        className="mb-6 flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl"
          style={{ background: 'rgba(255,107,26,0.12)', border: '1px solid rgba(255,107,26,0.22)' }}>
          <Video size={20} style={{ color: '#FF6B1A' }} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Bricolage Grotesque, sans-serif' }}>
            Live Classes
          </h1>
          <p className="mt-0.5 text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>
            All sessions across every course
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
          {/* Timetable button */}
          <Link href="/live-classes/timetable"
            className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition-colors hover:bg-white/10"
            style={{ color: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.10)' }}>
            <CalendarDays size={14} />Timetable
          </Link>

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
              background: courseFilter ? 'rgba(255,107,26,0.12)' : 'rgba(255,255,255,0.04)',
              border: courseFilter ? '1px solid rgba(255,107,26,0.25)' : '1px solid rgba(255,255,255,0.07)',
              color: courseFilter ? '#FF6B1A' : 'rgba(255,255,255,0.45)',
            }}>
            <option value="">All courses</option>
            {courses.map(c => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
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

      {/* Content */}
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
          <motion.div key="list" className="space-y-6">
            {grouped.map((group, gi) => (
              <motion.div key={group.key}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: gi * 0.05 }}>
                {/* Date label */}
                <div className="mb-3 flex items-center gap-2">
                  <div className="flex h-6 items-center gap-1.5 rounded-xl px-3"
                    style={{
                      background: group.list.some(l => l.status === 'live') ? 'rgba(239,68,68,0.10)' : 'rgba(255,255,255,0.05)',
                      border:     group.list.some(l => l.status === 'live') ? '1px solid rgba(239,68,68,0.22)' : '1px solid rgba(255,255,255,0.08)',
                    }}>
                    <Calendar size={10} style={{ color: group.list.some(l => l.status === 'live') ? '#EF4444' : 'rgba(255,255,255,0.4)' }} />
                    <span className="text-[10px] font-bold"
                      style={{ color: group.list.some(l => l.status === 'live') ? '#EF4444' : 'rgba(255,255,255,0.4)' }}>
                      {group.label}
                    </span>
                  </div>
                  <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.06)' }} />
                  <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.2)' }}>
                    {group.list.length} {group.list.length === 1 ? 'session' : 'sessions'}
                  </span>
                </div>

                <div className="space-y-2.5">
                  {group.list.map((live, i) => (
                    <ClassCard key={live.id} live={live} index={gi * 10 + i} />
                  ))}
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

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
