import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type NavLayout = 'sidebar' | 'topbar'

interface UIState {
  sidebarCollapsed: boolean
  toggleSidebar:    () => void
  setSidebar:       (v: boolean) => void
  mobileNavOpen:    boolean
  setMobileNav:     (v: boolean) => void
  navLayout:        NavLayout
  setNavLayout:     (v: NavLayout) => void

  /* Right-side activity panel */
  rightPanelOpen:   boolean
  toggleRightPanel: () => void
  setRightPanel:    (v: boolean) => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      toggleSidebar:    () => set(s => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebar:       (v) => set({ sidebarCollapsed: v }),
      mobileNavOpen:    false,
      setMobileNav:     (v) => set({ mobileNavOpen: v }),
      navLayout:        'sidebar',
      setNavLayout:     (v) => set({ navLayout: v }),

      rightPanelOpen:   true,
      toggleRightPanel: () => set(s => ({ rightPanelOpen: !s.rightPanelOpen })),
      setRightPanel:    (v) => set({ rightPanelOpen: v }),
    }),
    {
      name: 'lms-client-ui',
      partialize: (s) => ({
        sidebarCollapsed: s.sidebarCollapsed,
        navLayout:        s.navLayout,
        rightPanelOpen:   s.rightPanelOpen,
      }),
    },
  ),
)
