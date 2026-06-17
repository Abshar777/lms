'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  LifeBuoy, Send, Loader2, MessageSquare, Search, ShieldCheck,
  CheckCircle2, ChevronLeft,
} from 'lucide-react'
import {
  useAdminTickets, useAdminTicket, useAdminReply, useSetTicketStatus, useSupportStats,
  type SupportTicket, type SupportStatus, type SupportUser,
} from '@/lib/api/support'
import { useCurrentUser } from '@/lib/api/user'

const STATUS_STYLE: Record<SupportStatus, { label: string; color: string; bg: string }> = {
  open:     { label: 'Open',     color: '#FBBF24', bg: 'rgba(245,158,11,0.15)' },
  pending:  { label: 'Replied',  color: '#60A5FA', bg: 'rgba(37,99,235,0.15)' },
  resolved: { label: 'Resolved', color: '#4ADE80', bg: 'rgba(22,163,74,0.15)' },
  closed:   { label: 'Closed',   color: 'rgba(255,255,255,0.45)', bg: 'rgba(255,255,255,0.06)' },
}
const STATUS_TABS: { key: string; label: string }[] = [
  { key: 'all', label: 'All' }, { key: 'open', label: 'Open' }, { key: 'pending', label: 'Replied' },
  { key: 'resolved', label: 'Resolved' }, { key: 'closed', label: 'Closed' },
]
const ALL_STATUSES: SupportStatus[] = ['open', 'pending', 'resolved', 'closed']

const PROGRAM_TABS: { key: string; label: string }[] = [
  { key: 'all',                label: 'All Programs' },
  { key: '4x-trading',        label: '4x Trading' },
  { key: 'digital-marketing', label: 'Digital Marketing' },
]

function userOf(t: SupportTicket): SupportUser | null {
  return typeof t.userId === 'object' ? t.userId : null
}
function fmtWhen(iso: string) {
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export default function AdminSupportPage() {
  const { data: currentUser } = useCurrentUser()
  const isSuperAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin'

  const [statusFilter, setStatusFilter] = useState('all')
  const [programFilter, setProgramFilter] = useState('all')
  const [search, setSearch]             = useState('')
  const [selectedId, setSelectedId]     = useState<string | null>(null)

  // category-scoped admins have a fixed program; super/admin can toggle
  const effectiveProgram = isSuperAdmin ? (programFilter !== 'all' ? programFilter : undefined) : undefined

  const { data: tickets = [], isLoading } = useAdminTickets({ status: statusFilter, search, program: effectiveProgram })
  const { data: stats } = useSupportStats(effectiveProgram)

  const cards = [
    { label: 'Total',    value: stats?.total ?? 0,    color: '#A78BFA' },
    { label: 'Open',     value: stats?.open ?? 0,     color: '#FBBF24' },
    { label: 'Replied',  value: stats?.pending ?? 0,  color: '#60A5FA' },
    { label: 'Resolved', value: stats?.resolved ?? 0, color: '#4ADE80' },
    { label: 'Unread',   value: stats?.unread ?? 0,   color: '#FF6B1A' },
  ]

  return (
    <div className="mx-auto max-w-7xl pb-10">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <div className="mb-1 flex items-center gap-2">
          <LifeBuoy size={14} style={{ color: '#FF6B1A' }} />
          <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: '#FF6B1A' }}>Support</span>
        </div>
        <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Bricolage Grotesque, sans-serif' }}>Help &amp; Complaints</h1>
        <p className="mt-0.5 text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Client requests and conversations.</p>
      </motion.div>

      {/* Stats */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {cards.map(c => (
          <div key={c.label} className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="text-2xl font-bold" style={{ color: c.color }}>{c.value}</p>
            <p className="text-[11px] uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.4)' }}>{c.label}</p>
          </div>
        ))}
      </div>

      {/* Program filter — only super_admin and admin see this */}
      {isSuperAdmin && (
        <div className="mb-4 flex items-center gap-2">
          {PROGRAM_TABS.map(t => (
            <button key={t.key} onClick={() => setProgramFilter(t.key)}
              className="rounded-xl px-3 py-1.5 text-xs font-semibold transition-all"
              style={programFilter === t.key
                ? { background: 'rgba(167,139,250,0.15)', color: '#A78BFA', border: '1px solid rgba(167,139,250,0.3)' }
                : { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.08)' }}>
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* Status filters + search */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {STATUS_TABS.map(t => (
          <button key={t.key} onClick={() => setStatusFilter(t.key)}
            className="rounded-xl px-3 py-1.5 text-xs font-semibold transition-all"
            style={statusFilter === t.key
              ? { background: 'rgba(255,107,26,0.15)', color: '#FF6B1A', border: '1px solid rgba(255,107,26,0.3)' }
              : { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.08)' }}>
            {t.label}
          </button>
        ))}
        <div className="relative ml-auto">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.3)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search subject…"
            className="w-56 rounded-xl py-1.5 pl-8 pr-3 text-xs text-white outline-none"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' }} />
        </div>
      </div>

      <div className="flex gap-5 items-start">
        {/* Ticket list */}
        <div className="flex w-full max-w-sm flex-shrink-0 flex-col gap-2">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 size={20} className="animate-spin" style={{ color: '#FF6B1A' }} /></div>
          ) : tickets.length === 0 ? (
            <div className="rounded-2xl p-6 text-center" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <MessageSquare size={22} className="mx-auto mb-2" style={{ color: 'rgba(255,255,255,0.2)' }} />
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>No tickets here.</p>
            </div>
          ) : tickets.map(t => {
            const u = userOf(t); const s = STATUS_STYLE[t.status]
            return (
              <button key={t.id} onClick={() => setSelectedId(t.id)}
                className="w-full rounded-2xl p-3 text-left transition-all"
                style={{ background: t.id === selectedId ? 'rgba(255,107,26,0.08)' : 'rgba(255,255,255,0.025)', border: `1px solid ${t.id === selectedId ? 'rgba(255,107,26,0.3)' : 'rgba(255,255,255,0.07)'}` }}>
                <div className="flex items-start justify-between gap-2">
                  <p className="line-clamp-1 text-sm font-bold text-white">{t.subject}</p>
                  {t.adminUnread && <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full" style={{ background: '#FF6B1A' }} />}
                </div>
                <p className="mt-0.5 text-[11px]" style={{ color: 'rgba(255,255,255,0.45)' }}>{u?.name ?? 'Unknown'} · {u?.email}</p>
                <div className="mt-1.5 flex items-center justify-between">
                  <span className="rounded-md px-1.5 py-0.5 text-[10px] font-semibold" style={{ background: s.bg, color: s.color }}>{s.label}</span>
                  <div className="flex items-center gap-2">
                    {t.program && (
                      <span className="rounded-md px-1.5 py-0.5 text-[10px] font-semibold"
                        style={{ background: t.program === '4x-trading' ? 'rgba(167,139,250,0.12)' : 'rgba(96,165,250,0.12)', color: t.program === '4x-trading' ? '#A78BFA' : '#60A5FA' }}>
                        {t.program === '4x-trading' ? '4x' : 'DM'}
                      </span>
                    )}
                    <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>{fmtWhen(t.lastMessageAt)}</span>
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {/* Thread */}
        <div className="min-w-0 flex-1 rounded-2xl" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', minHeight: 480 }}>
          {selectedId
            ? <AdminThread ticketId={selectedId} onBack={() => setSelectedId(null)} />
            : (
              <div className="flex h-full flex-col items-center justify-center gap-3 py-24 text-center" style={{ minHeight: 480 }}>
                <LifeBuoy size={28} style={{ color: 'rgba(255,255,255,0.15)' }} />
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Select a ticket to read and reply.</p>
              </div>
            )}
        </div>
      </div>
    </div>
  )
}

/* ── Conversation + reply (admin) ── */
function AdminThread({ ticketId, onBack }: { ticketId: string; onBack: () => void }) {
  const { data: ticket, isLoading } = useAdminTicket(ticketId)
  const reply  = useAdminReply(ticketId)
  const status = useSetTicketStatus(ticketId)
  const [body, setBody] = useState('')
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [ticket?.messages.length])

  if (isLoading || !ticket) {
    return <div className="flex items-center justify-center py-24" style={{ minHeight: 480 }}><Loader2 size={20} className="animate-spin" style={{ color: '#FF6B1A' }} /></div>
  }
  const u = userOf(ticket); const s = STATUS_STYLE[ticket.status]

  const send = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!body.trim()) return
    try { await reply.mutateAsync(body.trim()); setBody('') } catch { /* ignore */ }
  }

  return (
    <div className="flex h-full flex-col" style={{ minHeight: 480 }}>
      {/* Header */}
      <div className="flex items-center gap-3 border-b p-4" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
        <button onClick={onBack} className="flex h-8 w-8 items-center justify-center rounded-xl hover:bg-white/10 lg:hidden" style={{ color: 'rgba(255,255,255,0.5)' }}><ChevronLeft size={16} /></button>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-1 text-sm font-bold text-white">{ticket.subject}</p>
          <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {u?.name} · {u?.email} · <span className="capitalize">{ticket.category}</span>
            {ticket.program && (
              <span className="ml-1.5 rounded px-1.5 py-0.5 text-[10px] font-semibold"
                style={{ background: ticket.program === '4x-trading' ? 'rgba(167,139,250,0.12)' : 'rgba(96,165,250,0.12)', color: ticket.program === '4x-trading' ? '#A78BFA' : '#60A5FA' }}>
                {ticket.program === '4x-trading' ? '4x Trading' : 'Digital Marketing'}
              </span>
            )}
          </p>
        </div>
        <select value={ticket.status} onChange={e => status.mutate(e.target.value as SupportStatus)}
          className="rounded-lg px-2 py-1 text-xs font-semibold outline-none"
          style={{ background: '#1e2035', color: s.color, border: '1px solid rgba(255,255,255,0.12)' }}>
          {ALL_STATUSES.map(st => <option key={st} value={st} style={{ background: '#1e2035', color: 'white' }}>{STATUS_STYLE[st].label}</option>)}
        </select>
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {ticket.messages.map((m, i) => {
          const mine = m.senderRole === 'admin'
          return (
            <div key={m._id ?? i} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className="max-w-[78%]">
                <div className="rounded-2xl px-3.5 py-2.5 text-sm"
                  style={mine
                    ? { background: 'linear-gradient(135deg,#FF6B1A,#FF8C42)', color: 'white', borderTopRightRadius: 4 }
                    : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.92)', borderTopLeftRadius: 4 }}>
                  {m.body}
                </div>
                <div className={`mt-1 flex items-center gap-1 text-[10px] ${mine ? 'justify-end' : ''}`} style={{ color: 'rgba(255,255,255,0.35)' }}>
                  {mine && <ShieldCheck size={9} style={{ color: '#4ADE80' }} />}
                  {mine ? 'You (Support)' : (u?.name ?? 'Client')} · {fmtWhen(m.createdAt)}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={endRef} />
      </div>

      {/* Reply */}
      {ticket.status === 'closed' ? (
        <div className="flex items-center gap-2 border-t p-4 text-xs" style={{ borderColor: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.4)' }}>
          <CheckCircle2 size={13} /> Ticket closed. Set it to Open to continue the conversation.
        </div>
      ) : (
        <form onSubmit={send} className="flex items-end gap-2 border-t p-3" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
          <textarea value={body} onChange={e => setBody(e.target.value)} rows={1} maxLength={5000}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(e) } }}
            placeholder="Reply to the client…" className="flex-1 resize-none rounded-xl px-3 py-2.5 text-sm text-white outline-none"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', maxHeight: 120 }} />
          <button type="submit" disabled={reply.isPending || !body.trim()}
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-white disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg,#FF6B1A,#FF8C42)' }}>
            {reply.isPending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
          </button>
        </form>
      )}
    </div>
  )
}
