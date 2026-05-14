'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, ShieldOff } from 'lucide-react'
import { useCurrentUser, logout } from '@/lib/api/user'

/**
 * AdminGuard
 * ───────────────────────────────────────────────
 * Wrap admin-only UI. Renders the children only when the authenticated
 * user has role === 'admin'. Anyone else is redirected to /login.
 *
 * The middleware already keeps anonymous users out via the `lms_at`
 * cookie. The cookie is shared across :3000 and :3001 because both
 * run on the same localhost host, so a logged-in student would
 * otherwise reach the admin app. This guard rejects them.
 */
export function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { data: user, isLoading, isError } = useCurrentUser()

  useEffect(() => {
    if (isLoading) return

    /* No session at all → middleware should have handled it, but fail safe. */
    if (isError || !user) {
      router.replace('/login')
      return
    }

    /* Logged in but not admin → end the session and bounce to login. */
    if (user.role !== 'admin') {
      void logout().finally(() => {
        router.replace('/login?reason=not-admin')
      })
    }
  }, [isLoading, isError, user, router])

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center gap-3" style={{ background: '#080A12' }}>
        <Loader2 size={20} className="animate-spin" style={{ color: '#FF6B1A' }} />
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>Verifying admin access…</p>
      </div>
    )
  }

  if (!user || user.role !== 'admin') {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4" style={{ background: '#080A12' }}>
        <div className="flex h-14 w-14 items-center justify-center rounded-3xl"
          style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.22)' }}>
          <ShieldOff size={22} style={{ color: '#EF4444' }} />
        </div>
        <p className="text-base font-bold" style={{ color: 'white' }}>Admin access required</p>
        <p className="text-sm max-w-sm text-center" style={{ color: 'rgba(255,255,255,0.45)' }}>
          You&apos;re signed in as a student. Redirecting you to the admin login…
        </p>
      </div>
    )
  }

  return <>{children}</>
}
