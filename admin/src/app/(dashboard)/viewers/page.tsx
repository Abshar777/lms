'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Eye, Search, Loader2, Mail, Calendar, CheckCircle2,
  XCircle, ShieldOff, ShieldCheck, ChevronLeft, ChevronRight,
  Clock, TrendingUp, Megaphone, Cpu, RotateCcw,
} from 'lucide-react'
import { useUsers, useUpdateUser, type AdminUser } from '@/lib/api/users'
import { useApproveEnrollment, useRejectEnrollment, useToggleBlock, useRevokeToViewer } from '@/lib/api/enrollmentRequests'
import { useCurrentUser } from '@/lib/api/user'
import { useToast } from '@/store/ui.store'
import { ApproveViewerDialog } from '@/components/viewers/ApproveViewerDialog'

type ProgramCategory = '4x-trading' | 'digital-marketing' | 'ai'

const CATEGORY_META: Record<ProgramCategory, { label: string; color: string; bg: string }> = {
  '4x-trading':        { label: 'FOREX Trading',     color: '#10B981', bg: 'rgba(16,185,129,0.14)'  },
  'digital-marketing': { label: 'Digital Marketing', color: '#FF6B1A', bg: 'rgba(255,107,26,0.14)' },
  'ai':                { label: 'AI',                 color: '#8B5CF6', bg: 'rgba(139,92,246,0.14)'  },
}

const CATEGORY_SCOPE: Record<string, ProgramCategory> = {
  '4x_admin':               '4x-trading',
  digital_marketing_admin:  'digital-marketing',
  ai_admin:                 'ai',
}

function fmtDate(d?: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function ViewersPage() {
  const { data: me } = useCurrentUser()
  const toast = useToast()

  const [search, setSearch]   = useState('')
  const [page,   setPage]     = useState(1)
  const [approveTarget, setApproveTarget] = useState<AdminUser | null>(null)

  const scopeCategory: ProgramCategory | null = me?.role ? (CATEGORY_SCOPE[me.role] ?? null) : null
  const isFullAdmin = me?.role === 'super_admin' || me?.role === 'admin'

  const { data, isLoading, refetch } = useUsers('student', {
    search,
    page,
    per_page: 20,
    enrollmentStatus: 'pending',
  })

  const viewers = data?.docs ?? []
  const meta    = data?.meta

  const approve      = useApproveEnrollment()
  const reject       = useRejectEnrollment()
  const toggleBlock  = useToggleBlock()

  const handleApprove = async (cats: ProgramCategory[]) => {
    if (!approveTarget) return
    try {
      await approve.mutateAsync({ userId: approveTarget.id, categories: cats })
      toast.success(`${approveTarget.name} approved`, `Now a student with access to: ${cats.map(c => CATEGORY_META[c].label).join(', ')}`)
      setApproveTarget(null)
      refetch()
    } catch (err: any) {
      toast.error('Approval failed', err?.response?.data?.error?.message)
    }
  }

  const handleReject = async (user: AdminUser, reason: string) => {
    try {
      await reject.mutateAsync({ userId: user.id, reason })
      toast.success(`${user.name} rejected`, 'User has been notified.')
      refetch()
    } catch (err: any) {
      toast.error('Reject failed', err?.response?.data?.error?.message)
    }
  }

  const handleToggleBlock = async (user: AdminUser) => {
    try {
      await toggleBlock.mutateAsync({ userId: user.id, isActive: !user.isActive })
      toast.success(
        user.isActive ? `${user.name} blocked` : `${user.name} unblocked`,
        user.isActive ? 'User can no longer log in.' : 'User can log in again.',
      )
      refetch()
    } catch (err: any) {
      toast.error('Action failed', err?.response?.data?.error?.message)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5" style={{ fontFamily: 'Bricolage Grotesque, sans-serif' }}>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)' }}>
              <Eye size={15} style={{ color: '#818CF8' }} />
            </div>
            Viewers
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Users who signed up but are awaiting approval. Approve to grant student access.
          </p>
        </div>
        {meta && (
          <div className="flex items-center gap-2 rounded-2xl px-4 py-2.5 flex-shrink-0"
            style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.18)' }}>
            <Eye size={13} style={{ color: '#818CF8' }} />
            <span className="text-sm font-bold" style={{ color: '#818CF8' }}>{meta.total_count}</span>
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>pending</span>
          </div>
        )}
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 rounded-2xl px-4 py-3.5"
        style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)' }}>
        <Eye size={14} className="mt-0.5 flex-shrink-0" style={{ color: '#818CF8' }} />
        <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>
          Viewers can browse the platform but cannot access course content or book live classes.
          Approving a viewer assigns them a program and converts them into a full student.
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'rgba(255,255,255,0.3)' }} />
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
          placeholder="Search by name or email…"
          className="w-full rounded-xl py-2 pl-9 pr-4 text-sm text-white outline-none transition-all placeholder:text-white/25"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
          onFocus={e => { e.currentTarget.style.border = '1px solid rgba(99,102,241,0.5)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.10)' }}
          onBlur={e => { e.currentTarget.style.border = '1px solid rgba(255,255,255,0.08)'; e.currentTarget.style.boxShadow = 'none' }}
        />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] border-collapse">
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                {['Viewer', 'Email', 'Status', 'Signed up', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left"
                    style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={5} className="px-4 py-16 text-center">
                  <div className="inline-flex items-center gap-2 text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    <Loader2 size={14} className="animate-spin" />Loading viewers…
                  </div>
                </td></tr>
              )}
              {!isLoading && viewers.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-20 text-center">
                  <div style={{ color: 'rgba(255,255,255,0.3)' }}>
                    <Eye size={32} className="mx-auto mb-3 opacity-30" />
                    <p className="text-sm font-medium">No pending viewers</p>
                    <p className="mt-1 text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>New signups will appear here</p>
                  </div>
                </td></tr>
              )}
              {!isLoading && viewers.map((user, i) => (
                <motion.tr
                  key={user.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                  className="group transition-colors hover:bg-white/[0.02]"
                >
                  {/* Name + avatar */}
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="relative flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full"
                        style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.25)' }}>
                        <span className="text-xs font-bold" style={{ color: '#818CF8' }}>
                          {user.name[0]?.toUpperCase() ?? '?'}
                        </span>
                        {!user.isActive && (
                          <div className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full"
                            style={{ background: '#EF4444', border: '2px solid #0D0F1A' }}>
                            <ShieldOff size={8} className="text-white" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white" style={{ maxWidth: 180 }}>{user.name}</p>
                        {!user.isActive && (
                          <span className="text-[10px] font-medium" style={{ color: '#EF4444' }}>Blocked</span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Email */}
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5" style={{ color: 'rgba(255,255,255,0.55)' }}>
                      <Mail size={11} />
                      <span className="text-xs truncate max-w-[220px]">{user.email}</span>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3.5">
                    <div className="flex flex-col gap-1">
                      <span className="inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold"
                        style={{ background: 'rgba(99,102,241,0.12)', color: '#818CF8' }}>
                        <Eye size={10} />Viewer
                      </span>
                      <span className="inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium"
                        style={{ background: 'rgba(251,191,36,0.10)', color: '#FBBF24' }}>
                        <Clock size={9} />Pending approval
                      </span>
                    </div>
                  </td>

                  {/* Joined */}
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5 text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                      <Calendar size={11} />{fmtDate(user.createdAt)}
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        onClick={() => setApproveTarget(user)}
                        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-all hover:opacity-90"
                        style={{ background: 'rgba(74,222,128,0.85)', boxShadow: '0 2px 8px rgba(74,222,128,0.25)' }}>
                        <CheckCircle2 size={11} />Approve
                      </button>
                      <button
                        onClick={() => handleToggleBlock(user)}
                        disabled={toggleBlock.isPending}
                        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all disabled:opacity-40"
                        style={user.isActive
                          ? { color: '#F87171', border: '1px solid rgba(248,113,113,0.3)' }
                          : { color: '#4ADE80', border: '1px solid rgba(74,222,128,0.3)' }}>
                        {toggleBlock.isPending
                          ? <Loader2 size={10} className="animate-spin" />
                          : user.isActive ? <ShieldOff size={10} /> : <ShieldCheck size={10} />}
                        {user.isActive ? 'Block' : 'Unblock'}
                      </button>
                      <button
                        onClick={() => {
                          const reason = prompt(`Reject ${user.name}? Enter reason:`)
                          if (reason && reason.length >= 5) handleReject(user, reason)
                        }}
                        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all"
                        style={{ color: 'rgba(248,113,113,0.7)', border: '1px solid rgba(248,113,113,0.2)' }}>
                        <XCircle size={10} />Reject
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {meta && meta.total_pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
              Page {meta.page} of {meta.total_pages} · {meta.total_count} viewers
            </span>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={!meta.has_prev}
                className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-white/05 disabled:opacity-30"
                style={{ color: 'rgba(255,255,255,0.5)' }}>
                <ChevronLeft size={13} />
              </button>
              <button onClick={() => setPage(p => p + 1)} disabled={!meta.has_next}
                className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-white/05 disabled:opacity-30"
                style={{ color: 'rgba(255,255,255,0.5)' }}>
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Approve dialog */}
      <AnimatePresence>
        {approveTarget && (
          <ApproveViewerDialog
            user={approveTarget}
            scopeCategory={scopeCategory}
            loading={approve.isPending}
            onClose={() => setApproveTarget(null)}
            onConfirm={handleApprove}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
