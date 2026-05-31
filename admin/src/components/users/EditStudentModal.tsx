'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Loader2, AlertCircle, User, Mail } from 'lucide-react'
import { useUpdateUser, type AdminUser } from '@/lib/api/users'
import { useToast } from '@/store/ui.store'

interface Props {
  user:      AdminUser
  onClose:   () => void
  onSuccess: () => void
}

export function EditStudentModal({ user, onClose, onSuccess }: Props) {
  const update = useUpdateUser()
  const toast  = useToast()

  const [name,  setName]  = useState(user.name)
  const [email, setEmail] = useState(user.email)
  const [error, setError] = useState<string | null>(null)

  const base   = 'w-full rounded-xl py-2.5 pl-9 pr-4 text-sm text-white outline-none transition-all placeholder:text-white/30'
  const iStyle = { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' } as React.CSSProperties

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const dto: { name?: string; email?: string } = {}
    if (name.trim()  !== user.name)  dto.name  = name.trim()
    if (email.trim() !== user.email) dto.email = email.trim().toLowerCase()
    if (Object.keys(dto).length === 0) { onClose(); return }
    try {
      await update.mutateAsync({ id: user.id, ...dto })
      toast.success('Profile updated')
      onSuccess()
    } catch (err: any) {
      setError(
        err?.response?.data?.error?.message
        ?? 'Failed to update profile.',
      )
    }
  }

  return (
    <AnimatePresence>
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
          className="w-full max-w-sm rounded-2xl p-6 shadow-2xl"
          style={{ background: '#161829', border: '1px solid rgba(255,255,255,0.10)' }}
        >
          {/* Header */}
          <div className="mb-5 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-white" style={{ fontFamily: 'Bricolage Grotesque, sans-serif' }}>
                Edit Student
              </h2>
              <p className="mt-0.5 truncate text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                {user.email}
              </p>
            </div>
            <button onClick={onClose}
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl transition-colors hover:bg-white/10"
              style={{ color: 'rgba(255,255,255,0.4)' }}>
              <X size={15} />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Name */}
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest"
                style={{ color: 'rgba(255,255,255,0.35)' }}>Full name</label>
              <div className="relative">
                <User size={13} className="absolute left-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'rgba(255,255,255,0.35)' }} />
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required minLength={2} maxLength={100}
                  placeholder="Full name"
                  className={base}
                  style={iStyle}
                  onFocus={e => { e.currentTarget.style.border = '1px solid rgba(255,107,26,0.5)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(255,107,26,0.10)' }}
                  onBlur={e => { e.currentTarget.style.border = '1px solid rgba(255,255,255,0.09)'; e.currentTarget.style.boxShadow = 'none' }}
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest"
                style={{ color: 'rgba(255,255,255,0.35)' }}>Email address</label>
              <div className="relative">
                <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'rgba(255,255,255,0.35)' }} />
                <input
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  type="email"
                  required
                  placeholder="email@example.com"
                  className={base}
                  style={iStyle}
                  onFocus={e => { e.currentTarget.style.border = '1px solid rgba(255,107,26,0.5)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(255,107,26,0.10)' }}
                  onBlur={e => { e.currentTarget.style.border = '1px solid rgba(255,255,255,0.09)'; e.currentTarget.style.boxShadow = 'none' }}
                />
              </div>
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
              <button type="submit" disabled={update.isPending}
                className="flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-bold text-white disabled:opacity-60 transition-all hover:brightness-110"
                style={{ background: 'linear-gradient(135deg,#FF6B1A,#FF8C42)' }}>
                {update.isPending
                  ? <><Loader2 size={14} className="animate-spin" />Saving…</>
                  : 'Save changes'}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
