'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Users, GraduationCap, BookOpen, Loader2,
  AlertCircle, CheckCircle2, Search, Check,
} from 'lucide-react'
import { useCreateBatch, useUpdateBatch, type Batch } from '@/lib/api/batches'
import { useUsers } from '@/lib/api/users'
import { useCourses } from '@/lib/api/courses'

/* ── Zod schema ─────────────────────────────────────── */
const schema = z.object({
  name:        z.string().min(2, 'Name must be at least 2 chars').max(120),
  description: z.string().max(2000).optional(),
  mentorId:    z.string().min(1, 'Select a mentor'),
  courseId:    z.string().optional(),
  maxStudents: z.coerce.number().int().min(1).max(500).optional(),
  status:      z.enum(['active', 'archived']).optional(),
})
type Values = z.infer<typeof schema>

/* ── Helpers ─────────────────────────────────────────── */
const inputCls = (err?: boolean) =>
  `w-full rounded-xl px-3 py-2.5 text-sm outline-none transition-all placeholder:text-gray-300 ${
    err
      ? 'border border-red-300 bg-red-50 text-gray-800'
      : 'border border-[#E4E7ED] bg-[#F8F9FB] text-gray-800 focus:border-[#FF6B1A] focus:bg-white focus:ring-2 focus:ring-orange-100'
  }`

function Label({ text, error }: { text: string; error?: string }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold" style={{ color: '#4B5563' }}>{text}</label>
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

/* ── Searchable user picker ──────────────────────────── */
function UserPicker({
  role,
  value,
  onChange,
  placeholder,
  multi,
  selectedIds,
  onToggle,
}: {
  role:         'instructor' | 'student'
  value?:       string
  onChange?:    (id: string) => void
  placeholder:  string
  multi?:       boolean
  selectedIds?: string[]
  onToggle?:    (id: string) => void
}) {
  const [search, setSearch] = useState('')
  const { data } = useUsers(role, { per_page: 50, search: search || undefined })
  const users = data?.docs ?? []

  if (multi) {
    return (
      <div>
        <div className="relative mb-2">
          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#D1D5DB' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={placeholder}
            className="w-full rounded-xl border border-[#E4E7ED] bg-[#F8F9FB] py-2 pl-8 pr-3 text-xs outline-none focus:border-[#FF6B1A] focus:ring-2 focus:ring-orange-100"
          />
        </div>
        <div className="max-h-40 overflow-y-auto rounded-xl border border-[#E4E7ED] bg-white">
          {users.length === 0 && (
            <p className="py-4 text-center text-xs" style={{ color: '#9CA3AF' }}>No {role}s found</p>
          )}
          {users.map(u => {
            const sel = selectedIds?.includes(u.id)
            return (
              <button key={u.id} type="button" onClick={() => onToggle?.(u.id)}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs transition-colors hover:bg-gray-50">
                <div className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded"
                  style={{ background: sel ? '#FF6B1A' : '#fff', border: sel ? '1.5px solid #FF6B1A' : '1.5px solid #D1D5DB' }}>
                  {sel && <Check size={9} color="#fff" strokeWidth={3} />}
                </div>
                <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                  style={{ background: 'linear-gradient(135deg,#6366F1,#818CF8)' }}>
                  {u.name.charAt(0).toUpperCase()}
                </div>
                <span className="min-w-0 flex-1 truncate font-medium" style={{ color: '#0D0F1A' }}>{u.name}</span>
                <span className="truncate text-[10px]" style={{ color: '#9CA3AF' }}>{u.email}</span>
              </button>
            )
          })}
        </div>
        {(selectedIds?.length ?? 0) > 0 && (
          <p className="mt-1.5 text-[10px]" style={{ color: '#6B7280' }}>
            {selectedIds!.length} student{selectedIds!.length > 1 ? 's' : ''} selected
          </p>
        )}
      </div>
    )
  }

  return (
    <div>
      <div className="relative mb-2">
        <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#D1D5DB' }} />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-xl border border-[#E4E7ED] bg-[#F8F9FB] py-2 pl-8 pr-3 text-xs outline-none focus:border-[#FF6B1A] focus:ring-2 focus:ring-orange-100"
        />
      </div>
      <div className="max-h-36 overflow-y-auto rounded-xl border border-[#E4E7ED] bg-white">
        {users.map(u => (
          <button key={u.id} type="button" onClick={() => { onChange?.(u.id); setSearch(u.name) }}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs transition-colors hover:bg-gray-50"
            style={{ background: value === u.id ? 'rgba(255,107,26,0.06)' : undefined }}>
            <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
              style={{ background: 'linear-gradient(135deg,#FF6B1A,#FF8C42)' }}>
              {u.name.charAt(0).toUpperCase()}
            </div>
            <span className="min-w-0 flex-1 truncate font-medium" style={{ color: '#0D0F1A' }}>{u.name}</span>
            <span className="truncate text-[10px]" style={{ color: '#9CA3AF' }}>{u.email}</span>
            {value === u.id && <Check size={11} style={{ color: '#FF6B1A' }} />}
          </button>
        ))}
      </div>
    </div>
  )
}

/* ── Main modal ──────────────────────────────────────── */
interface Props {
  open:     boolean
  onClose:  () => void
  editing?: Batch | null
}

export function BatchModal({ open, onClose, editing }: Props) {
  const [success, setSuccess]         = useState(false)
  const [selectedStudents, setStudents] = useState<string[]>([])
  const [mentorId, setMentorId]       = useState('')

  const create = useCreateBatch()
  const update = useUpdateBatch()
  const isPending = create.isPending || update.isPending
  const apiError  = create.error || update.error

  const { data: coursesData } = useCourses({ per_page: 100, status: 'published' })

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { maxStudents: 30, status: 'active' },
  })

  /* Populate form when editing */
  useEffect(() => {
    if (editing) {
      setValue('name',        editing.name)
      setValue('description', editing.description)
      setValue('maxStudents', editing.maxStudents)
      setValue('status',      editing.status)
      const mid = typeof editing.mentorId === 'object' ? editing.mentorId.id : editing.mentorId
      setMentorId(mid)
      setValue('mentorId', mid)
      const cid = editing.courseId
        ? (typeof editing.courseId === 'object' ? (editing.courseId as any).id : editing.courseId)
        : ''
      setValue('courseId', cid)
      const sids = Array.isArray(editing.studentIds)
        ? editing.studentIds.map((s: any) => typeof s === 'object' ? s.id : s)
        : []
      setStudents(sids)
    } else {
      reset()
      setMentorId('')
      setStudents([])
    }
  }, [editing, open])

  const serverError = (() => {
    if (!apiError) return null
    const e = apiError as any
    return e.response?.data?.error?.message ?? 'Something went wrong'
  })()

  const onSubmit = async (values: Values) => {
    const dto = { ...values, mentorId, studentIds: selectedStudents }
    if (editing) {
      await update.mutateAsync({ id: editing.id, data: dto })
    } else {
      await create.mutateAsync(dto as any)
    }
    setSuccess(true)
    setTimeout(() => { setSuccess(false); reset(); setMentorId(''); setStudents([]); onClose() }, 1500)
  }

  const handleClose = () => {
    if (isPending) return
    reset(); setMentorId(''); setStudents([]); setSuccess(false); onClose()
  }

  const toggleStudent = (id: string) =>
    setStudents(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id])

  return (
    <AnimatePresence>
      {open && (
        <motion.div key="batch-backdrop"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={handleClose}>

          <motion.div key="batch-modal"
            initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"
            style={{ border: '1px solid #E4E7ED', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
            onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="flex items-center gap-3 px-6 py-4 flex-shrink-0" style={{ borderBottom: '1px solid #E4E7ED' }}>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl"
                style={{ background: 'rgba(255,107,26,0.10)' }}>
                <Users size={18} style={{ color: '#FF6B1A' }} />
              </div>
              <div>
                <p className="text-sm font-bold" style={{ color: '#0D0F1A' }}>
                  {editing ? 'Edit Batch' : 'Create Batch'}
                </p>
                <p className="text-xs" style={{ color: '#9CA3AF' }}>
                  {editing ? 'Update batch details' : 'Set up a new cohort with a mentor'}
                </p>
              </div>
              <button onClick={handleClose}
                className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-gray-100"
                style={{ color: '#9CA3AF' }}>
                <X size={15} />
              </button>
            </div>

            {/* Success */}
            <AnimatePresence>
              {success && (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center gap-3 px-6 py-10">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full"
                    style={{ background: 'rgba(14,204,142,0.10)' }}>
                    <CheckCircle2 size={28} style={{ color: '#0ECC8E' }} />
                  </div>
                  <p className="text-sm font-semibold" style={{ color: '#0D0F1A' }}>
                    Batch {editing ? 'updated' : 'created'}!
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {!success && (
              <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                {serverError && (
                  <div className="flex items-start gap-2.5 rounded-xl px-4 py-3 text-xs"
                    style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#DC2626' }}>
                    <AlertCircle size={13} className="mt-0.5 flex-shrink-0" />{serverError}
                  </div>
                )}

                {/* Name */}
                <div>
                  <Label text="Batch name *" error={errors.name?.message} />
                  <input {...register('name')} placeholder="e.g. Batch A — Morning Group"
                    className={inputCls(!!errors.name)} />
                </div>

                {/* Description */}
                <div>
                  <Label text="Description" />
                  <textarea {...register('description')} rows={2}
                    placeholder="Optional notes about this batch…"
                    className={`${inputCls()} resize-none`} />
                </div>

                {/* Mentor */}
                <div>
                  <Label text="Mentor *" error={errors.mentorId?.message} />
                  <UserPicker
                    role="instructor"
                    value={mentorId}
                    onChange={id => { setMentorId(id); setValue('mentorId', id, { shouldValidate: true }) }}
                    placeholder="Search mentors…"
                  />
                </div>

                {/* Course (optional) */}
                <div>
                  <Label text="Link to course (optional)" />
                  <div className="relative">
                    <BookOpen size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#D1D5DB' }} />
                    <select {...register('courseId')}
                      className="w-full appearance-none rounded-xl border border-[#E4E7ED] bg-[#F8F9FB] py-2.5 pl-9 pr-4 text-sm text-gray-800 outline-none focus:border-[#FF6B1A] focus:ring-2 focus:ring-orange-100">
                      <option value="">— No course linked —</option>
                      {coursesData?.docs.map(c => (
                        <option key={c.id} value={c.id}>{c.title}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Capacity & Status */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label text="Max students" />
                    <input {...register('maxStudents')} type="number" min={1} max={500}
                      className={inputCls()} />
                  </div>
                  <div>
                    <Label text="Status" />
                    <select {...register('status')}
                      className="w-full appearance-none rounded-xl border border-[#E4E7ED] bg-[#F8F9FB] py-2.5 px-3 text-sm text-gray-800 outline-none focus:border-[#FF6B1A] focus:ring-2 focus:ring-orange-100">
                      <option value="active">Active</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>
                </div>

                {/* Students */}
                <div>
                  <Label text="Add students (optional)" />
                  <UserPicker
                    role="student"
                    multi
                    selectedIds={selectedStudents}
                    onToggle={toggleStudent}
                    placeholder="Search students to add…"
                  />
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 pt-1 sticky bottom-0 bg-white pb-1">
                  <button type="button" onClick={handleClose} disabled={isPending}
                    className="rounded-xl px-4 py-2.5 text-sm font-medium transition-colors hover:bg-gray-100 disabled:opacity-50"
                    style={{ color: '#4B5563' }}>
                    Cancel
                  </button>
                  <motion.button type="submit" disabled={isPending}
                    whileHover={{ y: -1, boxShadow: '0 6px 20px rgba(255,107,26,0.28)' }}
                    whileTap={{ scale: 0.98 }}
                    className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                    style={{ background: 'linear-gradient(135deg,#FF6B1A,#FF8C42)' }}>
                    {isPending
                      ? <><Loader2 size={14} className="animate-spin" />{editing ? 'Saving…' : 'Creating…'}</>
                      : <>{editing ? 'Save changes' : 'Create Batch'}</>}
                  </motion.button>
                </div>
              </form>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
