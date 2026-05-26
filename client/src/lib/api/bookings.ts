'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, apiGet } from '@/lib/axios'

export type BookingStatus = 'booked' | 'attended' | 'missed' | 'cancelled'

export interface MyBooking {
  id:          string
  status:      BookingStatus
  bookedAt:    string
  cancelledAt?: string
  liveClassId: {
    id:             string
    title:          string
    scheduledStart: string
    durationMins:   number
    status:         string
    meetingUrl?:    string
    muxPlaybackId?: string
    type:           string
  }
  batchId: {
    id:   string
    name: string
  }
}

export const bookingKeys = {
  mine:   (p: object) => ['bookings', 'me', p] as const,
  all:    ['bookings'] as const,
}

/* ── My bookings ─────────────────────────────────────── */
export function useMyBookings(params: {
  status?:   BookingStatus
  page?:     number
  per_page?: number
} = {}) {
  return useQuery({
    queryKey: bookingKeys.mine(params),
    queryFn:  async () => {
      const p: Record<string, any> = { ...params }
      Object.keys(p).forEach(k => (p[k] == null || p[k] === '') && delete p[k])
      const res = await api.get<{ success: true; data: MyBooking[]; meta: any }>(
        '/bookings/me', { params: p },
      )
      return { docs: res.data.data, meta: res.data.meta }
    },
    staleTime: 30_000,
  })
}

/* ── Book a session ──────────────────────────────────── */
export function useCreateBooking() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (liveClassId: string): Promise<MyBooking> => {
      const res = await api.post<{ success: true; data: MyBooking }>('/bookings', { liveClassId })
      return res.data.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: bookingKeys.all })
    },
  })
}

/* ── Cancel a booking ────────────────────────────────── */
export function useCancelBooking() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (bookingId: string) => {
      await api.delete(`/bookings/${bookingId}`)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: bookingKeys.all })
    },
  })
}
