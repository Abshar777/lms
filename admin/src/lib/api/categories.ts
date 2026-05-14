'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/axios'

export interface Category {
  id:           string
  name:         string
  slug:         string
  description?: string
  icon?:        string
  createdAt:    string
  updatedAt:    string
}

export const categoryKeys = {
  all: ['admin', 'categories'] as const,
}

export function useCategories() {
  return useQuery({
    queryKey: categoryKeys.all,
    queryFn: async () => {
      const res = await api.get<{ success: true; data: Category[] }>('/admin/categories')
      return res.data.data
    },
    staleTime: 60_000,
  })
}

export function useCreateCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: { name: string; description?: string; icon?: string }): Promise<Category> => {
      const res = await api.post<{ success: true; data: Category }>('/admin/categories', data)
      return res.data.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: categoryKeys.all }),
  })
}

export function useUpdateCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<{ name: string; description: string; icon: string }> }): Promise<Category> => {
      const res = await api.patch<{ success: true; data: Category }>(`/admin/categories/${id}`, data)
      return res.data.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: categoryKeys.all }),
  })
}

export function useDeleteCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/admin/categories/${id}`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: categoryKeys.all }),
  })
}
