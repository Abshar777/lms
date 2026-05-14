'use client'
import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/axios'

export interface Achievement {
  id:          string
  title:       string
  description: string
  iconKey:     'rocket' | 'flame' | 'trophy' | 'star' | 'medal' | 'crown' | 'heart' | 'graduation'
  target:      number
  progress:    number
  earned:      boolean
  earnedAt?:   string | null
}

export interface AchievementList {
  items:       Achievement[]
  earnedCount: number
  total:       number
}

export function useMyAchievements() {
  return useQuery({
    queryKey: ['achievements', 'me'],
    queryFn:  () => apiGet<AchievementList>('/achievements/me'),
    staleTime: 60_000,
  })
}
