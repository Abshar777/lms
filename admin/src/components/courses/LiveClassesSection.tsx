'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Video, Plus, Trash2, Calendar, Clock, Link as LinkIcon,
  Loader2, X, AlertCircle, CheckCircle2, Radio,
} from 'lucide-react'
import {
  useLiveClassesForCourse, useCreateLiveClass, useDeleteLiveClass, useUpdateLiveClass,
  type LiveClass,
} from '@/lib/api/liveClasses'

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour:    'numeric', minute: '2-digit',
  })
}

function fmtDuration(mins: number): string {
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

function isLiveNow(l: LiveClass): boolean {
  if (l.cancelled) return false
  const start = new Date(l.scheduledStart).getTime()
  const end   = start + l.durationMins * 60_000
  const now   = Date.now()
  return now >= start - 10 * 60_000 && now <= end
}

interface Props { courseId: string }

export function LiveClassesSection({ courseId }: Props) {
  const { data: items, isLoading } = useLiveClassesForCourse(courseId)
  const createMutation = useCreateLiveClass()
  const updateMutation = useUpdateLiveClass(courseId)
  const deleteMutation = useDeleteLiveClass(courseId)
  const [showForm, setShowForm] = useState(false)
  const [error, setError]       = useState<string | null>(null)

  const upcoming = (items ?? []).filter(l => !l.cancelled && new Date(l.scheduledStart).getTime() > Date.now() - 60_000)
  const past     = (items ?? []).filter(l => l.cancelled || new Date(l.scheduledStart).getTime() <= Date.now() - 60_000)

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
            onSubmit={async (data) => {
              setError(null)
              try {
                await createMutation.mutateAsync(data)
                setShowForm(false)
              } catch (err: any) {
                setError(err?.response?.data?.error?.message
                  ?? err?.response?.data?.error?.details?.[0]?.message
                  ?? 'Could not schedule the session.')
              }
            }}
            error={error} />
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
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.35)' }}>
            Upcoming
          </p>
          <div className="space-y-2">
            {upcoming.map(l => (
              <LiveRow key={l.id} live={l}
                onCancel={() => updateMutation.mutateAsync({ id: l.id, data: { cancelled: true } })}
                onDelete={() => deleteMutation.mutateAsync(l.id)} />
            ))}
          </div>
        </div>
      )}

      {past.length > 0 && (
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.35)' }}>
            Past & cancelled
          </p>
          <div className="space-y-2">
            {past.map(l => (
              <LiveRow key={l.id} live={l}
                onCancel={() => Promise.resolve()}
                onDelete={() => deleteMutation.mutateAsync(l.id)} />
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

function LiveRow({ live, onCancel, onDelete }: {
  live: LiveClass
  onCancel: () => Promise<unknown>
  onDelete: () => Promise<unknown>
}) {
  const [confirming, setConfirming] = useState<'cancel' | 'delete' | null>(null)
  const liveNow = isLiveNow(live)
  return (
    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 rounded-xl px-3 py-2.5"
      style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${liveNow ? 'rgba(239,68,68,0.30)' : 'rgba(255,255,255,0.07)'}` }}>
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg"
        style={{
          background: live.cancelled
            ? 'rgba(255,255,255,0.04)'
            : liveNow
              ? 'rgba(239,68,68,0.10)'
              : 'rgba(99,102,241,0.10)',
        }}>
        {liveNow ? <Radio size={13} style={{ color: '#EF4444' }} /> : <Calendar size={13} style={{ color: live.cancelled ? 'rgba(255,255,255,0.3)' : '#818CF8' }} />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          {liveNow && (
            <span className="rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-white"
              style={{ background: '#EF4444' }}>LIVE</span>
          )}
          {live.cancelled && (
            <span className="rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest"
              style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}>Cancelled</span>
          )}
          <p className={`truncate text-sm font-semibold ${live.cancelled ? 'line-through' : ''}`}
            style={{ color: live.cancelled ? 'rgba(255,255,255,0.45)' : 'white' }}>
            {live.title}
          </p>
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px]" style={{ color: 'rgba(255,255,255,0.45)' }}>
          <span className="flex items-center gap-1"><Calendar size={9} />{fmtDateTime(live.scheduledStart)}</span>
          <span style={{ color: 'rgba(255,255,255,0.15)' }}>·</span>
          <span className="flex items-center gap-1"><Clock size={9} />{fmtDuration(live.durationMins)}</span>
        </div>
      </div>
      <div className="flex items-center gap-1">
        {!live.cancelled && !liveNow && (
          confirming === 'cancel' ? (
            <button onClick={async () => { await onCancel(); setConfirming(null) }}
              className="rounded-lg px-2 py-1 text-[10px] font-semibold text-white"
              style={{ background: '#F59E0B' }}>Confirm cancel</button>
          ) : (
            <button onClick={() => setConfirming('cancel')}
              className="rounded-lg px-2 py-1 text-[10px] font-semibold transition-colors hover:bg-white/06"
              style={{ color: 'rgba(255,255,255,0.55)' }}>Cancel</button>
          )
        )}
        {confirming === 'delete' ? (
          <button onClick={async () => { await onDelete(); setConfirming(null) }}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold text-white"
            style={{ background: '#EF4444' }}><CheckCircle2 size={9} />Confirm delete</button>
        ) : (
          <button onClick={() => setConfirming('delete')}
            className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-red-500/15"
            style={{ color: 'rgba(255,255,255,0.55)' }}>
            <Trash2 size={12} />
          </button>
        )}
      </div>
    </motion.div>
  )
}

function CreateForm({
  courseId, pending, onSubmit, error,
}: {
  courseId: string
  pending:  boolean
  onSubmit: (data: { courseId: string; title: string; description?: string; scheduledStart: string; durationMins: number; meetingUrl: string }) => Promise<void>
  error:    string | null
}) {
  const [title,        setTitle]        = useState('')
  const [description,  setDescription]  = useState('')
  const [start,        setStart]        = useState('')   // datetime-local
  const [durationMins, setDurationMins] = useState(60)
  const [meetingUrl,   setMeetingUrl]   = useState('')

  const handle = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title || !start || !meetingUrl) return
    /* `datetime-local` gives "YYYY-MM-DDTHH:mm" — interpreted as local time */
    const iso = new Date(start).toISOString()
    await onSubmit({ courseId, title, description: description || undefined, scheduledStart: iso, durationMins, meetingUrl })
    setTitle(''); setDescription(''); setStart(''); setMeetingUrl(''); setDurationMins(60)
  }

  const inputStyle = { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' } as const
  const base = "w-full rounded-xl px-3 py-2 text-sm text-white outline-none placeholder:text-white/30"

  return (
    <motion.form onSubmit={handle}
      initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden">
      <div className="rounded-2xl p-4 space-y-3"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <input value={title} onChange={e => setTitle(e.target.value)} required minLength={3} maxLength={255}
          placeholder="Session title (e.g. Week 2 Q&A)"
          className={base} style={inputStyle} />
        <input value={description} onChange={e => setDescription(e.target.value)} maxLength={2000}
          placeholder="Short description (optional)"
          className={base} style={inputStyle} />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[2fr_1fr]">
          <input value={start} onChange={e => setStart(e.target.value)} type="datetime-local" required
            className={base} style={inputStyle} />
          <input value={durationMins} onChange={e => setDurationMins(Number(e.target.value))} type="number" min={5} max={600} step={5}
            placeholder="Duration (mins)"
            className={base} style={inputStyle} />
        </div>
        <div className="relative">
          <LinkIcon size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.4)' }} />
          <input value={meetingUrl} onChange={e => setMeetingUrl(e.target.value)} type="url" required maxLength={2048}
            placeholder="https://meet.google.com/abc-defg-hij"
            className={`${base} pl-9`} style={inputStyle} />
        </div>
        {error && (
          <p className="flex items-center gap-1.5 text-xs" style={{ color: '#F87171' }}>
            <AlertCircle size={11} />{error}
          </p>
        )}
        <div className="flex items-center justify-end">
          <button type="submit" disabled={pending}
            className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #FF6B1A, #FF8C42)' }}>
            {pending ? <><Loader2 size={11} className="animate-spin" />Scheduling…</> : <>Schedule session</>}
          </button>
        </div>
      </div>
    </motion.form>
  )
}
