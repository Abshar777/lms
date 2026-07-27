'use client'
import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/axios'

export interface Organization {
  id:       string
  name:     string
  slug:     'dubai' | 'bangalore'
  currency: 'AED' | 'INR'
}

export function useOrganizations(enabled = true) {
  return useQuery({
    queryKey: ['admin', 'organizations'],
    queryFn:  () => apiGet<Organization[]>('/admin/organizations'),
    enabled,
    staleTime: 5 * 60_000,
  })
}
