'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, apiGet, apiPost, apiPatch } from '@/lib/axios'

export type LiveClassStatus = 'scheduled' | 'live' | 'ended' | 'cancelled'
export type LiveClassType   = 'external' | 'internal'

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

  type:           LiveClassType
  status:         LiveClassStatus

  /* External-only */
  meetingUrl?:    string

  /* Internal-only (Mux) */
  muxPlaybackId?: string
  playbackUrl?:   string
  thumbnailUrl?:  string
  recordingUrl?:  string
  viewerCount:    number
  startedAt?:     string
  endedAt?:       string

  createdAt:      string
  updatedAt:      string
}

export interface StreamCredentials {
  rtmpUrl:    string
  streamKey:  string
  playbackId: string
}

export const liveClassKeys = {
  forCourse:   (courseId: string) => ['admin', 'live-classes', courseId] as const,
  byId:        (id: string)       => ['admin', 'live-classes', 'detail', id] as const,
  credentials: (id: string)       => ['admin', 'live-classes', id, 'credentials'] as const,
}

/* GET /admin/live-classes — all classes across all courses (global overview page) */
export function useAllLiveClasses(status: string = 'all') {
  return useQuery({
    queryKey:        ['admin', 'live-classes', 'all', status],
    queryFn:         () => apiGet<LiveClass[]>('/admin/live-classes', { status }),
    staleTime:       10_000,
    refetchInterval: 15_000,   // refresh so live status pulses update
  })
}

/* GET /admin/live-classes/:id — single class, used by monitor page */
export function useLiveClassById(id: string | undefined) {
  return useQuery({
    queryKey: liveClassKeys.byId(id ?? ''),
    queryFn:  () => apiGet<LiveClass>(`/admin/live-classes/${id}`),
    enabled:  !!id,
    staleTime: 5_000,
    refetchInterval: 10_000,   // poll so status changes (scheduled→live→ended) are reflected
  })
}

export function useLiveClassesForCourse(courseId: string | undefined) {
  return useQuery({
    queryKey: liveClassKeys.forCourse(courseId ?? ''),
    queryFn:  () => apiGet<LiveClass[]>(`/admin/courses/${courseId}/live-classes`),
    enabled:  !!courseId,
    staleTime: 15_000,
    refetchInterval: 15_000,   // poll for status updates while on the page
  })
}

export function useStreamCredentials(id: string | undefined) {
  return useQuery({
    queryKey: liveClassKeys.credentials(id ?? ''),
    queryFn:  () => apiGet<StreamCredentials>(`/admin/live-classes/${id}/stream-credentials`),
    enabled:  false,           // only fetched when instructor clicks "Show credentials"
    staleTime: Infinity,       // credentials don't change
  })
}

export interface CreateLiveClassInput {
  courseId:       string
  title:          string
  description?:   string
  scheduledStart: string       // ISO
  durationMins:   number
  type:           LiveClassType
  meetingUrl?:    string       // required when type=external
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
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateLiveClassInput & { status: LiveClassStatus }> }) =>
      apiPatch<LiveClass>(`/admin/live-classes/${id}`, data),
    onSuccess: () => {
      if (courseId) qc.invalidateQueries({ queryKey: liveClassKeys.forCourse(courseId) })
    },
  })
}

export function useStartLiveStream(courseId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiPost<LiveClass>(`/admin/live-classes/${id}/start`, {}),
    onSuccess: () => {
      if (courseId) qc.invalidateQueries({ queryKey: liveClassKeys.forCourse(courseId) })
    },
  })
}

export function useEndLiveStream(courseId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiPost<LiveClass>(`/admin/live-classes/${id}/end`, {}),
    onSuccess: () => {
      if (courseId) qc.invalidateQueries({ queryKey: liveClassKeys.forCourse(courseId) })
    },
  })
}

/* Start/End mutations that also invalidate the byId cache — used by monitor page */
export function useStartLiveStreamById(id: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => apiPost<LiveClass>(`/admin/live-classes/${id}/start`, {}),
    onSuccess: () => {
      if (id) qc.invalidateQueries({ queryKey: liveClassKeys.byId(id) })
    },
  })
}

export function useEndLiveStreamById(id: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => apiPost<LiveClass>(`/admin/live-classes/${id}/end`, {}),
    onSuccess: () => {
      if (id) qc.invalidateQueries({ queryKey: liveClassKeys.byId(id) })
    },
  })
}

export function useRecreateLiveStream(id: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => apiPost<LiveClass>(`/admin/live-classes/${id}/recreate`, {}),
    onSuccess: (data) => {
      if (id) qc.invalidateQueries({ queryKey: liveClassKeys.byId(id) })
      /* Also invalidate the course-level list so credentials panel refreshes */
      const courseId = data?.courseId
      if (courseId) qc.invalidateQueries({ queryKey: liveClassKeys.forCourse(courseId) })
      /* Invalidate stream credentials cache so next reveal fetches fresh key */
      if (id) qc.removeQueries({ queryKey: liveClassKeys.credentials(id) })
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
