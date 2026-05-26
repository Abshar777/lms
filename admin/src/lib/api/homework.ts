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

export interface HomeworkSubmission {
  id:             string
  homeworkId:     { id: string; title: string }
  userId:         { id: string; name: string; email: string }
  submissionText?: string
  submissionUrl?:  string
  grade?:          number
  feedback?:       string
  gradedAt?:       string
  gradedBy?:       { id: string; name: string }
  status:          'submitted' | 'graded' | 'returned'
  createdAt:       string
}

export const homeworkKeys = {
  forClass:    (id: string) => ['admin', 'homework', id] as const,
  submissions: (id: string) => ['admin', 'homework-submissions', id] as const,
}

export function useHomework(liveClassId: string) {
  return useQuery({
    queryKey: homeworkKeys.forClass(liveClassId),
    queryFn:  () => apiGet<Homework[]>(`/admin/live-classes/${liveClassId}/homework`),
    enabled:  !!liveClassId,
    staleTime: 30_000,
  })
}

export function useSubmissions(liveClassId: string) {
  return useQuery({
    queryKey: homeworkKeys.submissions(liveClassId),
    queryFn:  () => apiGet<HomeworkSubmission[]>(`/admin/live-classes/${liveClassId}/homework/submissions`),
    enabled:  !!liveClassId,
    staleTime: 30_000,
  })
}

export function useCreateHomework(liveClassId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { title: string; description: string; dueDate?: string }) =>
      api.post(`/admin/live-classes/${liveClassId}/homework`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: homeworkKeys.forClass(liveClassId) }),
  })
}

export function useDeleteHomework(liveClassId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (hwId: string) => api.delete(`/admin/homework/${hwId}`),
    onSuccess:  () => qc.invalidateQueries({ queryKey: homeworkKeys.forClass(liveClassId) }),
  })
}

export function useGradeSubmission(liveClassId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ subId, grade, feedback }: { subId: string; grade: number; feedback?: string }) =>
      api.patch(`/admin/homework-submissions/${subId}/grade`, { grade, feedback }),
    onSuccess: () => qc.invalidateQueries({ queryKey: homeworkKeys.submissions(liveClassId) }),
  })
}
