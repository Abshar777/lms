'use client'

import { motion } from 'framer-motion'
import { useMemo, useState } from 'react'
import { DollarSign } from 'lucide-react'
import { useRevenueTimeseries } from '@/lib/api/stats'
import Spinner from '@/components/ui/Spinner'

const PERIOD_OPTIONS = [
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
  { label: '1y',  days: 365 },
]

export function RevenueChart() {
  const [days, setDays] = useState(30)
  const { data, isLoading } = useRevenueTimeseries(days)

  const VIEW_W = 360
  const VIEW_H = 110
  const PAD_X  = 4
  const PAD_Y  = 10

  const { points, path, totalCents, maxAmount } = useMemo(() => {
    if (!data || data.length === 0) {
      return { points: [] as { x: number; y: number; v: number }[], path: '', totalCents: 0, maxAmount: 0 }
    }
    const max  = Math.max(1, ...data.map(d => d.amount))
    const total = data.reduce((a, b) => a + b.amount, 0)
    const w    = VIEW_W - PAD_X * 2
    const h    = VIEW_H - PAD_Y * 2
    const step = data.length > 1 ? w / (data.length - 1) : 0
    const pts  = data.map((d, i) => ({
      x: PAD_X + i * step,
      y: PAD_Y + h - (d.amount / max) * h,
      v: d.amount,
    }))
    const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ')
    return { points: pts, path, totalCents: total, maxAmount: max }
  }, [data])

  const area = useMemo(() => {
    if (points.length === 0) return ''
    const first = points[0]!
    const last  = points[points.length - 1]!
    return `${path} L ${last.x.toFixed(2)} ${VIEW_H - PAD_Y} L ${first.x.toFixed(2)} ${VIEW_H - PAD_Y} Z`
  }, [path, points])

  const formatUSD = (cents: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(cents / 100)

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-5"
      style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1.5">
            <DollarSign size={13} style={{ color: '#4ADE80' }} />
            <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: '#4ADE80' }}>
              Revenue
            </span>
          </div>
          <h3 className="mt-0.5 text-sm font-bold text-white">Stripe payments</h3>
        </div>

        <div className="flex items-center gap-2">
          {/* Period selector */}
          <div className="flex items-center gap-1 rounded-lg p-0.5"
            style={{ background: 'rgba(255,255,255,0.06)' }}>
            {PERIOD_OPTIONS.map(o => (
              <button key={o.days} onClick={() => setDays(o.days)}
                className="rounded px-2.5 py-1 text-[11px] font-semibold transition-colors"
                style={{
                  background: days === o.days ? 'rgba(255,255,255,0.12)' : 'transparent',
                  color:      days === o.days ? 'white' : 'rgba(255,255,255,0.4)',
                }}>
                {o.label}
              </button>
            ))}
          </div>

          <div className="text-right">
            <p className="text-2xl font-bold text-white" style={{ fontFamily: 'Bricolage Grotesque, sans-serif' }}>
              {formatUSD(totalCents)}
            </p>
            <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
              peak {formatUSD(maxAmount)}/day
            </p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 py-12 text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
          <Spinner size={14} />Loading…
        </div>
      ) : totalCents === 0 ? (
        <div className="py-10 text-center text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
          No revenue yet — paid enrollments will appear here.
        </div>
      ) : (
        <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="w-full h-auto" preserveAspectRatio="none">
          <defs>
            <linearGradient id="rev-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#4ADE80" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#4ADE80" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={area} fill="url(#rev-grad)" />
          <path d={path} fill="none" stroke="#4ADE80" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
          {points.length > 0 && (() => {
            const p = points[points.length - 1]!
            return <circle cx={p.x} cy={p.y} r={2.5} fill="#4ADE80" />
          })()}
        </svg>
      )}
    </motion.div>
  )
}
