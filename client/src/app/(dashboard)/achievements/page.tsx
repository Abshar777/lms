'use client'

import { motion } from 'framer-motion'
import {
  Trophy, Star, Flame, Award, Target, Crown, Heart, GraduationCap, Rocket, Medal, Loader2,
} from 'lucide-react'
import { useMyAchievements, type Achievement } from '@/lib/api/achievements'

const ICON_MAP: Record<Achievement['iconKey'], React.ElementType> = {
  rocket: Rocket,
  flame:  Flame,
  trophy: Trophy,
  star:   Star,
  medal:  Medal,
  crown:  Crown,
  heart:  Heart,
  graduation: GraduationCap,
}

const ICON_COLORS: Record<Achievement['iconKey'], { fg: string; bg: string }> = {
  rocket:     { fg: '#6366F1', bg: 'rgba(99,102,241,0.10)' },
  flame:      { fg: '#EF4444', bg: 'rgba(239,68,68,0.10)' },
  trophy:     { fg: '#F59E0B', bg: 'rgba(245,158,11,0.10)' },
  star:       { fg: '#FBBF24', bg: 'rgba(251,191,36,0.10)' },
  medal:      { fg: '#10B981', bg: 'rgba(16,185,129,0.10)' },
  crown:      { fg: '#A855F7', bg: 'rgba(168,85,247,0.10)' },
  heart:      { fg: '#EC4899', bg: 'rgba(236,72,153,0.10)' },
  graduation: { fg: '#0057b8', bg: 'rgba(0,87,184,0.10)' },
}

export default function AchievementsPage() {
  const { data, isLoading } = useMyAchievements()
  const items = data?.items ?? []
  const earned = items.filter(a => a.earned)
  const inProgress = items.filter(a => !a.earned)

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Trophy size={14} style={{ color: '#F59E0B' }} />
          <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: '#F59E0B' }}>
            Achievements
          </span>
        </div>
        <h1 className="text-2xl font-bold" style={{ color: '#111827', fontFamily: 'Bricolage Grotesque, sans-serif' }}>
          Badges
          {data && (
            <span className="ml-2 inline-flex items-center justify-center rounded-lg px-2 py-0.5 text-sm font-bold"
              style={{ background: 'rgba(245,158,11,0.10)', color: '#F59E0B' }}>
              {data.earnedCount} / {data.total}
            </span>
          )}
        </h1>
        <p className="mt-1 text-sm" style={{ color: '#6B7280' }}>
          Milestones you&apos;ve hit on your learning journey.
        </p>
      </motion.div>

      {isLoading && (
        <div className="flex items-center justify-center gap-2 py-16 text-sm" style={{ color: '#9CA3AF' }}>
          <Loader2 size={14} className="animate-spin" />Loading achievements…
        </div>
      )}

      {earned.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-widest" style={{ color: '#9CA3AF' }}>
            Earned
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {earned.map((a, i) => <BadgeCard key={a.id} a={a} index={i} />)}
          </div>
        </section>
      )}

      {inProgress.length > 0 && (
        <section>
          <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-widest" style={{ color: '#9CA3AF' }}>
            In progress
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {inProgress.map((a, i) => <BadgeCard key={a.id} a={a} index={i} />)}
          </div>
        </section>
      )}
    </div>
  )
}

function BadgeCard({ a, index }: { a: Achievement; index: number }) {
  const Icon = ICON_MAP[a.iconKey]
  const palette = ICON_COLORS[a.iconKey]
  const pct = a.target > 0 ? Math.min(100, Math.round((a.progress / a.target) * 100)) : 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}
      className="rounded-2xl bg-white p-4 transition-all hover:shadow-md"
      style={{
        border: a.earned ? `1px solid ${palette.fg}40` : '1px solid #E5E7EB',
        opacity: a.earned ? 1 : 0.85,
      }}>
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl"
          style={{
            background: a.earned ? palette.bg : '#F4F5F8',
            border: `1px solid ${a.earned ? palette.fg + '40' : '#E5E7EB'}`,
          }}>
          <Icon size={20} style={{ color: a.earned ? palette.fg : '#9CA3AF' }} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-bold" style={{ color: a.earned ? '#111827' : '#6B7280' }}>{a.title}</p>
            {a.earned && (
              <Award size={12} style={{ color: palette.fg }} />
            )}
          </div>
          <p className="mt-1 text-xs leading-relaxed" style={{ color: '#6B7280' }}>{a.description}</p>

          {!a.earned && a.target > 1 && (
            <div className="mt-2.5">
              <div className="flex items-center justify-between text-[10px]" style={{ color: '#9CA3AF' }}>
                <span>{a.progress} / {a.target}</span>
                <span>{pct}%</span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full" style={{ background: '#F3F4F6' }}>
                <motion.div className="h-full rounded-full"
                  initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.7, ease: 'easeOut' }}
                  style={{ background: palette.fg }} />
              </div>
            </div>
          )}

          {a.earned && a.earnedAt && (
            <p className="mt-1.5 text-[10px]" style={{ color: '#9CA3AF' }}>
              Earned {new Date(a.earnedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  )
}
