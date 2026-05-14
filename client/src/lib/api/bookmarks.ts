'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/axios'

export interface VideoBookmark {
  id:        string
  lessonId:  string | { id: string; title: string }
  courseId:  string
  timeSecs:  number
  label?:    string
  createdAt: string
}

export const bookmarkKeys = {
  forLesson: (lessonId: string) => ['bookmarks', 'lesson', lessonId] as const,
  forCourse: (courseId: string) => ['bookmarks', 'course', courseId] as const,
}

export function useLessonBookmarks(lessonId: string | undefined) {
  return useQuery({
    queryKey: bookmarkKeys.forLesson(lessonId ?? ''),
    queryFn: async () => {
      const res = await api.get<{ success: true; data: { bookmarks: VideoBookmark[] } }>(
        `/lessons/${lessonId}/bookmarks`,
      )
      return res.data.data.bookmarks
    },
    enabled: !!lessonId,
    staleTime: 30_000,
  })
}

export function useCreateBookmark(lessonId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { timeSecs: number; label?: string }) =>
      api.post(`/lessons/${lessonId}/bookmarks`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: bookmarkKeys.forLesson(lessonId ?? '') }),
  })
}

export function useDeleteBookmark(lessonId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (bookmarkId: string) => api.delete(`/bookmarks/${bookmarkId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: bookmarkKeys.forLesson(lessonId ?? '') }),
  })
}

export function useCourseBookmarks(courseId: string | undefined) {
  return useQuery({
    queryKey: bookmarkKeys.forCourse(courseId ?? ''),
    queryFn: async () => {
      const res = await api.get<{ success: true; data: { bookmarks: VideoBookmark[] } }>(
        `/courses/${courseId}/bookmarks`,
      )
      return res.data.data.bookmarks
    },
    enabled: !!courseId,
    staleTime: 30_000,
  })
}
