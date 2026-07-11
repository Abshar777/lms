'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronDown, Check, Eye, EyeOff } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import Spinner from '@/components/ui/Spinner'
import { api } from '@/lib/axios'
import { useToast } from '@/store/ui.store'
import type { CurrentAdmin } from '@/lib/api/user'
import type { AdminUserRole } from '@/lib/api/users'

/* ── Custom dark select ──────────────────────────── */
function SelectField<T extends string>({
  label, value, options, onChange, locked,
}: {
  label:    string
  value:    T
  options:  { value: T; label: string }[]
  onChange: (v: T) => void
  locked?:  boolean
}) {
  const [open, setOpen] = useState(false)
  const current = options.find(o => o.value === value)

  if (locked) {
    return (
      <div>
        <label className="mb-1.5 block text-xs font-medium" style={{ color: 'rgba(255,255,255,0.45)' }}>{label}</label>
        <div className="rounded-xl px-3 py-2.5 text-sm"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.4)' }}>
          {current?.label ?? '—'}
        </div>
      </div>
    )
  }

  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium" style={{ color: 'rgba(255,255,255,0.45)' }}>{label}</label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm transition-all"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: `1px solid ${open ? 'rgba(0,87,184,0.5)' : 'rgba(255,255,255,0.09)'}`,
            boxShadow: open ? '0 0 0 3px rgba(0,87,184,0.08)' : 'none',
            color: 'white',
          }}
        >
          <span>{current?.label ?? '—'}</span>
          <ChevronDown size={13} style={{
            color: 'rgba(255,255,255,0.35)',
            transform: open ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.15s',
            flexShrink: 0,
          }} />
        </button>

        <AnimatePresence>
          {open && (
            <>
              <div className="fixed inset-0 z-[60]" onClick={() => setOpen(false)} />
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.97 }}
                transition={{ duration: 0.1 }}
                className="absolute left-0 bottom-full z-[61] mb-1 w-full overflow-hidden rounded-xl py-1"
                style={{
                  background: '#131525',
                  border: '1px solid rgba(255,255,255,0.12)',
                  boxShadow: '0 20px 50px rgba(0,0,0,0.7)',
                }}
              >
                {options.map(o => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => { onChange(o.value); setOpen(false) }}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors hover:bg-white/06"
                    style={{ color: o.value === value ? '#0057b8' : 'rgba(255,255,255,0.8)' }}
                  >
                    <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center">
                      {o.value === value && <Check size={12} />}
                    </span>
                    {o.label}
                  </button>
                ))}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

/* ── Data ────────────────────────────────────────── */
const ROLE_OPTIONS_BY_CREATOR: Record<string, { value: AdminUserRole; label: string }[]> = {
  super_admin: [
    { value: 'super_admin',             label: 'Super Admin' },
    { value: 'admin',                   label: 'Admin' },
    { value: '4x_admin',               label: 'FOREX Admin' },
    { value: 'digital_marketing_admin', label: 'DM Admin' },
    { value: 'ai_admin',               label: 'AI Admin' },
    { value: 'instructor',              label: 'Instructor' },
  ],
  admin: [
    { value: 'admin',                   label: 'Admin' },
    { value: '4x_admin',               label: 'FOREX Admin' },
    { value: 'digital_marketing_admin', label: 'DM Admin' },
    { value: 'ai_admin',               label: 'AI Admin' },
    { value: 'instructor',              label: 'Instructor' },
  ],
  '4x_admin':              [{ value: 'instructor', label: 'Instructor' }],
  digital_marketing_admin: [{ value: 'instructor', label: 'Instructor' }],
  ai_admin:                [{ value: 'instructor', label: 'Instructor' }],
}

const LOCKED_CATEGORY: Record<string, '4x-trading' | 'digital-marketing' | 'ai'> = {
  '4x_admin':              '4x-trading',
  digital_marketing_admin: 'digital-marketing',
  ai_admin:                'ai',
}

const CATEGORY_OPTIONS = [
  { value: '' as const,                   label: 'No category' },
  { value: '4x-trading' as const,         label: 'FOREX Trading' },
  { value: 'digital-marketing' as const,  label: 'Digital Marketing' },
  { value: 'ai' as const,                 label: 'AI' },
]

function needsCategory(role: AdminUserRole) {
  return role === '4x_admin' || role === 'digital_marketing_admin' || role === 'ai_admin' || role === 'instructor'
}

/* ── Modal ───────────────────────────────────────── */
interface Props {
  me:      CurrentAdmin
  open:    boolean
  onClose: () => void
}

export function AddUserModal({ me, open, onClose }: Props) {
  const roleOptions    = ROLE_OPTIONS_BY_CREATOR[me.role] ?? []
  const lockedCategory = LOCKED_CATEGORY[me.role]
  const defaultRole    = roleOptions[0]?.value ?? 'instructor'

  const [name,        setName]        = useState('')
  const [email,       setEmail]       = useState('')
  const [password,    setPassword]    = useState('')
  const [showPass,    setShowPass]    = useState(false)
  const [role,        setRole]        = useState<AdminUserRole>(defaultRole)
  const [category,    setCategory]    = useState<'4x-trading' | 'digital-marketing' | 'ai' | ''>('')
  const [loading,     setLoading]     = useState(false)

  const qc    = useQueryClient()
  const toast = useToast()

  useEffect(() => {
    if (open) {
      setName(''); setEmail(''); setPassword(''); setShowPass(false)
      setRole(defaultRole); setCategory('')
    }
  }, [open, defaultRole])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const body: Record<string, unknown> = { name: name.trim(), email: email.trim(), password, role }
      if (lockedCategory) {
        body.category = lockedCategory
      } else if (needsCategory(role) && category) {
        body.category = category
      }
      await api.post('/admin/users', body)
      qc.invalidateQueries({ queryKey: ['admin', 'users'] })
      qc.invalidateQueries({ queryKey: ['admin', 'stats'] })
      toast.success(`${name} created successfully`)
      onClose()
    } catch (err: any) {
      toast.error('Creation failed', err?.response?.data?.error?.message)
    } finally {
      setLoading(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.09)',
    outline: 'none',
  }

  const focusStyle = {
    onFocus: (e: React.FocusEvent<HTMLInputElement>) => {
      e.currentTarget.style.border = '1px solid rgba(0,87,184,0.5)'
      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,87,184,0.08)'
    },
    onBlur: (e: React.FocusEvent<HTMLInputElement>) => {
      e.currentTarget.style.border = '1px solid rgba(255,255,255,0.09)'
      e.currentTarget.style.boxShadow = 'none'
    },
  }

  /* locked category display value */
  const lockedCategoryOption = lockedCategory
    ? CATEGORY_OPTIONS.find(o => o.value === lockedCategory)
    : undefined

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="absolute inset-0"
        style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="relative w-full max-w-md rounded-2xl"
        style={{
          background: 'linear-gradient(145deg, #0e1022 0%, #0a0c18 100%)',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 40px 80px rgba(0,0,0,0.8)',
          zIndex: 1,
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#0057b8' }}>Add User</p>
            <h2 className="mt-0.5 text-base font-bold text-white">New Staff Account</h2>
          </div>
          <button onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl transition-colors hover:bg-white/08"
            style={{ color: 'rgba(255,255,255,0.4)' }}>
            <X size={15} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5">
          <div className="space-y-3">
            {/* Name */}
            <div>
              <label className="mb-1.5 block text-xs font-medium" style={{ color: 'rgba(255,255,255,0.45)' }}>Full name</label>
              <input
                value={name} onChange={e => setName(e.target.value)}
                required placeholder="e.g. John Smith"
                className="w-full rounded-xl px-3 py-2.5 text-sm text-white transition-all placeholder:text-white/20"
                style={inputStyle} {...focusStyle}
              />
            </div>

            {/* Email */}
            <div>
              <label className="mb-1.5 block text-xs font-medium" style={{ color: 'rgba(255,255,255,0.45)' }}>Email address</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                required placeholder="user@example.com"
                className="w-full rounded-xl px-3 py-2.5 text-sm text-white transition-all placeholder:text-white/20"
                style={inputStyle} {...focusStyle}
              />
            </div>

            {/* Password */}
            <div>
              <label className="mb-1.5 block text-xs font-medium" style={{ color: 'rgba(255,255,255,0.45)' }}>Password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password} onChange={e => setPassword(e.target.value)}
                  required placeholder="Min 8 characters"
                  className="w-full rounded-xl py-2.5 pl-3 pr-10 text-sm text-white transition-all placeholder:text-white/20"
                  style={inputStyle} {...focusStyle}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: 'rgba(255,255,255,0.3)' }}>
                  {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {/* Role */}
            <SelectField
              label="Role"
              value={role}
              options={roleOptions}
              onChange={v => { setRole(v); setCategory('') }}
              locked={roleOptions.length <= 1}
            />

            {/* Category */}
            {needsCategory(role) && (
              lockedCategoryOption ? (
                <SelectField
                  label="Category"
                  value={lockedCategory!}
                  options={[lockedCategoryOption]}
                  onChange={() => {}}
                  locked
                />
              ) : (
                <SelectField
                  label="Category"
                  value={category}
                  options={CATEGORY_OPTIONS}
                  onChange={setCategory}
                />
              )
            )}
          </div>

          {/* Actions */}
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" onClick={onClose}
              className="rounded-xl px-4 py-2 text-sm font-medium transition-colors hover:bg-white/07"
              style={{ color: 'rgba(255,255,255,0.5)' }}>
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex items-center gap-1.5 rounded-xl px-5 py-2 text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg,#0057b8,#003d80)', boxShadow: '0 4px 14px rgba(0,87,184,0.3)' }}>
              {loading && <Spinner size={13} />}
              Create User
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}
