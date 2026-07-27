import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface OrgState {
  activeOrgId:   string | null
  activeOrgName: string | null
  activeOrgSlug: string | null
  setOrg: (id: string, name: string, slug: string) => void
  clearOrg: () => void
}

export const useOrgStore = create<OrgState>()(
  persist(
    (set) => ({
      activeOrgId:   null,
      activeOrgName: null,
      activeOrgSlug: null,
      setOrg:   (id, name, slug) => set({ activeOrgId: id, activeOrgName: name, activeOrgSlug: slug }),
      clearOrg: ()               => set({ activeOrgId: null, activeOrgName: null, activeOrgSlug: null }),
    }),
    {
      name: 'lms-active-org',
      storage: {
        getItem:    k => {
          if (typeof sessionStorage === 'undefined') return null
          const raw = sessionStorage.getItem(k)
          return raw ? JSON.parse(raw) : null
        },
        setItem:    (k, v) => typeof sessionStorage !== 'undefined' && sessionStorage.setItem(k, JSON.stringify(v)),
        removeItem: k => typeof sessionStorage !== 'undefined' && sessionStorage.removeItem(k),
      },
    },
  ),
)
