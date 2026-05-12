'use client'

import { motion } from 'framer-motion'
import { Trophy, Star, Flame, TrendingUp, Award, Target, Calendar, ChevronRight } from 'lucide-react'

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } }
const fadeUp  = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 280, damping: 26 } } }

const BADGES = [
  { id: 1, name: 'First Step',       desc: 'Completed your first lesson',   icon: '🎯', color: '#6366F1', bg: '#EEF2FF', earned: true  },
  { id: 2, name: 'Quick Learner',    desc: '5 lessons in a single day',      icon: '⚡', color: '#F59E0B', bg: '#FFFBEB', earned: true  },
  { id: 3, name: '7-Day Streak',     desc: 'Learned 7 days in a row',        icon: '🔥', color: '#EF4444', bg: '#FEF2F2', earned: true  },
  { id: 4, name: 'Course Master',    desc: 'Completed a full course',        icon: '📚', color: '#10B981', bg: '#ECFDF5', earned: true  },
  { id: 5, name: 'Social Learner',   desc: 'Joined 3 discussions',           icon: '💬', color: '#8B5CF6', bg: '#F5F3FF', earned: true  },
  { id: 6, name: 'Design Expert',    desc: 'Finish all design courses',      icon: '🎨', color: '#FF6B1A', bg: '#FFF7ED', earned: false },
  { id: 7, name: 'Night Owl',        desc: 'Study after midnight',           icon: '🦉', color: '#6366F1', bg: '#EEF2FF', earned: false },
  { id: 8, name: 'Top 10',           desc: 'Reach top 10 leaderboard',       icon: '🏆', color: '#F59E0B', bg: '#FFFBEB', earned: false },
]

const LEADERBOARD = [
  { rank: 1, name: 'Sarah Chen',  pts: 2840, avatar: 'S', color: '#F59E0B' },
  { rank: 2, name: 'Alex Kim',    pts: 2610, avatar: 'A', color: '#6366F1' },
  { rank: 3, name: 'John Doe',    pts: 2480, avatar: 'J', color: '#FF6B1A', isYou: true },
  { rank: 4, name: 'Maria López', pts: 2210, avatar: 'M', color: '#10B981' },
  { rank: 5, name: 'Raj Patel',   pts: 1980, avatar: 'R', color: '#8B5CF6' },
]

const STREAK_DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

export default function AchievementsPage() {
  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-8">

      {/* ── Stats row ─────────────────────────────── */}
      <motion.div variants={fadeUp} className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { icon: '🏆', value: '100',  label: 'Total Points',    color: '#F59E0B', bg: '#FFFBEB' },
          { icon: '🎖',  value: '32',   label: 'Badges Earned',   color: '#6366F1', bg: '#EEF2FF' },
          { icon: '📜',  value: '2',    label: 'Certificates',    color: '#10B981', bg: '#ECFDF5' },
          { icon: '🔥',  value: '7',    label: 'Day Streak',      color: '#EF4444', bg: '#FEF2F2' },
        ].map(s => (
          <motion.div key={s.label}
            whileHover={{ y: -3, boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}
            className="flex items-center gap-3 rounded-2xl bg-white p-4"
            style={{ border: '1px solid #E5E7EB', boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}>
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl text-2xl"
              style={{ background: s.bg }}>
              {s.icon}
            </div>
            <div>
              <p className="text-2xl font-bold" style={{ color: '#111827' }}>{s.value}</p>
              <p className="text-xs" style={{ color: '#9CA3AF' }}>{s.label}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
        {/* ── Left ─────────────────────────────────── */}
        <div className="space-y-6">

          {/* Badges */}
          <motion.div variants={fadeUp} className="rounded-2xl bg-white p-5"
            style={{ border: '1px solid #E5E7EB' }}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-bold" style={{ color: '#111827' }}>Your Badges</h2>
              <span className="text-xs font-semibold" style={{ color: '#9CA3AF' }}>
                {BADGES.filter(b => b.earned).length}/{BADGES.length} earned
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {BADGES.map((b, i) => (
                <motion.div key={b.id}
                  initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 + i * 0.05, type: 'spring', stiffness: 300, damping: 25 }}
                  whileHover={{ y: -3 }}
                  className="flex flex-col items-center gap-2 rounded-2xl p-3 text-center transition-all"
                  style={{
                    background: b.earned ? b.bg : '#F9FAFB',
                    border: `1px solid ${b.earned ? b.color + '30' : '#E5E7EB'}`,
                    opacity: b.earned ? 1 : 0.5,
                  }}>
                  <span className="text-2xl">{b.icon}</span>
                  <div>
                    <p className="text-xs font-bold" style={{ color: b.earned ? '#111827' : '#9CA3AF' }}>{b.name}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: '#9CA3AF' }}>{b.desc}</p>
                  </div>
                  {b.earned && (
                    <span className="rounded-lg px-2 py-0.5 text-[9px] font-bold"
                      style={{ background: b.color + '20', color: b.color }}>Earned</span>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Streak calendar */}
          <motion.div variants={fadeUp} className="rounded-2xl bg-white p-5"
            style={{ border: '1px solid #E5E7EB' }}>
            <div className="mb-4 flex items-center gap-2">
              <Flame size={16} style={{ color: '#EF4444' }} />
              <h2 className="text-base font-bold" style={{ color: '#111827' }}>Learning Streak</h2>
            </div>
            <div className="grid grid-cols-7 gap-2">
              {STREAK_DAYS.map((d, i) => (
                <div key={d} className="flex flex-col items-center gap-1.5">
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.3 + i * 0.05 }}
                    className="flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold transition-all"
                    style={i < 7
                      ? { background: 'linear-gradient(135deg,#FF6B1A,#FF8C42)', color: 'white', boxShadow: '0 4px 12px rgba(255,107,26,0.3)' }
                      : { background: '#F3F4F6', color: '#D1D5DB' }}>
                    {i < 7 ? '✓' : ''}
                  </motion.div>
                  <span className="text-[10px] font-medium" style={{ color: '#9CA3AF' }}>{d}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-xl p-3" style={{ background: '#FFF7ED', border: '1px solid rgba(255,107,26,0.18)' }}>
              <p className="text-xs font-semibold" style={{ color: '#FF6B1A' }}>
                🔥 7-day streak! Keep going — your longest streak is <strong>7 days</strong>.
              </p>
            </div>
          </motion.div>
        </div>

        {/* ── Right: Leaderboard ───────────────────── */}
        <motion.div variants={fadeUp} className="rounded-2xl bg-white p-5 lg:sticky lg:top-[116px] lg:self-start"
          style={{ border: '1px solid #E5E7EB' }}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-bold" style={{ color: '#111827' }}>Leaderboard</h2>
            <TrendingUp size={16} style={{ color: '#9CA3AF' }} />
          </div>
          <div className="space-y-2">
            {LEADERBOARD.map((u, i) => (
              <motion.div key={u.rank}
                initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.07 }}
                className="flex items-center gap-3 rounded-xl px-3 py-3 transition-colors"
                style={{
                  background: u.isYou ? 'rgba(255,107,26,0.06)' : 'transparent',
                  border: u.isYou ? '1px solid rgba(255,107,26,0.18)' : '1px solid transparent',
                }}>
                <span className="w-6 text-sm font-bold text-center flex-shrink-0">
                  {u.rank === 1 ? '🥇' : u.rank === 2 ? '🥈' : u.rank === 3 ? '🥉' : `#${u.rank}`}
                </span>
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                  style={{ background: u.color }}>
                  {u.avatar}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate" style={{ color: u.isYou ? '#FF6B1A' : '#111827' }}>
                    {u.name}{u.isYou && ' (You)'}
                  </p>
                  <p className="text-xs" style={{ color: '#9CA3AF' }}>{u.pts.toLocaleString()} pts</p>
                </div>
              </motion.div>
            ))}
          </div>
          <div className="mt-4 rounded-xl p-3 text-center" style={{ background: '#F3F4F6' }}>
            <p className="text-xs" style={{ color: '#6B7280' }}>
              You&apos;re <strong style={{ color: '#111827' }}>130 pts</strong> away from 2nd place!
            </p>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full" style={{ background: '#E5E7EB' }}>
              <motion.div className="h-full rounded-full"
                style={{ background: 'linear-gradient(90deg,#FF6B1A,#FF8C42)', width: '94%' }}
                initial={{ width: 0 }} animate={{ width: '94%' }}
                transition={{ duration: 0.8, ease: 'easeOut', delay: 0.5 }} />
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}
