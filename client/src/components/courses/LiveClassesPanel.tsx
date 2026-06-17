'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Calendar, Video, Loader2, Radio, Clock, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { Tv2 } from 'lucide-react'
import { useLiveClassesForCourse, isLive, isUpcoming, fmtCountdown, type LiveClass } from '@/lib/api/liveClasses'
import { Button } from '@/components/ui/button'

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour:    'numeric', minute: '2-digit',
  })
}

function fmtDuration(mins: number): string {
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}


export function LiveClassesPanel({ slug }: { slug: string }) {
  const { data: items, isLoading, isError } = useLiveClassesForCourse(slug)
  /* Tick every 30s so live/upcoming/countdown flip in real time */
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(t)
  }, [])

  const upcoming = items?.filter(l => isLive(l) || isUpcoming(l)) ?? []
  /* Show at most 4 by default — full list is a follow-up. */
  const visible = upcoming.slice(0, 4)

  if (!isLoading && !isError && visible.length === 0) {
    /* Empty state — don't clutter the page if there's nothing to show. */
    return null
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.18, type: 'spring', stiffness: 260, damping: 26 }}
      className="mt-8 overflow-hidden rounded-2xl"
      style={{
        background: 'linear-gradient(135deg, rgba(99,102,241,0.04) 0%, rgba(255,107,26,0.04) 100%)',
        border: '1px solid rgba(99,102,241,0.18)',
      }}>

      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-5 py-4"
        style={{ borderBottom: '1px solid rgba(99,102,241,0.12)' }}>
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl"
            style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)' }}>
            <Video size={16} style={{ color: '#6366F1' }} />
          </div>
          <div>
            <h2 className="text-base font-bold" style={{ color: '#0D0F1A', fontFamily: 'Bricolage Grotesque, sans-serif' }}>
              Live classes
            </h2>
            <p className="text-[11px]" style={{ color: '#9CA3AF' }}>
              Scheduled real-time sessions with the instructor
            </p>
          </div>
        </div>
      </div>

      <div className="p-5">
        {isLoading && (
          <div className="flex items-center gap-2 text-sm" style={{ color: '#9CA3AF' }}>
            <Loader2 size={14} className="animate-spin" />Loading…
          </div>
        )}

        {isError && (
          <div className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm"
            style={{ background: 'rgba(239,68,68,0.08)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.18)' }}>
            <AlertCircle size={14} />Couldn&apos;t load scheduled sessions.
          </div>
        )}

        <div className="space-y-3">
          {visible.map((l, i) => <LiveClassRow key={l.id} live={l} now={now} index={i} />)}
        </div>
      </div>
    </motion.section>
  )
}

function LiveClassRow({ live, now, index }: { live: LiveClass; now: number; index: number }) {
  const isLiveNow  = isLive(live)
  const isInternal = live.type === 'internal'
  const countdown  = fmtCountdown(live.scheduledStart, now)

  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + index * 0.04 }}
      className="flex items-center gap-4 rounded-xl bg-white p-3.5"
      style={{ border: `1px solid ${isLiveNow ? 'rgba(239,68,68,0.30)' : '#E4E7ED'}` }}>

      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl"
        style={{
          background: isLiveNow ? 'rgba(239,68,68,0.10)' : isInternal ? 'rgba(255,107,26,0.08)' : 'rgba(99,102,241,0.08)',
          border: `1px solid ${isLiveNow ? 'rgba(239,68,68,0.25)' : isInternal ? 'rgba(255,107,26,0.18)' : 'rgba(99,102,241,0.18)'}`,
        }}>
        {isLiveNow
          ? <Radio size={18} style={{ color: '#EF4444' }} />
          : isInternal
          ? <Tv2 size={18} style={{ color: '#FF6B1A' }} />
          : <Calendar size={18} style={{ color: '#6366F1' }} />}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          {isLiveNow && (
            <motion.span
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
              className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white"
              style={{ background: '#EF4444' }}>
              <span className="h-1.5 w-1.5 rounded-full bg-white" />Live now
            </motion.span>
          )}
          <p className="truncate text-sm font-semibold" style={{ color: '#0D0F1A' }}>{live.title}</p>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px]" style={{ color: '#6B7280' }}>
          <span className="flex items-center gap-1"><Calendar size={10} />{fmtDateTime(live.scheduledStart)}</span>
          <span style={{ color: '#E4E7ED' }}>·</span>
          <span className="flex items-center gap-1"><Clock size={10} />{fmtDuration(live.durationMins)}</span>
          {!isLiveNow && <>
            <span style={{ color: '#E4E7ED' }}>·</span>
            <span style={{ color: '#FF6B1A' }}>{countdown}</span>
          </>}
        </div>
      </div>

      {/* CTA — internal uses watch page, external opens link */}
      {isInternal ? (
        <Button
          asChild
          variant={isLiveNow ? 'destructive' : 'default'}
          size="sm"
          className={isLiveNow ? 'shadow-[0_4px_16px_rgba(239,68,68,0.32)]' : ''}>
          <Link href={`/live-classes/${live.id}/watch`}>
            {isLiveNow ? 'Watch now' : 'View'}
          </Link>
        </Button>
      ) : (
        <Button
          asChild
          variant={isLiveNow ? 'destructive' : 'secondary'}
          size="sm"
          className={isLiveNow ? 'shadow-[0_4px_16px_rgba(239,68,68,0.32)]' : ''}>
          <a href={live.meetingUrl ?? '#'} target="_blank" rel="noreferrer noopener">
            {isLiveNow ? 'Join now' : 'Open link'}
          </a>
        </Button>
      )}
    </motion.div>
  )
}
