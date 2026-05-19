'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Video, Plus, Trash2, Calendar, Clock, Link as LinkIcon,
  Loader2, X, AlertCircle, CheckCircle2, Radio, Zap,
  ExternalLink, Tv2, Copy, Eye, EyeOff, PlayCircle, Square,
  BookOpen, Monitor,
} from 'lucide-react'
import {
  useLiveClassesForCourse, useCreateLiveClass, useDeleteLiveClass,
  useUpdateLiveClass, useStartLiveStream, useEndLiveStream, useStreamCredentials,
  type LiveClass, type LiveClassType, type LiveClassStatus,
} from '@/lib/api/liveClasses'

/* ── Helpers ──────────────────────────────────────────── */
function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  })
}

function fmtDuration(mins: number): string {
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

function statusColor(status: LiveClassStatus): string {
  switch (status) {
    case 'live':      return '#EF4444'
    case 'ended':     return '#22C55E'
    case 'cancelled': return 'rgba(255,255,255,0.35)'
    default:          return '#818CF8'
  }
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).catch(() => {})
}

/* ── Stream credentials panel ─────────────────────────── */
function CredentialsPanel({ liveId }: { liveId: string }) {
  const [revealed, setRevealed] = useState(false)
  const [copiedKey, setCopiedKey] = useState(false)
  const { data, isFetching, refetch } = useStreamCredentials(liveId)

  const handleReveal = async () => {
    if (!data) await refetch()
    setRevealed(v => !v)
  }

  const handleCopyKey = () => {
    if (data?.streamKey) {
      copyToClipboard(data.streamKey)
      setCopiedKey(true)
      setTimeout(() => setCopiedKey(false), 2000)
    }
  }

  const inputStyle = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }

  return (
    <div className="mt-2.5 rounded-xl p-3 space-y-2.5" style={inputStyle}>
      <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.35)' }}>
        OBS / Streaming software
      </p>

      {/* RTMP URL — always shown */}
      <div className="space-y-1">
        <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>RTMP URL</span>
        <div className="flex items-center gap-2">
          <code className="flex-1 truncate rounded-lg px-2.5 py-1.5 text-[11px] font-mono text-white"
            style={{ background: 'rgba(255,255,255,0.06)' }}>
            rtmps://global-live.mux.com:443/app
          </code>
          <button
            onClick={() => copyToClipboard('rtmps://global-live.mux.com:443/app')}
            className="flex-shrink-0 rounded-lg p-1.5 transition-colors hover:bg-white/10"
            title="Copy RTMP URL">
            <Copy size={11} style={{ color: 'rgba(255,255,255,0.5)' }} />
          </button>
        </div>
      </div>

      {/* Stream key */}
      <div className="space-y-1">
        <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Stream key</span>
        <div className="flex items-center gap-2">
          <code className="flex-1 truncate rounded-lg px-2.5 py-1.5 text-[11px] font-mono text-white"
            style={{ background: 'rgba(255,255,255,0.06)' }}>
            {isFetching
              ? 'Loading…'
              : !data
              ? '••••••••••••••••••••••••'
              : revealed
              ? data.streamKey
              : '•'.repeat(Math.min(data.streamKey.length, 32))}
          </code>
          <button onClick={handleReveal} className="flex-shrink-0 rounded-lg p-1.5 transition-colors hover:bg-white/10"
            title={revealed ? 'Hide key' : 'Show key'}>
            {isFetching
              ? <Loader2 size={11} className="animate-spin" style={{ color: 'rgba(255,255,255,0.5)' }} />
              : revealed
              ? <EyeOff size={11} style={{ color: 'rgba(255,255,255,0.5)' }} />
              : <Eye size={11} style={{ color: 'rgba(255,255,255,0.5)' }} />}
          </button>
          <button onClick={handleCopyKey} disabled={!data}
            className="flex-shrink-0 rounded-lg p-1.5 transition-colors hover:bg-white/10 disabled:opacity-30"
            title="Copy stream key">
            {copiedKey
              ? <CheckCircle2 size={11} style={{ color: '#22C55E' }} />
              : <Copy size={11} style={{ color: 'rgba(255,255,255,0.5)' }} />}
          </button>
        </div>
      </div>

      <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
        Paste these into OBS → Settings → Stream. Keep the stream key private.
      </p>
    </div>
  )
}

/* ── Single live class row ────────────────────────────── */
function LiveRow({
  live, courseId,
}: {
  live:     LiveClass
  courseId: string
}) {
  const router          = useRouter()
  const [confirming,    setConfirming]    = useState<'cancel' | 'delete' | null>(null)
  const [showCreds,     setShowCreds]     = useState(false)
  const [startError,    setStartError]    = useState<string | null>(null)
  const updateMutation  = useUpdateLiveClass(courseId)
  const startMutation   = useStartLiveStream(courseId)
  const endMutation     = useEndLiveStream(courseId)
  const deleteMutation  = useDeleteLiveClass(courseId)

  const isInternal  = live.type === 'internal'
  const isLiveNow   = live.status === 'live'
  const isScheduled = live.status === 'scheduled'
  const isEnded     = live.status === 'ended'
  const isCancelled = live.status === 'cancelled'
  const borderColor = isLiveNow ? 'rgba(239,68,68,0.35)' : 'rgba(255,255,255,0.07)'

  return (
    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-xl px-3 py-2.5"
      style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${borderColor}` }}>

      <div className="flex items-center gap-3">
        {/* Icon */}
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg"
          style={{ background: isLiveNow ? 'rgba(239,68,68,0.12)' : isInternal ? 'rgba(255,107,26,0.10)' : 'rgba(99,102,241,0.10)' }}>
          {isLiveNow
            ? <motion.div animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 1.4, repeat: Infinity }}>
                <Radio size={14} style={{ color: '#EF4444' }} />
              </motion.div>
            : isInternal
            ? <Tv2 size={14} style={{ color: isCancelled ? 'rgba(255,255,255,0.25)' : '#FF6B1A' }} />
            : <Calendar size={14} style={{ color: isCancelled ? 'rgba(255,255,255,0.25)' : '#818CF8' }} />}
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Status badge */}
            {isLiveNow && (
              <motion.span animate={{ opacity: [1, 0.5, 1] }} transition={{ duration: 1.4, repeat: Infinity }}
                className="rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-white"
                style={{ background: '#EF4444' }}>● LIVE</motion.span>
            )}
            {isCancelled && (
              <span className="rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest"
                style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}>Cancelled</span>
            )}
            {isEnded && (
              <span className="rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest"
                style={{ background: 'rgba(34,197,94,0.12)', color: '#22C55E' }}>Ended</span>
            )}
            {/* Type badge */}
            <span className="rounded-md px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-widest"
              style={{
                background: isInternal ? 'rgba(255,107,26,0.12)' : 'rgba(99,102,241,0.12)',
                color:      isInternal ? '#FF6B1A' : '#818CF8',
              }}>
              {isInternal ? 'In-App' : 'External'}
            </span>
            <p className={`truncate text-sm font-semibold ${isCancelled ? 'line-through opacity-50' : ''}`}
              style={{ color: 'white' }}>
              {live.title}
            </p>
          </div>

          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px]"
            style={{ color: 'rgba(255,255,255,0.4)' }}>
            <span className="flex items-center gap-1">
              <Calendar size={9} />{fmtDateTime(live.scheduledStart)}
            </span>
            <span style={{ color: 'rgba(255,255,255,0.15)' }}>·</span>
            <span className="flex items-center gap-1">
              <Clock size={9} />{fmtDuration(live.durationMins)}
            </span>
            {isLiveNow && live.viewerCount > 0 && (
              <span className="font-semibold" style={{ color: '#EF4444' }}>
                {live.viewerCount.toLocaleString()} watching
              </span>
            )}
            {isEnded && live.recordingUrl && (
              <span className="font-semibold" style={{ color: '#22C55E' }}>Recording ready</span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Internal: Start stream → go to monitor page (OBS) */}
          {isInternal && isScheduled && (
            <button
              onClick={async () => {
                setStartError(null)
                try {
                  await startMutation.mutateAsync(live.id)
                  router.push(`/live-classes/${live.id}/monitor`)
                } catch (err: any) {
                  setStartError(err?.response?.data?.error?.message ?? 'Failed to start stream')
                }
              }}
              disabled={startMutation.isPending}
              title="Start with OBS"
              className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-bold text-white disabled:opacity-50 hover:brightness-110 transition-all"
              style={{ background: 'linear-gradient(135deg, #FF6B1A, #EF4444)' }}>
              {startMutation.isPending ? <Loader2 size={9} className="animate-spin" /> : <PlayCircle size={9} />}
              OBS
            </button>
          )}

          {/* Internal: Stream from Browser → studio page */}
          {isInternal && isScheduled && (
            <button
              onClick={() => router.push(`/live-classes/${live.id}/studio`)}
              title="Stream from browser"
              className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-bold transition-all hover:brightness-110"
              style={{ background: 'rgba(255,107,26,0.15)', border: '1px solid rgba(255,107,26,0.30)', color: '#FF6B1A' }}>
              <Monitor size={9} />Browser
            </button>
          )}

          {/* Internal: Monitor button when already live */}
          {isInternal && isLiveNow && (
            <button
              onClick={() => router.push(`/live-classes/${live.id}/monitor`)}
              className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-bold text-white hover:brightness-110 transition-all"
              style={{ background: '#EF4444' }}>
              <Radio size={9} />Monitor
            </button>
          )}

          {/* Internal: End stream button */}
          {isInternal && isLiveNow && (
            confirming === 'cancel' ? (
              <button
                onClick={() => { endMutation.mutate(live.id); setConfirming(null) }}
                className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-bold text-white"
                style={{ background: '#EF4444' }}>
                <CheckCircle2 size={9} />Confirm end
              </button>
            ) : (
              <button
                onClick={() => setConfirming('cancel')}
                disabled={endMutation.isPending}
                className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-bold text-white disabled:opacity-50 hover:brightness-110 transition-all"
                style={{ background: 'rgba(239,68,68,0.80)' }}>
                {endMutation.isPending ? <Loader2 size={9} className="animate-spin" /> : <Square size={9} />}
                End stream
              </button>
            )
          )}

          {/* Internal: Show credentials */}
          {isInternal && (isScheduled || isLiveNow) && (
            <button
              onClick={() => setShowCreds(v => !v)}
              className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-semibold transition-colors hover:bg-white/10"
              style={{ color: 'rgba(255,255,255,0.6)' }}>
              <Zap size={9} />Creds
            </button>
          )}

          {/* Internal: Watch recording */}
          {isInternal && isEnded && live.recordingUrl && (
            <a href={live.recordingUrl} target="_blank" rel="noreferrer"
              className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-semibold transition-colors hover:bg-white/10"
              style={{ color: '#22C55E' }}>
              <BookOpen size={9} />Recording
            </a>
          )}

          {/* External: Go Live Now — sets status to live */}
          {!isInternal && isScheduled && (
            <button
              onClick={() => updateMutation.mutate({ id: live.id, data: { status: 'live', scheduledStart: new Date().toISOString() } })}
              disabled={updateMutation.isPending}
              title="Mark as live now"
              className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-bold text-white disabled:opacity-50 hover:brightness-110 transition-all"
              style={{ background: 'linear-gradient(135deg, #FF6B1A, #EF4444)' }}>
              {updateMutation.isPending ? <Loader2 size={9} className="animate-spin" /> : <Zap size={9} />}
              Go Live
            </button>
          )}

          {/* External: Join button when live */}
          {!isInternal && isLiveNow && live.meetingUrl && (
            <a href={live.meetingUrl} target="_blank" rel="noreferrer"
              className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-bold text-white hover:brightness-110 transition-all"
              style={{ background: '#EF4444' }}>
              <ExternalLink size={9} />Join
            </a>
          )}

          {/* External: End session button when live */}
          {!isInternal && isLiveNow && (
            confirming === 'cancel' ? (
              <button
                onClick={() => { updateMutation.mutate({ id: live.id, data: { status: 'ended' } }); setConfirming(null) }}
                className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-bold text-white"
                style={{ background: '#EF4444' }}>
                <CheckCircle2 size={9} />Confirm end
              </button>
            ) : (
              <button
                onClick={() => setConfirming('cancel')}
                disabled={updateMutation.isPending}
                className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-bold text-white disabled:opacity-50 hover:brightness-110 transition-all"
                style={{ background: 'rgba(239,68,68,0.80)' }}>
                {updateMutation.isPending ? <Loader2 size={9} className="animate-spin" /> : <Square size={9} />}
                End session
              </button>
            )
          )}

          {/* Cancel session (scheduled only) — sets status to cancelled */}
          {isScheduled && (
            confirming === 'cancel' ? (
              <button
                onClick={() => { updateMutation.mutate({ id: live.id, data: { status: 'cancelled' } }); setConfirming(null) }}
                className="rounded-lg px-2 py-1 text-[10px] font-semibold text-white"
                style={{ background: '#F59E0B' }}>Confirm cancel</button>
            ) : (
              <button onClick={() => setConfirming('cancel')}
                className="rounded-lg px-2 py-1 text-[10px] font-semibold transition-colors hover:bg-white/10"
                style={{ color: 'rgba(255,255,255,0.5)' }}>Cancel</button>
            )
          )}

          {/* Delete */}
          {confirming === 'delete' ? (
            <button
              onClick={() => { deleteMutation.mutate(live.id); setConfirming(null) }}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold text-white"
              style={{ background: '#EF4444' }}>
              <CheckCircle2 size={9} />Confirm
            </button>
          ) : (
            <button onClick={() => setConfirming('delete')}
              className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-red-500/15"
              style={{ color: 'rgba(255,255,255,0.5)' }}>
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Start error */}
      {startError && (
        <p className="mt-1.5 flex items-center gap-1.5 text-[11px]" style={{ color: '#F87171' }}>
          <AlertCircle size={10} />{startError}
        </p>
      )}

      {/* RTMP credentials panel (inline expand) */}
      <AnimatePresence>
        {showCreds && isInternal && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden">
            <CredentialsPanel liveId={live.id} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

/* ── Create form ──────────────────────────────────────── */
function CreateForm({
  courseId, pending, onSubmit, error,
}: {
  courseId: string
  pending:  boolean
  onSubmit: (data: {
    courseId:       string
    title:          string
    description?:   string
    scheduledStart: string
    durationMins:   number
    type:           LiveClassType
    meetingUrl?:    string
  }) => Promise<void>
  error: string | null
}) {
  const [type,         setType]         = useState<LiveClassType>('external')
  const [title,        setTitle]        = useState('')
  const [description,  setDescription]  = useState('')
  const [start,        setStart]        = useState('')
  const [durationMins, setDurationMins] = useState(60)
  const [meetingUrl,   setMeetingUrl]   = useState('')

  const handle = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title || !start) return
    if (type === 'external' && !meetingUrl) return
    const iso = new Date(start).toISOString()
    await onSubmit({
      courseId,
      title,
      description:    description || undefined,
      scheduledStart: iso,
      durationMins,
      type,
      meetingUrl:     type === 'external' ? meetingUrl : undefined,
    })
    setTitle(''); setDescription(''); setStart(''); setMeetingUrl(''); setDurationMins(60)
  }

  const inputStyle = { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' } as const
  const base = 'w-full rounded-xl px-3 py-2 text-sm text-white outline-none placeholder:text-white/30'

  return (
    <motion.form onSubmit={handle}
      initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden">
      <div className="rounded-2xl p-4 space-y-3"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>

        {/* Type selector */}
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
              {t === 'internal' ? <Tv2 size={11} /> : <ExternalLink size={11} />}
              {t === 'internal' ? 'In-App Stream' : 'External Link'}
            </button>
          ))}
        </div>

        {/* Internal type hint */}
        {type === 'internal' && (
          <p className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-[11px]"
            style={{ background: 'rgba(255,107,26,0.08)', color: 'rgba(255,107,26,0.85)', border: '1px solid rgba(255,107,26,0.18)' }}>
            <Tv2 size={11} />
            RTMP credentials (for OBS) are generated after saving.
          </p>
        )}

        <input value={title} onChange={e => setTitle(e.target.value)} required minLength={3} maxLength={255}
          placeholder="Session title (e.g. Week 2 Q&A)"
          className={base} style={inputStyle} />

        <input value={description} onChange={e => setDescription(e.target.value)} maxLength={2000}
          placeholder="Short description (optional)"
          className={base} style={inputStyle} />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[2fr_1fr]">
          <input value={start} onChange={e => setStart(e.target.value)} type="datetime-local" required
            className={base} style={inputStyle} />
          <input value={durationMins} onChange={e => setDurationMins(Number(e.target.value))}
            type="number" min={5} max={600} step={5}
            placeholder="Duration (mins)"
            className={base} style={inputStyle} />
        </div>

        {/* Meeting URL — only for external */}
        {type === 'external' && (
          <div className="relative">
            <LinkIcon size={13} className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: 'rgba(255,255,255,0.4)' }} />
            <input value={meetingUrl} onChange={e => setMeetingUrl(e.target.value)} type="url" required maxLength={2048}
              placeholder="https://zoom.us/j/123456789"
              className={`${base} pl-9`} style={inputStyle} />
          </div>
        )}

        {error && (
          <p className="flex items-center gap-1.5 text-xs" style={{ color: '#F87171' }}>
            <AlertCircle size={11} />{error}
          </p>
        )}

        <div className="flex justify-end">
          <button type="submit" disabled={pending}
            className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #FF6B1A, #FF8C42)' }}>
            {pending
              ? <><Loader2 size={11} className="animate-spin" />Scheduling…</>
              : <>Schedule session</>}
          </button>
        </div>
      </div>
    </motion.form>
  )
}

/* ── Section ──────────────────────────────────────────── */
interface Props { courseId: string }

export function LiveClassesSection({ courseId }: Props) {
  const { data: items, isLoading }   = useLiveClassesForCourse(courseId)
  const createMutation               = useCreateLiveClass()
  const [showForm, setShowForm]      = useState(false)
  const [error,    setError]         = useState<string | null>(null)

  const upcoming = (items ?? []).filter(l => l.status === 'scheduled' || l.status === 'live')
  const past     = (items ?? []).filter(l => l.status === 'ended' || l.status === 'cancelled')

  return (
    <section className="mt-6 rounded-2xl p-5 space-y-4"
      style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Video size={14} style={{ color: '#FF6B1A' }} />
          <h3 className="text-base font-bold text-white" style={{ fontFamily: 'Bricolage Grotesque, sans-serif' }}>
            Live classes
          </h3>
          {items && (
            <span className="rounded-md px-1.5 py-0.5 text-[10px] font-bold"
              style={{ background: 'rgba(255,107,26,0.15)', color: '#FF6B1A' }}>
              {items.length}
            </span>
          )}
        </div>
        <button onClick={() => { setShowForm(v => !v); setError(null) }}
          className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold text-white"
          style={{ background: showForm ? 'rgba(255,255,255,0.06)' : 'linear-gradient(135deg, #FF6B1A, #FF8C42)' }}>
          {showForm ? <><X size={12} />Cancel</> : <><Plus size={12} />New session</>}
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <CreateForm
            courseId={courseId}
            pending={createMutation.isPending}
            error={error}
            onSubmit={async (data) => {
              setError(null)
              try {
                await createMutation.mutateAsync(data)
                setShowForm(false)
              } catch (err: any) {
                setError(
                  err?.response?.data?.error?.message
                  ?? err?.response?.data?.error?.details?.[0]?.message
                  ?? 'Could not schedule the session.'
                )
              }
            }} />
        )}
      </AnimatePresence>

      {isLoading && (
        <div className="flex items-center gap-2 text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
          <Loader2 size={12} className="animate-spin" />Loading…
        </div>
      )}

      {!isLoading && items?.length === 0 && !showForm && (
        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
          No live classes scheduled yet. Click <span className="text-white font-semibold">New session</span> to add one.
        </p>
      )}

      {upcoming.length > 0 && (
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest"
            style={{ color: 'rgba(255,255,255,0.35)' }}>Upcoming & Live</p>
          <div className="space-y-2">
            {upcoming.map(l => <LiveRow key={l.id} live={l} courseId={courseId} />)}
          </div>
        </div>
      )}

      {past.length > 0 && (
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest"
            style={{ color: 'rgba(255,255,255,0.35)' }}>Past & Cancelled</p>
          <div className="space-y-2">
            {past.map(l => <LiveRow key={l.id} live={l} courseId={courseId} />)}
          </div>
        </div>
      )}
    </section>
  )
}
