'use client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/axios'
import type { PaginationMeta } from '@/types/index'

/* ── Enrollment (student course access) ─────────────── */
export interface StudentEnrollment {
  _id:            string
  id:             string
  courseId:       { id: string; title: string; thumbnailUrl?: string }
  blockedLessons: string[]
  createdAt:      string
}

const enrollmentKeys = {
  forStudent: (userId: string) => ['admin', 'enrollments', userId] as const,
}

export interface AdminUser {
  id:            string
  name:          string
  email:         string
  avatarUrl?:    string
  role:          'student' | 'instructor' | 'admin'
  isVerified:    boolean
  isActive:      boolean
  headline?:     string
  bio?:          string
  lastLoginAt?:  string
  createdAt:     string
  updatedAt:     string
  customRoleId?: string | { id: string; name: string }
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

/* ─── Student Enrollments ───────────────────────────── */
export function useStudentEnrollments(userId: string | undefined) {
  return useQuery({
    queryKey: enrollmentKeys.forStudent(userId ?? ''),
    queryFn: async () => {
      const res = await api.get<{ success: true; data: StudentEnrollment[] }>(
        `/admin/users/${userId}/enrollments`,
      )
      return res.data.data
    },
    enabled: !!userId,
    staleTime: 30_000,
  })
}

export function useUpdateEnrollmentAccess() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, blockedLessons }: { id: string; blockedLessons: string[] }) => {
      const res = await api.patch<{ success: true; data: StudentEnrollment }>(
        `/admin/enrollments/${id}`, { blockedLessons },
      )
      return res.data.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'enrollments'] })
    },
  })
}

export function useEnrollStudent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ userId, courseId }: { userId: string; courseId: string }) => {
      const res = await api.post<{ success: true; data: StudentEnrollment }>(
        `/admin/users/${userId}/enrollments`, { courseId },
      )
      return res.data.data
    },
    onSuccess: (_data, { userId }) => {
      qc.invalidateQueries({ queryKey: ['admin', 'enrollments', userId] })
    },
  })
}

export function useRemoveEnrollment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ enrollmentId }: { enrollmentId: string; userId: string }) => {
      await api.delete(`/admin/enrollments/${enrollmentId}`)
    },
    onSuccess: (_data, { userId }) => {
      qc.invalidateQueries({ queryKey: ['admin', 'enrollments', userId] })
    },
  })
}

/* ─── Update user (role / isActive / isVerified / name / email) ─── */
export function useUpdateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id, ...dto
    }: { id: string; role?: AdminUser['role']; isActive?: boolean; isVerified?: boolean; name?: string; email?: string }) => {
      const res = await api.patch<{ success: true; data: AdminUser }>(`/admin/users/${id}`, dto)
      return res.data.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'users'] })
      qc.invalidateQueries({ queryKey: ['admin', 'stats'] })
    },
  })
}
