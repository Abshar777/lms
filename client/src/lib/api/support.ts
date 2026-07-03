'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost } from '@/lib/axios'

export type SupportStatus   = 'open' | 'pending' | 'resolved' | 'closed'
export type SupportCategory = 'technical' | 'billing' | 'course' | 'account' | 'other'

export interface SupportMessage {
  _id?:       string
  senderId:   string | { id: string; name: string; avatarUrl?: string; role?: string }
  senderRole: 'student' | 'instructor' | 'admin'
  body:       string
  createdAt:  string
}

export interface SupportTicket {
  id:             string
  subject:        string
  category:       SupportCategory
  status:         SupportStatus
  messages:       SupportMessage[]
  lastMessageAt:  string
  lastSenderRole: 'student' | 'admin'
  userUnread:     boolean
  adminUnread:    boolean
  createdAt:      string
}

export const supportKeys = {
  mine: ['support', 'me'] as const,
  one:  (id: string) => ['support', id] as const,
}

/* GET /support/me — my tickets */
export function useMyTickets() {
  return useQuery({
    queryKey: supportKeys.mine,
    queryFn:  () => apiGet<SupportTicket[]>('/support/me'),
    staleTime: 15_000,
  })
}

/* GET /support/:id — a single ticket thread */
export function useTicket(id: string | undefined) {
  return useQuery({
    queryKey: supportKeys.one(id ?? ''),
    queryFn:  () => apiGet<SupportTicket>(`/support/${id}`),
    enabled:  !!id,
    staleTime: 5_000,
  })
}

/* POST /support — open a new ticket */
export function useCreateTicket() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { subject: string; category?: SupportCategory; message: string }) =>
      apiPost<SupportTicket>('/support', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: supportKeys.mine }),
  })
}

/* POST /support/:id/messages — reply */
export function useReplyTicket(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: string) => apiPost<SupportTicket>(`/support/${id}/messages`, { body }),
    onSuccess: (ticket) => {
      qc.setQueryData(supportKeys.one(id), ticket)
      qc.invalidateQueries({ queryKey: supportKeys.mine })
    },
  })
}
