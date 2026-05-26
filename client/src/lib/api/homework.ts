'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, api } from '@/lib/axios'

export interface Homework {
  id:          string
  liveClassId: string
  title:       string
  description: string
  dueDate?:    string
  assignedBy:  { id: string; name: string }
  createdAt:   string
}

export interface MySubmission {
  id:             string
  homeworkId:     string
  submissionText?: string
  submissionUrl?:  string
  grade?:          number
  feedback?:       string
  gradedAt?:       string
  status:          'submitted' | 'graded' | 'returned'
  createdAt:       string
}

export const homeworkKeys = {
  forSession: (sessionId: string) => ['homework', 'session', sessionId] as const,
}

export function useSessionHomework(sessionId: string) {
  return useQuery({
    queryKey: homeworkKeys.forSession(sessionId),
    // Endpoint mounted at /api/v1/live-classes/:id/homework
    queryFn:  () => apiGet<Homework[]>(`/live-classes/${sessionId}/homework`),
    enabled:  !!sessionId,
    staleTime: 60_000,
  })
}

export function useSubmitHomework(sessionId: string) {
  const qc = useQueryClient()
  return useMutation({
    // Endpoint: POST /api/v1/live-classes/homework/:id/submit
    mutationFn: ({ homeworkId, submissionText, submissionUrl }: {
      homeworkId: string
      submissionText?: string
      submissionUrl?: string
    }) => api.post(`/live-classes/homework/${homeworkId}/submit`, { submissionText, submissionUrl })
      .then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: homeworkKeys.forSession(sessionId) }),
  })
}
