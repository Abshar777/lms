'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { CheckCircle2, AlertCircle, Mail } from 'lucide-react'
import { verifyEmail } from '@/lib/api/user'
import Spinner from '@/components/ui/Spinner'

function VerifyEmailInner() {
  const params = useSearchParams()
  const token  = params.get('token') ?? ''
  const [state, setState] = useState<'verifying' | 'ok' | 'error'>('verifying')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function run() {
      if (!token) {
        setState('error')
        setErrorMsg('No token in the URL. Open the link from your verification email.')
        return
      }
      try {
        await verifyEmail(token)
        if (!cancelled) setState('ok')
      } catch (err: any) {
        if (cancelled) return
        setState('error')
        setErrorMsg(err?.response?.data?.error?.message ?? 'This verification link is invalid or has expired.')
      }
    }
    void run()
    return () => { cancelled = true }
  }, [token])

  if (state === 'verifying') {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <Spinner size={26} />
        <p className="text-sm" style={{ color: '#6B7280' }}>Verifying your email…</p>
      </div>
    )
  }
  if (state === 'ok') {
    return (
      <div className="flex flex-col items-center gap-3 py-2 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-3xl"
          style={{ background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.22)' }}>
          <CheckCircle2 size={24} style={{ color: '#10B981' }} />
        </div>
        <p className="text-base font-bold" style={{ color: '#0D0F1A' }}>Email verified</p>
        <p className="text-sm max-w-sm" style={{ color: '#6B7280' }}>
          Thanks for confirming. You now have full access to notifications, certificates, and account recovery.
        </p>
        <Link href="/my-learning" className="mt-3 rounded-xl px-5 py-2.5 text-sm font-bold text-white"
          style={{ background: '#0057b8' }}>
          Go to My Learning
        </Link>
      </div>
    )
  }
  return (
    <div className="flex flex-col items-center gap-3 py-2 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-3xl"
        style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.22)' }}>
        <AlertCircle size={24} style={{ color: '#EF4444' }} />
      </div>
      <p className="text-base font-bold" style={{ color: '#0D0F1A' }}>Couldn&apos;t verify</p>
      <p className="text-sm max-w-sm" style={{ color: '#6B7280' }}>{errorMsg}</p>
      <Link href="/login" className="mt-3 text-sm font-semibold" style={{ color: '#0057b8' }}>
        Back to sign in
      </Link>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-10" style={{ background: '#F4F5F8' }}>
      <motion.div
        initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 26 }}
        className="w-full max-w-[460px] rounded-3xl bg-white p-8"
        style={{ border: '1px solid #E4E7ED', boxShadow: '0 24px 80px rgba(13,15,26,0.08)' }}>
        <div className="mb-2 flex items-center gap-2">
          <Mail size={16} style={{ color: '#0057b8' }} />
          <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: '#0057b8' }}>
            Email verification
          </span>
        </div>
        <Suspense fallback={<div className="h-[160px]" />}>
          <VerifyEmailInner />
        </Suspense>
      </motion.div>
    </div>
  )
}
