'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, apiGet, apiPost } from '@/lib/axios'
import type { Course } from '@/types/index'

export interface EnrollmentSummary {
  isEnrolled:       boolean
  enrollmentId:     string | null
  progressPercent:  number
  status:           'active' | 'completed' | 'dropped' | null
  lastLessonId:     string | null
  certificateId:    string | null
  completedLessons: string[]
}

export interface MyEnrollment {
  id:              string
  status:          'active' | 'completed' | 'dropped'
  progressPercent: number
  lastLessonId?:   string
  enrolledAt:      string
  completedAt?:    string
  courseId:        string | Course   // populated → Course
}

export const enrollmentKeys = {
  mine:        ['enrollments', 'mine'] as const,
  forCourse:   (slug: string) => ['enrollments', 'course', slug] as const,
}

/* GET /courses/:slug/progress — what the player needs */
export function useCourseProgress(slug: string | undefined) {
  return useQuery({
    queryKey: enrollmentKeys.forCourse(slug ?? ''),
    queryFn:  () => apiGet<EnrollmentSummary>(`/courses/${slug}/progress`),
    enabled:  !!slug,
    staleTime: 10_000,
  })
}

/* GET /enrollments/me */
export function useMyEnrollments() {
  return useQuery({
    queryKey: enrollmentKeys.mine,
    queryFn:  () => apiGet<MyEnrollment[]>('/enrollments/me'),
    staleTime: 10_000,
  })
}

/* Recent activity for the right sidebar */
export interface ActivityItem {
  id:           string
  isCompleted:  boolean
  completedAt?: string
  createdAt:    string
  updatedAt:    string
  watchTimeSecs?: number
  lessonId:     string | { id: string; title: string; type: 'video' | 'article' | 'quiz'; durationMins: number }
  courseId:     string | { id: string; title: string; slug: string }
}

export interface MyActivity {
  items: ActivityItem[]
  week:  { lessonsCompleted: number; minutesWatched: number }
}

export function useMyActivity(limit = 8) {
  return useQuery({
    queryKey: ['enrollments', 'activity', limit],
    queryFn:  () => apiGet<MyActivity>('/enrollments/activity', { limit }),
    staleTime: 15_000,
  })
}

/* POST /enrollments */
export function useEnroll() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (courseId: string) =>
      apiPost<{ enrollment: MyEnrollment }>('/enrollments', { courseId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: enrollmentKeys.mine })
      qc.invalidateQueries({ queryKey: ['enrollments'] })
      qc.invalidateQueries({ queryKey: ['courses'] })
    },
  })
}
