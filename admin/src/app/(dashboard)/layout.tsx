'use client'

import { useUIStore } from '@/store/ui.store'
import { AdminSidebar } from '@/components/layout/AdminSidebar'
import { AdminTopbar } from '@/components/layout/AdminTopbar'
import { DeleteModal } from '@/components/courses/DeleteModal'
import { motion } from 'framer-motion'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { sidebarCollapsed } = useUIStore()
  const left = sidebarCollapsed ? 68 : 240

  return (
    <div className="min-h-screen" style={{ background: '#080A12' }}>
      <AdminSidebar />
      <AdminTopbar />

      <motion.main
        animate={{ marginLeft: left }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="min-h-screen pt-[60px]"
      >
        <div className="px-6 py-6">
          {children}
        </div>
      </motion.main>

      <DeleteModal />
    </div>
  )
}
