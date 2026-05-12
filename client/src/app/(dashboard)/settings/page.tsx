'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  User, Bell, Shield, CreditCard, Globe,
  Camera, Check, LogOut, LayoutDashboard,
  PanelLeft, AlignJustify, Monitor,
} from 'lucide-react'
import { useUIStore } from '@/store/ui.store'

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } }
const fadeUp  = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 280, damping: 26 } } }

const MENU = [
  { id: 'profile',       icon: User,            label: 'Profile' },
  { id: 'layout',        icon: LayoutDashboard, label: 'Layout & Navigation' },
  { id: 'notifications', icon: Bell,            label: 'Notifications' },
  { id: 'privacy',       icon: Shield,          label: 'Privacy & Security' },
  { id: 'billing',       icon: CreditCard,      label: 'Billing' },
  { id: 'language',      icon: Globe,           label: 'Language & Region' },
]

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <motion.button onClick={onToggle}
      className="relative flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors"
      style={{ background: on ? '#FF6B1A' : '#D1D5DB' }}>
      <motion.span animate={{ x: on ? 22 : 2 }}
        transition={{ type: 'spring', stiffness: 500, damping: 35 }}
        className="absolute h-4 w-4 rounded-full bg-white shadow-sm" />
    </motion.button>
  )
}

/* ── Layout preview card ────────────────────────── */
function LayoutCard({
  value, label, desc, selected, onSelect, preview,
}: {
  value: string; label: string; desc: string; selected: boolean; onSelect: () => void
  preview: React.ReactNode
}) {
  return (
    <motion.button
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.98 }}
      onClick={onSelect}
      className="relative flex flex-col overflow-hidden rounded-2xl text-left transition-all w-full"
      style={{
        border: selected ? '2px solid #FF6B1A' : '2px solid #E5E7EB',
        boxShadow: selected ? '0 0 0 3px rgba(255,107,26,0.12)' : '0 2px 6px rgba(0,0,0,0.04)',
      }}>
      {/* Preview illustration */}
      <div className="h-36 w-full overflow-hidden" style={{ background: '#F4F5F8' }}>
        {preview}
      </div>
      {/* Label */}
      <div className="flex items-start justify-between p-4">
        <div>
          <p className="text-sm font-bold" style={{ color: '#111827' }}>{label}</p>
          <p className="mt-0.5 text-xs" style={{ color: '#9CA3AF' }}>{desc}</p>
        </div>
        <div className="mt-0.5 flex-shrink-0 ml-2">
          <div className="flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors"
            style={{
              borderColor: selected ? '#FF6B1A' : '#D1D5DB',
              background:  selected ? '#FF6B1A' : 'transparent',
            }}>
            {selected && <Check size={11} color="white" strokeWidth={3} />}
          </div>
        </div>
      </div>
      {selected && (
        <motion.div layoutId="layout-selected-border"
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{ border: '2px solid #FF6B1A' }} />
      )}
    </motion.button>
  )
}

/* ── Mini preview components ─────────────────────── */
function SidebarPreview() {
  return (
    <div className="flex h-full w-full p-3 gap-2">
      {/* Mini sidebar */}
      <div className="flex flex-col gap-1.5 rounded-xl p-2 flex-shrink-0 w-16"
        style={{ background: 'white', border: '1px solid #E5E7EB' }}>
        <div className="h-4 w-4 rounded-lg" style={{ background: 'linear-gradient(135deg,#FF6B1A,#FF8C42)' }} />
        {[0,1,2].map(i => (
          <div key={i} className="h-2 rounded-full" style={{ background: i === 0 ? 'rgba(255,107,26,0.2)' : '#F3F4F6', width: i === 0 ? '100%' : '80%' }} />
        ))}
      </div>
      {/* Mini content */}
      <div className="flex flex-1 flex-col gap-1.5">
        {/* Mini topbar */}
        <div className="flex items-center justify-between rounded-xl px-2 py-1.5" style={{ background: 'white', border: '1px solid #E5E7EB' }}>
          <div className="h-2 w-16 rounded-full" style={{ background: '#F3F4F6' }} />
          <div className="flex gap-1">
            <div className="h-4 w-4 rounded-full" style={{ background: 'linear-gradient(135deg,#FF6B1A,#FF8C42)' }} />
          </div>
        </div>
        {/* Mini page content */}
        <div className="flex flex-1 flex-col gap-1">
          <div className="h-2 w-3/4 rounded-full" style={{ background: '#E5E7EB' }} />
          <div className="h-2 w-1/2 rounded-full" style={{ background: '#F3F4F6' }} />
          <div className="mt-1 flex gap-1 flex-1">
            {[0,1].map(i => (
              <div key={i} className="flex-1 rounded-xl" style={{ background: 'white', border: '1px solid #E5E7EB' }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function TopbarPreview() {
  return (
    <div className="flex h-full w-full flex-col p-3 gap-2">
      {/* Mini topbar with logo + tabs */}
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
        {/* Tabs row */}
        <div className="flex items-end gap-1 px-3 py-1">
          {['My Learning','Catalog','Favorites'].map((t, i) => (
            <div key={t} className="relative px-2 py-1">
              <div className="h-1.5 rounded-full" style={{ background: i === 0 ? '#111827' : '#D1D5DB', width: i === 0 ? 40 : 30 }} />
              {i === 0 && <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full" style={{ background: '#FF6B1A' }} />}
            </div>
          ))}
        </div>
      </div>
      {/* Mini page content */}
      <div className="flex flex-1 flex-col gap-1">
        <div className="h-2 w-3/4 rounded-full" style={{ background: '#E5E7EB' }} />
        <div className="flex gap-1.5 flex-1 mt-0.5">
          {[0,1,2].map(i => (
            <div key={i} className="flex-1 rounded-xl" style={{ background: 'white', border: '1px solid #E5E7EB' }} />
          ))}
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────── */
export default function SettingsPage() {
  const { navLayout, setNavLayout } = useUIStore()
  const [active,  setActive]  = useState('profile')
  const [saved,   setSaved]   = useState(false)
  const [notifs,  setNotifs]  = useState({ course: true, email: true, push: false, weekly: true })
  const [profile, setProfile] = useState({ name: 'Adit Irwan', email: 'student@learnos.com', role: 'Jr UI/UX Designer', bio: '' })

  const handleSave = () => { setSaved(true); setTimeout(() => setSaved(false), 2500) }

  return (
    <motion.div variants={stagger} initial="hidden" animate="show"
      className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_1fr]">

      {/* ── Sidebar menu ──────────────────────────── */}
      <motion.div variants={fadeUp}
        className="rounded-2xl bg-white p-3 lg:sticky lg:top-[116px] lg:self-start"
        style={{ border: '1px solid #E5E7EB' }}>
        <div className="space-y-0.5">
          {MENU.map(item => {
            const Icon = item.icon
            return (
              <button key={item.id} onClick={() => setActive(item.id)}
                className="relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors text-left"
                style={{ color: active === item.id ? '#111827' : '#6B7280' }}>
                {active === item.id && (
                  <motion.div layoutId="settings-active"
                    className="absolute inset-0 rounded-xl"
                    style={{ background: '#FFF7ED', border: '1px solid rgba(255,107,26,0.18)' }}
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }} />
                )}
                <Icon size={15} className="relative z-10 flex-shrink-0"
                  style={{ color: active === item.id ? '#FF6B1A' : '#9CA3AF' }} />
                <span className="relative z-10">{item.label}</span>
              </button>
            )
          })}
        </div>
        <div className="mt-3 pt-3" style={{ borderTop: '1px solid #F3F4F6' }}>
          <button
            onClick={() => { document.cookie = 'learnos_auth=; path=/; max-age=0'; window.location.href = '/login' }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors hover:bg-red-50"
            style={{ color: '#EF4444' }}>
            <LogOut size={15} />Logout
          </button>
        </div>
      </motion.div>

      {/* ── Content panel ─────────────────────────── */}
      <motion.div variants={fadeUp} className="space-y-4">

        {/* ── Profile ── */}
        {active === 'profile' && (
          <div className="rounded-2xl bg-white p-6" style={{ border: '1px solid #E5E7EB' }}>
            <h2 className="mb-5 text-base font-bold" style={{ color: '#111827' }}>Profile Settings</h2>
            <div className="mb-6 flex items-center gap-4">
              <div className="relative">
                <div className="flex h-16 w-16 items-center justify-center rounded-full text-xl font-bold text-white"
                  style={{ background: 'linear-gradient(135deg,#FF6B1A,#FF8C42)' }}>A</div>
                <button className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-md"
                  style={{ border: '1px solid #E5E7EB', color: '#FF6B1A' }}>
                  <Camera size={12} />
                </button>
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: '#111827' }}>Profile Photo</p>
                <p className="text-xs" style={{ color: '#9CA3AF' }}>PNG, JPG up to 5MB</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {[
                { label: 'Full Name', key: 'name',  type: 'text'  },
                { label: 'Email',     key: 'email', type: 'email' },
                { label: 'Job Title', key: 'role',  type: 'text'  },
              ].map(f => (
                <div key={f.key}>
                  <label className="mb-1.5 block text-xs font-semibold" style={{ color: '#374151' }}>{f.label}</label>
                  <input type={f.type}
                    value={profile[f.key as keyof typeof profile]}
                    onChange={e => setProfile({ ...profile, [f.key]: e.target.value })}
                    className="w-full rounded-xl px-3.5 py-2.5 text-sm outline-none"
                    style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', color: '#111827' }}
                    onFocus={e => { e.currentTarget.style.border = '1.5px solid #FF6B1A'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(255,107,26,0.08)' }}
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
            <div className="mt-5 flex items-center justify-end gap-3">
              <button className="rounded-xl px-4 py-2 text-sm font-semibold transition-colors hover:bg-gray-50"
                style={{ color: '#6B7280', border: '1px solid #E5E7EB' }}>Cancel</button>
              <motion.button whileHover={{ y: -1 }} whileTap={{ scale: 0.97 }}
                onClick={handleSave}
                className="flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-bold text-white"
                style={{ background: saved ? '#22C55E' : 'linear-gradient(135deg,#FF6B1A,#FF8C42)', boxShadow: '0 4px 14px rgba(255,107,26,0.28)' }}>
                {saved ? <><Check size={14} />Saved!</> : 'Save changes'}
              </motion.button>
            </div>
          </div>
        )}

        {/* ── Layout & Navigation ── */}
        {active === 'layout' && (
          <div className="space-y-5">
            <div className="rounded-2xl bg-white p-6" style={{ border: '1px solid #E5E7EB' }}>
              <div className="mb-1 flex items-center gap-2">
                <Monitor size={16} style={{ color: '#FF6B1A' }} />
                <h2 className="text-base font-bold" style={{ color: '#111827' }}>Navigation Layout</h2>
              </div>
              <p className="mb-6 text-xs" style={{ color: '#9CA3AF' }}>
                Choose how you want to navigate through LearnOS. Your preference is saved automatically.
              </p>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <LayoutCard
                  value="sidebar"
                  label="Sidebar Navigation"
                  desc="Collapsible sidebar on the left with icon shortcuts"
                  selected={navLayout === 'sidebar'}
                  onSelect={() => setNavLayout('sidebar')}
                  preview={<SidebarPreview />}
                />
                <LayoutCard
                  value="topbar"
                  label="Top Navigation"
                  desc="Full-width top nav bar — more screen space for content"
                  selected={navLayout === 'topbar'}
                  onSelect={() => setNavLayout('topbar')}
                  preview={<TopbarPreview />}
                />
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={navLayout}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="mt-5 flex items-center gap-3 rounded-2xl px-4 py-3"
                  style={{ background: 'rgba(255,107,26,0.06)', border: '1px solid rgba(255,107,26,0.18)' }}>
                  {navLayout === 'sidebar'
                    ? <PanelLeft size={16} style={{ color: '#FF6B1A' }} />
                    : <AlignJustify size={16} style={{ color: '#FF6B1A' }} />
                  }
                  <p className="text-sm" style={{ color: '#374151' }}>
                    {navLayout === 'sidebar'
                      ? <><span className="font-semibold">Sidebar layout active.</span> The left sidebar shows your main navigation. Use the collapse button to hide labels.</>
                      : <><span className="font-semibold">Top navigation active.</span> The sidebar is hidden. All pages are accessible from the top nav tabs.</>
                    }
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Sidebar options — only shown in sidebar mode */}
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
                        { label: 'Show labels',       desc: 'Display text labels beside icons',       key: 'labels'  },
                        { label: 'Compact mode',      desc: 'Reduce padding for a denser sidebar',    key: 'compact' },
                        { label: 'Auto-collapse',     desc: 'Collapse sidebar when navigating away',  key: 'auto'    },
                      ].map(opt => (
                        <div key={opt.key} className="flex items-center justify-between rounded-xl p-3 transition-colors hover:bg-gray-50"
                          style={{ border: '1px solid #F3F4F6' }}>
                          <div>
                            <p className="text-sm font-semibold" style={{ color: '#111827' }}>{opt.label}</p>
                            <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>{opt.desc}</p>
                          </div>
                          <Toggle on={opt.key === 'labels'} onToggle={() => {}} />
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* ── Notifications ── */}
        {active === 'notifications' && (
          <div className="rounded-2xl bg-white p-6" style={{ border: '1px solid #E5E7EB' }}>
            <h2 className="mb-5 text-base font-bold" style={{ color: '#111827' }}>Notification Preferences</h2>
            <div className="space-y-3">
              {[
                { key: 'course',  label: 'Course updates',      desc: 'New lessons, announcements from instructors' },
                { key: 'email',   label: 'Email notifications', desc: 'Receive updates via email' },
                { key: 'push',    label: 'Push notifications',  desc: 'Browser and mobile push alerts' },
                { key: 'weekly',  label: 'Weekly digest',       desc: 'A summary of your learning progress every week' },
              ].map(n => (
                <div key={n.key} className="flex items-center justify-between gap-4 rounded-xl p-4 transition-colors hover:bg-gray-50"
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
          </div>
        )}

        {/* ── Coming soon sections ── */}
        {(active === 'privacy' || active === 'billing' || active === 'language') && (
          <div className="rounded-2xl bg-white p-10 flex flex-col items-center gap-4" style={{ border: '1px solid #E5E7EB' }}>
            <div className="flex h-14 w-14 items-center justify-center rounded-3xl text-2xl"
              style={{ background: '#FFF7ED', border: '1px solid rgba(255,107,26,0.18)' }}>
              {active === 'privacy' ? '🔒' : active === 'billing' ? '💳' : '🌍'}
            </div>
            <p className="text-base font-bold" style={{ color: '#111827' }}>Coming soon</p>
            <p className="text-sm text-center max-w-xs" style={{ color: '#9CA3AF' }}>
              This settings section is under construction. Check back soon!
            </p>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
