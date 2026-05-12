'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  Search, Bell, X, MessageSquare, BookOpen,
  GraduationCap, Heart, Sparkles, Trophy,
  Settings, LayoutDashboard,
} from 'lucide-react'
import { useUIStore } from '@/store/ui.store'

/* Nav tabs shown when sidebar layout is active (minimal — sidebar handles main nav) */
const SIDEBAR_TABS = [
  { label: 'My Learning', href: '/my-learning', icon: GraduationCap },
  { label: 'Catalog',     href: '/courses',      icon: BookOpen },
  { label: 'Favorites',   href: '/favorites',    icon: Heart, badge: 1 },
]

/* Nav tabs shown when topbar-only layout is active (full navigation) */
const TOPBAR_TABS = [
  { label: 'My Learning',  href: '/my-learning',  icon: GraduationCap },
  { label: 'Catalog',      href: '/courses',       icon: BookOpen },
  { label: 'Achievements', href: '/achievements',  icon: Trophy },
  { label: 'Favorites',    href: '/favorites',     icon: Heart, badge: 1 },
  { label: 'Settings',     href: '/settings',      icon: Settings },
]

const notifications = [
  { id: 1, text: 'New lesson added to TypeScript course', time: '5m ago',  unread: true  },
  { id: 2, text: 'Your certificate is ready for download', time: '1h ago', unread: true  },
  { id: 3, text: 'Sarah Chen started a new Q&A thread',   time: '3h ago', unread: false },
]

export function ClientTopbar() {
  const { sidebarCollapsed, navLayout } = useUIStore()
  const pathname    = usePathname()
  const [focused,   setFocused]   = useState(false)
  const [query,     setQuery]     = useState('')
  const [notifOpen, setNotifOpen] = useState(false)

  const unread   = notifications.filter(n => n.unread).length
  const isSidebar = navLayout === 'sidebar'
  const left      = isSidebar ? (sidebarCollapsed ? 68 : 240) : 0
  const tabs      = isSidebar ? SIDEBAR_TABS : TOPBAR_TABS

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  return (
    <motion.header
      /* ── Slides in from top on mount ── */
      initial={{ y: -100, opacity: 0 }}
      animate={{ left, y: 0, opacity: 1 }}
      transition={{ y: { type: 'spring', stiffness: 280, damping: 28, mass: 0.8 }, left: { type: 'spring', stiffness: 300, damping: 30 } }}
      className="fixed top-0 right-0 z-30 bg-white"
      style={{ borderBottom: '1px solid #E5E7EB' }}>

      {/* ── Row 1: Logo (topbar mode) + search + actions ── */}
      <div className="flex h-[60px] items-center gap-3 px-6" style={{ borderBottom: '1px solid #F3F4F6' }}>

        {/* Logo — only visible in topbar-only layout */}
        <AnimatePresence>
          {!isSidebar && (
            <motion.div
              initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.2 }}
              className="flex items-center gap-2.5 mr-4 flex-shrink-0">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl"
                style={{ background: 'linear-gradient(135deg,#FF6B1A,#FF8C42)' }}>
                <span className="text-white text-xs font-bold">L</span>
              </div>
              <span className="font-bold text-[15px]" style={{ color: '#111827', fontFamily: 'Bricolage Grotesque, sans-serif' }}>
                LearnOS
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search */}
        <div className="relative flex-1 max-w-[380px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: focused ? '#FF6B1A' : '#FF6B1A', opacity: focused ? 1 : 0.55 }} />
          <input
            value={query} onChange={e => setQuery(e.target.value)}
            onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
            placeholder="Search..."
            className="w-full rounded-xl py-2 pl-9 pr-10 text-sm outline-none transition-all"
            style={{
              background: focused ? '#FFF7ED' : '#F3F4F6',
              border: focused ? '1.5px solid #FF6B1A' : '1.5px solid transparent',
              boxShadow: focused ? '0 0 0 3px rgba(255,107,26,0.10)' : 'none',
              color: '#111827',
            }} />
          <motion.button
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-lg text-white"
            style={{ background: 'linear-gradient(135deg,#FF6B1A,#FF8C42)', boxShadow: '0 2px 8px rgba(255,107,26,0.30)' }}>
            <Search size={12} />
          </motion.button>
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          {/* Ask AI — orange primary */}
          <motion.button whileHover={{ scale: 1.02, boxShadow: '0 6px 20px rgba(255,107,26,0.35)' }} whileTap={{ scale: 0.97 }}
            className="hidden sm:flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold text-white"
            style={{ background: 'linear-gradient(135deg,#FF6B1A,#FF8C42)', boxShadow: '0 3px 12px rgba(255,107,26,0.28)' }}>
            <Sparkles size={12} />Ask AI
          </motion.button>

          {/* Messages */}
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            className="flex h-9 w-9 items-center justify-center rounded-xl transition-colors hover:bg-orange-50"
            style={{ color: '#FF6B1A' }}>
            <MessageSquare size={16} />
          </motion.button>

          {/* Notifications */}
          <div className="relative">
            <motion.button onClick={() => setNotifOpen(v => !v)}
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              className="relative flex h-9 w-9 items-center justify-center rounded-xl transition-colors hover:bg-orange-50"
              style={{ color: '#FF6B1A' }}>
              <Bell size={16} />
              {unread > 0 && (
                <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 400 }}
                  className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-white"
                  style={{ background: '#EF4444' }}>
                  {unread}
                </motion.span>
              )}
            </motion.button>

            <AnimatePresence>
              {notifOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.96 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                    className="absolute right-0 top-full mt-2 w-72 rounded-2xl overflow-hidden z-50 bg-white"
                    style={{ border: '1px solid #E5E7EB', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
                    <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #F3F4F6' }}>
                      <span className="text-sm font-semibold" style={{ color: '#111827' }}>Notifications</span>
                      <button className="text-[11px] font-semibold" style={{ color: '#FF6B1A' }}>Mark all read</button>
                    </div>
                    {notifications.map((n, i) => (
                      <motion.div key={n.id}
                        initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className="flex gap-3 px-4 py-3 transition-colors hover:bg-orange-50 cursor-pointer"
                        style={{ borderBottom: i < notifications.length - 1 ? '1px solid #F3F4F6' : 'none' }}>
                        <div className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full"
                          style={{ background: n.unread ? '#FF6B1A' : '#E5E7EB' }} />
                        <div>
                          <p className="text-xs leading-relaxed" style={{ color: n.unread ? '#111827' : '#9CA3AF' }}>{n.text}</p>
                          <p className="mt-0.5 text-[10px]" style={{ color: '#9CA3AF' }}>{n.time}</p>
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* Profile */}
          <Link href="/settings">
            <div className="flex cursor-pointer items-center gap-2.5 rounded-xl px-2 py-1 transition-colors hover:bg-orange-50">
              <div className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-white ring-2 ring-orange-100"
                style={{ background: 'linear-gradient(135deg,#FF6B1A,#FF8C42)' }}>
                A
              </div>
              <div className="hidden md:block">
                <p className="text-xs font-semibold leading-tight" style={{ color: '#111827' }}>Adit Irwan</p>
                <p className="text-[10px]" style={{ color: '#9CA3AF' }}>Jr UI/UX Designer</p>
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* ── Row 2: Nav tabs — stagger from top ── */}
      <div className="flex h-[40px] items-end px-6">
        {tabs.map((tab, i) => {
          const active = isActive(tab.href)
          return (
            <Link key={tab.href} href={tab.href}>
              <motion.div
                initial={{ opacity: 0, y: -16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 320, damping: 26, delay: 0.05 + i * 0.04 }}
                className="relative flex h-[40px] items-center gap-1.5 px-4 cursor-pointer select-none">
                <span className="text-sm font-medium transition-colors"
                  style={{ color: active ? '#111827' : '#9CA3AF', fontWeight: active ? 600 : 400 }}>
                  {tab.label}
                </span>
                {tab.badge && (
                  <span aria-label={`${tab.badge} items`}
                    className="flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-white"
                    style={{ background: '#FF6B1A' }}>
                    <span aria-hidden="true">{tab.badge}</span>
                  </span>
                )}
                {active && (
                  <motion.div layoutId="tab-underline"
                    className="absolute bottom-0 left-0 right-0 h-[2.5px] rounded-full"
                    style={{ background: '#FF6B1A' }}
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }} />
                )}
              </motion.div>
            </Link>
          )
        })}
      </div>
    </motion.header>
  )
}
