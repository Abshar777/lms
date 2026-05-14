'use client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/axios'

/* ─── Types ───────────────────────────────────────── */
export interface AdminSection {
  id:        string
  courseId:  string
  title:     string
  order:     number
  createdAt: string
  updatedAt: string
}

export interface AdminLesson {
  id:           string
  sectionId:    string
  courseId:     string
  title:        string
  type:         'video' | 'article' | 'quiz' | 'assignment'
  contentUrl?:  string
  contentBody?: string
  transcript?:  string
  durationMins: number
  order:        number
  isFree:       boolean
  createdAt:    string
  updatedAt:    string
}

export type QuestionType = 'mcq' | 'true_false' | 'short'

export interface QuizQuestion {
  id:            string
  text:          string
  type:          QuestionType
  choices:       string[]
  correctAnswer: string
  points:        number
  explanation?:  string
}

export interface AdminQuiz {
  id:          string
  lessonId:    string
  courseId:    string
  passPercent: number
  timeLimit?:  number
  questions:   QuizQuestion[]
}

export interface AdminAssignment {
  id:           string
  lessonId:     string
  courseId:     string
  title:        string
  instructions: string
  dueDate?:     string
  maxScore:     number
}

export interface CourseOutline {
  sections: AdminSection[]
  lessons:  AdminLesson[]
}

/* ─── Query keys ─────────────────────────────────── */
export const outlineKeys = {
  outline: (courseId: string) => ['admin', 'outline', courseId] as const,
}

/* ─── Outline (sections + lessons in one call) ──── */
export function useCourseOutline(courseId: string) {
  return useQuery({
    queryKey: outlineKeys.outline(courseId),
    queryFn:  async () => {
      const res = await api.get<{ success: true; data: CourseOutline }>(`/admin/courses/${courseId}/outline`)
      return res.data.data
    },
    enabled: !!courseId,
  })
}

/* ─── Section mutations ──────────────────────────── */
export function useCreateSection(courseId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (title: string) => {
      const res = await api.post<{ success: true; data: AdminSection }>(
        `/admin/courses/${courseId}/sections`,
        { title },
      )
      return res.data.data
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: outlineKeys.outline(courseId) }) },
  })
}

export function useUpdateSection(courseId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) => {
      const res = await api.patch<{ success: true; data: AdminSection }>(
        `/admin/sections/${id}`, { title },
      )
      return res.data.data
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: outlineKeys.outline(courseId) }) },
  })
}

export function useDeleteSection(courseId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => { await api.delete(`/admin/sections/${id}`) },
    onSuccess: () => { qc.invalidateQueries({ queryKey: outlineKeys.outline(courseId) }) },
  })
}

export function useReorderSections(courseId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (ids: string[]) => {
      await api.put(`/admin/courses/${courseId}/sections/reorder`, { ids })
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: outlineKeys.outline(courseId) }) },
  })
}

/* ─── Lesson mutations ───────────────────────────── */
type LessonPayload = {
  sectionId:     string
  title:         string
  type?:         'video' | 'article' | 'quiz' | 'assignment'
  contentUrl?:   string
  contentBody?:  string
  durationMins?: number
  isFree?:       boolean
}

export function useCreateLesson(courseId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (dto: LessonPayload) => {
      const res = await api.post<{ success: true; data: AdminLesson }>(`/admin/lessons`, dto)
      return res.data.data
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: outlineKeys.outline(courseId) }) },
  })
}

export function useUpdateLesson(courseId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...dto }: { id: string } & Partial<Omit<LessonPayload, 'sectionId'>>) => {
      const res = await api.patch<{ success: true; data: AdminLesson }>(`/admin/lessons/${id}`, dto)
      return res.data.data
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: outlineKeys.outline(courseId) }) },
  })
}

export function useDeleteLesson(courseId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => { await api.delete(`/admin/lessons/${id}`) },
    onSuccess: () => { qc.invalidateQueries({ queryKey: outlineKeys.outline(courseId) }) },
  })
}

export function useReorderLessons(courseId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ sectionId, ids }: { sectionId: string; ids: string[] }) => {
      await api.put(`/admin/sections/${sectionId}/lessons/reorder`, { ids })
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: outlineKeys.outline(courseId) }) },
  })
}

export function useMoveLesson(courseId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, sectionId }: { id: string; sectionId: string }) => {
      await api.post(`/admin/lessons/${id}/move`, { sectionId })
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: outlineKeys.outline(courseId) }) },
  })
}

/* ─── Quiz hooks ─────────────────────────────────── */
export const quizKeys = {
  quiz: (lessonId: string) => ['admin', 'quiz', lessonId] as const,
}

export function useAdminQuiz(lessonId: string) {
  return useQuery({
    queryKey: quizKeys.quiz(lessonId),
    queryFn:  async () => {
      const res = await api.get<{ success: true; data: AdminQuiz | null }>(`/admin/lessons/${lessonId}/quiz`)
      return res.data.data
    },
    enabled: !!lessonId,
  })
}

export interface QuizQuestionDraft {
  text:          string
  type:          QuestionType
  choices:       string[]
  correctAnswer: string
  points:        number
  explanation?:  string
}

export interface UpsertQuizPayload {
  passPercent?: number
  timeLimit?:   number
  questions:    QuizQuestionDraft[]
}

export function useUpsertQuiz(lessonId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (dto: UpsertQuizPayload) => {
      const res = await api.put<{ success: true; data: AdminQuiz }>(`/admin/lessons/${lessonId}/quiz`, dto)
      return res.data.data
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: quizKeys.quiz(lessonId) }) },
  })
}

export function useDeleteQuiz(lessonId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => { await api.delete(`/admin/lessons/${lessonId}/quiz`) },
    onSuccess: () => { qc.invalidateQueries({ queryKey: quizKeys.quiz(lessonId) }) },
  })
}

/* ─── Assignment hooks ───────────────────────────── */
export const assignmentKeys = {
  assignment: (lessonId: string) => ['admin', 'assignment', lessonId] as const,
}

export function useAdminAssignment(lessonId: string) {
  return useQuery({
    queryKey: assignmentKeys.assignment(lessonId),
    queryFn:  async () => {
      const res = await api.get<{ success: true; data: AdminAssignment | null }>(`/admin/lessons/${lessonId}/assignment`)
      return res.data.data
    },
    enabled: !!lessonId,
  })
}

export interface UpsertAssignmentPayload {
  title:        string
  instructions: string
  dueDate?:     string
  maxScore?:    number
}

export function useUpsertAssignment(lessonId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (dto: UpsertAssignmentPayload) => {
      const res = await api.put<{ success: true; data: AdminAssignment }>(`/admin/lessons/${lessonId}/assignment`, dto)
      return res.data.data
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: assignmentKeys.assignment(lessonId) }) },
  })
}

/* ─── Transcript hooks ───────────────────────────── */
export function useSaveTranscript(lessonId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (transcript: string) => {
      await api.patch(`/lessons/${lessonId}/transcript`, { transcript })
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['transcript', lessonId] }) },
  })
}

export function useGenerateTranscript(lessonId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (): Promise<string> => {
      const res = await api.post<{ success: true; data: { transcript: string } }>(
        `/lessons/${lessonId}/generate-transcript`,
      )
      return res.data.data.transcript
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['transcript', lessonId] }) },
  })
}
