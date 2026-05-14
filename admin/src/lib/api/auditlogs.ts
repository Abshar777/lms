'use client'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/axios'
import type { PaginationMeta } from '@/types/index'

export interface AuditLog {
  id:         string
  actorId:    string
  actorEmail: string
  actorRole:  string
  action:     string
  entity:     string
  entityId?:  string
  meta?:      Record<string, unknown>
  ip?:        string
  userAgent?: string
  createdAt:  string
}

interface AuditFilter {
  page?:    number
  action?:  string
  entity?:  string
  actorId?: string
}

export const auditKeys = {
  list: (f: AuditFilter) => ['audit-logs', f] as const,
}

export function useAuditLogs(filter: AuditFilter = {}) {
  const { page = 1, action, entity, actorId } = filter
  return useQuery({
    queryKey: auditKeys.list(filter),
    queryFn: async () => {
      const params: Record<string, unknown> = { page, per_page: 25 }
      if (action)  params['action']  = action
      if (entity)  params['entity']  = entity
      if (actorId) params['actorId'] = actorId
      const res = await api.get<{ success: true; data: AuditLog[]; meta: PaginationMeta }>(
        '/audit-logs', { params },
      )
      return { docs: res.data.data, meta: res.data.meta }
    },
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  })
}
