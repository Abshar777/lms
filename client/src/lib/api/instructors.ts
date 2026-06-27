'use client'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/axios'

export interface PublicInstructor {
  id:        string
  name:      string
  avatarUrl: string | null
  headline:  string | null
}

export function useInstructors() {
  return useQuery({
    queryKey: ['instructors', 'list'],
    queryFn: async () => {
      const res = await api.get<{ success: true; data: PublicInstructor[] }>('/instructors')
      return res.data.data
    },
    staleTime: 5 * 60_000,
  })
}
