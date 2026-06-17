'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPatch, api } from '@/lib/axios'

export interface CurrentUser {
  id:          string
  name:        string
  email:       string
  avatarUrl?:  string
  role:        'student' | 'instructor' | 'admin'
  headline?:   string
  bio?:        string
  websiteUrl?: string
  isVerified:  boolean
  isActive:    boolean
  category?:   '4x-trading' | 'digital-marketing'
  enrollmentStatus?:            'pending' | 'approved' | 'cancelled'
  enrollmentCancellationReason?: string
  createdAt:   string
  updatedAt:   string
}

export const userKeys = {
  me: ['auth', 'me'] as const,
}

/* GET /auth/me — the authenticated user behind the lms_at cookie. */
export function useCurrentUser() {
  return useQuery({
    queryKey: userKeys.me,
    queryFn:  async () => {
      const data = await apiGet<{ user: CurrentUser }>('/auth/me')
      return data.user
    },
    retry: false,
    staleTime: 60_000,
  })
}

/* PATCH /auth/me — update name / headline / bio / avatarUrl / websiteUrl. */
export function useUpdateProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: Partial<Pick<CurrentUser, 'name' | 'headline' | 'bio' | 'avatarUrl' | 'websiteUrl'>>) => {
      const data = await apiPatch<{ user: CurrentUser }>('/auth/me', input)
      return data.user
    },
    onSuccess: (user) => {
      /* Update the cache directly so the UI reflects the change instantly. */
      qc.setQueryData<CurrentUser>(userKeys.me, user)
    },
  })
}

/* POST /auth/logout — server clears the cookies. */
export function logout(): Promise<void> {
  return api.post('/auth/logout').then(() => {/* no-op */}).catch(() => {/* best-effort */})
}

/* PATCH /auth/me/password */
export function useChangePassword() {
  return useMutation({
    mutationFn: ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) =>
      api.patch('/auth/me/password', { currentPassword, newPassword }),
  })
}

/* POST /auth/forgot-password — always succeeds visibly. */
export function forgotPassword(email: string): Promise<void> {
  return api.post('/auth/forgot-password', { email }).then(() => {/* no-op */})
}

/* POST /auth/reset-password */
export function resetPassword(token: string, password: string): Promise<void> {
  return api.post('/auth/reset-password', { token, password }).then(() => {/* no-op */})
}

/* POST /auth/verify-email */
export function verifyEmail(token: string): Promise<void> {
  return api.post('/auth/verify-email', { token }).then(() => {/* no-op */})
}

/* POST /auth/resend-verification (authenticated) */
export function resendVerification(): Promise<void> {
  return api.post('/auth/resend-verification').then(() => {/* no-op */})
}

/* ─── Active sessions ─────────────────────────────── */
export interface ActiveSession {
  id:          string
  userAgent?:  string
  ip?:         string
  lastUsedAt?: string
  createdAt:   string
  expiresAt:   string
  isCurrent:   boolean
}

export const sessionsKey = ['auth', 'sessions'] as const

export function useActiveSessions() {
  return useQuery({
    queryKey: sessionsKey,
    queryFn:  () => apiGet<ActiveSession[]>('/auth/sessions'),
    staleTime: 15_000,
  })
}

export function useRevokeSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete<{ success: true; data: { revokedCurrent: boolean } }>(`/auth/sessions/${id}`)
      return res.data.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: sessionsKey }),
  })
}

/* ─── Account lifecycle ───────────────────────────── */

/* POST /auth/deactivate */
export function deactivateAccount(password: string): Promise<void> {
  return api.post('/auth/deactivate', { password }).then(() => {/* no-op */})
}

/* DELETE /auth/account */
export function deleteAccount(password: string): Promise<void> {
  return api.delete('/auth/account', { data: { password } }).then(() => {/* no-op */})
}
