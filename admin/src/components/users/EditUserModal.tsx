'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Loader2, ChevronDown, Check } from 'lucide-react'
import { useUpdateUser, type AdminUser, type AdminUserRole } from '@/lib/api/users'
import { useToast } from '@/store/ui.store'
import type { CurrentAdmin } from '@/lib/api/user'

/* ── Custom dark select ──────────────────────────── */
function SelectField<T extends string>({
  label, value, options, onChange, disabled,
}: {
  label:    string
  value:    T
  options:  { value: T; label: string }[]
  onChange: (v: T) => void
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const current = options.find(o => o.value === value)

  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium" style={{ color: 'rgba(255,255,255,0.45)' }}>
        {label}
      </label>
      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen(v => !v)}
          className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm transition-all"
          style={{
            background: disabled ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.06)',
            border: `1px solid ${open ? 'rgba(255,107,26,0.5)' : 'rgba(255,255,255,0.09)'}`,
            boxShadow: open ? '0 0 0 3px rgba(255,107,26,0.08)' : 'none',
            color: disabled ? 'rgba(255,255,255,0.3)' : 'white',
          }}
        >
          <span>{current?.label ?? '—'}</span>
          {!disabled && (
            <ChevronDown size={13} style={{
              color: 'rgba(255,255,255,0.35)',
              transform: open ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.15s',
              flexShrink: 0,
            }} />
          )}
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
                className="absolute left-0 top-full z-[61] mt-1 w-full overflow-hidden rounded-xl py-1"
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
                    style={{ color: o.value === value ? '#FF6B1A' : 'rgba(255,255,255,0.8)' }}
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

/* ── Toggle switch ───────────────────────────────── */
function Toggle({ label, checked, onChange, color }: {
  label:    string
  checked:  boolean
  onChange: (v: boolean) => void
  color:    string
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center gap-2.5 rounded-xl p-2 transition-colors hover:bg-white/04"
    >
      <div
        className="relative h-5 w-9 flex-shrink-0 rounded-full transition-colors duration-200"
        style={{ background: checked ? color : 'rgba(255,255,255,0.12)' }}
      >
        <span
          className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200"
          style={{ transform: checked ? 'translateX(16px)' : 'translateX(2px)' }}
        />
      </div>
      <span className="text-xs font-medium" style={{ color: checked ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.4)' }}>
        {label}
      </span>
    </button>
  )
}

/* ── Role option sets ────────────────────────────── */
const ROLE_OPTIONS_BY_EDITOR: Record<string, { value: AdminUserRole; label: string }[]> = {
  super_admin: [
    { value: 'super_admin',             label: 'Super Admin' },
    { value: 'admin',                   label: 'Admin' },
    { value: '4x_admin',               label: 'FOREX Admin' },
    { value: 'digital_marketing_admin', label: 'DM Admin' },
    { value: 'instructor',              label: 'Instructor' },
  ],
  admin: [
    { value: 'admin',                   label: 'Admin' },
    { value: '4x_admin',               label: 'FOREX Admin' },
    { value: 'digital_marketing_admin', label: 'DM Admin' },
    { value: 'instructor',              label: 'Instructor' },
  ],
}

const CATEGORY_OPTIONS = [
  { value: '' as const,                   label: 'No category' },
  { value: '4x-trading' as const,         label: 'FOREX Trading' },
  { value: 'digital-marketing' as const,  label: 'Digital Marketing' },
]

function needsCategory(role: AdminUserRole) {
  return role === '4x_admin' || role === 'digital_marketing_admin' || role === 'instructor'
}

/* ── Modal ───────────────────────────────────────── */
interface Props {
  user:      AdminUser
  me:        CurrentAdmin
  onClose:   () => void
  onSuccess: () => void
}

export function EditUserModal({ user, me, onClose, onSuccess }: Props) {
  const [name,       setName]       = useState(user.name)
  const [email,      setEmail]      = useState(user.email)
  const [role,       setRole]       = useState<AdminUserRole>(user.role)
  const [category,   setCategory]   = useState<'4x-trading' | 'digital-marketing' | ''>(user.category ?? '')
  const [isActive,   setIsActive]   = useState(user.isActive)
  const [isVerified, setIsVerified] = useState(user.isVerified)

  const updateUser = useUpdateUser()
  const toast      = useToast()

  const roleOptions = ROLE_OPTIONS_BY_EDITOR[me.role] ?? []
  const canEditRole = roleOptions.length > 0

  const activeRole = canEditRole ? role : user.role

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const dto: Parameters<typeof updateUser.mutateAsync>[0] = {
        id: user.id, name: name.trim(), email: email.trim(), isActive, isVerified,
      }
      if (canEditRole && role !== user.role) dto.role = role
      dto.category = needsCategory(activeRole)
        ? ((category || null) as '4x-trading' | 'digital-marketing' | null)
        : null
      await updateUser.mutateAsync(dto)
      toast.success('User updated')
      onSuccess()
    } catch (err: any) {
      toast.error('Update failed', err?.response?.data?.error?.message)
    }
  }

  const inputStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.09)',
    outline: 'none',
  }

  const focusStyle = {
    onFocus: (e: React.FocusEvent<HTMLInputElement>) => {
      e.currentTarget.style.border = '1px solid rgba(255,107,26,0.5)'
      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(255,107,26,0.08)'
    },
    onBlur: (e: React.FocusEvent<HTMLInputElement>) => {
      e.currentTarget.style.border = '1px solid rgba(255,255,255,0.09)'
      e.currentTarget.style.boxShadow = 'none'
    },
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="absolute inset-0"
          style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
          onClick={onClose}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="relative w-full max-w-md overflow-hidden rounded-2xl"
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
              <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#FF6B1A' }}>Edit User</p>
              <h2 className="mt-0.5 text-base font-bold text-white">{user.name}</h2>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{user.email}</p>
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
                <label className="mb-1.5 block text-xs font-medium" style={{ color: 'rgba(255,255,255,0.45)' }}>Name</label>
                <input
                  value={name} onChange={e => setName(e.target.value)} required
                  className="w-full rounded-xl px-3 py-2.5 text-sm text-white transition-all"
                  style={inputStyle} {...focusStyle}
                />
              </div>

              {/* Email */}
              <div>
                <label className="mb-1.5 block text-xs font-medium" style={{ color: 'rgba(255,255,255,0.45)' }}>Email</label>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)} required
                  className="w-full rounded-xl px-3 py-2.5 text-sm text-white transition-all"
                  style={inputStyle} {...focusStyle}
                />
              </div>

              {/* Role */}
              {canEditRole ? (
                <SelectField
                  label="Role"
                  value={role}
                  options={roleOptions}
                  onChange={v => { setRole(v); setCategory('') }}
                />
              ) : (
                <div>
                  <label className="mb-1.5 block text-xs font-medium" style={{ color: 'rgba(255,255,255,0.45)' }}>Role</label>
                  <div className="rounded-xl px-3 py-2.5 text-sm"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.4)' }}>
                    {ROLE_OPTIONS_BY_EDITOR['super_admin']?.find(o => o.value === user.role)?.label ?? user.role}
                  </div>
                </div>
              )}

              {/* Category */}
              {needsCategory(activeRole) && (
                <SelectField
                  label="Category"
                  value={category}
                  options={CATEGORY_OPTIONS}
                  onChange={setCategory}
                />
              )}

              {/* Toggles */}
              <div className="flex gap-2 rounded-xl p-0.5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <Toggle label="Active"   checked={isActive}   onChange={setIsActive}   color="#22c55e" />
                <div className="w-px self-stretch" style={{ background: 'rgba(255,255,255,0.07)' }} />
                <Toggle label="Verified" checked={isVerified} onChange={setIsVerified} color="#3b82f6" />
              </div>
            </div>

            {/* Actions */}
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={onClose}
                className="rounded-xl px-4 py-2 text-sm font-medium transition-colors hover:bg-white/07"
                style={{ color: 'rgba(255,255,255,0.5)' }}>
                Cancel
              </button>
              <button type="submit" disabled={updateUser.isPending}
                className="flex items-center gap-1.5 rounded-xl px-5 py-2 text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg,#FF6B1A,#FF8C42)', boxShadow: '0 4px 14px rgba(255,107,26,0.3)' }}>
                {updateUser.isPending && <Loader2 size={13} className="animate-spin" />}
                Save changes
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
