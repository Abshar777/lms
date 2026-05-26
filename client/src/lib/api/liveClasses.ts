'use client'
import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/axios'

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

  /* Batch scheduling */
  batchId?:        string | { id: string; name: string }
  sessionCapacity: number
  bookedCount:     number

  createdAt:      string
  updatedAt:      string
}

export interface WatchAccess {
  type:          LiveClassType
  status:        LiveClassStatus
  meetingUrl?:   string      // external only
  playbackUrl?:  string      // internal only
  recordingUrl?: string      // internal, after stream ends
  thumbnailUrl?: string
  viewerCount:   number
}

/* ── Helpers ──────────────────────────────────────────── */
export function isLive(l: LiveClass): boolean {
  return l.status === 'live'
}

export function isUpcoming(l: LiveClass): boolean {
  return l.status === 'scheduled'
}

export function isEnded(l: LiveClass): boolean {
  return l.status === 'ended'
}

export function hasRecording(l: LiveClass): boolean {
  return l.type === 'internal' && l.status === 'ended' && !!l.recordingUrl
}

export function fmtCountdown(startIso: string, now: number): string {
  const diff = new Date(startIso).getTime() - now
  if (diff <= 0) return 'starting now'
  const s    = Math.floor(diff / 1000)
  const days = Math.floor(s / 86400)
  if (days >= 2)  return `in ${days} days`
  if (days === 1) return 'tomorrow'
  const hrs = Math.floor(s / 3600)
  if (hrs >= 1)  return `in ${hrs}h`
  const mins = Math.floor(s / 60)
  return `in ${mins}m`
}

/* ── Query keys ──────────────────────────────────────── */
export const liveClassKeys = {
  forCourse:   (slug: string)   => ['live-classes', 'course', slug]     as const,
  myBatch:     (status: string) => ['live-classes', 'my-batch', status] as const,
  upcoming:    ['live-classes', 'upcoming']                              as const,
  watch:       (id: string)     => ['live-classes', id, 'watch']        as const,
}

/* ── Hooks ───────────────────────────────────────────── */

/* GET /live-classes — all sessions for the student's batches */
export function useMyBatchLiveClasses(status: string = 'all') {
  return useQuery({
    queryKey:        liveClassKeys.myBatch(status),
    queryFn:         () => apiGet<LiveClass[]>('/live-classes', status !== 'all' ? { status } : {}),
    staleTime:       15_000,
    refetchInterval: 30_000,
  })
}

/* GET /courses/:slug/live-classes */
export function useLiveClassesForCourse(slug: string | undefined) {
  return useQuery({
    queryKey:        liveClassKeys.forCourse(slug ?? ''),
    queryFn:         () => apiGet<LiveClass[]>(`/courses/${slug}/live-classes`),
    enabled:         !!slug,
    staleTime:       15_000,
    refetchInterval: 30_000,
  })
}

/* GET /live-classes/upcoming — authenticated, across user's enrollments */
export function useUpcomingLiveClasses(limit = 5) {
  return useQuery({
    queryKey:        liveClassKeys.upcoming,
    queryFn:         () => apiGet<LiveClass[]>('/live-classes/upcoming', { limit }),
    staleTime:       15_000,
    refetchInterval: 30_000,
  })
}

/* GET /live-classes/:id/watch — enrollment-gated playback/meeting access */
export function useWatchAccess(id: string | undefined) {
  return useQuery({
    queryKey:        liveClassKeys.watch(id ?? ''),
    queryFn:         () => apiGet<WatchAccess>(`/live-classes/${id}/watch`),
    enabled:         !!id,
    staleTime:       10_000,
    refetchInterval: 20_000,   // poll to detect status changes (live → ended)
    retry:           false,    // 403 (not enrolled) should surface immediately
  })
}
