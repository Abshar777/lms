'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/axios'
import type { PaginationMeta } from '@/types/index'

/* ── Types ──────────────────────────────────────────── */
export interface BatchUser {
  id:        string
  name:      string
  email:     string
  avatarUrl?: string
}

export interface BatchCourse {
  id:           string
  title:        string
  slug:         string
  thumbnailUrl?: string
}

export interface Batch {
  id:          string
  name:        string
  description: string
  mentorId:    BatchUser
  studentIds:  BatchUser[] | string[]
  courseId?:   BatchCourse | string | null
  maxStudents: number
  status:      'active' | 'archived'
  createdAt:   string
  updatedAt:   string
}

export interface CreateBatchDto {
  name:        string
  description?: string
  mentorId:    string
  studentIds?: string[]
  courseId?:   string
  maxStudents?: number
  status?:     'active' | 'archived'
}

export type UpdateBatchDto = Partial<CreateBatchDto>

/* ── Query keys ─────────────────────────────────────── */
export const batchKeys = {
  all:    ['admin', 'batches'] as const,
  list:   (p: object) => ['admin', 'batches', 'list', p] as const,
  detail: (id: string) => ['admin', 'batches', 'detail', id] as const,
}

/* ── List ────────────────────────────────────────────── */
export function useBatches(params: {
  page?: number
  per_page?: number
  status?: 'active' | 'archived' | 'all'
  mentorId?: string
  search?: string
} = {}) {
  return useQuery({
    queryKey: batchKeys.list(params),
    queryFn: async () => {
      const p: Record<string, any> = { ...params }
      Object.keys(p).forEach(k => (p[k] == null || p[k] === '') && delete p[k])
      const res = await api.get<{ success: true; data: Batch[]; meta: PaginationMeta }>(
        '/admin/batches', { params: p },
      )
      return { docs: res.data.data, meta: res.data.meta }
    },
    staleTime: 30_000,
  })
}

/* ── Single ──────────────────────────────────────────── */
export function useBatch(id: string) {
  return useQuery({
    queryKey: batchKeys.detail(id),
    queryFn: async () => {
      const res = await api.get<{ success: true; data: Batch }>(`/admin/batches/${id}`)
      return res.data.data
    },
    enabled: !!id,
  })
}

/* ── Create ──────────────────────────────────────────── */
export function useCreateBatch() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (dto: CreateBatchDto): Promise<Batch> => {
      const res = await api.post<{ success: true; data: Batch }>('/admin/batches', dto)
      return res.data.data
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: batchKeys.all }) },
  })
}

/* ── Update ──────────────────────────────────────────── */
export function useUpdateBatch() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateBatchDto }): Promise<Batch> => {
      const res = await api.patch<{ success: true; data: Batch }>(`/admin/batches/${id}`, data)
      return res.data.data
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: batchKeys.all })
      qc.invalidateQueries({ queryKey: batchKeys.detail(id) })
    },
  })
}

/* ── Delete ──────────────────────────────────────────── */
export function useDeleteBatch() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => { await api.delete(`/admin/batches/${id}`) },
    onSuccess: () => { qc.invalidateQueries({ queryKey: batchKeys.all }) },
  })
}

/* ── Add students ────────────────────────────────────── */
export function useAddBatchStudents() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, studentIds }: { id: string; studentIds: string[] }) => {
      const res = await api.post<{ success: true; data: Batch }>(`/admin/batches/${id}/students`, { studentIds })
      return res.data.data
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: batchKeys.detail(id) })
      qc.invalidateQueries({ queryKey: batchKeys.all })
    },
  })
}

/* ── Remove student ──────────────────────────────────── */
export function useRemoveBatchStudent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ batchId, userId }: { batchId: string; userId: string }) => {
      const res = await api.delete<{ success: true; data: Batch }>(`/admin/batches/${batchId}/students/${userId}`)
      return res.data.data
    },
    onSuccess: (_, { batchId }) => {
      qc.invalidateQueries({ queryKey: batchKeys.detail(batchId) })
      qc.invalidateQueries({ queryKey: batchKeys.all })
    },
  })
}
