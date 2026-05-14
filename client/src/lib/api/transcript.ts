'use client'
import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/axios'

interface TranscriptResponse {
  transcript: string | null
}

export const transcriptKeys = {
  lesson: (id: string) => ['transcript', id] as const,
}

export function useTranscript(lessonId: string | undefined) {
  return useQuery({
    queryKey: transcriptKeys.lesson(lessonId ?? ''),
    queryFn:  () => apiGet<TranscriptResponse>(`/lessons/${lessonId}/transcript`),
    enabled:  !!lessonId,
    staleTime: 5 * 60_000,
  })
}
