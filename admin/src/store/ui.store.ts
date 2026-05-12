import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UIState {
  sidebarCollapsed: boolean
  toggleSidebar:    () => void
  setSidebar:       (v: boolean) => void

  deleteModalOpen:  boolean
  deleteTargetId:   string | null
  deleteTargetName: string | null
  openDeleteModal:  (id: string, name: string) => void
  closeDeleteModal: () => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      toggleSidebar:    () => set(s => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebar:       (v) => set({ sidebarCollapsed: v }),

      deleteModalOpen:  false,
      deleteTargetId:   null,
      deleteTargetName: null,
      openDeleteModal:  (id, name) => set({ deleteModalOpen: true, deleteTargetId: id, deleteTargetName: name }),
      closeDeleteModal: () => set({ deleteModalOpen: false, deleteTargetId: null, deleteTargetName: null }),
    }),
    { name: 'lms-admin-ui', partialize: (s) => ({ sidebarCollapsed: s.sidebarCollapsed }) },
  ),
)
