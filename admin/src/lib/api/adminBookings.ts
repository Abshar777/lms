'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/axios'

export function useAdminBookForStudent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ liveClassId, studentId }: { liveClassId: string; studentId: string }) => {
      const res = await api.post<{ success: true; data: unknown }>(
        '/admin/bookings/book-for-student',
        { liveClassId, studentId },
      )
      return res.data.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'live-classes'] })
    },
  })
}
