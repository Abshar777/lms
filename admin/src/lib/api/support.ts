'use client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/axios'

export type SupportStatus   = 'open' | 'pending' | 'resolved' | 'closed'
export type SupportCategory = 'technical' | 'billing' | 'course' | 'account' | 'other'

export interface SupportMessage {
  _id?:       string
  senderId:   string | { id: string; name: string; avatarUrl?: string; role?: string }
  senderRole: 'student' | 'instructor' | 'admin'
  body:       string
  createdAt:  string
}

export interface SupportUser { id: string; name: string; email: string; avatarUrl?: string }

export interface SupportTicket {
  id:            string
  userId:        SupportUser | string
  subject:       string
  category:      SupportCategory
  status:        SupportStatus
  messages:      SupportMessage[]
  lastMessageAt: string
  lastSenderRole:'student' | 'instructor' | 'admin'
  adminUnread:   boolean
  createdAt:     string
}

export interface SupportStats { open: number; pending: number; resolved: number; closed: number; unread: number }

export const supportKeys = {
  list:  (p: object) => ['admin', 'support', p] as const,
  one:   (id: string) => ['admin', 'support', 'ticket', id] as const,
  stats: ['admin', 'support', 'stats'] as const,
}

/* GET /support/admin */
export function useAdminTickets(filter: { status?: string; search?: string } = {}) {
  return useQuery({
    queryKey: supportKeys.list(filter),
    queryFn:  async () => {
      const params: Record<string, string> = {}
      if (filter.status && filter.status !== 'all') params.status = filter.status
      if (filter.search?.trim()) params.search = filter.search.trim()
      const res = await api.get<{ success: true; data: SupportTicket[] }>('/support/admin', { params })
      return res.data.data
    },
    staleTime: 10_000,
  })
}

/* GET /support/admin/stats */
export function useSupportStats() {
  return useQuery({
    queryKey: supportKeys.stats,
    queryFn:  async () => (await api.get<{ success: true; data: SupportStats }>('/support/admin/stats')).data.data,
    staleTime: 10_000,
  })
}

/* GET /support/:id */
export function useAdminTicket(id: string | null) {
  return useQuery({
    queryKey: supportKeys.one(id ?? ''),
    queryFn:  async () => (await api.get<{ success: true; data: SupportTicket }>(`/support/${id}`)).data.data,
    enabled:  !!id,
    staleTime: 5_000,
  })
}

/* POST /support/:id/messages */
export function useAdminReply(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: string) =>
      (await api.post<{ success: true; data: SupportTicket }>(`/support/${id}/messages`, { body })).data.data,
    onSuccess: (ticket) => {
      qc.setQueryData(supportKeys.one(id), ticket)
      qc.invalidateQueries({ queryKey: ['admin', 'support'] })
    },
  })
}

/* PATCH /support/:id/status */
export function useSetTicketStatus(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (status: SupportStatus) =>
      (await api.patch<{ success: true; data: SupportTicket }>(`/support/${id}/status`, { status })).data.data,
    onSuccess: (ticket) => {
      qc.setQueryData(supportKeys.one(id), ticket)
      qc.invalidateQueries({ queryKey: ['admin', 'support'] })
    },
  })
}
