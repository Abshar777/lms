'use client'

import { motion } from 'framer-motion'
import {
  BookOpen, Users, GraduationCap, DollarSign,
  TrendingUp, Star, Clock, ArrowUpRight,
} from 'lucide-react'
import { StatCard } from '@/components/ui/StatCard'
import { useCourses } from '@/lib/api/courses'
import Link from 'next/link'

const stats = [
  { label: 'Total Courses',   value: 24,       change: 12,  changeLabel: '+3 this month',    icon: BookOpen,     color: '#FF6B1A', prefix: '',  suffix: '',   delay: 0 },
  { label: 'Total Students',  value: 8420,      change: 18,  changeLabel: '+320 this week',   icon: Users,        color: '#2F6BFF', prefix: '',  suffix: '',   delay: 0.05 },
  { label: 'Instructors',     value: 12,        change: 0,   changeLabel: '2 pending review', icon: GraduationCap,color: '#A78BFA', prefix: '',  suffix: '',   delay: 0.1 },
  { label: 'Revenue (MRR)',   value: 14280,     change: 23,  changeLabel: '+$2.6k vs last mo', icon: DollarSign,   color: '#4ADE80', prefix: '$', suffix: '',   delay: 0.15 },
]

const recentActivity = [
  { text: 'New enrollment in UI/UX Design Mastery',     time: '2 min ago',  type: 'enroll' },
  { text: 'Alex Kim submitted course for review',       time: '18 min ago', type: 'course' },
  { text: '5★ review on TypeScript from Zero to Hero',  time: '1 hr ago',   type: 'review' },
  { text: '50 students joined this week',               time: '3 hr ago',   type: 'milestone' },
  { text: 'Maya Patel published Python course update',  time: '5 hr ago',   type: 'publish' },
]

const typeColor: Record<string, string> = {
  enroll: '#4ADE80', course: '#FF6B1A', review: '#FACC15', milestone: '#2F6BFF', publish: '#A78BFA',
}

export default function DashboardPage() {
  const { data: coursesData } = useCourses({ per_page: 5, status: 'published' })

  return (
    <div className="space-y-8">
      {/* ── Welcome ─────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 24 }}>
        <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Bricolage Grotesque, sans-serif' }}>
          Good morning, Admin 👋
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
          Here's what's happening with LearnOS today.
        </p>
      </motion.div>

      {/* ── Stat cards ──────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(s => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      {/* ── Bottom grid ─────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Recent courses ─ 3/5 */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 240, damping: 24 }}
          className="col-span-3 rounded-2xl overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <h2 className="text-sm font-semibold text-white">Recent Courses</h2>
            <Link href="/courses" className="flex items-center gap-1 text-xs font-semibold transition-opacity hover:opacity-70" style={{ color: '#FF6B1A' }}>
              View all <ArrowUpRight size={12} />
            </Link>
          </div>
          <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
            {coursesData?.docs.map((c, i) => (
              <motion.div key={c.id}
                initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25 + i * 0.04 }}
                className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-white/03">
                <div className="relative h-10 w-16 flex-shrink-0 overflow-hidden rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.06)' }}>
                  {c.thumbnailUrl && <img src={c.thumbnailUrl} alt="" className="h-full w-full object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">{c.title}</p>
                  <div className="mt-0.5 flex items-center gap-2">
                    <span className="flex items-center gap-1 text-[11px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
                      <Users size={10} />{c.enrolledCount.toLocaleString()}
                    </span>
                    {c.ratingAvg > 0 && (
                      <span className="flex items-center gap-1 text-[11px]" style={{ color: '#FACC15' }}>
                        <Star size={10} fill="#FACC15" />{c.ratingAvg.toFixed(1)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-semibold text-white">
                    {c.isFree ? 'Free' : `$${c.price}`}
                  </p>
                  <span className="text-[10px] font-semibold"
                    style={{ color: c.status === 'published' ? '#4ADE80' : '#FACC15' }}>
                    {c.status}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Activity feed ─ 2/5 */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, type: 'spring', stiffness: 240, damping: 24 }}
          className="col-span-2 rounded-2xl overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <h2 className="text-sm font-semibold text-white">Recent Activity</h2>
          </div>
          <div className="px-5 py-3 space-y-0">
            {recentActivity.map((a, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.05 }}
                className="flex items-start gap-3 py-3"
                style={{ borderBottom: i < recentActivity.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                <div className="mt-0.5 h-2 w-2 flex-shrink-0 rounded-full"
                  style={{ background: typeColor[a.type] ?? '#FF6B1A', marginTop: 6 }} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.7)' }}>{a.text}</p>
                  <p className="mt-0.5 text-[10px] flex items-center gap-1" style={{ color: 'rgba(255,255,255,0.25)' }}>
                    <Clock size={9} />{a.time}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ── Quick actions ────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, type: 'spring', stiffness: 240, damping: 24 }}
        className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Add Course',      href: '/courses/new',       icon: BookOpen,     color: '#FF6B1A' },
          { label: 'View Students',   href: '/students',          icon: Users,        color: '#2F6BFF' },
          { label: 'Revenue Report',  href: '/settings',          icon: TrendingUp,   color: '#4ADE80' },
          { label: 'Reviews Queue',   href: '/reviews',           icon: Star,         color: '#FACC15' },
        ].map((a, i) => {
          const Icon = a.icon
          return (
            <Link key={a.href} href={a.href}>
              <motion.div
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + i * 0.04 }}
                whileHover={{ y: -3, boxShadow: `0 12px 32px rgba(0,0,0,0.3)` }}
                whileTap={{ scale: 0.97 }}
                className="flex cursor-pointer items-center gap-3 rounded-2xl p-4 transition-colors"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl"
                  style={{ background: `${a.color}18`, border: `1px solid ${a.color}28` }}>
                  <Icon size={16} style={{ color: a.color }} strokeWidth={1.8} />
                </div>
                <span className="text-sm font-semibold text-white">{a.label}</span>
              </motion.div>
            </Link>
          )
        })}
      </motion.div>
    </div>
  )
}
