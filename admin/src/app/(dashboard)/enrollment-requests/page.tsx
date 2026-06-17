'use client'

import { useState, Fragment } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Clock, CheckCircle2, XCircle, User, Mail,
  Loader2, ChevronDown, AlertCircle, Search,
} from 'lucide-react'
import {
  useEnrollmentRequests, useApproveEnrollment, useCancelEnrollment,
  type EnrollmentRequest, type EnrollmentRequestStatus,
} from '@/lib/api/enrollmentRequests'
import { useCurrentUser } from '@/lib/api/user'
import { useToast } from '@/store/ui.store'

const CATEGORY_LABEL: Record<string, string> = {
  '4x-trading':        '4x Trading',
  'digital-marketing': 'Digital Marketing',
}

const CATEGORY_COLOR: Record<string, { bg: string; color: string }> = {
  '4x-trading':        { bg: 'rgba(96,165,250,0.14)',  color: '#60A5FA' },
  'digital-marketing': { bg: 'rgba(52,211,153,0.14)',  color: '#34D399' },
}

const STATUS_STYLE: Record<string, { bg: string; color: string; icon: React.ReactNode; label: string }> = {
  pending:   { bg: 'rgba(251,191,36,0.14)',  color: '#FBBF24', icon: <Clock size={11} />,        label: 'Pending' },
  approved:  { bg: 'rgba(74,222,128,0.14)',  color: '#4ADE80', icon: <CheckCircle2 size={11} />, label: 'Approved' },
  cancelled: { bg: 'rgba(248,113,113,0.14)', color: '#F87171', icon: <XCircle size={11} />,      label: 'Cancelled' },
}

type StatusFilter = EnrollmentRequestStatus | 'all'

/* ── Cancel dialog ─────────────────────────────── */
function CancelDialog({ user, onClose, onConfirm, loading }: {
  user:      EnrollmentRequest
  onClose:   () => void
  onConfirm: (reason: string) => void
  loading:   boolean
}) {
  const [reason, setReason] = useState('')
  const catStyle = CATEGORY_COLOR[user.category] ?? CATEGORY_COLOR['4x-trading']

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0"
        style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="relative w-full max-w-md overflow-hidden rounded-2xl"
        style={{
          background: 'linear-gradient(145deg, #0e1022 0%, #0a0c18 100%)',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 40px 80px rgba(0,0,0,0.8)',
          zIndex: 1,
        }}
      >
        <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#EF4444' }}>Cancel Access</p>
          <h2 className="mt-0.5 text-base font-bold text-white">{user.name}</h2>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{user.email}</p>
        </div>

        <div className="p-5">
          <div className="mb-4 flex items-center gap-2 rounded-xl p-3"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <AlertCircle size={14} style={{ color: '#EF4444', flexShrink: 0 }} />
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.7)' }}>
              The student will receive an email explaining why their request was not approved.
            </p>
          </div>

          <label className="mb-1.5 block text-xs font-medium" style={{ color: 'rgba(255,255,255,0.45)' }}>
            Reason for cancellation
          </label>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="e.g. Incomplete information provided, please resubmit with valid details…"
            rows={4}
            className="w-full resize-none rounded-xl px-3 py-2.5 text-sm text-white outline-none transition-all placeholder:text-white/20"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.09)',
            }}
            onFocus={e => { e.currentTarget.style.border = '1px solid rgba(239,68,68,0.4)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(239,68,68,0.08)' }}
            onBlur={e => { e.currentTarget.style.border = '1px solid rgba(255,255,255,0.09)'; e.currentTarget.style.boxShadow = 'none' }}
          />
          <p className="mt-1 text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>{reason.length}/1000</p>

          <div className="mt-5 flex justify-end gap-2">
            <button onClick={onClose}
              className="rounded-xl px-4 py-2 text-sm font-medium transition-colors hover:bg-white/07"
              style={{ color: 'rgba(255,255,255,0.5)' }}>
              Cancel
            </button>
            <button
              onClick={() => reason.trim().length >= 5 && onConfirm(reason.trim())}
              disabled={loading || reason.trim().length < 5}
              className="flex items-center gap-1.5 rounded-xl px-5 py-2 text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg,#EF4444,#DC2626)' }}>
              {loading && <Loader2 size={13} className="animate-spin" />}
              Confirm cancellation
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

/* ── Main page ─────────────────────────────────── */
export default function EnrollmentRequestsPage() {
  const { data: me } = useCurrentUser()
  const toast        = useToast()

  const [statusFilter, setStatusFilter]  = useState<StatusFilter>('pending')
  const [search,       setSearch]        = useState('')
  const [cancelTarget, setCancelTarget]  = useState<EnrollmentRequest | null>(null)

  const approve = useApproveEnrollment()
  const cancel  = useCancelEnrollment()

  const isScoped = me?.role === '4x_admin' || me?.role === 'digital_marketing_admin'
  const scopeCategory = me?.role === '4x_admin'
    ? '4x-trading' as const
    : me?.role === 'digital_marketing_admin'
      ? 'digital-marketing' as const
      : undefined

  const { data, isLoading } = useEnrollmentRequests(statusFilter, scopeCategory)

  const requests = (data?.data ?? []).filter(r =>
    !search || r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.email.toLowerCase().includes(search.toLowerCase()),
  )

  const handleApprove = async (u: EnrollmentRequest) => {
    try {
      await approve.mutateAsync(u.id)
      toast.success(`${u.name} approved`, 'They can now access live sessions.')
    } catch (err: any) {
      toast.error('Approval failed', err?.response?.data?.error?.message)
    }
  }

  const handleCancel = async (reason: string) => {
    if (!cancelTarget) return
    try {
      await cancel.mutateAsync({ userId: cancelTarget.id, reason })
      toast.success('Request cancelled', `${cancelTarget.name} has been notified by email.`)
      setCancelTarget(null)
    } catch (err: any) {
      toast.error('Cancellation failed', err?.response?.data?.error?.message)
    }
  }

  const STATUS_TABS: { value: StatusFilter; label: string }[] = [
    { value: 'pending',   label: 'Pending' },
    { value: 'approved',  label: 'Approved' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'all',       label: 'All' },
  ]

  const pendingCount = data?.meta?.total_count ?? 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Bricolage Grotesque, sans-serif' }}>
          Enrollment Requests
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
          {isScoped
            ? `Review student signup requests for the ${CATEGORY_LABEL[scopeCategory ?? ''] ?? ''} program.`
            : 'Review student signup requests across all programs.'}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Status tabs */}
        <div className="flex overflow-hidden rounded-xl" style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}>
          {STATUS_TABS.map(t => (
            <button
              key={t.value}
              onClick={() => setStatusFilter(t.value)}
              className="px-4 py-2 text-sm font-medium transition-all"
              style={{
                color:      statusFilter === t.value ? '#FF6B1A' : 'rgba(255,255,255,0.45)',
                background: statusFilter === t.value ? 'rgba(255,107,26,0.10)' : 'transparent',
                borderRight: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              {t.label}
              {t.value === 'pending' && statusFilter !== 'pending' && pendingCount > 0 && (
                <span className="ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                  style={{ background: 'rgba(251,191,36,0.2)', color: '#FBBF24' }}>
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1" style={{ minWidth: 180, maxWidth: 320 }}>
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: 'rgba(255,255,255,0.3)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            className="w-full rounded-xl py-2 pl-9 pr-4 text-sm text-white outline-none transition-all placeholder:text-white/25"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
          />
        </div>

        {data && (
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
            {data.meta.total_count} {statusFilter === 'all' ? 'total' : statusFilter}
          </p>
        )}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
        <table className="w-full min-w-[600px] border-collapse">
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              {['Student', 'Program', 'Status', 'Signed up', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left"
                  style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={5} className="px-4 py-14 text-center">
                <div className="inline-flex items-center gap-2 text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  <Loader2 size={14} className="animate-spin" />Loading requests…
                </div>
              </td></tr>
            )}
            {!isLoading && requests.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-16 text-center">
                <div style={{ color: 'rgba(255,255,255,0.3)' }}>
                  <CheckCircle2 size={28} className="mx-auto mb-3 opacity-40" />
                  <p className="text-sm font-medium">
                    {statusFilter === 'pending' ? 'No pending requests' : `No ${statusFilter} requests`}
                  </p>
                </div>
              </td></tr>
            )}
            {!isLoading && requests.map((r, i) => {
              const catStyle  = CATEGORY_COLOR[r.category] ?? CATEGORY_COLOR['4x-trading']
              const statStyle = STATUS_STYLE[r.enrollmentStatus ?? 'pending']
              const isPending = r.enrollmentStatus === 'pending'
              const date      = new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

              return (
                <Fragment key={r.id}>
                <motion.tr
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                  className="group transition-colors hover:bg-white/[0.02]"
                >
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full"
                        style={{ background: 'rgba(255,107,26,0.15)', border: '1px solid rgba(255,107,26,0.25)' }}>
                        <span className="text-xs font-bold" style={{ color: '#FF6B1A' }}>
                          {r.name[0]?.toUpperCase() ?? '?'}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white" style={{ maxWidth: 180 }}>{r.name}</p>
                        <p className="truncate text-xs" style={{ color: 'rgba(255,255,255,0.4)', maxWidth: 200 }}>{r.email}</p>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3.5">
                    <span className="inline-flex items-center rounded-lg px-2 py-1 text-[11px] font-semibold"
                      style={{ background: catStyle.bg, color: catStyle.color }}>
                      {CATEGORY_LABEL[r.category] ?? r.category}
                    </span>
                  </td>

                  <td className="px-4 py-3.5">
                    <span className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold"
                      style={{ background: statStyle.bg, color: statStyle.color }}>
                      {statStyle.icon}
                      {statStyle.label}
                    </span>
                    {r.enrollmentCancellationReason && (
                      <p className="mt-1 max-w-[220px] truncate text-[10px]"
                        style={{ color: 'rgba(255,255,255,0.3)' }}
                        title={r.enrollmentCancellationReason}>
                        {r.enrollmentCancellationReason}
                      </p>
                    )}
                  </td>

                  <td className="px-4 py-3.5">
                    <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{date}</span>
                  </td>

                  <td className="px-4 py-3.5">
                    {isPending && (
                      <div className="flex items-center justify-end gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          onClick={() => handleApprove(r)}
                          disabled={approve.isPending}
                          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
                          style={{ background: 'rgba(74,222,128,0.85)' }}>
                          {approve.isPending
                            ? <Loader2 size={11} className="animate-spin" />
                            : <CheckCircle2 size={11} />}
                          Approve
                        </button>
                        <button
                          onClick={() => setCancelTarget(r)}
                          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-all hover:opacity-90"
                          style={{ background: 'rgba(239,68,68,0.85)' }}>
                          <XCircle size={11} />
                          Cancel
                        </button>
                      </div>
                    )}
                    {!isPending && r.enrollmentStatus === 'approved' && (
                      <div className="flex justify-end">
                        <button
                          onClick={() => setCancelTarget(r)}
                          className="rounded-lg px-3 py-1.5 text-xs font-medium opacity-0 transition-all group-hover:opacity-100 hover:bg-red-500/15"
                          style={{ color: 'rgba(248,113,113,0.7)' }}>
                          Revoke
                        </button>
                      </div>
                    )}
                    {r.enrollmentStatus === 'cancelled' && (
                      <div className="flex items-center justify-end opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          onClick={() => handleApprove(r)}
                          disabled={approve.isPending}
                          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
                          style={{ background: 'rgba(74,222,128,0.85)' }}>
                          {approve.isPending
                            ? <Loader2 size={11} className="animate-spin" />
                            : <CheckCircle2 size={11} />}
                          Accept
                        </button>
                      </div>
                    )}
                  </td>
                </motion.tr>
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Cancel dialog */}
      <AnimatePresence>
        {cancelTarget && (
          <CancelDialog
            user={cancelTarget}
            onClose={() => setCancelTarget(null)}
            onConfirm={handleCancel}
            loading={cancel.isPending}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
