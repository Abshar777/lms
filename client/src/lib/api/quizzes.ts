'use client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost } from '@/lib/axios'

export type QuestionType = 'mcq' | 'true_false' | 'short'

export interface QuizQuestion {
  id:      string
  text:    string
  type:    QuestionType
  choices: string[]
  points:  number
}

export interface StudentQuiz {
  id:           string
  passPercent:  number
  timeLimit:    number | null
  questions:    QuizQuestion[]
}

export interface QuizSummary {
  hasAttempted:  boolean
  bestScore:     number | null
  passed:        boolean
  attempts:      number
  passPercent:   number
  timeLimit:     number | null
  questionCount: number
}

export interface SubmitQuizResult {
  score:        number
  maxScore:     number
  scorePercent: number
  passed:       boolean
  attempt:      number
  breakdown: Array<{
    questionId:    string
    correct:       boolean
    correctAnswer: string
    points:        number
    explanation?:  string
  }>
}

export const quizKeys = {
  all:     ['quiz'] as const,
  quiz:    (lessonId: string) => ['quiz', lessonId] as const,
  summary: (lessonId: string) => ['quiz', lessonId, 'summary'] as const,
}

export function useStudentQuiz(lessonId: string) {
  return useQuery({
    queryKey: quizKeys.quiz(lessonId),
    queryFn:  () => apiGet<StudentQuiz>(`/quizzes/lessons/${lessonId}`),
    enabled:  !!lessonId,
  })
}

export function useQuizSummary(lessonId: string) {
  return useQuery({
    queryKey: quizKeys.summary(lessonId),
    queryFn:  () => apiGet<QuizSummary>(`/quizzes/lessons/${lessonId}/summary`),
    enabled:  !!lessonId,
  })
}

export function useSubmitQuiz(lessonId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (answers: Array<{ questionId: string; answer: string }>) =>
      apiPost<SubmitQuizResult>(`/quizzes/lessons/${lessonId}/submit`, { answers }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: quizKeys.summary(lessonId) })
    },
  })
}
