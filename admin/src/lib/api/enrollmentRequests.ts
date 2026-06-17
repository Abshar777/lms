'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/axios'

export type EnrollmentRequestStatus = 'pending' | 'approved' | 'cancelled'

export interface EnrollmentRequest {
  id:                           string
  name:                         string
  email:                        string
  category:                     '4x-trading' | 'digital-marketing'
  enrollmentStatus:             EnrollmentRequestStatus
  enrollmentCancellationReason?: string
  isActive:                     boolean
  createdAt:                    string
}

const KEYS = {
  list: (status: string, category?: string) =>
    ['admin', 'enrollment-requests', status, category ?? 'all'] as const,
}

export function useEnrollmentRequests(
  status: EnrollmentRequestStatus | 'all' = 'pending',
  category?: '4x-trading' | 'digital-marketing',
) {
  return useQuery({
    queryKey: KEYS.list(status, category),
    queryFn: async () => {
      const params: Record<string, string> = { status }
      if (category) params['category'] = category
      const res = await api.get<{ success: true; data: EnrollmentRequest[]; meta: { total_count: number; total_pages: number; page: number; has_next: boolean; has_prev: boolean } }>(
        '/admin/enrollment-requests',
        { params },
      )
      return res.data
    },
    staleTime: 30_000,
  })
}

export function useApproveEnrollment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (userId: string) => {
      const res = await api.patch<{ success: true; data: { id: string; enrollmentStatus: string } }>(
        `/admin/enrollment-requests/${userId}/approve`,
      )
      return res.data.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'enrollment-requests'] }),
  })
}

export function useCancelEnrollment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ userId, reason }: { userId: string; reason: string }) => {
      const res = await api.patch<{ success: true; data: { id: string; enrollmentStatus: string } }>(
        `/admin/enrollment-requests/${userId}/cancel`,
        { reason },
      )
      return res.data.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'enrollment-requests'] }),
  })
}
