'use client'

import { motion } from 'framer-motion'
import { useMemo } from 'react'
import { TrendingUp, Loader2 } from 'lucide-react'
import { useEnrollmentsTimeseries } from '@/lib/api/stats'

export function EnrollmentsChart() {
  const { data, isLoading } = useEnrollmentsTimeseries(30)

  /* SVG geometry. The component is responsive via viewBox + preserveAspectRatio. */
  const VIEW_W = 360
  const VIEW_H = 110
  const PAD_X  = 4
  const PAD_Y  = 10

  const { points, path, maxCount, total } = useMemo(() => {
    if (!data || data.length === 0) {
      return { points: [] as { x: number; y: number; v: number; d: string }[], path: '', maxCount: 0, total: 0 }
    }
    const max = Math.max(1, ...data.map(d => d.count))
    const w = VIEW_W - PAD_X * 2
    const h = VIEW_H - PAD_Y * 2
    const step = data.length > 1 ? w / (data.length - 1) : 0
    const pts = data.map((d, i) => ({
      x: PAD_X + i * step,
      y: PAD_Y + h - (d.count / max) * h,
      v: d.count,
      d: d.date,
    }))
    const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ')
    return { points: pts, path, maxCount: max, total: data.reduce((a, b) => a + b.count, 0) }
  }, [data])

  /* Build the closing area under the line for the gradient fill. */
  const area = useMemo(() => {
    if (points.length === 0) return ''
    const first = points[0]
    const last  = points[points.length - 1]
    if (!first || !last) return ''
    return `${path} L ${last.x.toFixed(2)} ${VIEW_H - PAD_Y} L ${first.x.toFixed(2)} ${VIEW_H - PAD_Y} Z`
  }, [path, points])

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-5"
      style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1.5">
            <TrendingUp size={13} style={{ color: '#FF6B1A' }} />
            <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: '#FF6B1A' }}>
              Last 30 days
            </span>
          </div>
          <h3 className="mt-0.5 text-sm font-bold text-white">New enrollments</h3>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-white" style={{ fontFamily: 'Bricolage Grotesque, sans-serif' }}>
            {total.toLocaleString()}
          </p>
          <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>peak {maxCount}/day</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 py-12 text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
          <Loader2 size={14} className="animate-spin" />Loading…
        </div>
      ) : total === 0 ? (
        <div className="py-10 text-center text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
          No enrollments in the last 30 days.
        </div>
      ) : (
        <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="w-full h-auto" preserveAspectRatio="none">
          <defs>
            <linearGradient id="ec-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"  stopColor="#FF6B1A" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#FF6B1A" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={area} fill="url(#ec-grad)" />
          <path d={path} fill="none" stroke="#FF6B1A" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
          {/* Dot for the most recent day */}
          {points.length > 0 && (() => {
            const p = points[points.length - 1]
            if (!p) return null
            return <circle cx={p.x} cy={p.y} r={2.5} fill="#FF6B1A" />
          })()}
        </svg>
      )}
    </motion.div>
  )
}
