'use client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost } from '@/lib/axios'
import { enrollmentKeys } from './enrollments'

export function useMarkLessonComplete(slug: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (lessonId: string) =>
      apiPost<{ progressPercent: number; status: 'active' | 'completed' }>(
        `/lessons/${lessonId}/complete`,
      ),
    onSuccess: () => {
      if (slug) qc.invalidateQueries({ queryKey: enrollmentKeys.forCourse(slug) })
      qc.invalidateQueries({ queryKey: enrollmentKeys.mine })
    },
  })
}

export function recordWatchTime(lessonId: string, secs: number): void {
  /* Fire-and-forget — must not block the player. */
  void apiPost(`/lessons/${lessonId}/watch-time`, { secs }).catch(() => {/* swallow */})
}

/* GET /lessons/:id/progress — used by the player to resume from the
   last watched second on mount. */
export interface LessonProgress {
  watchTimeSecs: number
  isCompleted:   boolean
  completedAt:   string | null
}

export function useMyLessonProgress(lessonId: string | undefined) {
  return useQuery({
    queryKey: ['lesson', 'progress', lessonId ?? ''],
    queryFn:  () => apiGet<LessonProgress>(`/lessons/${lessonId}/progress`),
    enabled:  !!lessonId,
    staleTime: 0,
    refetchOnMount: 'always',
  })
}
