'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { User, Mail, Lock, Eye, EyeOff, ChevronRight, Zap } from 'lucide-react'
import { useCurrentUser } from '@/lib/api/user'
import { RequestSection } from '@/components/settings/RequestSection'
import Spinner from '@/components/ui/Spinner'

function AccountCard() {
  const { data: user, isLoading } = useCurrentUser()
  const [showPw, setShowPw] = useState(false)

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-2xl bg-white p-5" style={{ border: '1px solid #E5E7EB' }}>
        <Spinner size={16} />
        <span className="text-sm" style={{ color: '#9CA3AF' }}>Loading account…</span>
      </div>
    )
  }

  if (!user) return null

  const field = (icon: React.ReactNode, label: string, value: React.ReactNode) => (
    <div className="flex items-center gap-3">
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl"
        style={{ background: 'rgba(0,87,184,0.07)', border: '1px solid rgba(0,87,184,0.12)' }}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: '#9CA3AF' }}>{label}</p>
        <div className="text-sm font-medium truncate" style={{ color: '#111827' }}>{value}</div>
      </div>
    </div>
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-white p-5"
      style={{ border: '1px solid rgba(0,87,184,0.18)', boxShadow: '0 1px 6px rgba(0,87,184,0.06)' }}
    >
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full"
            style={{ background: 'rgba(124,58,237,0.1)' }}>
            <Zap size={12} style={{ color: '#7C3AED' }} />
          </div>
          <span className="text-xs font-semibold" style={{ color: '#5B21B6' }}>Express Account</span>
        </div>
        <Link
          href="/settings"
          className="text-xs font-medium transition-colors hover:underline"
          style={{ color: '#0057b8' }}
        >
          Account settings
        </Link>
      </div>

      {/* Fields */}
      <div className="space-y-3">
        {field(
          <User size={14} style={{ color: '#0057b8' }} />,
          'Full Name',
          user.name,
        )}
        {field(
          <Mail size={14} style={{ color: '#0057b8' }} />,
          'Email Address',
          user.email,
        )}
        {field(
          <Lock size={14} style={{ color: '#0057b8' }} />,
          'Password',
          <div className="flex items-center gap-2">
            <span className="tracking-widest text-base leading-none" style={{ color: '#374151' }}>
              {showPw ? 'your-password' : '••••••••••'}
            </span>
            <button
              type="button"
              onClick={() => setShowPw(v => !v)}
              className="transition-colors hover:opacity-70"
              style={{ color: '#9CA3AF' }}
            >
              {showPw ? <EyeOff size={13} /> : <Eye size={13} />}
            </button>
            <Link
              href="/settings?tab=profile"
              className="ml-1 text-xs font-medium transition-colors hover:underline"
              style={{ color: '#0057b8' }}
            >
              Change
            </Link>
          </div>,
        )}
      </div>

      {/* Note */}
      <div className="mt-4 rounded-xl px-3 py-2.5 text-xs" style={{
        background: 'rgba(0,87,184,0.04)',
        border: '1px solid rgba(0,87,184,0.10)',
        color: '#374151',
      }}>
        Complete the form below to upgrade your Express Account to full membership.
        Your name and email are locked — contact support to change them.
      </div>
    </motion.div>
  )
}

export default function CompleteRegistrationPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-5 pb-20">

      {/* Page header */}
      <div>
        <div className="flex items-center gap-1.5 text-xs" style={{ color: '#9CA3AF' }}>
          <Link href="/my-learning" className="hover:underline">Home</Link>
          <ChevronRight size={12} />
          <span style={{ color: '#374151' }}>Complete Registration</span>
        </div>
        <h1 className="mt-2 text-xl font-bold" style={{ color: '#111827' }}>Complete Your Registration</h1>
        <p className="mt-0.5 text-sm" style={{ color: '#6B7280' }}>
          Fill in your details to unlock full access to courses, live classes, and bookings.
        </p>
      </div>

      {/* Auto-filled account card */}
      <AccountCard />

      {/* The full enrollment form */}
      <RequestSection />

    </div>
  )
}
