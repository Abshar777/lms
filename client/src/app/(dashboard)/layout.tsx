'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useUIStore } from '@/store/ui.store'
import { ClientSidebar } from '@/components/layout/ClientSidebar'
import { ClientTopbar } from '@/components/layout/ClientTopbar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { sidebarCollapsed, navLayout } = useUIStore()
  const isSidebar = navLayout === 'sidebar'
  const left      = isSidebar ? (sidebarCollapsed ? 68 : 240) : 0

  return (
    <div className="min-h-screen" style={{ background: '#F4F5F8' }}>
      {/* Sidebar — only shown in sidebar layout */}
      <AnimatePresence>
        {isSidebar && <ClientSidebar key="sidebar" />}
      </AnimatePresence>

      <ClientTopbar />

      <motion.main
        animate={{ marginLeft: left }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="min-h-screen pt-[100px]">
        <div className="px-6 py-7">
          {children}
        </div>
      </motion.main>
    </div>
  )
}
