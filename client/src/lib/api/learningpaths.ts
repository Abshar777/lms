'use client'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/axios'
import type { PaginationMeta } from '@/types/index'

export interface LearningPathCourse {
  courseId: {
    id:            string
    title:         string
    slug:          string
    thumbnailUrl?: string
    isFree:        boolean
    price:         number
    level:         string
    durationMins:  number
    enrolledCount: number
    ratingAvg:     number
  } | string
  order:          number
  isPrerequisite: boolean
}

export interface LearningPath {
  id:            string
  title:         string
  slug:          string
  description?:  string
  thumbnailUrl?: string
  instructorId:  { id: string; name: string; avatarUrl?: string } | string
  categoryId?:   { id: string; name: string; slug: string } | string
  status:        'draft' | 'published'
  courses:       LearningPathCourse[]
  enrolledCount: number
  createdAt:     string
}

export const learningPathKeys = {
  all:     () => ['learning-paths'] as const,
  detail:  (slug: string) => ['learning-paths', slug] as const,
}

export function useLearningPaths(params?: { page?: number; categoryId?: string }) {
  return useQuery({
    queryKey: [...learningPathKeys.all(), params],
    queryFn: async () => {
      const res = await api.get<{
        success: true
        data: { paths: LearningPath[]; meta: PaginationMeta }
      }>('/learning-paths', { params })
      return res.data.data
    },
    staleTime: 60_000,
  })
}

export function useLearningPath(slug: string | undefined) {
  return useQuery({
    queryKey: learningPathKeys.detail(slug ?? ''),
    queryFn: async () => {
      const res = await api.get<{ success: true; data: { path: LearningPath } }>(
        `/learning-paths/${slug}`,
      )
      return res.data.data.path
    },
    enabled: !!slug,
    staleTime: 120_000,
  })
}
