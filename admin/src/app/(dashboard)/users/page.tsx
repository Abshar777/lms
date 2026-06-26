'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AdminUsersPanel } from '@/components/users/AdminUsersPanel'
import { useCurrentUser } from '@/lib/api/user'

export default function UsersPage() {
  const { data: me, isLoading } = useCurrentUser()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && me?.role === 'instructor') {
      router.replace('/courses')
    }
  }, [me, isLoading, router])

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2"
          style={{ borderColor: '#0057b8', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  if (me?.role === 'instructor') return null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Bricolage Grotesque, sans-serif' }}>
          Users
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
          Manage admins and instructors.{me?.role === 'super_admin' ? ' View, edit, delete, or impersonate any user.' : ' View, edit, and delete users.'}
        </p>
      </div>
      <AdminUsersPanel />
    </div>
  )
}
