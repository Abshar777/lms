'use client'

import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BookOpen, GraduationCap, Trophy,
  Settings, ChevronLeft, LogOut, Flame,
} from 'lucide-react'
import { useUIStore } from '@/store/ui.store'

const navItems = [
  { label: 'My Learning',  href: '/my-learning',  icon: GraduationCap },
  { label: 'Catalog',      href: '/courses',       icon: BookOpen },
  { label: 'Achievements', href: '/achievements',  icon: Trophy },
]
const bottomItems = [{ label: 'Settings', href: '/settings', icon: Settings }]

/* stagger for nav items — each slides in from top */
const itemVariants = {
  hidden: { opacity: 0, y: -14 },
  show:   (i: number) => ({
    opacity: 1, y: 0,
    transition: { type: 'spring' as const, stiffness: 300, damping: 26, delay: 0.08 + i * 0.05 },
  }),
}

export function ClientSidebar() {
  const pathname = usePathname()
  const { sidebarCollapsed, toggleSidebar } = useUIStore()
  const w = sidebarCollapsed ? 68 : 240

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  return (
    <motion.aside
      /* ── Slides down from top on mount, exits up ── */
      initial={{ y: -20, opacity: 0 }}
      animate={{ width: w, y: 0, opacity: 1 }}
      exit={{ y: -20, opacity: 0 }}
      transition={{
        y:     { type: 'spring', stiffness: 280, damping: 28, mass: 0.8 },
        width: { type: 'spring', stiffness: 300, damping: 30 },
      }}
      className="fixed left-0 top-0 z-40 flex h-screen flex-col overflow-hidden bg-white"
      style={{ borderRight: '1px solid #E4E7ED' }}>

      {/* ── Logo ─────────────────────────────────── */}
      <div className="flex h-[60px] flex-shrink-0 items-center gap-3 px-4"
        style={{ borderBottom: '1px solid #E4E7ED' }}>
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl"
          style={{ background: 'linear-gradient(135deg,#FF6B1A,#FF8C42)' }}>
          <Flame size={15} color="#fff" strokeWidth={2.2} />
        </div>
        <AnimatePresence>
          {!sidebarCollapsed && (
            <motion.span
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}
              className="whitespace-nowrap font-bold"
              style={{ fontFamily: 'Bricolage Grotesque, sans-serif', fontSize: 16, color: '#0D0F1A' }}>
              LearnOS
            </motion.span>
          )}
        </AnimatePresence>
        <motion.button
          onClick={toggleSidebar}
          animate={{ marginLeft: sidebarCollapsed ? 0 : 'auto', rotate: sidebarCollapsed ? 180 : 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-orange-50"
          style={{ color: '#FF6B1A' }}>
          <ChevronLeft size={15} />
        </motion.button>
      </div>

      {/* ── Nav ─────────────────────────────────── */}
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto overflow-x-hidden px-2 py-4">
        <AnimatePresence>
          {!sidebarCollapsed && (
            <motion.p
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.12 }}
              className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-[0.15em]"
              style={{ color: '#9CA3AF' }}>
              Menu
            </motion.p>
          )}
        </AnimatePresence>

        {navItems.map((item, i) => {
          const active = isActive(item.href)
          const Icon   = item.icon
          return (
            <motion.div key={item.href} custom={i} variants={itemVariants} initial="hidden" animate="show">
              <Link href={item.href}>
                <motion.div
                  whileHover={{ x: sidebarCollapsed ? 0 : 3 }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                  className="relative flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors"
                  style={{
                    background: active ? 'rgba(255,107,26,0.08)' : 'transparent',
                    color:      active ? '#FF6B1A' : '#4B5563',
                  }}
                  title={sidebarCollapsed ? item.label : undefined}>
                  {active && (
                    <motion.div layoutId="client-sidebar-active" className="absolute inset-0 rounded-xl"
                      style={{ background: 'rgba(255,107,26,0.08)', border: '1px solid rgba(255,107,26,0.18)' }}
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }} />
                  )}
                  <Icon size={17} className="relative z-10 flex-shrink-0" strokeWidth={active ? 2.2 : 1.8} />
                  <AnimatePresence>
                    {!sidebarCollapsed && (
                      <motion.span
                        initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.13 }}
                        className="relative z-10 whitespace-nowrap text-sm font-medium">
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.div>
              </Link>
            </motion.div>
          )
        })}
      </nav>

      {/* ── Bottom ──────────────────────────────── */}
      <div className="flex-shrink-0 px-2 pb-4" style={{ borderTop: '1px solid #E4E7ED', paddingTop: 12 }}>
        {bottomItems.map((item, i) => {
          const Icon = item.icon
          return (
            <motion.div key={item.href} custom={navItems.length + i} variants={itemVariants} initial="hidden" animate="show">
              <Link href={item.href}>
                <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-orange-50"
                  style={{ color: '#9CA3AF' }} title={sidebarCollapsed ? item.label : undefined}>
                  <Icon size={17} strokeWidth={1.8} className="flex-shrink-0" />
                  <AnimatePresence>
                    {!sidebarCollapsed && (
                      <motion.span initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                        className="whitespace-nowrap text-sm font-medium">{item.label}</motion.span>
                    )}
                  </AnimatePresence>
                </div>
              </Link>
            </motion.div>
          )
        })}

        {/* User row */}
        <div className="mt-2 flex items-center gap-3 rounded-xl px-3 py-2.5"
          style={{ background: '#F4F5F8', border: '1px solid #E4E7ED' }}>
          <div className="relative h-8 w-8 flex-shrink-0 overflow-hidden rounded-full">
            <div className="flex h-full w-full items-center justify-center text-xs font-bold text-white"
              style={{ background: 'linear-gradient(135deg,#FF6B1A,#FF8C42)' }}>A</div>
            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white"
              style={{ background: '#0ECC8E' }} />
          </div>
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold" style={{ color: '#0D0F1A' }}>Adit Irwan</p>
                <p className="truncate text-[10px]" style={{ color: '#9CA3AF' }}>student@learnos.com</p>
              </motion.div>
            )}
          </AnimatePresence>
          <button
            onClick={() => { document.cookie = 'learnos_auth=; path=/; max-age=0'; window.location.href = '/login' }}
            className="flex-shrink-0 transition-all hover:text-red-500" style={{ color: '#9CA3AF' }}>
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </motion.aside>
  )
}
