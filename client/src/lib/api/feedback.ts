'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, api } from '@/lib/axios'

export interface ClassFeedback {
  id:          string
  liveClassId: string | { id: string; title: string; scheduledStart: string }
  userId:      string
  rating:      number
  comment?:    string
  createdAt:   string
}

export const feedbackKeys = {
  forSession: (sessionId: string) => ['feedback', 'session', sessionId] as const,
  mine:       () => ['feedback', 'me'] as const,
}

export function useMyFeedback() {
  return useQuery({
    queryKey: feedbackKeys.mine(),
    queryFn:  () => apiGet<ClassFeedback[]>('/feedback/me'),
    staleTime: 60_000,
  })
}

export function useSessionFeedback(sessionId: string) {
  return useQuery({
    queryKey: feedbackKeys.forSession(sessionId),
    queryFn:  () => apiGet<ClassFeedback | null>('/feedback/me').then(list => {
      if (!Array.isArray(list)) return null
      return list.find((f: ClassFeedback) => {
        const lcId = typeof f.liveClassId === 'string' ? f.liveClassId : f.liveClassId?.id
        return lcId === sessionId
      }) ?? null
    }),
    enabled:  !!sessionId,
    staleTime: 60_000,
  })
}

export function useSubmitFeedback(sessionId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ rating, comment }: { rating: number; comment?: string }) =>
      api.post('/feedback', { liveClassId: sessionId, rating, comment }).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: feedbackKeys.forSession(sessionId) })
      qc.invalidateQueries({ queryKey: feedbackKeys.mine() })
    },
  })
}
