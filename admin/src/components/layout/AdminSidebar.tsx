'use client'

import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, BookOpen, Users, GraduationCap,
  Tag, Star, Settings, ChevronLeft, LogOut,
} from 'lucide-react'
import { useUIStore } from '@/store/ui.store'

const navItems = [
  { label: 'Dashboard',   href: '/',            icon: LayoutDashboard },
  { label: 'Courses',     href: '/courses',      icon: BookOpen },
  { label: 'Students',    href: '/students',     icon: Users },
  { label: 'Instructors', href: '/instructors',  icon: GraduationCap },
  { label: 'Categories',  href: '/categories',   icon: Tag },
  { label: 'Reviews',     href: '/reviews',      icon: Star },
]

const bottomItems = [
  { label: 'Settings', href: '/settings', icon: Settings },
]

export function AdminSidebar() {
  const pathname    = usePathname()
  const { sidebarCollapsed, toggleSidebar } = useUIStore()
  const w = sidebarCollapsed ? 68 : 240

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  return (
    <motion.aside
      animate={{ width: w }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="fixed left-0 top-0 z-40 flex h-screen flex-col overflow-hidden"
      style={{ background: '#0D0F1A', borderRight: '1px solid rgba(255,255,255,0.06)' }}
    >
      {/* ── Logo ─────────────────────────────────── */}
      <div className="flex h-[60px] flex-shrink-0 items-center gap-3 px-4"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl"
          style={{ background: 'linear-gradient(135deg, #FF6B1A, #FF8C42)' }}>
          <GraduationCap size={16} color="#fff" strokeWidth={2} />
        </div>
        <AnimatePresence>
          {!sidebarCollapsed && (
            <motion.span
              initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.15 }}
              className="whitespace-nowrap font-bold text-white"
              style={{ fontFamily: 'Bricolage Grotesque, sans-serif', fontSize: 16 }}>
              LearnOS
              <span className="ml-1.5 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider"
                style={{ background: 'rgba(255,107,26,0.18)', color: '#FF6B1A' }}>Admin</span>
            </motion.span>
          )}
        </AnimatePresence>

        {/* Collapse toggle */}
        <motion.button
          onClick={toggleSidebar}
          animate={{ marginLeft: sidebarCollapsed ? 0 : 'auto', rotate: sidebarCollapsed ? 180 : 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-white/10"
          style={{ color: 'rgba(255,255,255,0.4)' }}>
          <ChevronLeft size={15} />
        </motion.button>
      </div>

      {/* ── Nav items ───────────────────────────── */}
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto overflow-x-hidden px-2 py-4">
        {!sidebarCollapsed && (
          <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-[0.15em]"
            style={{ color: 'rgba(255,255,255,0.2)' }}>Menu</p>
        )}

        {navItems.map(item => {
          const active = isActive(item.href)
          const Icon   = item.icon
          return (
            <Link key={item.href} href={item.href}>
              <motion.div
                whileHover={{ x: sidebarCollapsed ? 0 : 3 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                className="relative flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors"
                style={{
                  background: active ? 'rgba(255,107,26,0.12)' : 'transparent',
                  color: active ? '#FF6B1A' : 'rgba(255,255,255,0.5)',
                }}
                title={sidebarCollapsed ? item.label : undefined}
              >
                {active && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute inset-0 rounded-xl"
                    style={{ background: 'rgba(255,107,26,0.10)', border: '1px solid rgba(255,107,26,0.20)' }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <Icon size={17} className="relative z-10 flex-shrink-0" strokeWidth={active ? 2.2 : 1.8} />
                <AnimatePresence>
                  {!sidebarCollapsed && (
                    <motion.span
                      initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -6 }} transition={{ duration: 0.13 }}
                      className="relative z-10 whitespace-nowrap text-sm font-medium">
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.div>
            </Link>
          )
        })}
      </nav>

      {/* ── Bottom ──────────────────────────────── */}
      <div className="flex-shrink-0 px-2 pb-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 12 }}>
        {bottomItems.map(item => {
          const Icon = item.icon
          return (
            <Link key={item.href} href={item.href}>
              <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-white/10"
                style={{ color: 'rgba(255,255,255,0.4)' }} title={sidebarCollapsed ? item.label : undefined}>
                <Icon size={17} strokeWidth={1.8} className="flex-shrink-0" />
                <AnimatePresence>
                  {!sidebarCollapsed && (
                    <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="whitespace-nowrap text-sm font-medium">{item.label}</motion.span>
                  )}
                </AnimatePresence>
              </div>
            </Link>
          )
        })}

        {/* User row */}
        <div className="mt-2 flex items-center gap-3 rounded-xl px-3 py-2.5"
          style={{ background: 'rgba(255,255,255,0.04)' }}>
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #FF6B1A, #FF8C42)' }}>A</div>
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-white">Admin User</p>
                <p className="truncate text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>admin@learnos.com</p>
              </motion.div>
            )}
          </AnimatePresence>
          <button className="flex-shrink-0 transition-opacity hover:opacity-70" style={{ color: 'rgba(255,255,255,0.3)' }}>
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </motion.aside>
  )
}
