'use client'
import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/axios'

export interface LiveClass {
  id:             string
  courseId:       string
  course?:        { id: string; title: string; slug: string; thumbnailUrl?: string }
  instructorId:   string
  instructor?:    { id: string; name: string; avatarUrl?: string }
  title:          string
  description?:   string
  scheduledStart: string
  durationMins:   number
  meetingUrl:     string
  cancelled:      boolean
  createdAt:      string
  updatedAt:      string
}

export function isLive(l: LiveClass, now: number = Date.now()): boolean {
  if (l.cancelled) return false
  const start = new Date(l.scheduledStart).getTime()
  const end   = start + l.durationMins * 60_000
  /* Allow joining 10 minutes early */
  return now >= start - 10 * 60_000 && now <= end
}

export function isUpcoming(l: LiveClass, now: number = Date.now()): boolean {
  if (l.cancelled) return false
  return new Date(l.scheduledStart).getTime() > now
}

export const liveClassKeys = {
  forCourse: (slug: string) => ['live-classes', 'course', slug] as const,
  upcoming:  ['live-classes', 'upcoming'] as const,
}

/* GET /courses/:slug/live-classes — public */
export function useLiveClassesForCourse(slug: string | undefined) {
  return useQuery({
    queryKey: liveClassKeys.forCourse(slug ?? ''),
    queryFn:  () => apiGet<LiveClass[]>(`/courses/${slug}/live-classes`),
    enabled:  !!slug,
    staleTime: 30_000,
  })
}

/* GET /live-classes/upcoming — authenticated, across user's enrollments */
export function useUpcomingLiveClasses(limit = 5) {
  return useQuery({
    queryKey: liveClassKeys.upcoming,
    queryFn:  () => apiGet<LiveClass[]>('/live-classes/upcoming', { limit }),
    staleTime: 60_000,
  })
}
