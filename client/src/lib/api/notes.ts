'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/axios'

export interface LessonNote {
  id:        string
  lessonId:  string | { id: string; title: string; order: number }
  courseId:  string
  body:      string
  updatedAt: string
}

export const noteKeys = {
  forLesson: (lessonId: string) => ['notes', 'lesson', lessonId] as const,
  forCourse: (courseId: string) => ['notes', 'course', courseId] as const,
}

export function useMyNote(lessonId: string | undefined) {
  return useQuery({
    queryKey: noteKeys.forLesson(lessonId ?? ''),
    queryFn: async () => {
      const res = await api.get<{ success: true; data: { note: LessonNote | null } }>(
        `/lessons/${lessonId}/my-note`,
      )
      return res.data.data.note
    },
    enabled: !!lessonId,
    staleTime: 60_000,
  })
}

export function useUpsertNote(lessonId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: string) =>
      api.put(`/lessons/${lessonId}/my-note`, { body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: noteKeys.forLesson(lessonId ?? '') }),
  })
}

export function useDeleteNote(lessonId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.delete(`/lessons/${lessonId}/my-note`),
    onSuccess: () => qc.invalidateQueries({ queryKey: noteKeys.forLesson(lessonId ?? '') }),
  })
}

export function useCourseNotes(courseId: string | undefined) {
  return useQuery({
    queryKey: noteKeys.forCourse(courseId ?? ''),
    queryFn: async () => {
      const res = await api.get<{ success: true; data: { notes: LessonNote[] } }>(
        `/courses/${courseId}/my-notes`,
      )
      return res.data.data.notes
    },
    enabled: !!courseId,
    staleTime: 60_000,
  })
}
