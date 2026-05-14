'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, apiGet, apiPost } from '@/lib/axios'
import type { Course, PaginationMeta } from '@/types/index'

export interface FavoriteRow {
  id:        string
  courseId:  string | Course
  createdAt: string
}

export const favoriteKeys = {
  list:    (p: object) => ['favorites', 'list', p] as const,
  exists:  (id: string) => ['favorites', 'exists', id] as const,
}

export function useMyFavorites(params: { page?: number; per_page?: number } = {}) {
  return useQuery({
    queryKey: favoriteKeys.list(params),
    queryFn: async () => {
      const res = await api.get<{ success: true; data: FavoriteRow[]; meta: PaginationMeta }>(
        '/favorites/me', { params },
      )
      return { docs: res.data.data, meta: res.data.meta }
    },
    staleTime: 30_000,
  })
}

export function useIsFavorited(courseId: string | undefined) {
  return useQuery({
    queryKey: favoriteKeys.exists(courseId ?? ''),
    queryFn:  () => apiGet<{ favorited: boolean }>(`/favorites/exists/${courseId}`).then(d => d.favorited),
    enabled:  !!courseId,
    staleTime: 30_000,
  })
}

export function useToggleFavorite(courseId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (currentlyFavorited: boolean) => {
      if (currentlyFavorited) {
        await api.delete(`/favorites/${courseId}`)
      } else {
        await apiPost('/favorites', { courseId })
      }
      return !currentlyFavorited
    },
    onSuccess: (nowFavorited) => {
      qc.setQueryData(favoriteKeys.exists(courseId), nowFavorited)
      qc.invalidateQueries({ queryKey: ['favorites', 'list'] })
    },
  })
}
