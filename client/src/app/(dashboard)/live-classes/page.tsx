'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import {
  Video, Radio, Calendar, Clock, Loader2, AlertCircle, ChevronRight,
  Tv2, ExternalLink, BookOpen,
} from 'lucide-react'
import {
  useUpcomingLiveClasses, isLive, isUpcoming, isEnded, hasRecording, fmtCountdown,
  type LiveClass,
} from '@/lib/api/liveClasses'

/* ── Helpers ─────────────────────────────────────── */
function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

function fmtDuration(mins: number): string {
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

function groupByDate(items: LiveClass[]): { label: string; date: string; items: LiveClass[] }[] {
  const groups = new Map<string, LiveClass[]>()
  for (const item of items) {
    const key = new Date(item.scheduledStart).toDateString()
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(item)
  }
  const today    = new Date().toDateString()
  const tomorrow = new Date(Date.now() + 86_400_000).toDateString()
  return Array.from(groups.entries()).map(([key, items]) => ({
    label: key === today ? 'Today' : key === tomorrow ? 'Tomorrow' : fmtDate(items[0]!.scheduledStart),
    date:  key,
    items: items.sort((a, b) => new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime()),
  }))
}

/* ── Card ──────────────────────────────────────────── */
function ClassCard({ live, now, index }: { live: LiveClass; now: number; index: number }) {
  const liveNow    = isLive(live)
  const upcoming   = isUpcoming(live)
  const ended      = isEnded(live)
  const recording  = hasRecording(live)
  const isInternal = live.type === 'internal'

  /* Border color */
  const border = liveNow
    ? 'rgba(239,68,68,0.28)'
    : ended && recording
    ? 'rgba(34,197,94,0.22)'
    : '#E4E7ED'

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, type: 'spring', stiffness: 300, damping: 28 }}
      className="flex items-center gap-4 rounded-2xl bg-white p-4"
      style={{ border: `1px solid ${border}` }}>

      {/* Icon */}
      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl"
        style={{
          background: liveNow
            ? 'rgba(239,68,68,0.10)'
            : isInternal
            ? 'rgba(255,107,26,0.09)'
            : 'rgba(99,102,241,0.09)',
          border: liveNow
            ? '1px solid rgba(239,68,68,0.22)'
            : isInternal
            ? '1px solid rgba(255,107,26,0.18)'
            : '1px solid rgba(99,102,241,0.18)',
        }}>
        {liveNow
          ? <Radio size={18} style={{ color: '#EF4444' }} />
          : isInternal
          ? <Tv2 size={18} style={{ color: '#FF6B1A' }} />
          : <Video size={18} style={{ color: '#6366F1' }} />}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Status badges */}
          {liveNow && (
            <motion.span
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ duration: 1.4, repeat: Infinity }}
              className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white"
              style={{ background: '#EF4444' }}>
              <span className="h-1.5 w-1.5 rounded-full bg-white" />Live now
            </motion.span>
          )}
          {ended && recording && (
            <span className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
              style={{ background: 'rgba(34,197,94,0.12)', color: '#16A34A' }}>
              <BookOpen size={9} />Recording
            </span>
          )}
          {/* Type badge */}
          <span className="rounded-md px-1.5 py-0.5 text-[10px] font-semibold"
            style={{
              background: isInternal ? 'rgba(255,107,26,0.09)' : 'rgba(99,102,241,0.09)',
              color:      isInternal ? '#FF6B1A' : '#6366F1',
            }}>
            {isInternal ? 'In-App Stream' : 'External Link'}
          </span>
          <p className="truncate text-sm font-bold" style={{ color: '#0D0F1A' }}>{live.title}</p>
        </div>

        {live.description && (
          <p className="mt-0.5 line-clamp-1 text-xs" style={{ color: '#6B7280' }}>{live.description}</p>
        )}

        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs" style={{ color: '#9CA3AF' }}>
          <span className="flex items-center gap-1">
            <Clock size={11} />{fmtTime(live.scheduledStart)} · {fmtDuration(live.durationMins)}
          </span>
          {live.course && (
            <span className="flex items-center gap-1">
              <ChevronRight size={10} style={{ color: '#D1D5DB' }} />
              {live.course.title}
            </span>
          )}
          {/* Viewer count when live */}
          {liveNow && live.viewerCount > 0 && (
            <span className="font-semibold" style={{ color: '#EF4444' }}>
              {live.viewerCount.toLocaleString()} watching
            </span>
          )}
          {/* Countdown when upcoming */}
          {upcoming && (
            <span style={{ color: '#FF6B1A', fontWeight: 600 }}>
              {fmtCountdown(live.scheduledStart, now)}
            </span>
          )}
        </div>
      </div>

      {/* CTA */}
      {/* Internal: watch page */}
      {isInternal && (liveNow || ended) && (
        <Link href={`/live-classes/${live.id}/watch`} className="flex-shrink-0">
          <motion.button
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            className="rounded-xl px-4 py-2 text-xs font-bold text-white"
            style={liveNow
              ? { background: 'linear-gradient(135deg,#EF4444,#DC2626)', boxShadow: '0 4px 14px rgba(239,68,68,0.32)' }
              : { background: 'linear-gradient(135deg,#22C55E,#16A34A)' }}>
            {liveNow ? 'Watch now' : 'Recording'}
          </motion.button>
        </Link>
      )}
      {/* Internal: upcoming — no CTA yet, just a reminder */}
      {isInternal && upcoming && (
        <Link href={`/live-classes/${live.id}/watch`} className="flex-shrink-0">
          <motion.button
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            className="rounded-xl px-4 py-2 text-xs font-bold"
            style={{ background: 'rgba(255,107,26,0.09)', color: '#FF6B1A', border: '1px solid rgba(255,107,26,0.20)' }}>
            View details
          </motion.button>
        </Link>
      )}
      {/* External */}
      {!isInternal && live.meetingUrl && (liveNow || upcoming) && (
        <a href={live.meetingUrl} target="_blank" rel="noreferrer noopener" className="flex-shrink-0">
          <motion.button
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold text-white"
            style={liveNow
              ? { background: 'linear-gradient(135deg,#EF4444,#DC2626)', boxShadow: '0 4px 14px rgba(239,68,68,0.32)' }
              : { background: 'linear-gradient(135deg,#6366F1,#818CF8)' }}>
            <ExternalLink size={11} />{liveNow ? 'Join now' : 'Open link'}
          </motion.button>
        </a>
      )}
    </motion.div>
  )
}

/* ── Date group ─────────────────────────────────────── */
function DateGroup({ label, items, now, groupIndex }: {
  label:      string
  items:      LiveClass[]
  now:        number
  groupIndex: number
}) {
  const hasLiveNow = items.some(l => isLive(l))

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: groupIndex * 0.06, type: 'spring', stiffness: 260, damping: 26 }}>
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-7 items-center gap-1.5 rounded-xl px-3"
          style={{
            background: hasLiveNow ? 'rgba(239,68,68,0.10)' : 'rgba(99,102,241,0.09)',
            border:     hasLiveNow ? '1px solid rgba(239,68,68,0.22)' : '1px solid rgba(99,102,241,0.18)',
          }}>
          <Calendar size={11} style={{ color: hasLiveNow ? '#EF4444' : '#6366F1' }} />
          <span className="text-xs font-bold" style={{ color: hasLiveNow ? '#EF4444' : '#6366F1' }}>
            {label}
          </span>
        </div>
        <div className="h-px flex-1" style={{ background: '#E4E7ED' }} />
        <span className="text-xs" style={{ color: '#9CA3AF' }}>
          {items.length} {items.length === 1 ? 'session' : 'sessions'}
        </span>
      </div>
      <div className="space-y-3">
        {items.map((live, i) => (
          <ClassCard key={live.id} live={live} now={now} index={i} />
        ))}
      </div>
    </motion.div>
  )
}

/* ── Page ──────────────────────────────────────────── */
export default function LiveClassesPage() {
  const { data, isLoading, isError } = useUpcomingLiveClasses(50)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(t)
  }, [])

  /* Show scheduled + live. Ended classes only shown if they have a recording. */
  const active = (data ?? [])
    .filter(l => l.status !== 'cancelled' && (isLive(l) || isUpcoming(l) || hasRecording(l)))
    .sort((a, b) => new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime())

  const groups       = groupByDate(active)
  const liveNowCount = active.filter(l => isLive(l)).length

  return (
    <div className="mx-auto max-w-3xl">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        className="mb-8 flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl"
          style={{ background: 'linear-gradient(135deg,rgba(99,102,241,0.15),rgba(99,102,241,0.08))', border: '1px solid rgba(99,102,241,0.25)' }}>
          <Video size={20} style={{ color: '#6366F1' }} />
        </div>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#0D0F1A', fontFamily: 'Bricolage Grotesque, sans-serif' }}>
            Live Classes
          </h1>
          <p className="mt-0.5 text-sm" style={{ color: '#9CA3AF' }}>
            Upcoming and active sessions across your enrolled courses
          </p>
        </div>

        {liveNowCount > 0 && (
          <motion.div
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 1.6, repeat: Infinity }}
            className="ml-auto flex items-center gap-1.5 rounded-2xl px-3.5 py-1.5"
            style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.28)' }}>
            <span className="h-2 w-2 rounded-full" style={{ background: '#EF4444' }} />
            <span className="text-sm font-bold" style={{ color: '#EF4444' }}>
              {liveNowCount} live now
            </span>
          </motion.div>
        )}
      </motion.div>

      {/* States */}
      <AnimatePresence mode="wait">
        {isLoading && (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex items-center justify-center gap-2 py-20 text-sm" style={{ color: '#9CA3AF' }}>
            <Loader2 size={16} className="animate-spin" />Loading your schedule…
          </motion.div>
        )}

        {isError && (
          <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-3 py-16">
            <div className="flex h-14 w-14 items-center justify-center rounded-3xl"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)' }}>
              <AlertCircle size={22} style={{ color: '#EF4444' }} />
            </div>
            <p className="text-sm font-semibold" style={{ color: '#0D0F1A' }}>Couldn&apos;t load live classes</p>
            <p className="text-xs" style={{ color: '#9CA3AF' }}>Check your connection and try again.</p>
          </motion.div>
        )}

        {!isLoading && !isError && groups.length === 0 && (
          <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-4 py-20 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl"
              style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.18)' }}>
              <Calendar size={26} style={{ color: '#6366F1' }} />
            </div>
            <div>
              <p className="text-base font-bold" style={{ color: '#0D0F1A' }}>No upcoming sessions</p>
              <p className="mt-1 text-sm" style={{ color: '#9CA3AF' }}>
                Enroll in courses to see their scheduled live classes here.
              </p>
            </div>
          </motion.div>
        )}

        {!isLoading && !isError && groups.length > 0 && (
          <motion.div key="groups" className="space-y-8">
            {groups.map((g, gi) => (
              <DateGroup key={g.date} label={g.label} items={g.items} now={now} groupIndex={gi} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
