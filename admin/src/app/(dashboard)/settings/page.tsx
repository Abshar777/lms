'use client'
import { motion } from 'framer-motion'
import { Construction } from 'lucide-react'

export default function Page() {
  return (
    <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 24 }}
        className="flex h-16 w-16 items-center justify-center rounded-3xl"
        style={{ background: 'rgba(255,107,26,0.12)', border: '1px solid rgba(255,107,26,0.22)' }}>
        <Construction size={26} style={{ color: '#FF6B1A' }} />
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="text-center">
        <p className="text-lg font-bold text-white" style={{ fontFamily: 'Bricolage Grotesque, sans-serif' }}>Settings — Coming soon</p>
        <p className="mt-1 text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>This section is under construction.</p>
      </motion.div>
    </div>
  )
}
