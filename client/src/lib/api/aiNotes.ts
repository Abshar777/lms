'use client'
import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/axios'

export interface AINotes {
  summary:            string
  keyTopics:          string[]
  studyOrder:         Array<{ title: string; tip: string; minutes: number }>
  keyTakeaways:       string[]
  estimatedStudyTime: string
  difficulty:         'beginner' | 'intermediate' | 'advanced' | 'mixed'
  generatedAt:        string
  generator:          'deterministic-v1' | 'anthropic' | 'openai'
}

export const aiNotesKeys = {
  forSlug: (slug: string) => ['ai-notes', slug] as const,
}

export function useAINotes(slug: string | undefined) {
  return useQuery({
    queryKey: aiNotesKeys.forSlug(slug ?? ''),
    queryFn:  () => apiGet<AINotes>(`/courses/${slug}/ai-notes`),
    enabled:  !!slug,
    /* Notes are derived from course content — only re-fetch when the
       course itself is edited (admin) or the user reloads. */
    staleTime: 10 * 60_000,
  })
}
