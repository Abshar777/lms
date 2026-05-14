'use client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/axios'
import type { PaginationMeta } from '@/types/index'

export interface AdminUser {
  id:           string
  name:         string
  email:        string
  avatarUrl?:   string
  role:         'student' | 'instructor' | 'admin'
  isVerified:   boolean
  isActive:     boolean
  headline?:    string
  bio?:         string
  lastLoginAt?: string
  createdAt:    string
  updatedAt:    string
}

export const userKeys = {
  list: (role: string, params: object) => ['admin', 'users', role, params] as const,
}

export function useUsers(role: 'student' | 'instructor' | 'admin', params: {
  page?: number; per_page?: number; search?: string
} = {}) {
  return useQuery({
    queryKey: userKeys.list(role, params),
    queryFn: async () => {
      const res = await api.get<{ success: true; data: AdminUser[]; meta: PaginationMeta }>(
        '/admin/users',
        { params: { role, ...params } },
      )
      return { docs: res.data.data, meta: res.data.meta }
    },
    staleTime: 30_000,
  })
}

/* ─── Update user (role / isActive / isVerified) ─── */
export function useUpdateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id, ...dto
    }: { id: string; role?: AdminUser['role']; isActive?: boolean; isVerified?: boolean }) => {
      const res = await api.patch<{ success: true; data: AdminUser }>(`/admin/users/${id}`, dto)
      return res.data.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'users'] })
      qc.invalidateQueries({ queryKey: ['admin', 'stats'] })
    },
  })
}
