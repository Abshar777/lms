'use client'

import { useState, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, User, Mail, Lock, Eye, EyeOff, Loader2, AlertCircle,
  CheckCircle2, Users, ChevronDown, ChevronUp,
  Check, Unlock, ArrowLeft, ArrowRight,
} from 'lucide-react'
import { useCreateInstructor } from '@/lib/api/instructors'
import { useCourses } from '@/lib/api/courses'
import { useCourseOutline } from '@/lib/api/outline'

/* ── Types ────────────────────────────────────────── */
interface CourseState {
  blockedLessons: Set<string>
  expanded: boolean
}

interface BlockState {
  [courseId: string]: CourseState
}

/* ── Zod schema for step 1 ─────────────────────────── */
const accountSchema = z.object({
  name:     z.string().min(2, 'Name must be at least 2 characters').max(100),
  email:    z.string().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})
type AccountValues = z.infer<typeof accountSchema>

/* ── Reusable Field wrapper ────────────────────────── */
function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold" style={{ color: '#4B5563' }}>{label}</label>
      {children}
      <AnimatePresence>
        {error && (
          <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="mt-1 flex items-center gap-1 text-xs text-red-500">
            <AlertCircle size={10} />{error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}

const inputCls = (hasError?: boolean) =>
  `w-full rounded-xl py-2.5 pl-9 pr-4 text-sm outline-none transition-all placeholder:text-gray-300 ${
    hasError
      ? 'border border-red-300 bg-red-50 text-gray-800'
      : 'border border-[#E4E7ED] bg-[#F8F9FB] text-gray-800 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100'
  }`

/* ── Course outline sub-component ─────────────────── */
function CourseOutlinePanel({
  courseId,
  blockedLessons,
  onToggleLesson,
}: {
  courseId:       string
  blockedLessons: Set<string>
  onToggleLesson: (lessonId: string) => void
}) {
  const { data: outline, isLoading } = useCourseOutline(courseId)

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-3 px-4 text-xs" style={{ color: '#9CA3AF' }}>
        <Loader2 size={11} className="animate-spin" />Loading curriculum…
      </div>
    )
  }

  if (!outline || outline.sections.length === 0) {
    return (
      <p className="py-3 px-4 text-xs" style={{ color: '#9CA3AF' }}>No curriculum added yet.</p>
    )
  }

  return (
    <div className="px-3 pb-3 space-y-2">
      {outline.sections.map(section => {
        const sectionLessons = outline.lessons.filter(l => l.sectionId === section.id)
        if (sectionLessons.length === 0) return null
        return (
          <div key={section.id}>
            <p className="text-[10px] font-bold uppercase tracking-wide mb-1.5 px-1"
              style={{ color: '#6B7280' }}>{section.title}</p>
            <div className="space-y-1">
              {sectionLessons.map(lesson => {
                const isBlocked = blockedLessons.has(lesson.id)
                return (
                  <button
                    key={lesson.id}
                    type="button"
                    onClick={() => onToggleLesson(lesson.id)}
                    className="w-full flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-gray-50"
                    style={{
                      background: isBlocked ? 'rgba(239,68,68,0.06)' : undefined,
                      border: isBlocked ? '1px solid rgba(239,68,68,0.15)' : '1px solid transparent',
                    }}
                  >
                    <div
                      className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded"
                      style={{
                        background: isBlocked ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.10)',
                        border: isBlocked ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(16,185,129,0.3)',
                      }}
                    >
                      {isBlocked
                        ? <Lock size={10} style={{ color: '#EF4444' }} />
                        : <Unlock size={10} style={{ color: '#10B981' }} />}
                    </div>
                    <span className="flex-1 truncate" style={{ color: isBlocked ? '#EF4444' : '#374151' }}>
                      {lesson.title}
                    </span>
                    <span className="flex-shrink-0 text-[10px]" style={{ color: '#9CA3AF' }}>
                      {isBlocked ? 'Blocked' : 'Allowed'}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ── Main modal ────────────────────────────────────── */
interface Props {
  open:    boolean
  onClose: () => void
}

export function AddStudentModal({ open, onClose }: Props) {
  const [step, setStep]       = useState<1 | 2>(1)
  const [showPw, setShowPw]   = useState(false)
  const [success, setSuccess] = useState(false)
  const [blockState, setBlockState] = useState<BlockState>({})
  const [accountValues, setAccountValues] = useState<AccountValues | null>(null)

  const { mutateAsync, isPending, error: apiError } = useCreateInstructor()
  const { data: coursesData, isLoading: coursesLoading } = useCourses({ per_page: 50, status: 'published' })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<AccountValues>({
    resolver: zodResolver(accountSchema),
  })

  const serverError = (() => {
    if (!apiError) return null
    const e = apiError as { response?: { data?: { error?: { message?: string } } } }
    return e.response?.data?.error?.message ?? 'Failed to create student. Please try again.'
  })()

  /* Step 1 → Step 2 */
  const onStep1Submit = (values: AccountValues) => {
    setAccountValues(values)
    setStep(2)
  }

  /* Toggle course selection */
  const toggleCourse = useCallback((courseId: string) => {
    setBlockState(prev => {
      const existing = prev[courseId]
      if (existing) {
        const { [courseId]: _, ...rest } = prev
        return rest
      }
      return {
        ...prev,
        [courseId]: { blockedLessons: new Set(), expanded: true },
      }
    })
  }, [])

  /* Toggle lesson blocking within a course */
  const toggleLesson = useCallback((courseId: string, lessonId: string) => {
    setBlockState(prev => {
      const course = prev[courseId]
      if (!course) return prev
      const next = new Set(course.blockedLessons)
      if (next.has(lessonId)) next.delete(lessonId)
      else next.add(lessonId)
      return { ...prev, [courseId]: { ...course, blockedLessons: next } }
    })
  }, [])

  /* Toggle course outline expanded state */
  const toggleExpand = useCallback((courseId: string) => {
    setBlockState(prev => {
      const course = prev[courseId]
      if (!course) return prev
      return { ...prev, [courseId]: { ...course, expanded: !course.expanded } }
    })
  }, [])

  /* Final submission */
  const onFinalSubmit = async () => {
    if (!accountValues) return
    const courses = Object.entries(blockState)
      .map(([courseId, v]) => ({
        courseId,
        blockedLessons: Array.from(v.blockedLessons),
      }))

    await mutateAsync({
      name:     accountValues.name,
      email:    accountValues.email,
      password: accountValues.password,
      role:     'student',
      courses,
    })
    setSuccess(true)
    setTimeout(() => {
      setSuccess(false)
      reset()
      setStep(1)
      setBlockState({})
      setAccountValues(null)
      onClose()
    }, 1800)
  }

  const handleClose = () => {
    if (isPending) return
    reset()
    setStep(1)
    setBlockState({})
    setAccountValues(null)
    setSuccess(false)
    onClose()
  }

  const selectedCourseIds = Object.keys(blockState)

  return (
    <AnimatePresence>
      {open && (
          <motion.div key="add-student-backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={handleClose}>

          <motion.div key="add-student-modal"
            initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="overflow-hidden rounded-2xl bg-white shadow-2xl"
            style={{
              border: '1px solid #E4E7ED',
              width: '100%',
              maxWidth: step === 2 ? 580 : 448,
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
            }}
            onClick={e => e.stopPropagation()}>

            {/* ── Header ── */}
            <div className="flex items-center gap-3 px-6 py-4 flex-shrink-0" style={{ borderBottom: '1px solid #E4E7ED' }}>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl"
                style={{ background: 'rgba(47,107,255,0.10)' }}>
                <Users size={18} style={{ color: '#2F6BFF' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold" style={{ color: '#0D0F1A' }}>Add Student</p>
                <p className="text-xs" style={{ color: '#9CA3AF' }}>
                  {step === 1 ? 'Step 1 of 2 — Account info' : 'Step 2 of 2 — Course access'}
                </p>
              </div>
              {/* Step indicators */}
              <div className="flex items-center gap-1.5 mr-2">
                {[1, 2].map(s => (
                  <div key={s} className="h-1.5 w-6 rounded-full transition-colors"
                    style={{ background: s <= step ? '#2F6BFF' : '#E4E7ED' }} />
                ))}
              </div>
              <button onClick={handleClose}
                className="flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-gray-100"
                style={{ color: '#9CA3AF' }}>
                <X size={15} />
              </button>
            </div>

            {/* ── Success ── */}
            <AnimatePresence>
              {success && (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                  className="flex flex-col items-center gap-3 px-6 py-10">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full"
                    style={{ background: 'rgba(14,204,142,0.10)' }}>
                    <CheckCircle2 size={28} style={{ color: '#0ECC8E' }} />
                  </div>
                  <p className="text-sm font-semibold" style={{ color: '#0D0F1A' }}>Student created!</p>
                  <p className="text-xs text-center" style={{ color: '#9CA3AF' }}>
                    {selectedCourseIds.length > 0
                      ? `Enrolled in ${selectedCourseIds.length} course${selectedCourseIds.length > 1 ? 's' : ''}.`
                      : 'They can now log in and browse courses.'}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {!success && (
              <div className="flex-1 overflow-y-auto min-h-0">
                {/* ── Step 1: Account info ── */}
                <AnimatePresence mode="wait">
                  {step === 1 && (
                    <motion.form
                      key="step1"
                      initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      onSubmit={handleSubmit(onStep1Submit)}
                      className="px-6 py-5 space-y-4"
                    >
                      <Field label="Full name *" error={errors.name?.message}>
                        <div className="relative">
                          <User size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#D1D5DB' }} />
                          <input {...register('name')} placeholder="e.g. John Smith" className={inputCls(!!errors.name)} />
                        </div>
                      </Field>

                      <Field label="Email address *" error={errors.email?.message}>
                        <div className="relative">
                          <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#D1D5DB' }} />
                          <input {...register('email')} type="email" placeholder="john@example.com" className={inputCls(!!errors.email)} />
                        </div>
                      </Field>

                      <Field label="Password *" error={errors.password?.message}>
                        <div className="relative">
                          <Lock size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#D1D5DB' }} />
                          <input {...register('password')} type={showPw ? 'text' : 'password'}
                            placeholder="Min. 8 characters"
                            className={`${inputCls(!!errors.password)} pr-9`} />
                          <button type="button" onClick={() => setShowPw(v => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-70"
                            style={{ color: '#9CA3AF' }}>
                            {showPw ? <EyeOff size={13} /> : <Eye size={13} />}
                          </button>
                        </div>
                      </Field>

                      <div className="flex items-center justify-end gap-3 pt-1">
                        <button type="button" onClick={handleClose}
                          className="rounded-xl px-4 py-2.5 text-sm font-medium transition-colors hover:bg-gray-100"
                          style={{ color: '#4B5563' }}>
                          Cancel
                        </button>
                        <motion.button type="submit"
                          whileHover={{ y: -1, boxShadow: '0 6px 20px rgba(47,107,255,0.28)' }}
                          whileTap={{ scale: 0.98 }}
                          className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white"
                          style={{ background: 'linear-gradient(135deg, #2F6BFF, #5B8FFF)' }}>
                          Next <ArrowRight size={14} />
                        </motion.button>
                      </div>
                    </motion.form>
                  )}

                  {/* ── Step 2: Course selection ── */}
                  {step === 2 && (
                    <motion.div
                      key="step2"
                      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="px-6 py-5"
                    >
                      {/* Server error */}
                      <AnimatePresence>
                        {serverError && (
                          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                            className="mb-4 flex items-start gap-2.5 rounded-xl px-4 py-3 text-xs"
                            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#DC2626' }}>
                            <AlertCircle size={13} className="mt-0.5 flex-shrink-0" />{serverError}
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <p className="mb-3 text-xs" style={{ color: '#6B7280' }}>
                        Select which courses to enroll this student in. Click a course's curriculum to block specific lessons.
                      </p>

                      {coursesLoading ? (
                        <div className="flex items-center gap-2 py-6 justify-center text-xs" style={{ color: '#9CA3AF' }}>
                          <Loader2 size={14} className="animate-spin" />Loading courses…
                        </div>
                      ) : (coursesData?.docs.length ?? 0) === 0 ? (
                        <p className="py-6 text-center text-xs" style={{ color: '#9CA3AF' }}>
                          No published courses available.
                        </p>
                      ) : (
                        <div className="space-y-2 mb-4">
                          {coursesData?.docs.map(course => {
                            const state = blockState[course.id]
                            const isSelected = !!state
                            const blockedCount = state?.blockedLessons.size ?? 0

                            return (
                              <div key={course.id}
                                className="rounded-xl overflow-hidden transition-all"
                                style={{
                                  border: isSelected ? '1.5px solid #2F6BFF' : '1.5px solid #E4E7ED',
                                  background: isSelected ? 'rgba(47,107,255,0.03)' : '#FAFAFA',
                                }}>
                                {/* Course row */}
                                <div className="flex items-center gap-3 px-3 py-2.5">
                                  {/* Checkbox */}
                                  <button
                                    type="button"
                                    onClick={() => toggleCourse(course.id)}
                                    className="flex-shrink-0 flex h-5 w-5 items-center justify-center rounded transition-all"
                                    style={{
                                      background: isSelected ? '#2F6BFF' : '#fff',
                                      border: isSelected ? '1.5px solid #2F6BFF' : '1.5px solid #D1D5DB',
                                    }}
                                  >
                                    {isSelected && <Check size={11} color="#fff" strokeWidth={3} />}
                                  </button>

                                  {/* Thumbnail */}
                                  <div className="h-8 w-12 flex-shrink-0 overflow-hidden rounded-lg"
                                    style={{ background: '#E4E7ED' }}>
                                    {course.thumbnailUrl && (
                                      <img src={course.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                                    )}
                                  </div>

                                  {/* Info */}
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-xs font-semibold" style={{ color: '#0D0F1A' }}>
                                      {course.title}
                                    </p>
                                    {blockedCount > 0 && (
                                      <p className="text-[10px]" style={{ color: '#EF4444' }}>
                                        {blockedCount} lesson{blockedCount > 1 ? 's' : ''} blocked
                                      </p>
                                    )}
                                  </div>

                                  {/* Expand toggle — only when selected */}
                                  {isSelected && (
                                    <button
                                      type="button"
                                      onClick={() => toggleExpand(course.id)}
                                      className="flex-shrink-0 flex h-6 w-6 items-center justify-center rounded-lg transition-colors hover:bg-gray-100"
                                      style={{ color: '#9CA3AF' }}
                                      title="Toggle curriculum"
                                    >
                                      {state.expanded
                                        ? <ChevronUp size={13} />
                                        : <ChevronDown size={13} />}
                                    </button>
                                  )}
                                </div>

                                {/* Curriculum panel */}
                                <AnimatePresence>
                                  {isSelected && state.expanded && (
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: 'auto', opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      transition={{ duration: 0.2 }}
                                      style={{ overflow: 'hidden', borderTop: '1px solid #E4E7ED' }}
                                    >
                                      <CourseOutlinePanel
                                        courseId={course.id}
                                        blockedLessons={state.blockedLessons}
                                        onToggleLesson={(lessonId) => toggleLesson(course.id, lessonId)}
                                      />
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            )
                          })}
                        </div>
                      )}

                      {/* Footer */}
                      <div className="flex items-center justify-between gap-3 pt-1 sticky bottom-0 bg-white pb-1">
                        <button type="button" onClick={() => setStep(1)}
                          className="flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors hover:bg-gray-100"
                          style={{ color: '#4B5563' }}>
                          <ArrowLeft size={14} /> Back
                        </button>
                        <div className="flex items-center gap-3">
                          <span className="text-xs" style={{ color: '#9CA3AF' }}>
                            {selectedCourseIds.length === 0
                              ? 'No courses selected'
                              : `${selectedCourseIds.length} course${selectedCourseIds.length > 1 ? 's' : ''} selected`}
                          </span>
                          <motion.button
                            type="button"
                            onClick={onFinalSubmit}
                            disabled={isPending}
                            whileHover={{ y: -1, boxShadow: '0 6px 20px rgba(47,107,255,0.28)' }}
                            whileTap={{ scale: 0.98 }}
                            className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-all disabled:opacity-60"
                            style={{ background: 'linear-gradient(135deg, #2F6BFF, #5B8FFF)' }}>
                            {isPending
                              ? <><Loader2 size={14} className="animate-spin" />Creating…</>
                              : <>Create Student</>}
                          </motion.button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
          </motion.div>
      )}
    </AnimatePresence>
  )
}
