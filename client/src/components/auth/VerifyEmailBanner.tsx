'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, X, Loader2, CheckCircle2 } from 'lucide-react'
import { useCurrentUser, resendVerification } from '@/lib/api/user'

const STORAGE_KEY = 'lms-verify-banner-dismissed-at'

function isRecentlyDismissed(): boolean {
  if (typeof window === 'undefined') return false
  const at = window.localStorage.getItem(STORAGE_KEY)
  if (!at) return false
  const since = Date.now() - Number(at)
  /* Snooze for 24h */
  return since < 24 * 60 * 60 * 1000
}

export function VerifyEmailBanner() {
  const { data: user } = useCurrentUser()
  const [dismissed, setDismissed] = useState(() => isRecentlyDismissed())
  const [sending,   setSending]   = useState(false)
  const [sent,      setSent]      = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  if (!user || user.isVerified || dismissed) return null

  const dismiss = () => {
    setDismissed(true)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, String(Date.now()))
    }
  }

  const resend = async () => {
    setSending(true)
    setError(null)
    try {
      await resendVerification()
      setSent(true)
      setTimeout(() => setSent(false), 4000)
    } catch (err: any) {
      setError(err?.response?.data?.error?.message ?? 'Could not send. Try again later.')
    } finally {
      setSending(false)
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
        className="mb-5 flex items-center gap-3 rounded-2xl px-4 py-3"
        style={{
          background: 'linear-gradient(135deg, rgba(0,87,184,0.06) 0%, rgba(255,140,66,0.04) 100%)',
          border: '1px solid rgba(0,87,184,0.18)',
        }}>
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl"
          style={{ background: 'rgba(0,87,184,0.12)' }}>
          <Mail size={14} style={{ color: '#0057b8' }} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold" style={{ color: '#0D0F1A' }}>
            Verify your email to unlock the full LearnOS experience
          </p>
          <p className="text-xs" style={{ color: '#6B7280' }}>
            We sent a link to <span className="font-semibold">{user.email}</span>.
            {error && <> <span style={{ color: '#EF4444' }}>{error}</span></>}
          </p>
        </div>
        <button
          onClick={resend}
          disabled={sending || sent}
          className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold text-white transition-all disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg, #0057b8, #1a73e8)' }}>
          {sending
            ? <><Loader2 size={12} className="animate-spin" />Sending…</>
            : sent
              ? <><CheckCircle2 size={12} />Sent</>
              : 'Resend email'}
        </button>
        <button onClick={dismiss}
          aria-label="Dismiss"
          className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-white/60"
          style={{ color: '#9CA3AF' }}>
          <X size={13} />
        </button>
      </motion.div>
    </AnimatePresence>
  )
}
