'use client'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/axios'
import type { Course } from '@/types/index'

const recKeys = {
  byCourse: (slug: string) => ['recommendations', 'course', slug] as const,
}

export function useCourseRecommendations(slug: string) {
  return useQuery({
    queryKey: recKeys.byCourse(slug),
    queryFn:  async () => {
      const res = await api.get<{ success: true; data: Course[] }>(
        `/courses/${slug}/recommendations`,
      )
      return res.data.data
    },
    staleTime: 5 * 60_000, // 5 min — rarely changes
    enabled:   !!slug,
  })
}
