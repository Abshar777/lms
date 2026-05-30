import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type NavLayout = 'sidebar' | 'topbar'

export type ToastKind = 'success' | 'error' | 'info'
export interface Toast {
  id:     string
  kind:   ToastKind
  title:  string
  body?:  string
}

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

  /* Toasts */
  toasts:    Toast[]
  pushToast: (t: Omit<Toast, 'id'>) => void
  popToast:  (id: string) => void
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

      toasts:    [],
      pushToast: (t) => {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
        set(s => ({ toasts: [...s.toasts, { ...t, id }] }))
      },
      popToast: (id) => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })),
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

/* Convenience hook — useToast().success("Done!") */
export function useToast() {
  const push = useUIStore(s => s.pushToast)
  return {
    success: (title: string, body?: string) => push({ kind: 'success', title, body }),
    error:   (title: string, body?: string) => push({ kind: 'error',   title, body }),
    info:    (title: string, body?: string) => push({ kind: 'info',    title, body }),
  }
}
