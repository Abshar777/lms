'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LifeBuoy, Search, ChevronRight, Send, Loader2,
  CheckCircle2, Clock, AlertCircle, XCircle, Inbox,
  BarChart2, Users, TrendingUp, MessageSquare, RefreshCw,
  Filter, Circle,
} from 'lucide-react'
import {
  useAdminTickets, useAdminTicket, useAdminReply, useSetTicketStatus,
  useSupportStats, useSupportPerformance,
  type SupportTicket, type SupportStatus, type SupportProgram,
  PROGRAM_LABELS, CATEGORY_LABELS,
} from '@/lib/api/support'
import { useCurrentUser } from '@/lib/api/user'

/* ─── helpers ──────────────────────────────────────── */
const fmtDate = (iso: string) => {
  const d = new Date(iso)
  const now = new Date()
  const diff = (now.getTime() - d.getTime()) / 1000
  if (diff < 60)    return 'just now'
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

const STATUS_META: Record<SupportStatus, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  open:     { label: 'Open',     color: '#2563EB', bg: '#EFF6FF', icon: Circle },
  pending:  { label: 'Pending',  color: '#D97706', bg: '#FEF3C7', icon: Clock },
  resolved: { label: 'Resolved', color: '#16A34A', bg: '#DCFCE7', icon: CheckCircle2 },
  closed:   { label: 'Closed',   color: '#6B7280', bg: '#F3F4F6', icon: XCircle },
}

function StatusBadge({ status }: { status: SupportStatus }) {
  const m = STATUS_META[status]
  const Icon = m.icon
  return (
    <span className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-semibold"
      style={{ background: m.bg, color: m.color }}>
      <Icon size={10} />
      {m.label}
    </span>
  )
}

function ProgramBadge({ program }: { program?: string }) {
  if (!program) return null
  const COLORS: Record<string, { bg: string; color: string }> = {
    'ai':                { bg: '#F0F4FF', color: '#4F46E5' },
    '4x-trading':        { bg: '#FFF7ED', color: '#C2410C' },
    'digital-marketing': { bg: '#F0FDF4', color: '#15803D' },
  }
  const c = COLORS[program] ?? { bg: '#F3F4F6', color: '#374151' }
  return (
    <span className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
      style={{ background: c.bg, color: c.color }}>
      {PROGRAM_LABELS[program] ?? program}
    </span>
  )
}

/* ─── Stat card ─────────────────────────────────────── */
function StatCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: React.ElementType; color: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white p-4"
      style={{ border: '1px solid #E5E7EB', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl"
        style={{ background: `${color}14` }}>
        <Icon size={16} style={{ color }} />
      </div>
      <div>
        <p className="text-xl font-bold leading-none" style={{ color: '#111827' }}>{value}</p>
        <p className="mt-0.5 text-xs" style={{ color: '#9CA3AF' }}>{label}</p>
      </div>
    </div>
  )
}

/* ─── Ticket row ─────────────────────────────────────── */
function TicketRow({ ticket, active, onClick }: { ticket: SupportTicket; active: boolean; onClick: () => void }) {
  const user = typeof ticket.userId === 'object' ? ticket.userId : null
  return (
    <button onClick={onClick}
      className="w-full text-left transition-all"
      style={{}}>
      <div className="flex items-start gap-3 rounded-xl px-3 py-3 transition-colors"
        style={{
          background: active ? 'rgba(0,87,184,0.06)' : 'transparent',
          border: active ? '1px solid rgba(0,87,184,0.14)' : '1px solid transparent',
        }}>
        <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
          style={{ background: '#0057b8' }}>
          {(user?.name ?? '?').charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-sm font-semibold" style={{ color: '#111827' }}>{ticket.subject}</p>
            {ticket.adminUnread && (
              <span className="flex h-2 w-2 flex-shrink-0 rounded-full" style={{ background: '#0057b8' }} />
            )}
          </div>
          <p className="truncate text-xs" style={{ color: '#6B7280' }}>{user?.name ?? 'Unknown'}</p>
          <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
            <StatusBadge status={ticket.status} />
            <ProgramBadge program={ticket.program} />
            <span className="text-[11px]" style={{ color: '#9CA3AF' }}>{fmtDate(ticket.lastMessageAt)}</span>
          </div>
        </div>
      </div>
    </button>
  )
}

/* ─── Thread panel ───────────────────────────────────── */
function ThreadPanel({ ticketId, onClose }: { ticketId: string; onClose: () => void }) {
  const { data: ticket, isLoading } = useAdminTicket(ticketId)
  const replyMut  = useAdminReply(ticketId)
  const statusMut = useSetTicketStatus(ticketId)
  const [draft, setDraft] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [ticket?.messages.length])

  const send = async () => {
    if (!draft.trim() || replyMut.isPending) return
    await replyMut.mutateAsync(draft.trim())
    setDraft('')
  }

  if (isLoading) return (
    <div className="flex h-full items-center justify-center gap-2">
      <Loader2 size={18} className="animate-spin" style={{ color: '#0057b8' }} />
      <span className="text-sm" style={{ color: '#9CA3AF' }}>Loading…</span>
    </div>
  )
  if (!ticket) return null

  const user = typeof ticket.userId === 'object' ? ticket.userId : null
  const statuses: SupportStatus[] = ['open', 'pending', 'resolved', 'closed']

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex-shrink-0 p-5" style={{ borderBottom: '1px solid #E5E7EB' }}>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="text-base font-bold" style={{ color: '#111827' }}>{ticket.subject}</h3>
            <div className="mt-1 flex items-center gap-2 flex-wrap">
              <span className="text-xs" style={{ color: '#6B7280' }}>
                {user?.name ?? 'Unknown'} · {user?.email}
              </span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <StatusBadge status={ticket.status} />
              <ProgramBadge program={ticket.program} />
              {ticket.category && (
                <span className="text-[11px]" style={{ color: '#9CA3AF' }}>
                  {CATEGORY_LABELS[ticket.category] ?? ticket.category}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-shrink-0 items-center gap-2">
            <select
              value={ticket.status}
              onChange={e => statusMut.mutate(e.target.value as SupportStatus)}
              disabled={statusMut.isPending}
              className="rounded-xl border px-3 py-1.5 text-xs font-semibold outline-none"
              style={{ borderColor: '#E5E7EB', color: '#374151' }}>
              {statuses.map(s => (
                <option key={s} value={s}>{STATUS_META[s].label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {ticket.messages.map((m, i) => {
          const fromAdmin = m.senderRole === 'admin'
          const sender = typeof m.senderId === 'object' ? m.senderId : null
          return (
            <div key={m._id ?? i} className={`flex ${fromAdmin ? 'justify-end' : 'justify-start'}`}>
              <div className="max-w-[80%]">
                <div className="rounded-2xl px-4 py-2.5 text-sm"
                  style={fromAdmin
                    ? { background: '#0057b8', color: 'white', borderBottomRightRadius: 6 }
                    : { background: '#F3F4F6', color: '#111827', borderBottomLeftRadius: 6 }}>
                  {m.body}
                </div>
                <p className={`mt-1 text-[10px] ${fromAdmin ? 'text-right' : ''}`} style={{ color: '#9CA3AF' }}>
                  {fromAdmin ? (sender?.name ?? 'Support Team') : (user?.name ?? 'Student')} · {fmtDate(m.createdAt)}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Reply */}
      {ticket.status !== 'closed' ? (
        <div className="flex-shrink-0 p-4" style={{ borderTop: '1px solid #E5E7EB' }}>
          <div className="flex gap-2">
            <textarea
              value={draft} onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
              placeholder="Reply to this ticket…"
              rows={3}
              className="flex-1 resize-none rounded-xl p-3 text-sm outline-none"
              style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', color: '#111827' }} />
            <button onClick={send} disabled={!draft.trim() || replyMut.isPending}
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl transition-all disabled:opacity-40"
              style={{ background: '#0057b8' }}>
              {replyMut.isPending ? <Loader2 size={14} className="animate-spin text-white" /> : <Send size={14} color="white" />}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-shrink-0 p-4 text-center text-sm" style={{ color: '#9CA3AF', borderTop: '1px solid #E5E7EB' }}>
          This ticket is closed. Change the status to reply.
        </div>
      )}
    </div>
  )
}

/* ─── Performance tab ────────────────────────────────── */
function PerformancePanel() {
  const { data, isLoading } = useSupportPerformance()

  if (isLoading) return (
    <div className="flex h-64 items-center justify-center gap-2">
      <Loader2 size={18} className="animate-spin" style={{ color: '#0057b8' }} />
    </div>
  )

  const PROG_COLORS: Record<string, { accent: string; bg: string }> = {
    'ai':                { accent: '#4F46E5', bg: '#F0F4FF' },
    '4x-trading':        { accent: '#C2410C', bg: '#FFF7ED' },
    'digital-marketing': { accent: '#15803D', bg: '#F0FDF4' },
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h3 className="text-base font-bold" style={{ color: '#111827' }}>Admin Team Performance</h3>
        <p className="mt-0.5 text-sm" style={{ color: '#6B7280' }}>Ticket resolution stats by program team</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {(data ?? []).map(prog => {
          const c = PROG_COLORS[prog.program] ?? { accent: '#374151', bg: '#F3F4F6' }
          const resolvedPct = prog.total > 0 ? Math.round((prog.resolved / prog.total) * 100) : 0
          return (
            <div key={prog.program} className="rounded-2xl bg-white p-5"
              style={{ border: '1px solid #E5E7EB', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <div className="flex items-center gap-2 mb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl"
                  style={{ background: c.bg }}>
                  <Users size={14} style={{ color: c.accent }} />
                </div>
                <div>
                  <p className="text-sm font-bold" style={{ color: '#111827' }}>{prog.label}</p>
                  <p className="text-[11px]" style={{ color: '#9CA3AF' }}>admin team</p>
                </div>
              </div>

              {/* Resolution bar */}
              <div className="mb-3">
                <div className="flex justify-between mb-1">
                  <span className="text-xs" style={{ color: '#6B7280' }}>Resolution rate</span>
                  <span className="text-xs font-bold" style={{ color: c.accent }}>{resolvedPct}%</span>
                </div>
                <div className="h-1.5 w-full rounded-full" style={{ background: '#F3F4F6' }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${resolvedPct}%`, background: c.accent }} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Total',    value: prog.total,    color: '#374151' },
                  { label: 'Open',     value: prog.open,     color: '#2563EB' },
                  { label: 'Pending',  value: prog.pending,  color: '#D97706' },
                  { label: 'Resolved', value: prog.resolved, color: '#16A34A' },
                ].map(s => (
                  <div key={s.label} className="rounded-xl p-2.5" style={{ background: '#F9FAFB' }}>
                    <p className="text-base font-bold" style={{ color: s.color }}>{s.value}</p>
                    <p className="text-[10px]" style={{ color: '#9CA3AF' }}>{s.label}</p>
                  </div>
                ))}
              </div>

              <div className="mt-3 flex items-center justify-between rounded-xl px-3 py-2"
                style={{ background: c.bg }}>
                <span className="text-[11px] font-medium" style={{ color: c.accent }}>Avg first reply</span>
                <span className="text-xs font-bold" style={{ color: c.accent }}>
                  {prog.responded > 0 ? `${prog.avgResponseHours}h` : '—'}
                </span>
              </div>

              {prog.unread > 0 && (
                <div className="mt-2 flex items-center gap-1.5 rounded-xl px-3 py-2"
                  style={{ background: '#FEF2F2' }}>
                  <AlertCircle size={12} style={{ color: '#EF4444' }} />
                  <span className="text-[11px] font-medium" style={{ color: '#EF4444' }}>
                    {prog.unread} unread {prog.unread === 1 ? 'ticket' : 'tickets'}
                  </span>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ─── Main page ──────────────────────────────────────── */
const PROGRAM_TABS: { id: string; label: string }[] = [
  { id: 'all',                label: 'All' },
  { id: 'ai',                 label: 'AI' },
  { id: '4x-trading',        label: 'Forex' },
  { id: 'digital-marketing', label: 'Digital Marketing' },
]

const STATUS_FILTERS = [
  { id: 'all',      label: 'All' },
  { id: 'open',     label: 'Open' },
  { id: 'pending',  label: 'Pending' },
  { id: 'resolved', label: 'Resolved' },
  { id: 'closed',   label: 'Closed' },
]

export default function AdminSupportPage() {
  const { data: me } = useCurrentUser()
  const role = me?.role ?? ''
  const isSuperAdmin = role === 'admin' || role === 'super_admin'
  const isScoped     = role === 'ai_admin' || role === '4x_admin' || role === 'digital_marketing_admin'

  const [activeTab,    setActiveTab]    = useState<'inbox' | 'performance'>('inbox')
  const [programFilter, setProgramFilter] = useState('all')
  const [statusFilter,  setStatusFilter]  = useState('all')
  const [search,        setSearch]        = useState('')
  const [activeTicket,  setActiveTicket]  = useState<string | null>(null)

  const filter = {
    status:  statusFilter !== 'all' ? statusFilter : undefined,
    search:  search || undefined,
    program: isSuperAdmin && programFilter !== 'all' ? programFilter : undefined,
  }

  const { data: tickets = [], isLoading: ticketsLoading } = useAdminTickets(filter)
  const { data: stats }                                   = useSupportStats(isSuperAdmin ? (programFilter !== 'all' ? programFilter : undefined) : undefined)

  const unread = tickets.filter(t => t.adminUnread).length

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col overflow-hidden">
      {/* ── Page header ── */}
      <div className="flex-shrink-0 px-6 pt-5 pb-0">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl"
              style={{ background: 'rgba(0,87,184,0.10)' }}>
              <LifeBuoy size={17} style={{ color: '#0057b8' }} />
            </div>
            <div>
              <h1 className="text-xl font-bold" style={{ color: '#F9FAFB', fontFamily: 'Bricolage Grotesque, sans-serif' }}>
                Support Inbox
              </h1>
              {unread > 0 && (
                <p className="text-xs" style={{ color: '#9CA3AF' }}>
                  {unread} unread {unread === 1 ? 'ticket' : 'tickets'}
                </p>
              )}
            </div>
          </div>
          {/* Tab switch — super admin / admin only */}
          {isSuperAdmin && (
            <div className="flex rounded-xl p-1" style={{ background: 'rgba(255,255,255,0.06)' }}>
              {[
                { id: 'inbox',       label: 'Inbox',       icon: Inbox },
                { id: 'performance', label: 'Performance', icon: BarChart2 },
              ].map(t => (
                <button key={t.id} onClick={() => setActiveTab(t.id as any)}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all"
                  style={activeTab === t.id
                    ? { background: '#0057b8', color: 'white' }
                    : { color: 'rgba(255,255,255,0.4)' }}>
                  <t.icon size={12} />{t.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Stats row */}
        {stats && activeTab === 'inbox' && (
          <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
            <StatCard label="Total"    value={stats.total}    icon={MessageSquare} color="#374151" />
            <StatCard label="Open"     value={stats.open}     icon={Circle}        color="#2563EB" />
            <StatCard label="Pending"  value={stats.pending}  icon={Clock}         color="#D97706" />
            <StatCard label="Resolved" value={stats.resolved} icon={CheckCircle2}  color="#16A34A" />
            <StatCard label="Closed"   value={stats.closed}   icon={XCircle}       color="#6B7280" />
            <StatCard label="Unread"   value={stats.unread}   icon={AlertCircle}   color="#EF4444" />
          </div>
        )}

        {/* Program filter tabs — super admin / admin only */}
        {isSuperAdmin && activeTab === 'inbox' && (
          <div className="mb-4 flex gap-1 overflow-x-auto scrollbar-none">
            {PROGRAM_TABS.map(t => (
              <button key={t.id} onClick={() => { setProgramFilter(t.id); setActiveTicket(null) }}
                className="flex-shrink-0 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all whitespace-nowrap"
                style={programFilter === t.id
                  ? { background: '#0057b8', color: 'white' }
                  : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}>
                {t.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Performance tab ── */}
      {activeTab === 'performance' ? (
        <div className="flex-1 overflow-y-auto rounded-2xl mx-6 mb-6 bg-white"
          style={{ border: '1px solid #E5E7EB' }}>
          <PerformancePanel />
        </div>
      ) : (
        /* ── Inbox: split panel ── */
        <div className="mx-6 mb-6 flex flex-1 gap-4 overflow-hidden min-h-0">
          {/* Left: ticket list */}
          <div className="flex w-80 flex-shrink-0 flex-col overflow-hidden rounded-2xl bg-white"
            style={{ border: '1px solid #E5E7EB' }}>
            {/* Filters */}
            <div className="flex-shrink-0 p-3 space-y-2" style={{ borderBottom: '1px solid #F3F4F6' }}>
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#9CA3AF' }} />
                <input
                  value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search tickets…"
                  className="w-full rounded-xl py-2 pl-8 pr-3 text-sm outline-none"
                  style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }} />
              </div>
              <div className="flex gap-1 overflow-x-auto scrollbar-none">
                {STATUS_FILTERS.map(f => (
                  <button key={f.id} onClick={() => setStatusFilter(f.id)}
                    className="flex-shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all whitespace-nowrap"
                    style={statusFilter === f.id
                      ? { background: '#0057b8', color: 'white' }
                      : { background: '#F3F4F6', color: '#6B7280' }}>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
              {ticketsLoading ? (
                <div className="flex h-32 items-center justify-center gap-2">
                  <Loader2 size={16} className="animate-spin" style={{ color: '#0057b8' }} />
                </div>
              ) : tickets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <Inbox size={28} style={{ color: '#D1D5DB' }} />
                  <p className="text-sm" style={{ color: '#9CA3AF' }}>No tickets found</p>
                </div>
              ) : (
                tickets.map(t => (
                  <TicketRow key={t.id} ticket={t} active={activeTicket === t.id}
                    onClick={() => setActiveTicket(t.id)} />
                ))
              )}
            </div>
          </div>

          {/* Right: thread */}
          <div className="flex-1 overflow-hidden rounded-2xl bg-white"
            style={{ border: '1px solid #E5E7EB' }}>
            {activeTicket ? (
              <ThreadPanel key={activeTicket} ticketId={activeTicket} onClose={() => setActiveTicket(null)} />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl"
                  style={{ background: '#F3F4F6' }}>
                  <LifeBuoy size={24} style={{ color: '#D1D5DB' }} />
                </div>
                <p className="text-sm font-semibold" style={{ color: '#374151' }}>Select a ticket</p>
                <p className="text-xs" style={{ color: '#9CA3AF' }}>Pick a conversation from the list to view and reply</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
