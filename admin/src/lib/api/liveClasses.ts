'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, apiGet, apiPost, apiPatch } from '@/lib/axios'

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

export const liveClassKeys = {
  forCourse: (courseId: string) => ['admin', 'live-classes', courseId] as const,
}

export function useLiveClassesForCourse(courseId: string | undefined) {
  return useQuery({
    queryKey: liveClassKeys.forCourse(courseId ?? ''),
    queryFn:  () => apiGet<LiveClass[]>(`/admin/courses/${courseId}/live-classes`),
    enabled:  !!courseId,
    staleTime: 30_000,
  })
}

export interface CreateLiveClassInput {
  courseId:       string
  title:          string
  description?:   string
  scheduledStart: string  // ISO
  durationMins:   number
  meetingUrl:     string
}

export function useCreateLiveClass() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateLiveClassInput) =>
      apiPost<LiveClass>('/admin/live-classes', data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: liveClassKeys.forCourse(vars.courseId) })
    },
  })
}

export function useUpdateLiveClass(courseId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateLiveClassInput & { cancelled: boolean }> }) =>
      apiPatch<LiveClass>(`/admin/live-classes/${id}`, data),
    onSuccess: () => {
      if (courseId) qc.invalidateQueries({ queryKey: liveClassKeys.forCourse(courseId) })
    },
  })
}

export function useDeleteLiveClass(courseId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => { await api.delete(`/admin/live-classes/${id}`) },
    onSuccess: () => {
      if (courseId) qc.invalidateQueries({ queryKey: liveClassKeys.forCourse(courseId) })
    },
  })
}
