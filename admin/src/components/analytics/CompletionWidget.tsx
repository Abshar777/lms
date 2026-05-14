'use client'

import { motion } from 'framer-motion'
import { CheckCircle2, Loader2, Activity } from 'lucide-react'
import { useCompletionStats } from '@/lib/api/stats'

export function CompletionWidget() {
  const { data, isLoading } = useCompletionStats()

  const pct = data?.completionRate ?? 0
  /* Render as a circular progress ring. */
  const R = 32
  const C = 2 * Math.PI * R

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-5"
      style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="mb-3 flex items-center gap-1.5">
        <Activity size={13} style={{ color: '#4ADE80' }} />
        <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: '#4ADE80' }}>
          Completion
        </span>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 py-8 text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
          <Loader2 size={14} className="animate-spin" />Loading…
        </div>
      ) : (
        <div className="flex items-center gap-5">
          <div className="relative">
            <svg width={80} height={80}>
              <circle cx={40} cy={40} r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={5} />
              <motion.circle cx={40} cy={40} r={R} fill="none" stroke="#4ADE80" strokeWidth={5}
                strokeLinecap="round"
                strokeDasharray={C}
                initial={{ strokeDashoffset: C }}
                animate={{ strokeDashoffset: C - (pct / 100) * C }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                style={{ transformOrigin: '50% 50%', rotate: '-90deg' }} />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-base font-bold text-white" style={{ fontFamily: 'Bricolage Grotesque, sans-serif' }}>
                {pct.toFixed(1)}%
              </span>
            </div>
          </div>
          <div className="min-w-0 flex-1 space-y-1.5">
            <Row label="Completed" value={data?.completed ?? 0} color="#4ADE80" Icon={CheckCircle2} />
            <Row label="In progress" value={data?.active ?? 0} color="#FF6B1A" />
            <Row label="Dropped" value={data?.dropped ?? 0} color="rgba(255,255,255,0.3)" />
          </div>
        </div>
      )}
    </motion.div>
  )
}

function Row({ label, value, color, Icon }: { label: string; value: number; color: string; Icon?: React.ElementType }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="inline-flex items-center gap-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
        {Icon ? <Icon size={10} style={{ color }} /> : <span className="h-2 w-2 rounded-full" style={{ background: color }} />}
        {label}
      </span>
      <span className="font-semibold tabular-nums text-white">{value.toLocaleString()}</span>
    </div>
  )
}
