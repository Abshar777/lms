'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Loader2, AlertCircle, User, Mail,
  Lock, Unlock, BookOpen, Plus, Trash2,
  ChevronDown, ChevronUp, Check,
} from 'lucide-react'
import {
  useUpdateUser, useStudentEnrollments, useUpdateEnrollmentAccess,
  useEnrollStudent, useRemoveEnrollment, type AdminUser,
} from '@/lib/api/users'
import { useCourseOutline } from '@/lib/api/outline'
import { useCourses } from '@/lib/api/courses'
import { useToast } from '@/store/ui.store'

/* ── Module-access panel — section-level toggle ── */
function ModuleAccessPanel({
  courseId,
  blockedSections,
  onToggle,
  onBlockAll,
  onAllowAll,
}: {
  courseId:        string
  blockedSections: Set<string>
  onToggle:        (sectionId: string) => void
  onBlockAll:      (sectionIds: string[]) => void
  onAllowAll:      () => void
}) {
  const { data: outline, isLoading } = useCourseOutline(courseId)

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
        <Loader2 size={11} className="animate-spin" />Loading modules…
      </div>
    )
  }

  const sections = outline?.sections ?? []

  if (sections.length === 0) {
    return <p className="px-4 py-3 text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>No modules in this course.</p>
  }

  const allBlocked  = sections.every(s => blockedSections.has(s.id))
  const noneBlocked = sections.every(s => !blockedSections.has(s.id))

  return (
    <div className="px-3 pb-3 pt-2 space-y-1.5">
      {/* Select-all / deselect-all row */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.25)' }}>
          Modules
        </span>
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={onAllowAll} disabled={noneBlocked}
            className="rounded-md px-2 py-0.5 text-[10px] font-semibold transition-all disabled:opacity-30 hover:brightness-110"
            style={{ background: 'rgba(16,185,129,0.12)', color: '#10B981', border: '1px solid rgba(16,185,129,0.25)' }}>
            Allow all
          </button>
          <button type="button" onClick={() => onBlockAll(sections.map(s => s.id))} disabled={allBlocked}
            className="rounded-md px-2 py-0.5 text-[10px] font-semibold transition-all disabled:opacity-30 hover:brightness-110"
            style={{ background: 'rgba(239,68,68,0.10)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.22)' }}>
            Block all
          </button>
        </div>
      </div>

      {sections.map(section => {
        const isBlocked = blockedSections.has(section.id)
        return (
          <button
            key={section.id}
            type="button"
            onClick={() => onToggle(section.id)}
            className="w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs transition-all hover:brightness-110"
            style={{
              background: isBlocked ? 'rgba(239,68,68,0.07)' : 'rgba(16,185,129,0.05)',
              border:     isBlocked ? '1px solid rgba(239,68,68,0.20)' : '1px solid rgba(16,185,129,0.15)',
            }}
          >
            {/* Checkbox */}
            <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded"
              style={{
                background: isBlocked ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.12)',
                border:     isBlocked ? '1px solid rgba(239,68,68,0.35)' : '1px solid rgba(16,185,129,0.35)',
              }}>
              {isBlocked
                ? <Lock   size={10} style={{ color: '#EF4444' }} />
                : <Unlock size={10} style={{ color: '#10B981' }} />}
            </div>

            <span className="flex-1 truncate font-medium"
              style={{ color: isBlocked ? '#F87171' : 'rgba(255,255,255,0.8)' }}>
              {section.title}
            </span>

            <span className="flex-shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold"
              style={{
                background: isBlocked ? 'rgba(239,68,68,0.10)' : 'rgba(16,185,129,0.10)',
                color:      isBlocked ? '#EF4444' : '#10B981',
              }}>
              {isBlocked ? 'Blocked' : 'Allowed'}
            </span>
          </button>
        )
      })}
    </div>
  )
}

/* ── Dark custom dropdown (native <select> shows white on dark bg on Windows) ── */
function DarkSelect({ value, onChange, options, placeholder }: {
  value: string; onChange: (v: string) => void
  options: { value: string; label: string }[]; placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    function onOut(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', onOut)
    return () => document.removeEventListener('mousedown', onOut)
  }, [])
  const selected = options.find(o => o.value === value)
  const label = selected?.label ?? placeholder ?? 'Select…'
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(v => !v)}
        className="w-full rounded-xl py-2.5 pl-9 pr-9 text-sm outline-none transition-all flex items-center"
        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', color: value ? '#fff' : 'rgba(255,255,255,0.3)' }}>
        <span className="truncate">{label}</span>
        <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: 'rgba(255,255,255,0.3)', transform: open ? 'translateY(-50%) rotate(180deg)' : 'translateY(-50%)', transition: 'transform 0.15s' }} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }} transition={{ duration: 0.12 }}
            className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl py-1"
            style={{ background: '#0F1020', border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 16px 40px rgba(0,0,0,0.6)' }}>
            {placeholder && (
              <button type="button" onClick={() => { onChange(''); setOpen(false) }}
                className="w-full px-3 py-2 text-left text-sm transition-colors hover:bg-white/05"
                style={{ color: 'rgba(255,255,255,0.3)' }}>{placeholder}</button>
            )}
            {options.map(o => (
              <button key={o.value} type="button" onClick={() => { onChange(o.value); setOpen(false) }}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors hover:bg-white/05"
                style={{ color: o.value === value ? '#FF6B1A' : 'rgba(255,255,255,0.8)' }}>
                {o.label}
                {o.value === value && <Check size={12} style={{ color: '#FF6B1A' }} />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const CATEGORY_OPTIONS = [
  { value: '4x-trading',        label: '4x Trading' },
  { value: 'digital-marketing', label: 'Digital Marketing' },
]

/* ── Props ──────────────────────────────────────────── */
interface Props {
  user:      AdminUser
  onClose:   () => void
  onSuccess: () => void
}

export function EditStudentModal({ user, onClose, onSuccess }: Props) {
  const update         = useUpdateUser()
  const updateAccess   = useUpdateEnrollmentAccess()
  const enrollStudent  = useEnrollStudent()
  const removeEnroll   = useRemoveEnrollment()
  const toast          = useToast()

  /* Profile fields */
  const [name,     setName]     = useState(user.name)
  const [email,    setEmail]    = useState(user.email)
  const [category, setCategory] = useState<'4x-trading' | 'digital-marketing' | ''>(user.category ?? '')
  const [error,    setError]    = useState<string | null>(null)

  /* Keep category in sync if user prop changes (e.g. after refetch) */
  useEffect(() => { setCategory(user.category ?? '') }, [user.category])

  /* Course access — localBlocked stores SECTION IDs (not lesson IDs) */
  const { data: enrollments, isLoading: enrollmentsLoading } = useStudentEnrollments(user.id)
  const [localBlocked, setLocalBlocked] = useState<Record<string, Set<string>>>({})
  const [expandedEnrollments, setExpandedEnrollments] = useState<Set<string>>(new Set())

  /* All courses for the "add" picker */
  const { data: coursesData } = useCourses({ per_page: 200 })
  const allCourses = coursesData?.docs ?? []
  const [addCourseId, setAddCourseId] = useState('')

  /* Seed localBlocked once enrollments load */
  useEffect(() => {
    if (!enrollments) return
    setLocalBlocked(prev => {
      const next = { ...prev }
      enrollments.forEach(e => {
        const eid = String((e as any)._id ?? e.id)
        if (!(eid in next)) next[eid] = new Set(e.blockedLessons)
      })
      return next
    })
  }, [enrollments])

  /* Courses the student is NOT yet enrolled in */
  const enrolledCourseIds = new Set((enrollments ?? []).map(e => e.courseId?.id))
  const unenrolledCourses = allCourses.filter(c => !enrolledCourseIds.has(c.id))

  /* Toggle expand/collapse for an enrollment card */
  const toggleExpand = useCallback((eid: string) => {
    setExpandedEnrollments(prev => {
      const next = new Set(prev)
      if (next.has(eid)) next.delete(eid)
      else next.add(eid)
      return next
    })
  }, [])

  /* Toggle a single section for an enrollment */
  const toggleSection = useCallback((enrollmentId: string, sectionId: string) => {
    setLocalBlocked(prev => {
      const current = new Set(prev[enrollmentId] ?? [])
      if (current.has(sectionId)) current.delete(sectionId)
      else current.add(sectionId)
      return { ...prev, [enrollmentId]: current }
    })
  }, [])

  /* Block all sections for an enrollment */
  const blockAll = useCallback((enrollmentId: string, sectionIds: string[]) => {
    setLocalBlocked(prev => ({ ...prev, [enrollmentId]: new Set(sectionIds) }))
  }, [])

  /* Allow all sections for an enrollment */
  const allowAll = useCallback((enrollmentId: string) => {
    setLocalBlocked(prev => ({ ...prev, [enrollmentId]: new Set() }))
  }, [])

  /* Enroll in a new course */
  const handleEnroll = async () => {
    if (!addCourseId) return
    try {
      await enrollStudent.mutateAsync({ userId: user.id, courseId: addCourseId })
      setAddCourseId('')
      toast.success('Student enrolled!')
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? 'Could not enroll student.')
    }
  }

  /* Remove an enrollment */
  const handleRemove = async (enrollmentId: string) => {
    try {
      await removeEnroll.mutateAsync({ enrollmentId, userId: user.id })
      toast.success('Enrollment removed.')
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? 'Could not remove enrollment.')
    }
  }

  /* Submit — profile + any changed module-access */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const promises: Promise<unknown>[] = []

    const dto: { name?: string; email?: string; category?: '4x-trading' | 'digital-marketing' | null } = {}
    if (name.trim()  !== user.name)              dto.name     = name.trim()
    if (email.trim() !== user.email)             dto.email    = email.trim().toLowerCase()
    if (category     !== (user.category ?? '')) dto.category = category === '' ? null : category
    if (Object.keys(dto).length > 0) promises.push(update.mutateAsync({ id: user.id, ...dto }))

    enrollments?.forEach(e => {
      const eid      = String((e as any)._id ?? e.id)
      const original = new Set(e.blockedLessons)
      const current  = localBlocked[eid] ?? original
      const changed  = current.size !== original.size || [...current].some(id => !original.has(id))
      if (changed) {
        promises.push(updateAccess.mutateAsync({ id: eid, blockedLessons: Array.from(current) }))
      }
    })

    if (promises.length === 0) { onClose(); return }

    try {
      await Promise.all(promises)
      toast.success('Student updated')
      onSuccess()
    } catch (err: any) {
      setError(err?.response?.data?.error?.message ?? 'Failed to save changes.')
    }
  }

  const isPending = update.isPending || updateAccess.isPending

  const base   = 'w-full rounded-xl py-2.5 pl-9 pr-4 text-sm text-white outline-none transition-all placeholder:text-white/30'
  const iStyle = { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' } as React.CSSProperties
  const iFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.border    = '1px solid rgba(255,107,26,0.5)'
    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(255,107,26,0.10)'
  }
  const iBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.border    = '1px solid rgba(255,255,255,0.09)'
    e.currentTarget.style.boxShadow = 'none'
  }

  // Render through a portal to <body> so the fixed overlay isn't an (invalid)
  // DOM child of the <tbody>/<tr> that mounts this modal.
  if (typeof document === 'undefined') return null
  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.65)' }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          onClick={e => e.stopPropagation()}
          className="flex w-full max-w-md flex-col rounded-2xl shadow-2xl"
          style={{ background: '#161829', border: '1px solid rgba(255,255,255,0.10)', maxHeight: '90vh' }}
        >
          {/* Header */}
          <div className="flex flex-shrink-0 items-center justify-between gap-3 px-6 py-4"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-white" style={{ fontFamily: 'Bricolage Grotesque, sans-serif' }}>
                Edit Student
              </h2>
              <p className="mt-0.5 truncate text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{user.email}</p>
            </div>
            <button onClick={onClose}
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl transition-colors hover:bg-white/10"
              style={{ color: 'rgba(255,255,255,0.4)' }}>
              <X size={15} />
            </button>
          </div>

          {/* Scrollable body */}
          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-y-auto">
            <div className="space-y-3 px-6 py-4">
              {/* Name */}
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest"
                  style={{ color: 'rgba(255,255,255,0.35)' }}>Full name</label>
                <div className="relative">
                  <User size={13} className="absolute left-3 top-1/2 -translate-y-1/2"
                    style={{ color: 'rgba(255,255,255,0.35)' }} />
                  <input value={name} onChange={e => setName(e.target.value)}
                    required minLength={2} maxLength={100} placeholder="Full name"
                    className={base} style={iStyle} onFocus={iFocus} onBlur={iBlur} />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest"
                  style={{ color: 'rgba(255,255,255,0.35)' }}>Email address</label>
                <div className="relative">
                  <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2"
                    style={{ color: 'rgba(255,255,255,0.35)' }} />
                  <input value={email} onChange={e => setEmail(e.target.value)}
                    type="email" required placeholder="email@example.com"
                    className={base} style={iStyle} onFocus={iFocus} onBlur={iBlur} />
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest"
                  style={{ color: 'rgba(255,255,255,0.35)' }}>Program Category</label>
                <DarkSelect
                  value={category}
                  onChange={v => setCategory(v as '4x-trading' | 'digital-marketing' | '')}
                  options={CATEGORY_OPTIONS}
                  placeholder="Select category…"
                />
              </div>
            </div>

            {/* Course access section */}
            <div className="px-6 pb-4">
              {/* Section header */}
              <div className="mb-3 flex items-center gap-2">
                <BookOpen size={13} style={{ color: 'rgba(255,255,255,0.4)' }} />
                <p className="text-[10px] font-semibold uppercase tracking-widest"
                  style={{ color: 'rgba(255,255,255,0.35)' }}>Course Access</p>
              </div>

              {/* Add-course row */}
              {unenrolledCourses.length > 0 && (
                <div className="mb-3 flex items-center gap-2">
                  <select
                    value={addCourseId}
                    onChange={e => setAddCourseId(e.target.value)}
                    className="flex-1 rounded-xl px-3 py-2 text-xs text-white outline-none"
                    /* Solid dark bg so the browser-native dropdown popup renders dark (not white) */
                    style={{ background: '#1e2035', border: '1px solid rgba(255,255,255,0.09)', color: addCourseId ? 'white' : 'rgba(255,255,255,0.3)' }}
                  >
                    <option value="" style={{ background: '#1e2035', color: 'rgba(255,255,255,0.5)' }}>Select a course to enroll…</option>
                    {unenrolledCourses.map(c => (
                      <option key={c.id} value={c.id} style={{ background: '#1e2035', color: 'white' }}>{c.title}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleEnroll}
                    disabled={!addCourseId || enrollStudent.isPending}
                    className="flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-bold text-white disabled:opacity-40 transition-all hover:brightness-110"
                    style={{ background: 'linear-gradient(135deg,#FF6B1A,#FF8C42)', whiteSpace: 'nowrap' }}
                  >
                    {enrollStudent.isPending
                      ? <Loader2 size={11} className="animate-spin" />
                      : <Plus size={11} />}
                    Enroll
                  </button>
                </div>
              )}

              {/* Enrollment list */}
              {enrollmentsLoading ? (
                <div className="flex items-center gap-2 py-4 text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  <Loader2 size={13} className="animate-spin" />Loading enrollments…
                </div>
              ) : !enrollments || enrollments.length === 0 ? (
                <p className="py-3 text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  Not enrolled in any courses yet. Use the selector above to add one.
                </p>
              ) : (
                <div className="space-y-2">
                  {enrollments.map(enrollment => {
                    const eid            = String((enrollment as any)._id ?? enrollment.id)
                    const blockedSections = localBlocked[eid] ?? new Set<string>()
                    const hasRestrict    = blockedSections.size > 0
                    const courseId       = String((enrollment.courseId as any)?._id ?? enrollment.courseId?.id ?? '')
                    const isExpanded     = expandedEnrollments.has(eid)

                    return (
                      <motion.div
                        key={eid}
                        initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                        className="overflow-hidden rounded-xl transition-all"
                        style={{
                          border:     '1.5px solid rgba(255,255,255,0.08)',
                          background: 'rgba(255,255,255,0.03)',
                        }}
                      >
                        {/* Course header row */}
                        <div className="flex items-center gap-3 px-3 py-2.5">
                          {/* Thumbnail */}
                          <div className="h-8 w-12 flex-shrink-0 overflow-hidden rounded-lg"
                            style={{ background: 'rgba(255,255,255,0.08)' }}>
                            {enrollment.courseId?.thumbnailUrl && (
                              <img src={enrollment.courseId.thumbnailUrl} alt=""
                                className="h-full w-full object-cover" />
                            )}
                          </div>

                          {/* Title + badge */}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-semibold text-white">
                              {enrollment.courseId?.title ?? '—'}
                            </p>
                            <p className="text-[10px]" style={{ color: hasRestrict ? '#F87171' : 'rgba(255,255,255,0.35)' }}>
                              {hasRestrict ? `${blockedSections.size} module${blockedSections.size !== 1 ? 's' : ''} blocked` : 'Full access'}
                            </p>
                          </div>

                          {/* Expand toggle */}
                          <button
                            type="button"
                            onClick={() => toggleExpand(eid)}
                            className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-white/10"
                            style={{ color: 'rgba(255,255,255,0.4)' }}
                            title="Toggle module access"
                          >
                            {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                          </button>

                          {/* Remove enrollment */}
                          <button
                            type="button"
                            onClick={() => handleRemove(eid)}
                            disabled={removeEnroll.isPending}
                            className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-red-500/15 disabled:opacity-40"
                            style={{ color: 'rgba(255,255,255,0.3)' }}
                            title="Remove enrollment"
                          >
                            {removeEnroll.isPending
                              ? <Loader2 size={11} className="animate-spin" />
                              : <Trash2 size={11} />}
                          </button>
                        </div>

                        {/* Module access panel — collapsible */}
                        <AnimatePresence>
                          {isExpanded && courseId && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              style={{ overflow: 'hidden', borderTop: '1px solid rgba(255,255,255,0.06)' }}
                            >
                              <ModuleAccessPanel
                                courseId={courseId}
                                blockedSections={blockedSections}
                                onToggle={sectionId => toggleSection(eid, sectionId)}
                                onBlockAll={sectionIds => blockAll(eid, sectionIds)}
                                onAllowAll={() => allowAll(eid)}
                              />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 flex-shrink-0 px-6 pb-5 pt-3"
              style={{ background: '#161829', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              {error && (
                <p className="mb-3 flex items-center gap-1.5 text-xs" style={{ color: '#F87171' }}>
                  <AlertCircle size={11} />{error}
                </p>
              )}
              <div className="flex items-center justify-end gap-2">
                <button type="button" onClick={onClose}
                  className="rounded-xl px-4 py-2 text-sm font-medium transition-colors hover:bg-white/10"
                  style={{ color: 'rgba(255,255,255,0.5)' }}>
                  Cancel
                </button>
                <button type="submit" disabled={isPending}
                  className="flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-bold text-white disabled:opacity-60 transition-all hover:brightness-110"
                  style={{ background: 'linear-gradient(135deg,#FF6B1A,#FF8C42)' }}>
                  {isPending
                    ? <><Loader2 size={14} className="animate-spin" />Saving…</>
                    : 'Save changes'}
                </button>
              </div>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  )
}
