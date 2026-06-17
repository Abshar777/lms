import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ImpersonatedUser {
  id: string; name: string; email: string; role: string; avatarUrl?: string
}

interface ImpersonationState {
  token:            string | null
  impersonatedUser: ImpersonatedUser | null
  startImpersonation: (token: string, user: ImpersonatedUser) => void
  endImpersonation:   () => void
}

export const useImpersonationStore = create<ImpersonationState>()(
  persist(
    (set) => ({
      token:            null,
      impersonatedUser: null,
      startImpersonation: (token, user) => set({ token, impersonatedUser: user }),
      endImpersonation:   ()            => set({ token: null, impersonatedUser: null }),
    }),
    {
      name: 'lms-impersonation',
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
