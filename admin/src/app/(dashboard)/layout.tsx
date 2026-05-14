'use client'

import { useUIStore } from '@/store/ui.store'
import { AdminSidebar } from '@/components/layout/AdminSidebar'
import { AdminTopbar } from '@/components/layout/AdminTopbar'
import { DeleteModal } from '@/components/courses/DeleteModal'
import { Toaster } from '@/components/ui/Toaster'
import { AdminGuard } from '@/components/auth/AdminGuard'
import { motion } from 'framer-motion'
import { useIsMobile } from '@/hooks/useIsMobile'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { sidebarCollapsed } = useUIStore()
  const isMobile = useIsMobile()
  const left = isMobile ? 0 : (sidebarCollapsed ? 68 : 240)

  return (
    <AdminGuard>
      <div className="min-h-screen" style={{ background: '#080A12' }}>
        <AdminSidebar />
        <AdminTopbar />

        <motion.main
          animate={{ marginLeft: left }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="min-h-screen pt-[60px]"
        >
          <div className="px-4 py-4 sm:px-6 sm:py-6">
            {children}
          </div>
        </motion.main>

        <DeleteModal />
        <Toaster />
      </div>
    </AdminGuard>
  )
}
