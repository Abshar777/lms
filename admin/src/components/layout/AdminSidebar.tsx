'use client'

import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, BookOpen, Users, GraduationCap,
  Tag, Star, Settings, ChevronLeft, LogOut, X,
  ShoppingBag, Ticket, Map, ClipboardList, Video,
} from 'lucide-react'
import { useUIStore } from '@/store/ui.store'
import { useAllLiveClasses } from '@/lib/api/liveClasses'

const navItems = [
  { label: 'Dashboard',      href: '/',                 icon: LayoutDashboard },
  { label: 'Courses',        href: '/courses',           icon: BookOpen },
  { label: 'Learning Paths', href: '/learning-paths',   icon: Map },
  { label: 'Live Classes',   href: '/live-classes',     icon: Video },
  { label: 'Students',       href: '/students',          icon: Users },
  { label: 'Instructors',    href: '/instructors',       icon: GraduationCap },
  { label: 'Categories',     href: '/categories',        icon: Tag },
  { label: 'Reviews',        href: '/reviews',           icon: Star },
  { label: 'Orders',         href: '/orders',            icon: ShoppingBag },
  { label: 'Coupons',        href: '/coupons',           icon: Ticket },
  { label: 'Audit Logs',     href: '/audit-logs',        icon: ClipboardList },
]

const bottomItems = [
  { label: 'Settings', href: '/settings', icon: Settings },
]

interface SidebarContentProps {
  collapsed: boolean
  onClose?:  () => void
}

function SidebarContent({ collapsed, onClose }: SidebarContentProps) {
  const pathname = usePathname()
  const { data: allLive } = useAllLiveClasses('live')
  const liveNowCount = allLive?.length ?? 0

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  return (
    <>
      {/* ── Logo ─────────────────────────────────── */}
      <div className="flex h-[60px] flex-shrink-0 items-center gap-3 px-4"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl"
          style={{ background: 'linear-gradient(135deg, #FF6B1A, #FF8C42)' }}>
          <GraduationCap size={16} color="#fff" strokeWidth={2} />
        </div>
        <AnimatePresence>
          {!collapsed && (
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

        {/* Mobile close button (shown only when onClose is provided) */}
        {onClose ? (
          <button
            onClick={onClose}
            className="ml-auto flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-white/10"
            style={{ color: 'rgba(255,255,255,0.4)' }}>
            <X size={15} />
          </button>
        ) : (
          /* Desktop collapse toggle */
          <CollapseToggle collapsed={collapsed} />
        )}
      </div>

      {/* ── Nav items ───────────────────────────── */}
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto overflow-x-hidden px-2 py-4">
        {!collapsed && (
          <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-[0.15em]"
            style={{ color: 'rgba(255,255,255,0.2)' }}>Menu</p>
        )}

        {navItems.map(item => {
          const active = isActive(item.href)
          const Icon   = item.icon
          return (
            <Link key={item.href} href={item.href} onClick={onClose}>
              <motion.div
                whileHover={{ x: collapsed ? 0 : 3 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                className="relative flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors"
                style={{
                  background: active ? 'rgba(255,107,26,0.12)' : 'transparent',
                  color: active ? '#FF6B1A' : 'rgba(255,255,255,0.5)',
                }}
                title={collapsed ? item.label : undefined}
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
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -6 }} transition={{ duration: 0.13 }}
                      className="relative z-10 flex flex-1 items-center justify-between whitespace-nowrap text-sm font-medium">
                      {item.label}
                      {/* Pulsing live badge — only on Live Classes item when streams are active */}
                      {item.href === '/live-classes' && liveNowCount > 0 && (
                        <motion.span
                          animate={{ opacity: [1, 0.4, 1] }}
                          transition={{ duration: 1.4, repeat: Infinity }}
                          className="ml-1.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold text-white"
                          style={{ background: '#EF4444' }}>
                          {liveNowCount}
                        </motion.span>
                      )}
                    </motion.span>
                  )}
                </AnimatePresence>
                {/* Collapsed state: small red dot indicator */}
                {collapsed && item.href === '/live-classes' && liveNowCount > 0 && (
                  <motion.span
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 1.4, repeat: Infinity }}
                    className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full"
                    style={{ background: '#EF4444' }}
                  />
                )}
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
            <Link key={item.href} href={item.href} onClick={onClose}>
              <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-white/10"
                style={{ color: 'rgba(255,255,255,0.4)' }} title={collapsed ? item.label : undefined}>
                <Icon size={17} strokeWidth={1.8} className="flex-shrink-0" />
                <AnimatePresence>
                  {!collapsed && (
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
            {!collapsed && (
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
    </>
  )
}

/* Desktop-only collapse toggle (not shown in mobile drawer) */
function CollapseToggle({ collapsed }: { collapsed: boolean }) {
  const { toggleSidebar } = useUIStore()
  return (
    <motion.button
      onClick={toggleSidebar}
      animate={{ marginLeft: collapsed ? 0 : 'auto', rotate: collapsed ? 180 : 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-white/10"
      style={{ color: 'rgba(255,255,255,0.4)' }}>
      <ChevronLeft size={15} />
    </motion.button>
  )
}

export function AdminSidebar() {
  const { sidebarCollapsed, mobileNavOpen, setMobileNav } = useUIStore()
  const w = sidebarCollapsed ? 68 : 240

  return (
    <>
      {/* ── Desktop sidebar: hidden below lg ──────────── */}
      <motion.aside
        animate={{ width: w }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed left-0 top-0 z-40 hidden h-screen flex-col overflow-hidden lg:flex"
        style={{ background: '#0D0F1A', borderRight: '1px solid rgba(255,255,255,0.06)' }}
      >
        <SidebarContent collapsed={sidebarCollapsed} />
      </motion.aside>

      {/* ── Mobile drawer + backdrop: only shown below lg ─ */}
      <AnimatePresence>
        {mobileNavOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="admin-mobile-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/70 lg:hidden"
              onClick={() => setMobileNav(false)}
            />
            {/* Drawer */}
            <motion.aside
              key="admin-mobile-drawer"
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed left-0 top-0 z-50 flex h-screen w-[280px] flex-col overflow-hidden lg:hidden"
              style={{ background: '#0D0F1A' }}
            >
              <SidebarContent collapsed={false} onClose={() => setMobileNav(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
