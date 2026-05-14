'use client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPatch } from '@/lib/axios'

export interface UserStreak {
  currentStreak:   number
  longestStreak:   number
  lastActiveDate:  string
  totalDaysActive: number
  weeklyGoal:      number
  weekProgress:    number
  weekStartDate:   string
}

export const streakKeys = {
  all: ['streak'] as const,
  me:  ['streak', 'me'] as const,
}

export function useMyStreak() {
  return useQuery({
    queryKey: streakKeys.me,
    queryFn:  () => apiGet<UserStreak>('/streaks/me'),
    staleTime: 60_000,
  })
}

export function useUpdateStreakGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (weeklyGoal: number) => apiPatch<UserStreak>('/streaks/me/goal', { weeklyGoal }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: streakKeys.me }) },
  })
}
