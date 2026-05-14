'use client'

import { motion } from 'framer-motion'
import { Flame, Target, Calendar, Trophy } from 'lucide-react'
import { useMyStreak } from '@/lib/api/streaks'

export function StreakWidget() {
  const { data: streak, isLoading } = useMyStreak()

  if (isLoading) {
    return (
      <div className="h-[120px] animate-pulse rounded-2xl" style={{ background: '#F9FAFB', border: '1px solid #E4E7ED' }} />
    )
  }

  const current = streak?.currentStreak ?? 0
  const goal    = streak?.weeklyGoal ?? 5
  const done    = streak?.weekProgress ?? 0
  const pct     = Math.min(100, Math.round((done / goal) * 100))

  return (
    <div className="rounded-2xl bg-white p-4" style={{ border: '1px solid #E4E7ED' }}>
      <div className="mb-3 flex items-center gap-1.5">
        <Flame size={13} style={{ color: '#FF6B1A' }} />
        <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: '#FF6B1A' }}>
          Your streak
        </span>
      </div>

      <div className="flex items-center gap-4 mb-3">
        {/* Current streak */}
        <div className="flex items-center gap-1.5">
          <span className="text-3xl font-bold tabular-nums" style={{ color: current > 0 ? '#FF6B1A' : '#D1D5DB', fontFamily: 'Bricolage Grotesque, sans-serif' }}>
            {current}
          </span>
          <div>
            <p className="text-xs font-semibold" style={{ color: '#0D0F1A' }}>day{current !== 1 ? 's' : ''}</p>
            <p className="text-[10px]" style={{ color: '#9CA3AF' }}>current</p>
          </div>
        </div>

        <div className="h-8 w-px" style={{ background: '#F0F1F5' }} />

        {/* Longest */}
        <div className="flex items-center gap-1.5">
          <Trophy size={13} style={{ color: '#F59E0B' }} />
          <div>
            <p className="text-xs font-semibold tabular-nums" style={{ color: '#0D0F1A' }}>
              {streak?.longestStreak ?? 0}d
            </p>
            <p className="text-[10px]" style={{ color: '#9CA3AF' }}>best</p>
          </div>
        </div>

        <div className="h-8 w-px" style={{ background: '#F0F1F5' }} />

        {/* Total */}
        <div className="flex items-center gap-1.5">
          <Calendar size={13} style={{ color: '#6366F1' }} />
          <div>
            <p className="text-xs font-semibold tabular-nums" style={{ color: '#0D0F1A' }}>
              {streak?.totalDaysActive ?? 0}
            </p>
            <p className="text-[10px]" style={{ color: '#9CA3AF' }}>total days</p>
          </div>
        </div>
      </div>

      {/* Weekly goal */}
      <div>
        <div className="mb-1 flex items-center justify-between text-[11px]">
          <span className="flex items-center gap-1" style={{ color: '#6B7280' }}>
            <Target size={10} />Weekly goal
          </span>
          <span className="font-semibold" style={{ color: pct >= 100 ? '#22C55E' : '#0D0F1A' }}>
            {done}/{goal} lessons
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full" style={{ background: '#F3F4F6' }}>
          <motion.div
            className="h-full rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            style={{ background: pct >= 100 ? '#22C55E' : 'linear-gradient(90deg, #FF6B1A, #F59E0B)' }}
          />
        </div>
      </div>
    </div>
  )
}
