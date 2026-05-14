'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, apiPost } from '@/lib/axios'
import type { PaginationMeta } from '@/types/index'

export interface Review {
  id:                 string
  rating:             number
  comment?:           string
  createdAt:          string
  userId:             string | { id: string; name: string; avatarUrl?: string }
  /* 6.2 */
  instructorReply?:   string
  instructorReplyAt?: string
  instructorId?:      string | { id: string; name: string; avatarUrl?: string }
  /* 6.3 */
  helpfulVotes:       number
  reportCount:        number
  isReported:         boolean
}

export const reviewKeys = {
  forCourse: (courseId: string) => ['reviews', 'course', courseId] as const,
}

export function useCourseReviews(courseId: string | undefined, page = 1, perPage = 5) {
  return useQuery({
    queryKey: [...reviewKeys.forCourse(courseId ?? ''), page, perPage],
    queryFn: async () => {
      const res = await api.get<{ success: true; data: Review[]; meta: PaginationMeta }>(
        `/courses/${courseId}/reviews`,
        { params: { page, per_page: perPage } },
      )
      return { docs: res.data.data, meta: res.data.meta }
    },
    enabled: !!courseId,
    staleTime: 30_000,
  })
}

export function useSubmitReview(courseId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { rating: number; comment?: string }) =>
      apiPost<{ review: Review }>(`/courses/${courseId}/reviews`, data),
    onSuccess: () => {
      if (courseId) qc.invalidateQueries({ queryKey: reviewKeys.forCourse(courseId) })
      qc.invalidateQueries({ queryKey: ['courses'] })
    },
  })
}

/* 6.3 — helpful vote */
export function useVoteHelpful(courseId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (reviewId: string) => api.post(`/reviews/${reviewId}/helpful`),
    onSuccess: () => {
      if (courseId) qc.invalidateQueries({ queryKey: reviewKeys.forCourse(courseId) })
    },
  })
}

/* 6.3 — report */
export function useReportReview(courseId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (reviewId: string) => api.post(`/reviews/${reviewId}/report`),
    onSuccess: () => {
      if (courseId) qc.invalidateQueries({ queryKey: reviewKeys.forCourse(courseId) })
    },
  })
}
