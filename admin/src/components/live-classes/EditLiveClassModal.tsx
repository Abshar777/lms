'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, AlertCircle, ExternalLink, Tv2,
  Link as LinkIcon, Trash2, CheckCircle2, Video,
  MapPin, Building2, Wifi, Info,
} from 'lucide-react'
import {
  useUpdateLiveClass, useDeleteLiveClass,
  type LiveClass, type LiveClassType, type LiveClassStatus,
} from '@/lib/api/liveClasses'
import { useCourses } from '@/lib/api/courses'
import { useCourseOutline } from '@/lib/api/outline'
import { useUsers } from '@/lib/api/users'
import { isoToDatetimeLocal, datetimeLocalToISO } from '@/lib/timezone'
import Spinner from '@/components/ui/Spinner'

/* ── Helpers ──────────────────────────────────────────── */
const toLocalDatetime = isoToDatetimeLocal

/* ── Props ──────────────────────────────────────────────── */
interface Props {
  live:      LiveClass
  onClose:   () => void
  onSuccess: () => void
}

/* ── Component ──────────────────────────────────────────── */
export function EditLiveClassModal({ live, onClose, onSuccess }: Props) {
  const originalCourseId = (typeof live.course === 'object' ? live.course?.id : null) ?? live.courseId

  /* Course switcher */
  const [activeCourseId, setActiveCourseId] = useState(originalCourseId)

  const updateMutation = useUpdateLiveClass(activeCourseId)
  const deleteMutation = useDeleteLiveClass(activeCourseId)

  const { data: coursesData } = useCourses({ per_page: 200 })
  const courses = coursesData?.docs ?? []

  const { data: instructorsData } = useUsers('instructor', { per_page: 200 })
  const instructors = instructorsData?.docs ?? []

  const { data: outline } = useCourseOutline(activeCourseId)
  const sections = outline?.sections ?? []

  const [title,            setTitle]            = useState(live.title)
  const [description,      setDescription]      = useState(live.description ?? '')
  const [start,            setStart]            = useState(() => toLocalDatetime(live.scheduledStart))
  const [originalStart]                         = useState(() => toLocalDatetime(live.scheduledStart))
  const [durationMins,     setDurationMins]     = useState(live.durationMins)
  const [isOnline,         setIsOnline]         = useState<boolean>((live as any).isOnline ?? true)
  const [type,             setType]             = useState<LiveClassType>(live.type)
  const [meetingUrl,       setMeetingUrl]       = useState(live.meetingUrl ?? '')
  const [location,         setLocation]         = useState<string>((live as any).location ?? '')
  const [room,             setRoom]             = useState<string>((live as any).room ?? '')
  const [rescheduleReason, setRescheduleReason] = useState<string>('')
  const [status,           setStatus]           = useState<LiveClassStatus>(live.status)
  const [instructorId,     setInstructorId]     = useState(
    typeof live.instructor === 'object' ? (live.instructor?.id ?? '') : (live.instructorId ?? ''),
  )
  const [sectionId, setSectionId] = useState(() => {
    const s = (live as any).sectionId
    if (!s) return ''
    return typeof s === 'object' ? (s.id ?? '') : s
  })
  const [sessionCapacity, setSessionCapacity] = useState<number | ''>(
    (live as any).sessionCapacity ?? 500,
  )
  const [language,     setLanguage]     = useState<string>((live as any).language ?? 'English')
  const [recordingUrl, setRecordingUrl] = useState<string>(live.recordingUrl ?? '')
  const [error,        setError]        = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const timeChanged = start !== originalStart

  const base     = 'w-full rounded-xl px-3 py-2 text-sm text-white outline-none placeholder:text-white/30'
  const iStyle   = { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' } as const
  const selStyle = { background: '#1e2035', border: '1px solid rgba(255,255,255,0.12)', color: 'white' } as const

  const handleCourseChange = (newCourseId: string) => {
    setActiveCourseId(newCourseId)
    setSectionId('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (timeChanged && !rescheduleReason.trim()) {
      setError('Please provide a reason for rescheduling this class.')
      return
    }
    if (!isOnline && !location.trim()) {
      setError('Please enter a venue/location for in-person classes.')
      return
    }

    try {
      await updateMutation.mutateAsync({
        id:   live.id,
        data: {
          title:            title.trim(),
          description:      description.trim() || undefined,
          scheduledStart:   datetimeLocalToISO(start),
          durationMins,
          type,
          isOnline,
          meetingUrl:       isOnline && type === 'external' ? meetingUrl.trim() || undefined : undefined,
          location:         !isOnline ? location.trim() || undefined : undefined,
          room:             !isOnline ? room.trim() || undefined : undefined,
          rescheduleReason: timeChanged ? rescheduleReason.trim() : undefined,
          recordingUrl:     recordingUrl.trim() || undefined,
          status,
          instructorId:     instructorId || undefined,
          courseId:         activeCourseId !== originalCourseId ? activeCourseId : undefined,
          sectionId:        sectionId || undefined,
          sessionCapacity:  sessionCapacity !== '' ? sessionCapacity : undefined,
          language,
        },
      })
      onSuccess()
    } catch (err: any) {
      setError(
        err?.response?.data?.error?.message
        ?? err?.response?.data?.error?.details?.[0]?.message
        ?? 'Failed to update session.',
      )
    }
  }

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(live.id)
      onSuccess()
    } catch {
      setError('Failed to delete session.')
    }
  }

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
        className="w-full max-w-md rounded-2xl p-6 shadow-2xl overflow-y-auto"
        style={{ background: '#161829', border: '1px solid rgba(255,255,255,0.10)', maxHeight: '90vh' }}
      >
        {/* Header */}
        <div className="mb-5 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-white" style={{ fontFamily: 'Bricolage Grotesque, sans-serif' }}>
              Edit Session
            </h2>
            <p className="mt-0.5 truncate text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
              {courses.find(c => c.id === activeCourseId)?.title
                ?? (typeof live.course === 'object' ? live.course?.title : null)
                ?? 'Unknown course'}
            </p>
          </div>

          <div className="flex flex-shrink-0 items-center gap-2">
            <AnimatePresence mode="wait">
              {confirmDelete ? (
                <motion.button key="confirm"
                  initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                  className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold text-white disabled:opacity-60"
                  style={{ background: '#EF4444' }}>
                  {deleteMutation.isPending
                    ? <Spinner size={11} />
                    : <CheckCircle2 size={11} />}
                  Confirm delete
                </motion.button>
              ) : (
                <motion.button key="trash"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  onClick={() => setConfirmDelete(true)}
                  className="flex h-8 w-8 items-center justify-center rounded-xl transition-colors hover:bg-red-500/15"
                  style={{ color: 'rgba(255,255,255,0.35)' }}
                  title="Delete session">
                  <Trash2 size={14} />
                </motion.button>
              )}
            </AnimatePresence>

            <button onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-xl transition-colors hover:bg-white/10"
              style={{ color: 'rgba(255,255,255,0.4)' }}>
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">

          {/* Course switcher */}
          {courses.length > 0 && (
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest"
                style={{ color: 'rgba(255,255,255,0.35)' }}>Course</label>
              <select value={activeCourseId} onChange={e => handleCourseChange(e.target.value)}
                className={base} style={{ ...selStyle }}>
                {courses.map(c => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest"
              style={{ color: 'rgba(255,255,255,0.35)' }}>Session title</label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              required minLength={3} maxLength={255}
              className={base} style={iStyle} />
          </div>

          {/* Description */}
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest"
              style={{ color: 'rgba(255,255,255,0.35)' }}>Description (optional)</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              rows={3} maxLength={2000} placeholder="Short description…"
              className={base} style={{ ...iStyle, resize: 'none' }} />
          </div>

          {/* Date + Duration + Capacity */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest"
                style={{ color: 'rgba(255,255,255,0.35)' }}>Start time</label>
              <input type="datetime-local" value={start} onChange={e => setStart(e.target.value)}
                required className={base} style={iStyle} />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest"
                style={{ color: 'rgba(255,255,255,0.35)' }}>Duration (mins)</label>
              <input type="number" min={5} max={600} step={5}
                value={durationMins} onChange={e => setDurationMins(Number(e.target.value))}
                className={base} style={iStyle} />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest"
                style={{ color: 'rgba(255,255,255,0.35)' }}>Max seats</label>
              <input type="number" min={1} max={10000} step={1}
                value={sessionCapacity}
                onChange={e => setSessionCapacity(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="500"
                className={base} style={iStyle} />
            </div>
          </div>

          {/* Reschedule reason — appears only when time changes */}
          <AnimatePresence>
            {timeChanged && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                style={{ overflow: 'hidden' }}
              >
                <div style={{
                  background: 'rgba(251,191,36,0.07)',
                  border: '1px solid rgba(251,191,36,0.22)',
                  borderRadius: 12,
                  padding: '12px 14px',
                }}>
                  <div className="mb-2 flex items-center gap-1.5">
                    <Info size={12} style={{ color: '#FBB724' }} />
                    <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#FBB724' }}>
                      Reason for rescheduling <span style={{ color: '#EF4444' }}>*</span>
                    </span>
                  </div>
                  <textarea
                    value={rescheduleReason}
                    onChange={e => setRescheduleReason(e.target.value)}
                    rows={2}
                    maxLength={500}
                    placeholder="e.g. Instructor unavailable due to emergency; system maintenance required…"
                    className={base}
                    style={{ ...iStyle, resize: 'none', fontSize: 13 }}
                  />
                  <p className="mt-1 text-[10px]" style={{ color: 'rgba(255,255,255,0.28)' }}>
                    This reason will be included in 3 emails sent to all booked students over 24 hours.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Delivery mode: Online / Offline */}
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest"
              style={{ color: 'rgba(255,255,255,0.35)' }}>Delivery mode</label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setIsOnline(true)}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition-all"
                style={isOnline
                  ? { background: 'rgba(99,102,241,0.20)', color: '#818CF8', border: '1px solid rgba(99,102,241,0.35)' }
                  : { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.45)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <Wifi size={11} />
                Online
              </button>
              <button type="button" onClick={() => setIsOnline(false)}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition-all"
                style={!isOnline
                  ? { background: 'rgba(16,185,129,0.18)', color: '#34D399', border: '1px solid rgba(16,185,129,0.35)' }
                  : { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.45)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <Building2 size={11} />
                Offline (In-person)
              </button>
            </div>
          </div>

          {/* Online: session type + meeting URL */}
          {isOnline && (
            <>
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest"
                  style={{ color: 'rgba(255,255,255,0.35)' }}>Session type</label>
                <div className="flex gap-2">
                  {(['external', 'internal'] as const).map(t => (
                    <button key={t} type="button" onClick={() => setType(t)}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition-all"
                      style={type === t
                        ? { background: t === 'internal' ? 'rgba(0,87,184,0.20)' : 'rgba(99,102,241,0.20)',
                            color:      t === 'internal' ? '#0057b8' : '#818CF8',
                            border:     `1px solid ${t === 'internal' ? 'rgba(0,87,184,0.35)' : 'rgba(99,102,241,0.35)'}` }
                        : { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.45)',
                            border: '1px solid rgba(255,255,255,0.08)' }}>
                      {t === 'internal' ? <Tv2 size={11} /> : <ExternalLink size={11} />}
                      {t === 'internal' ? 'In-App Stream' : 'External Link'}
                    </button>
                  ))}
                </div>
              </div>

              {type === 'external' && (
                <div className="relative">
                  <LinkIcon size={13} className="absolute left-3 top-1/2 -translate-y-1/2"
                    style={{ color: 'rgba(255,255,255,0.35)' }} />
                  <input value={meetingUrl} onChange={e => setMeetingUrl(e.target.value)}
                    type="url" placeholder="https://zoom.us/j/… or Google Meet link"
                    className={`${base} pl-9`} style={iStyle} />
                </div>
              )}
            </>
          )}

          {/* Offline: Location + Room */}
          {!isOnline && (
            <div className="space-y-2">
              <div>
                <label className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest"
                  style={{ color: 'rgba(255,255,255,0.35)' }}>
                  <MapPin size={10} />
                  Venue / Location
                </label>
                <div className="relative">
                  <MapPin size={13} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                    style={{ color: 'rgba(255,255,255,0.30)' }} />
                  <input
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    maxLength={500}
                    placeholder="e.g. Delta Learning Center, Building A, 2nd Floor"
                    className={`${base} pl-9`}
                    style={iStyle}
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest"
                  style={{ color: 'rgba(255,255,255,0.35)' }}>
                  <Building2 size={10} />
                  Classroom / Room
                </label>
                <div className="relative">
                  <Building2 size={13} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                    style={{ color: 'rgba(255,255,255,0.30)' }} />
                  <input
                    value={room}
                    onChange={e => setRoom(e.target.value)}
                    maxLength={100}
                    placeholder="e.g. Room 204 / Lab 3 / Auditorium"
                    className={`${base} pl-9`}
                    style={iStyle}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Status */}
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest"
              style={{ color: 'rgba(255,255,255,0.35)' }}>Status</label>
            <select value={status} onChange={e => setStatus(e.target.value as LiveClassStatus)}
              className={base} style={{ ...selStyle }}>
              <option value="scheduled">Scheduled</option>
              <option value="live">Live</option>
              <option value="ended">Ended</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Module */}
          {sections.length > 0 && (
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest"
                style={{ color: 'rgba(255,255,255,0.35)' }}>Module (optional)</label>
              <select value={sectionId} onChange={e => setSectionId(e.target.value)}
                className={base} style={{ ...selStyle }}>
                <option value="">No specific module</option>
                {sections.map(s => (
                  <option key={s.id} value={s.id}>{s.title}</option>
                ))}
              </select>
            </div>
          )}

          {/* Instructor */}
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest"
              style={{ color: 'rgba(255,255,255,0.35)' }}>Instructor</label>
            <select value={instructorId} onChange={e => setInstructorId(e.target.value)}
              className={base} style={{ ...selStyle }}>
              <option value="">Default (current user)</option>
              {instructors.map(i => (
                <option key={i.id} value={i.id}>{i.name}</option>
              ))}
            </select>
          </div>

          {/* Language */}
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest"
              style={{ color: 'rgba(255,255,255,0.35)' }}>Language</label>
            <select value={language} onChange={e => setLanguage(e.target.value)}
              className={base} style={{ ...selStyle }}>
              <option value="English">🇬🇧 English</option>
              <option value="Arabic">🇦🇪 Arabic (عربي)</option>
              <option value="Hindi">🇮🇳 Hindi (हिंदी)</option>
              <option value="Malayalam">🇮🇳 Malayalam (മലയാളം)</option>
              <option value="Urdu">🇵🇰 Urdu (اردو)</option>
            </select>
          </div>

          {/* Recording URL */}
          <div>
            <label className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest"
              style={{ color: 'rgba(255,255,255,0.35)' }}>
              <Video size={10} />
              Recording URL
              <span className="normal-case tracking-normal font-normal"
                style={{ color: 'rgba(255,255,255,0.20)' }}>(optional)</span>
            </label>
            <div className="relative">
              <Video size={13} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: 'rgba(255,255,255,0.30)' }} />
              <input
                value={recordingUrl}
                onChange={e => setRecordingUrl(e.target.value)}
                type="url"
                placeholder="https://drive.google.com/… or any video URL"
                className={`${base} pl-9`}
                style={iStyle}
              />
            </div>
            {recordingUrl && (
              <p className="mt-1 text-[10px]" style={{ color: 'rgba(255,255,255,0.30)' }}>
                Students will see a "Watch Recording" button after class ends.
              </p>
            )}
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
            <button type="submit" disabled={updateMutation.isPending}
              className="flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-bold text-white disabled:opacity-60 transition-all hover:brightness-110"
              style={{ background: 'linear-gradient(135deg,#0057b8,#003d80)' }}>
              {updateMutation.isPending
                ? <><Spinner size={14} />Saving…</>
                : 'Save changes'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}
