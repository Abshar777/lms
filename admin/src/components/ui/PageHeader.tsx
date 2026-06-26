'use client'

import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

interface PageHeaderProps {
  title:    string
  subtitle?: string
  actions?: ReactNode
  badge?:   { label: string; color?: string }
}

export function PageHeader({ title, subtitle, actions, badge }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between mb-6">
      <motion.div
        initial={{ opacity: 0, x: -16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 26 }}>
        <div className="flex items-center gap-3">
          <h1
            className="text-2xl font-bold tracking-tight text-white"
            style={{ fontFamily: 'Bricolage Grotesque, sans-serif' }}>
            {title}
          </h1>
          {badge && (
            <span className="rounded-lg px-2 py-0.5 text-xs font-semibold"
              style={{ background: `${badge.color ?? '#0057b8'}18`, color: badge.color ?? '#0057b8', border: `1px solid ${badge.color ?? '#0057b8'}28` }}>
              {badge.label}
            </span>
          )}
        </div>
        {subtitle && (
          <p className="mt-0.5 text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>{subtitle}</p>
        )}
      </motion.div>

      {actions && (
        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 26, delay: 0.05 }}
          className="flex items-center gap-2 mt-3 sm:mt-0">
          {actions}
        </motion.div>
      )}
    </div>
  )
}
