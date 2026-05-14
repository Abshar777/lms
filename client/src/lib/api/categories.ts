'use client'
import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/axios'

export interface Category {
  id:           string
  name:         string
  slug:         string
  description?: string
  icon?:        string
}

export const categoryKeys = {
  all: ['categories'] as const,
}

export function useCategories() {
  return useQuery({
    queryKey: categoryKeys.all,
    queryFn:  () => apiGet<Category[]>('/categories'),
    staleTime: 5 * 60_000,  // categories rarely change
  })
}
