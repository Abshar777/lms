'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useUIStore } from '@/store/ui.store'
import { ClientSidebar } from '@/components/layout/ClientSidebar'
import { ClientTopbar } from '@/components/layout/ClientTopbar'
import { RightSidebar, RightSidebarToggle } from '@/components/layout/RightSidebar'
import { VerifyEmailBanner } from '@/components/auth/VerifyEmailBanner'
import { InstallPrompt } from '@/components/pwa/InstallPrompt'
import { useIsMobile } from '@/hooks/useIsMobile'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { sidebarCollapsed, navLayout, rightPanelOpen } = useUIStore()
  const isMobile  = useIsMobile()
  const isSidebar = navLayout === 'sidebar'
  const left      = (isSidebar && !isMobile) ? (sidebarCollapsed ? 68 : 240) : 0

  return (
    <div className="min-h-screen" style={{ background: '#F4F5F8' }}>
      {/* Left sidebar — only shown in sidebar layout */}
      <AnimatePresence>
        {isSidebar && <ClientSidebar key="sidebar" />}
      </AnimatePresence>

      <ClientTopbar />

      <motion.main
        animate={{ marginLeft: left }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="min-h-screen pt-[100px]">
        {/* On <lg screens the right panel is hidden, so pr-6 always.
            On lg+ reserve 344px (320 panel + 24 gutter) when open. */}
        <div className={`px-4 py-5 sm:px-6 sm:py-7 transition-[padding] duration-300 ease-out ${
          rightPanelOpen ? 'lg:pr-[344px]' : 'lg:pr-6'
        }`}>
          <VerifyEmailBanner />
          {children}
        </div>
      </motion.main>

      <RightSidebar />
      <RightSidebarToggle />
      <InstallPrompt />
    </div>
  )
}
