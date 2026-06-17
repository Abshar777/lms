'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  User, Bell, Shield, CreditCard, Globe,
  Camera, Check, LogOut, LayoutDashboard,
  PanelLeft, AlignJustify, Monitor, Loader2, AlertCircle, Lock, Eye, EyeOff,
} from 'lucide-react'
import { useUIStore } from '@/store/ui.store'
import { useCurrentUser, useUpdateProfile, useChangePassword, logout as apiLogout } from '@/lib/api/user'
import { PrivacySecuritySection } from '@/components/auth/PrivacySecuritySection'
import { Button, MotionButton } from '@/components/ui/button'

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } }
const fadeUp  = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 280, damping: 26 } } }

const MENU = [
  { id: 'profile',       icon: User,            label: 'Profile'               },
  { id: 'layout',        icon: LayoutDashboard, label: 'Layout & Navigation'   },
  { id: 'notifications', icon: Bell,            label: 'Notifications'         },
  { id: 'privacy',       icon: Shield,          label: 'Privacy & Security'    },
  { id: 'billing',       icon: CreditCard,      label: 'Billing'               },
  { id: 'language',      icon: Globe,           label: 'Language & Region'     },
]

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <MotionButton onClick={onToggle} variant="ghost" size="icon"
      className="relative flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors !p-0 !min-w-0"
      style={{ background: on ? '#FF6B1A' : '#D1D5DB' }}>
      <motion.span animate={{ x: on ? 22 : 2 }}
        transition={{ type: 'spring', stiffness: 500, damping: 35 }}
        className="absolute h-4 w-4 rounded-full bg-white shadow-sm" />
    </MotionButton>
  )
}

/* ── Layout preview cards ──────────────────────── */
function LayoutCard({
  value, label, desc, selected, onSelect, preview,
}: {
  value: string; label: string; desc: string; selected: boolean; onSelect: () => void
  preview: React.ReactNode
}) {
  return (
    <MotionButton whileHover={{ y: -3 }} whileTap={{ scale: 0.98 }}
      onClick={onSelect} variant="ghost"
      className="relative flex flex-col overflow-hidden rounded-2xl text-left w-full transition-all h-auto !p-0"
      style={{
        border: selected ? '2px solid #FF6B1A' : '2px solid #E5E7EB',
        boxShadow: selected ? '0 0 0 3px rgba(255,107,26,0.12)' : '0 2px 6px rgba(0,0,0,0.04)',
      }}>
      <div className="h-36 w-full" style={{ background: '#F4F5F8' }}>{preview}</div>
      <div className="flex items-start justify-between p-4">
        <div>
          <p className="text-sm font-bold" style={{ color: '#111827' }}>{label}</p>
          <p className="mt-0.5 text-xs" style={{ color: '#9CA3AF' }}>{desc}</p>
        </div>
        <div className="mt-0.5 ml-2 flex-shrink-0 flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors"
          style={{ borderColor: selected ? '#FF6B1A' : '#D1D5DB', background: selected ? '#FF6B1A' : 'transparent' }}>
          {selected && <Check size={11} color="white" strokeWidth={3} />}
        </div>
      </div>
    </MotionButton>
  )
}

function SidebarPreview() {
  return (
    <div className="flex h-full w-full gap-2 p-3">
      <div className="flex w-14 flex-shrink-0 flex-col gap-1.5 rounded-xl p-2"
        style={{ background: 'white', border: '1px solid #E5E7EB' }}>
        <div className="h-4 w-4 rounded-lg" style={{ background: 'linear-gradient(135deg,#FF6B1A,#FF8C42)' }} />
        {[0,1,2].map(i => (
          <div key={i} className="h-2 rounded-full"
            style={{ background: i === 0 ? 'rgba(255,107,26,0.2)' : '#F3F4F6', width: i === 0 ? '100%' : '80%' }} />
        ))}
      </div>
      <div className="flex flex-1 flex-col gap-1.5">
        <div className="flex items-center justify-between rounded-xl px-2 py-1.5"
          style={{ background: 'white', border: '1px solid #E5E7EB' }}>
          <div className="h-2 w-16 rounded-full" style={{ background: '#F3F4F6' }} />
          <div className="h-4 w-4 rounded-full" style={{ background: 'linear-gradient(135deg,#FF6B1A,#FF8C42)' }} />
        </div>
        <div className="flex flex-1 flex-col gap-1">
          <div className="h-2 w-3/4 rounded-full" style={{ background: '#E5E7EB' }} />
          <div className="flex flex-1 gap-1 mt-0.5">
            {[0,1].map(i => <div key={i} className="flex-1 rounded-xl" style={{ background: 'white', border: '1px solid #E5E7EB' }} />)}
          </div>
        </div>
      </div>
    </div>
  )
}

function TopbarPreview() {
  return (
    <div className="flex h-full w-full flex-col gap-2 p-3">
      <div className="rounded-xl overflow-hidden" style={{ background: 'white', border: '1px solid #E5E7EB' }}>
        <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: '1px solid #F3F4F6' }}>
          <div className="flex items-center gap-1.5">
            <div className="h-4 w-4 rounded-lg" style={{ background: 'linear-gradient(135deg,#FF6B1A,#FF8C42)' }} />
            <div className="h-2 w-12 rounded-full" style={{ background: '#F3F4F6' }} />
          </div>
          <div className="flex gap-1">
            <div className="h-4 w-10 rounded-lg" style={{ background: 'linear-gradient(135deg,#FF6B1A,#FF8C42)' }} />
            <div className="h-4 w-4 rounded-full" style={{ background: '#F3F4F6' }} />
          </div>
        </div>
        <div className="flex items-end gap-1 px-3 py-1">
          {['My Learning','Catalog','Favorites'].map((t, i) => (
            <div key={t} className="relative px-2 py-1">
              <div className="h-1.5 rounded-full"
                style={{ background: i === 0 ? '#111827' : '#D1D5DB', width: i === 0 ? 40 : 28 }} />
              {i === 0 && <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full" style={{ background: '#FF6B1A' }} />}
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-1">
        <div className="h-2 w-3/4 rounded-full" style={{ background: '#E5E7EB' }} />
        <div className="flex gap-1.5 flex-1 mt-0.5">
          {[0,1,2].map(i => <div key={i} className="flex-1 rounded-xl" style={{ background: 'white', border: '1px solid #E5E7EB' }} />)}
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────── */
function SettingsContent() {
  const router        = useRouter()
  const searchParams  = useSearchParams()
  const { navLayout, setNavLayout } = useUIStore()

  /* active tab driven by URL ?tab=xxx, defaults to "profile" */
  const active = searchParams.get('tab') ?? 'profile'
  const setActive = (id: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', id)
    router.push(`/settings?${params.toString()}`, { scroll: false })
  }

  const [saved,   setSaved]   = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [notifs,  setNotifs]  = useState({ course: true, email: true, push: false, weekly: true })

  /* Password change state */
  const [pwForm,    setPwForm]    = useState({ current: '', next: '', confirm: '' })
  const [pwSaved,   setPwSaved]   = useState(false)
  const [pwError,   setPwError]   = useState<string | null>(null)
  const [showCur,   setShowCur]   = useState(false)
  const [showNew,   setShowNew]   = useState(false)
  const changePasswordMutation = useChangePassword()

  const handleChangePassword = async () => {
    setPwError(null)
    if (pwForm.next !== pwForm.confirm) { setPwError("New passwords don't match."); return }
    if (pwForm.next.length < 8) { setPwError('Password must be at least 8 characters.'); return }
    try {
      await changePasswordMutation.mutateAsync({ currentPassword: pwForm.current, newPassword: pwForm.next })
      setPwSaved(true)
      setPwForm({ current: '', next: '', confirm: '' })
      setTimeout(() => setPwSaved(false), 3000)
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message
      setPwError(msg ?? 'Unable to change password. Please try again.')
    }
  }

  /* Real user from the cookie session */
  const { data: user, isLoading: userLoading } = useCurrentUser()
  const updateMutation = useUpdateProfile()

  /* Form state. role here maps to `headline` on the user document. */
  const [profile, setProfile] = useState({ name: '', email: '', role: '', bio: '' })

  /* Hydrate form when /auth/me resolves (or refreshes). */
  useEffect(() => {
    if (user) {
      setProfile({
        name:  user.name  ?? '',
        email: user.email ?? '',
        role:  user.headline ?? '',
        bio:   user.bio   ?? '',
      })
    }
  }, [user])

  const handleSave = async () => {
    setError(null)
    try {
      await updateMutation.mutateAsync({
        name:     profile.name.trim(),
        headline: profile.role,
        bio:      profile.bio,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message
        ?? err?.response?.data?.error?.details?.[0]?.message
      setError(msg ?? 'Unable to save changes. Please try again.')
    }
  }

  const handleLogout = async () => {
    await apiLogout()
    // Clear cart so the next user starts with a clean state
    localStorage.removeItem('lms-cart')
    window.location.href = '/login'
  }

  return (
    <motion.div variants={stagger} initial="hidden" animate="show"
      className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_1fr]">

      {/* ── Sidebar menu ──────────────────────────── */}
      <motion.div variants={fadeUp}
        className="rounded-2xl bg-white p-3 lg:sticky lg:top-[116px] lg:self-start"
        style={{ border: '1px solid #E5E7EB' }}>
        <div className="space-y-0.5">
          {MENU.map(item => {
            const Icon  = item.icon
            const isAct = active === item.id
            return (
              <Button key={item.id} onClick={() => setActive(item.id)} variant="ghost"
                className="relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-left transition-colors justify-start h-auto"
                style={{ color: isAct ? '#111827' : '#6B7280' }}>
                {isAct && (
                  <motion.div layoutId="settings-active"
                    className="absolute inset-0 rounded-xl"
                    style={{ background: '#FFF7ED', border: '1px solid rgba(255,107,26,0.18)' }}
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }} />
                )}
                <Icon size={15} className="relative z-10 flex-shrink-0"
                  style={{ color: isAct ? '#FF6B1A' : '#9CA3AF' }} />
                <span className="relative z-10">{item.label}</span>
              </Button>
            )
          })}
        </div>
        <div className="mt-3 pt-3" style={{ borderTop: '1px solid #F3F4F6' }}>
          <Button
            onClick={handleLogout} variant="ghost"
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors hover:bg-red-50 justify-start h-auto"
            style={{ color: '#EF4444' }}>
            <LogOut size={15} />Logout
          </Button>
        </div>
      </motion.div>

      {/* ── Content panel ─────────────────────────── */}
      <motion.div variants={fadeUp} className="space-y-4 min-w-0">

        {/* ── Profile ── */}
        <AnimatePresence mode="wait">
          {active === 'profile' && (
            <motion.div key="profile"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="rounded-2xl bg-white p-6" style={{ border: '1px solid #E5E7EB' }}>
              <h2 className="mb-5 text-base font-bold" style={{ color: '#111827' }}>Profile Settings</h2>
              <div className="mb-6 flex items-center gap-4">
                <div className="relative">
                  <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full text-xl font-bold text-white"
                    style={{ background: 'linear-gradient(135deg,#FF6B1A,#FF8C42)' }}>
                    {user?.avatarUrl
                      ? <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
                      : (profile.name?.trim()?.[0]?.toUpperCase() ?? '?')}
                  </div>
                  <Button size="icon-sm" variant="outline"
                    className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-md !p-0"
                    style={{ border: '1px solid #E5E7EB', color: '#FF6B1A' }}
                    title="Photo upload coming soon">
                    <Camera size={12} />
                  </Button>
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: '#111827' }}>Profile Photo</p>
                  <p className="text-xs" style={{ color: '#9CA3AF' }}>PNG, JPG up to 5MB</p>
                </div>
              </div>
              {userLoading && (
                <div className="mb-4 flex items-center gap-2 text-xs" style={{ color: '#9CA3AF' }}>
                  <Loader2 size={12} className="animate-spin" />Loading your profile…
                </div>
              )}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {([
                  { label: 'Full Name', key: 'name',  type: 'text',  readOnly: false, placeholder: 'Your name' },
                  { label: 'Email',     key: 'email', type: 'email', readOnly: true,  placeholder: 'you@example.com' },
                  { label: 'Job Title', key: 'role',  type: 'text',  readOnly: false, placeholder: 'e.g. Frontend Developer' },
                ] as const).map(f => (
                  <div key={f.key}>
                    <label className="mb-1.5 block text-xs font-semibold" style={{ color: '#374151' }}>
                      {f.label}{f.readOnly && <span className="ml-1 font-normal" style={{ color: '#9CA3AF' }}>(read-only)</span>}
                    </label>
                    <input type={f.type}
                      value={profile[f.key]}
                      readOnly={f.readOnly}
                      placeholder={f.placeholder}
                      onChange={e => !f.readOnly && setProfile({ ...profile, [f.key]: e.target.value })}
                      className="w-full rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all"
                      style={{
                        background: f.readOnly ? '#F3F4F6' : '#F9FAFB',
                        border: '1px solid #E5E7EB',
                        color: f.readOnly ? '#6B7280' : '#111827',
                        cursor: f.readOnly ? 'not-allowed' : 'text',
                      }}
                      onFocus={e => { if (!f.readOnly) { e.currentTarget.style.border = '1.5px solid #FF6B1A'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(255,107,26,0.08)' } }}
                      onBlur={e => { e.currentTarget.style.border = '1px solid #E5E7EB'; e.currentTarget.style.boxShadow = 'none' }} />
                  </div>
                ))}
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-xs font-semibold" style={{ color: '#374151' }}>Bio</label>
                  <textarea value={profile.bio} onChange={e => setProfile({ ...profile, bio: e.target.value })}
                    rows={3} placeholder="Tell us a bit about yourself..."
                    className="w-full resize-none rounded-xl px-3.5 py-2.5 text-sm outline-none"
                    style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', color: '#111827' }}
                    onFocus={e => { e.currentTarget.style.border = '1.5px solid #FF6B1A'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(255,107,26,0.08)' }}
                    onBlur={e => { e.currentTarget.style.border = '1px solid #E5E7EB'; e.currentTarget.style.boxShadow = 'none' }} />
                </div>
              </div>
              <AnimatePresence>
                {error && (
                  <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="mt-4 flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs"
                    style={{ background: '#FEE2E2', color: '#DC2626' }}>
                    <AlertCircle size={13} />{error}
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="mt-5 flex items-center justify-end gap-3">
                <Button
                  type="button" variant="outline"
                  onClick={() => user && setProfile({ name: user.name, email: user.email, role: user.headline ?? '', bio: user.bio ?? '' })}
                  className="rounded-xl px-4 py-2 text-sm font-semibold transition-colors hover:bg-gray-50"
                  style={{ color: '#6B7280', border: '1px solid #E5E7EB' }}>Cancel</Button>
                <MotionButton whileHover={{ y: -1 }} whileTap={{ scale: 0.97 }}
                  onClick={handleSave} variant="default"
                  disabled={updateMutation.isPending || userLoading}
                  className="flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-bold text-white transition-all disabled:opacity-70"
                  style={{
                    background: saved ? '#22C55E' : 'linear-gradient(135deg,#FF6B1A,#FF8C42)',
                    boxShadow: saved ? '0 4px 14px rgba(34,197,94,0.28)' : '0 4px 14px rgba(255,107,26,0.28)',
                  }}>
                  {updateMutation.isPending
                    ? <><Loader2 size={14} className="animate-spin" />Saving…</>
                    : saved
                      ? <><Check size={14} />Saved!</>
                      : 'Save changes'}
                </MotionButton>
              </div>
            </motion.div>
          )}

          {/* ── Change password (within Profile tab) ── */}
          {active === 'profile' && (
            <motion.div key="change-pw"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: 0.08 }}
              className="rounded-2xl bg-white p-6" style={{ border: '1px solid #E5E7EB' }}>
              <div className="mb-5 flex items-center gap-2">
                <Lock size={15} style={{ color: '#FF6B1A' }} />
                <h2 className="text-base font-bold" style={{ color: '#111827' }}>Change Password</h2>
              </div>

              <div className="space-y-3.5">
                {/* Current password */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold" style={{ color: '#374151' }}>Current password</label>
                  <div className="relative">
                    <input
                      type={showCur ? 'text' : 'password'}
                      value={pwForm.current}
                      onChange={e => setPwForm(p => ({ ...p, current: e.target.value }))}
                      placeholder="Your current password"
                      className="w-full rounded-xl px-3.5 py-2.5 text-sm pr-10 outline-none"
                      style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', color: '#111827' }}
                      onFocus={e => { e.currentTarget.style.border = '1.5px solid #FF6B1A'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(255,107,26,0.08)' }}
                      onBlur={e => { e.currentTarget.style.border = '1px solid #E5E7EB'; e.currentTarget.style.boxShadow = 'none' }}
                    />
                    <Button type="button" variant="ghost" size="icon-sm" onClick={() => setShowCur(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-70 h-auto w-auto !p-0"
                      style={{ color: '#9CA3AF' }}>
                      {showCur ? <EyeOff size={14} /> : <Eye size={14} />}
                    </Button>
                  </div>
                </div>

                {/* New password */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold" style={{ color: '#374151' }}>New password</label>
                  <div className="relative">
                    <input
                      type={showNew ? 'text' : 'password'}
                      value={pwForm.next}
                      onChange={e => setPwForm(p => ({ ...p, next: e.target.value }))}
                      placeholder="Min. 8 characters, 1 uppercase, 1 number"
                      className="w-full rounded-xl px-3.5 py-2.5 text-sm pr-10 outline-none"
                      style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', color: '#111827' }}
                      onFocus={e => { e.currentTarget.style.border = '1.5px solid #FF6B1A'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(255,107,26,0.08)' }}
                      onBlur={e => { e.currentTarget.style.border = '1px solid #E5E7EB'; e.currentTarget.style.boxShadow = 'none' }}
                    />
                    <Button type="button" variant="ghost" size="icon-sm" onClick={() => setShowNew(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-70 h-auto w-auto !p-0"
                      style={{ color: '#9CA3AF' }}>
                      {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
                    </Button>
                  </div>
                </div>

                {/* Confirm new password */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold" style={{ color: '#374151' }}>Confirm new password</label>
                  <input
                    type="password"
                    value={pwForm.confirm}
                    onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))}
                    placeholder="Repeat your new password"
                    className="w-full rounded-xl px-3.5 py-2.5 text-sm outline-none"
                    style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', color: '#111827' }}
                    onFocus={e => { e.currentTarget.style.border = '1.5px solid #FF6B1A'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(255,107,26,0.08)' }}
                    onBlur={e => { e.currentTarget.style.border = '1px solid #E5E7EB'; e.currentTarget.style.boxShadow = 'none' }}
                  />
                </div>
              </div>

              <AnimatePresence>
                {pwError && (
                  <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="mt-3.5 flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs"
                    style={{ background: '#FEE2E2', color: '#DC2626' }}>
                    <AlertCircle size={13} />{pwError}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="mt-5 flex justify-end">
                <MotionButton whileHover={{ y: -1 }} whileTap={{ scale: 0.97 }}
                  onClick={handleChangePassword} variant="default"
                  disabled={changePasswordMutation.isPending || !pwForm.current || !pwForm.next || !pwForm.confirm}
                  className="flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-bold text-white transition-all disabled:opacity-50"
                  style={{
                    background: pwSaved ? '#22C55E' : 'linear-gradient(135deg,#FF6B1A,#FF8C42)',
                    boxShadow: pwSaved ? '0 4px 14px rgba(34,197,94,0.28)' : '0 4px 14px rgba(255,107,26,0.28)',
                  }}>
                  {changePasswordMutation.isPending
                    ? <><Loader2 size={14} className="animate-spin" />Updating…</>
                    : pwSaved
                      ? <><Check size={14} />Password updated!</>
                      : <><Lock size={14} />Update password</>}
                </MotionButton>
              </div>
            </motion.div>
          )}

          {/* ── Layout & Navigation ── */}
          {active === 'layout' && (
            <motion.div key="layout"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-4">
              <div className="rounded-2xl bg-white p-6" style={{ border: '1px solid #E5E7EB' }}>
                <div className="mb-1 flex items-center gap-2">
                  <Monitor size={16} style={{ color: '#FF6B1A' }} />
                  <h2 className="text-base font-bold" style={{ color: '#111827' }}>Navigation Layout</h2>
                </div>
                <p className="mb-6 text-xs" style={{ color: '#9CA3AF' }}>
                  Choose how you want to navigate through LearnOS. Your preference is saved automatically.
                </p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <LayoutCard value="sidebar" label="Sidebar Navigation"
                    desc="Collapsible sidebar on the left with icon shortcuts"
                    selected={navLayout === 'sidebar'} onSelect={() => setNavLayout('sidebar')}
                    preview={<SidebarPreview />} />
                  <LayoutCard value="topbar" label="Top Navigation"
                    desc="Full-width top nav bar — more screen space for content"
                    selected={navLayout === 'topbar'} onSelect={() => setNavLayout('topbar')}
                    preview={<TopbarPreview />} />
                </div>
                <AnimatePresence mode="wait">
                  <motion.div key={navLayout}
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                    className="mt-5 flex items-center gap-3 rounded-2xl px-4 py-3"
                    style={{ background: 'rgba(255,107,26,0.06)', border: '1px solid rgba(255,107,26,0.18)' }}>
                    {navLayout === 'sidebar'
                      ? <PanelLeft size={16} style={{ color: '#FF6B1A' }} />
                      : <AlignJustify size={16} style={{ color: '#FF6B1A' }} />}
                    <p className="text-sm" style={{ color: '#374151' }}>
                      {navLayout === 'sidebar'
                        ? <><span className="font-semibold">Sidebar layout active.</span> The left sidebar shows your main navigation. Use the collapse button to hide labels.</>
                        : <><span className="font-semibold">Top navigation active.</span> The sidebar is hidden. All pages are accessible from the top nav tabs.</>}
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Sidebar options — only in sidebar mode */}
              <AnimatePresence>
                {navLayout === 'sidebar' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }}
                    className="overflow-hidden rounded-2xl bg-white"
                    style={{ border: '1px solid #E5E7EB' }}>
                    <div className="p-6">
                      <h3 className="mb-4 text-sm font-bold" style={{ color: '#111827' }}>Sidebar Options</h3>
                      <div className="space-y-3">
                        {[
                          { label: 'Show labels',   desc: 'Display text labels beside icons',            key: 'labels',  on: true  },
                          { label: 'Compact mode',  desc: 'Reduce padding for a denser sidebar',         key: 'compact', on: false },
                          { label: 'Auto-collapse', desc: 'Collapse sidebar when navigating away',       key: 'auto',    on: false },
                        ].map(opt => (
                          <div key={opt.key} className="flex items-center justify-between rounded-xl p-3 hover:bg-gray-50 transition-colors"
                            style={{ border: '1px solid #F3F4F6' }}>
                            <div>
                              <p className="text-sm font-semibold" style={{ color: '#111827' }}>{opt.label}</p>
                              <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>{opt.desc}</p>
                            </div>
                            <Toggle on={opt.on} onToggle={() => {}} />
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* ── Notifications ── */}
          {active === 'notifications' && (
            <motion.div key="notifications"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="rounded-2xl bg-white p-6" style={{ border: '1px solid #E5E7EB' }}>
              <h2 className="mb-5 text-base font-bold" style={{ color: '#111827' }}>Notification Preferences</h2>
              <div className="space-y-3">
                {[
                  { key: 'course',  label: 'Course updates',      desc: 'New lessons, announcements from instructors' },
                  { key: 'email',   label: 'Email notifications', desc: 'Receive updates via email' },
                  { key: 'push',    label: 'Push notifications',  desc: 'Browser and mobile push alerts' },
                  { key: 'weekly',  label: 'Weekly digest',       desc: 'A summary of your learning progress each week' },
                ].map(n => (
                  <div key={n.key} className="flex items-center justify-between gap-4 rounded-xl p-4 hover:bg-gray-50 transition-colors"
                    style={{ border: '1px solid #F3F4F6' }}>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: '#111827' }}>{n.label}</p>
                      <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>{n.desc}</p>
                    </div>
                    <Toggle on={notifs[n.key as keyof typeof notifs]}
                      onToggle={() => setNotifs(p => ({ ...p, [n.key]: !p[n.key as keyof typeof notifs] }))} />
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── Privacy & Security (real) ── */}
          {active === 'privacy' && (
            <motion.div key="privacy"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}>
              <PrivacySecuritySection />
            </motion.div>
          )}

          {/* ── Coming soon sections ── */}
          {(['billing', 'language'] as const).includes(active as never) && (
            <motion.div key={active}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="rounded-2xl bg-white p-10 flex flex-col items-center gap-4"
              style={{ border: '1px solid #E5E7EB' }}>
              <div className="flex h-14 w-14 items-center justify-center rounded-3xl text-2xl"
                style={{ background: '#FFF7ED', border: '1px solid rgba(255,107,26,0.18)' }}>
                {active === 'billing' ? '💳' : '🌍'}
              </div>
              <p className="text-base font-bold" style={{ color: '#111827' }}>Coming soon</p>
              <p className="text-sm text-center max-w-xs" style={{ color: '#9CA3AF' }}>
                This settings section is under construction. Check back soon!
              </p>
            </motion.div>
          )}
        </AnimatePresence>

      </motion.div>
    </motion.div>
  )
}

/* Wrap in Suspense because useSearchParams needs it in Next.js 15 */
export default function SettingsPage() {
  return (
    <Suspense fallback={
      <div className="flex h-40 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-200 border-t-orange-500" />
      </div>
    }>
      <SettingsContent />
    </Suspense>
  )
}
