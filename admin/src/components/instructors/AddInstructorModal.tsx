'use client'

import { useState, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, User, Mail, Lock, Eye, EyeOff, FileText,
  Loader2, AlertCircle, CheckCircle2, GraduationCap, Camera,
} from 'lucide-react'
import { useCreateInstructor } from '@/lib/api/instructors'
import { api } from '@/lib/axios'

/* ── Validation schema ──────────────────────────────── */
const schema = z.object({
  name:     z.string().min(2, 'Name must be at least 2 characters').max(100),
  email:    z.string().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  headline: z.string().max(255).optional(),
  bio:      z.string().max(2000).optional(),
  role:     z.enum(['instructor', 'admin']).default('instructor'),
  category: z.enum(['4x-trading', 'digital-marketing', 'ai', '']).optional(),
})
type Values = z.infer<typeof schema>

/* ── Input field helper ─────────────────────────────── */
function Field({
  label, error, children,
}: { label: string; error?: string; children: React.ReactNode }) {
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
      : 'border border-[#E4E7ED] bg-[#F8F9FB] text-gray-800 focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-blue-100'
  }`

/* ── Modal component ────────────────────────────────── */
interface AddInstructorModalProps {
  open:     boolean
  onClose:  () => void
}

export function AddInstructorModal({ open, onClose }: AddInstructorModalProps) {
  const [showPw, setShowPw]         = useState(false)
  const [success, setSuccess]       = useState(false)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarError, setAvatarError]     = useState<string | null>(null)
  const [uploading, setUploading]   = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const { mutateAsync, isPending, error: apiError } = useCreateInstructor()

  const { register, handleSubmit, reset, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { role: 'instructor' },
  })

  /* Extract server error message */
  const serverError = (() => {
    if (!apiError) return null
    const e = apiError as { response?: { data?: { error?: { message?: string } } } }
    return e.response?.data?.error?.message ?? 'Failed to create instructor. Please try again.'
  })()

  const onSubmit = async (values: Values) => {
    if (!avatarFile) {
      setAvatarError('Profile photo is required')
      return
    }
    setAvatarError(null)

    setUploading(true)
    let avatarUrl = ''
    try {
      const fd = new FormData()
      fd.append('file', avatarFile)
      const r = await api.post<{ success: true; data: { url: string } }>('/uploads/document', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      avatarUrl = r.data.data.url
    } finally {
      setUploading(false)
    }

    await mutateAsync({
      name:      values.name,
      email:     values.email,
      password:  values.password,
      role:      values.role,
      headline:  values.headline || undefined,
      bio:       values.bio      || undefined,
      category:  (values.category || undefined) as '4x-trading' | 'digital-marketing' | 'ai' | undefined,
      avatarUrl,
    })
    setSuccess(true)
    setTimeout(() => {
      setSuccess(false)
      reset()
      setAvatarFile(null)
      setAvatarPreview(null)
      onClose()
    }, 1800)
  }

  const handleClose = () => {
    if (isPending || uploading) return
    reset()
    setSuccess(false)
    setAvatarFile(null)
    setAvatarPreview(null)
    setAvatarError(null)
    onClose()
  }

  const isSubmitting = isPending || uploading

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="add-instructor-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={handleClose}
        >
          {/* Panel */}
          <motion.div
            key="add-instructor-modal"
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"
            style={{ border: '1px solid #E4E7ED' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-6 py-4" style={{ borderBottom: '1px solid #E4E7ED' }}>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl"
                style={{ background: 'rgba(0,87,184,0.10)' }}>
                <GraduationCap size={18} style={{ color: '#0057b8' }} />
              </div>
              <div>
                <p className="text-sm font-bold" style={{ color: '#0D0F1A' }}>Add Instructor</p>
                <p className="text-xs" style={{ color: '#9CA3AF' }}>Create a new instructor account</p>
              </div>
              <button onClick={handleClose}
                className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-gray-100"
                style={{ color: '#9CA3AF' }}>
                <X size={15} />
              </button>
            </div>

            {/* Success state */}
            <AnimatePresence>
              {success && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center gap-3 px-6 py-10"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-full"
                    style={{ background: 'rgba(14,204,142,0.10)' }}>
                    <CheckCircle2 size={28} style={{ color: '#0ECC8E' }} />
                  </div>
                  <p className="text-sm font-semibold" style={{ color: '#0D0F1A' }}>Instructor created!</p>
                  <p className="text-xs text-center" style={{ color: '#9CA3AF' }}>
                    The new instructor can now log in to the admin portal.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Form */}
            {!success && (
              <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-4">
                {/* Server error */}
                <AnimatePresence>
                  {serverError && (
                    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="flex items-start gap-2.5 rounded-xl px-4 py-3 text-xs"
                      style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#DC2626' }}>
                      <AlertCircle size={13} className="mt-0.5 flex-shrink-0" />{serverError}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* ── Profile photo (required) ── */}
                <div className="flex flex-col items-center gap-2 pb-1">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => {
                      const f = e.target.files?.[0]
                      if (!f) return
                      setAvatarFile(f)
                      setAvatarPreview(URL.createObjectURL(f))
                      setAvatarError(null)
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="group relative h-20 w-20 overflow-hidden rounded-full transition-all"
                    style={{
                      border: avatarError
                        ? '2px dashed #EF4444'
                        : avatarPreview ? '2px solid #0057b8' : '2px dashed #D1D5DB',
                      background: avatarPreview ? 'transparent' : '#F9FAFB',
                    }}
                  >
                    {avatarPreview
                      ? <img src={avatarPreview} alt="Preview" className="h-full w-full object-cover" />
                      : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Camera size={22} style={{ color: avatarError ? '#EF4444' : '#D1D5DB' }}
                            className="transition-colors group-hover:text-blue-400" />
                        </div>
                      )
                    }
                    <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/30 opacity-0 transition-opacity group-hover:opacity-100">
                      <Camera size={16} className="text-white" />
                    </div>
                  </button>
                  <p className="text-[11px] text-gray-500">
                    Profile photo <span className="text-red-500">*</span>
                  </p>
                  <AnimatePresence>
                    {avatarError && (
                      <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="flex items-center gap-1 text-xs text-red-500">
                        <AlertCircle size={10} />{avatarError}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>

                {/* Row: Name + Role */}
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Full name *" error={errors.name?.message}>
                    <div className="relative">
                      <User size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#D1D5DB' }} />
                      <input {...register('name')} placeholder="Jane Doe"
                        className={inputCls(!!errors.name)} />
                    </div>
                  </Field>

                  <Field label="Role *" error={errors.role?.message}>
                    <select {...register('role')}
                      className="w-full rounded-xl border border-[#E4E7ED] bg-[#F8F9FB] py-2.5 pl-3 pr-4 text-sm text-gray-800 outline-none focus:border-orange-400 focus:ring-2 focus:ring-blue-100">
                      <option value="instructor">Instructor</option>
                      <option value="admin">Admin</option>
                    </select>
                  </Field>
                </div>

                {/* Program Category */}
                <Field label="Program Category" error={errors.category?.message}>
                  <select {...register('category')}
                    className="w-full rounded-xl border border-[#E4E7ED] bg-[#F8F9FB] py-2.5 pl-3 pr-4 text-sm text-gray-800 outline-none focus:border-orange-400 focus:ring-2 focus:ring-blue-100">
                    <option value="">Select category…</option>
                    <option value="4x-trading">FOREX Trading</option>
                    <option value="digital-marketing">Digital Marketing</option>
                    <option value="ai">AI</option>
                  </select>
                </Field>

                {/* Email */}
                <Field label="Email address *" error={errors.email?.message}>
                  <div className="relative">
                    <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#D1D5DB' }} />
                    <input {...register('email')} type="email" placeholder="jane@example.com"
                      className={inputCls(!!errors.email)} />
                  </div>
                </Field>

                {/* Password */}
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

                {/* Headline */}
                <Field label="Headline" error={errors.headline?.message}>
                  <div className="relative">
                    <FileText size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#D1D5DB' }} />
                    <input {...register('headline')} placeholder="e.g. Senior React Developer & Educator"
                      className={inputCls(!!errors.headline)} />
                  </div>
                </Field>

                {/* Bio */}
                <Field label="Bio" error={errors.bio?.message}>
                  <textarea {...register('bio')} rows={3} placeholder="Short instructor bio…"
                    className="w-full resize-none rounded-xl border border-[#E4E7ED] bg-[#F8F9FB] px-4 py-2.5 text-sm text-gray-800 outline-none placeholder:text-gray-300 focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-blue-100" />
                </Field>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-1">
                  <button type="button" onClick={handleClose} disabled={isSubmitting}
                    className="rounded-xl px-4 py-2.5 text-sm font-medium transition-colors hover:bg-gray-100 disabled:opacity-50"
                    style={{ color: '#4B5563' }}>
                    Cancel
                  </button>
                  <motion.button
                    type="submit" disabled={isSubmitting}
                    whileHover={{ y: -1, boxShadow: '0 6px 20px rgba(0,87,184,0.32)' }}
                    whileTap={{ scale: 0.98 }}
                    className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-all disabled:opacity-60"
                    style={{ background: 'linear-gradient(135deg, #0057b8, #003d80)' }}>
                    {isSubmitting
                      ? <><Loader2 size={14} className="animate-spin" />{uploading ? 'Uploading…' : 'Creating…'}</>
                      : <>Create Instructor</>}
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
