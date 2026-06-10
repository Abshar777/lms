'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LifeBuoy, Plus, Send, Loader2, MessageSquare, ChevronLeft,
  CheckCircle2, Clock, X, ShieldCheck,
} from 'lucide-react'
import {
  useMyTickets, useTicket, useCreateTicket, useReplyTicket,
  type SupportTicket, type SupportStatus, type SupportCategory,
} from '@/lib/api/support'

const CATEGORIES: { value: SupportCategory; label: string }[] = [
  { value: 'technical', label: 'Technical issue' },
  { value: 'billing',   label: 'Billing & payments' },
  { value: 'course',    label: 'Course content' },
  { value: 'account',   label: 'My account' },
  { value: 'other',     label: 'Something else' },
]

const STATUS_STYLE: Record<SupportStatus, { label: string; color: string; bg: string }> = {
  open:     { label: 'Open',         color: '#D97706', bg: 'rgba(245,158,11,0.12)' },
  pending:  { label: 'Awaiting you', color: '#2563EB', bg: 'rgba(37,99,235,0.12)' },
  resolved: { label: 'Resolved',     color: '#16A34A', bg: 'rgba(22,163,74,0.12)' },
  closed:   { label: 'Closed',       color: '#6B7280', bg: 'rgba(107,114,128,0.12)' },
}

function fmtWhen(iso: string) {
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

/* ─────────────────────────────────────────────────────── */
export default function SupportPage() {
  const { data: tickets = [], isLoading } = useMyTickets()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [composing,  setComposing]  = useState(false)

  const selected = useMemo(() => tickets.find(t => t.id === selectedId) ?? null, [tickets, selectedId])

  return (
    <div className="mx-auto max-w-6xl">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        className="mb-6 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <LifeBuoy size={14} style={{ color: '#FF6B1A' }} />
            <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: '#FF6B1A' }}>Help &amp; Support</span>
          </div>
          <h1 className="text-2xl font-bold" style={{ color: '#111827', fontFamily: 'Bricolage Grotesque, sans-serif' }}>
            Contact Us
          </h1>
          <p className="mt-0.5 text-sm" style={{ color: '#9CA3AF' }}>
            Report a problem or ask a question — our team will reply right here.
          </p>
        </div>
        <button onClick={() => { setComposing(true); setSelectedId(null) }}
          className="flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold text-white"
          style={{ background: 'linear-gradient(135deg,#FF6B1A,#FF8C42)', boxShadow: '0 4px 14px rgba(255,107,26,0.3)' }}>
          <Plus size={15} /> New request
        </button>
      </motion.div>

      <div className="flex gap-5 items-start">
        {/* ── Left: ticket list ── */}
        <div className="flex w-full max-w-xs flex-shrink-0 flex-col gap-2 lg:w-72">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 size={20} className="animate-spin" style={{ color: '#FF6B1A' }} /></div>
          ) : tickets.length === 0 ? (
            <div className="rounded-2xl p-6 text-center" style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
              <MessageSquare size={24} className="mx-auto mb-2" style={{ color: '#D1D5DB' }} />
              <p className="text-sm font-semibold" style={{ color: '#374151' }}>No requests yet</p>
              <p className="mt-1 text-xs" style={{ color: '#9CA3AF' }}>Open a new request to get help.</p>
            </div>
          ) : tickets.map(t => (
            <TicketRow key={t.id} ticket={t} active={t.id === selectedId}
              onClick={() => { setSelectedId(t.id); setComposing(false) }} />
          ))}
        </div>

        {/* ── Right: thread / composer ── */}
        <div className="min-w-0 flex-1 rounded-2xl bg-white" style={{ border: '1px solid #E5E7EB', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', minHeight: 460 }}>
          {composing ? (
            <NewTicketForm onCreated={id => { setComposing(false); setSelectedId(id) }} onCancel={() => setComposing(false)} />
          ) : selected ? (
            <TicketThread ticketId={selected.id} onBack={() => setSelectedId(null)} />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 py-24 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: 'rgba(255,107,26,0.1)' }}>
                <LifeBuoy size={24} style={{ color: '#FF6B1A' }} />
              </div>
              <p className="font-bold" style={{ color: '#111827' }}>How can we help?</p>
              <p className="max-w-xs text-sm" style={{ color: '#9CA3AF' }}>
                Select a request to see the conversation, or start a new one.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Ticket list row ── */
function TicketRow({ ticket, active, onClick }: { ticket: SupportTicket; active: boolean; onClick: () => void }) {
  const s = STATUS_STYLE[ticket.status]
  return (
    <button onClick={onClick}
      className="w-full rounded-2xl p-3 text-left transition-all"
      style={{
        background: active ? 'rgba(255,107,26,0.06)' : 'white',
        border: `1px solid ${active ? 'rgba(255,107,26,0.3)' : '#E5E7EB'}`,
      }}>
      <div className="flex items-start justify-between gap-2">
        <p className="line-clamp-1 text-sm font-bold" style={{ color: '#111827' }}>{ticket.subject}</p>
        {ticket.userUnread && <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full" style={{ background: '#FF6B1A' }} />}
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-2">
        <span className="rounded-md px-1.5 py-0.5 text-[10px] font-semibold" style={{ background: s.bg, color: s.color }}>{s.label}</span>
        <span className="text-[10px]" style={{ color: '#9CA3AF' }}>{fmtWhen(ticket.lastMessageAt)}</span>
      </div>
    </button>
  )
}

/* ── New-ticket composer ── */
function NewTicketForm({ onCreated, onCancel }: { onCreated: (id: string) => void; onCancel: () => void }) {
  const create = useCreateTicket()
  const [subject,  setSubject]  = useState('')
  const [category, setCategory] = useState<SupportCategory>('technical')
  const [message,  setMessage]  = useState('')
  const [error,    setError]    = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      const t = await create.mutateAsync({ subject: subject.trim(), category, message: message.trim() })
      onCreated(t.id)
    } catch (err: any) {
      setError(err?.response?.data?.error?.message ?? 'Could not submit your request. Please try again.')
    }
  }

  const input = 'w-full rounded-xl px-3 py-2.5 text-sm outline-none focus:border-orange-400'
  const inputStyle = { background: '#F9FAFB', border: '1px solid #E5E7EB', color: '#111827' } as const

  return (
    <form onSubmit={submit} className="flex flex-col gap-4 p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold" style={{ color: '#111827' }}>New support request</h2>
        <button type="button" onClick={onCancel} className="flex h-8 w-8 items-center justify-center rounded-xl hover:bg-gray-100" style={{ color: '#9CA3AF' }}><X size={16} /></button>
      </div>

      <div>
        <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#9CA3AF' }}>Topic</label>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map(c => (
            <button key={c.value} type="button" onClick={() => setCategory(c.value)}
              className="rounded-xl px-3 py-1.5 text-xs font-semibold transition-all"
              style={category === c.value
                ? { background: 'rgba(255,107,26,0.1)', color: '#FF6B1A', border: '1px solid rgba(255,107,26,0.3)' }
                : { background: '#F9FAFB', color: '#6B7280', border: '1px solid #E5E7EB' }}>
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#9CA3AF' }}>Subject</label>
        <input value={subject} onChange={e => setSubject(e.target.value)} required minLength={3} maxLength={200}
          placeholder="Brief summary of your issue" className={input} style={inputStyle} />
      </div>

      <div>
        <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#9CA3AF' }}>Describe the problem</label>
        <textarea value={message} onChange={e => setMessage(e.target.value)} required maxLength={5000} rows={6}
          placeholder="Tell us what happened, what you expected, and any steps to reproduce it…"
          className={`${input} resize-none`} style={inputStyle} />
      </div>

      {error && <p className="text-xs" style={{ color: '#EF4444' }}>{error}</p>}

      <div className="flex items-center justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-xl px-4 py-2 text-sm font-medium" style={{ color: '#6B7280' }}>Cancel</button>
        <button type="submit" disabled={create.isPending || !subject.trim() || !message.trim()}
          className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg,#FF6B1A,#FF8C42)' }}>
          {create.isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Submit request
        </button>
      </div>
    </form>
  )
}

/* ── Ticket conversation thread ── */
function TicketThread({ ticketId, onBack }: { ticketId: string; onBack: () => void }) {
  const { data: ticket, isLoading } = useTicket(ticketId)
  const reply = useReplyTicket(ticketId)
  const [body, setBody] = useState('')
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [ticket?.messages.length])

  if (isLoading || !ticket) {
    return <div className="flex h-full items-center justify-center py-24"><Loader2 size={20} className="animate-spin" style={{ color: '#FF6B1A' }} /></div>
  }

  const s = STATUS_STYLE[ticket.status]
  const closed = ticket.status === 'closed'

  const send = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!body.trim()) return
    try { await reply.mutateAsync(body.trim()); setBody('') } catch { /* surfaced below */ }
  }

  return (
    <div className="flex h-full flex-col" style={{ minHeight: 460 }}>
      {/* Thread header */}
      <div className="flex items-center gap-3 border-b p-4" style={{ borderColor: '#F3F4F6' }}>
        <button onClick={onBack} className="flex h-8 w-8 items-center justify-center rounded-xl hover:bg-gray-100 lg:hidden" style={{ color: '#9CA3AF' }}><ChevronLeft size={16} /></button>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-1 text-sm font-bold" style={{ color: '#111827' }}>{ticket.subject}</p>
          <p className="text-[11px] capitalize" style={{ color: '#9CA3AF' }}>{ticket.category}</p>
        </div>
        <span className="rounded-md px-2 py-1 text-[10px] font-semibold" style={{ background: s.bg, color: s.color }}>{s.label}</span>
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {ticket.messages.map((m, i) => {
          const fromSupport = m.senderRole === 'admin'
          return (
            <div key={m._id ?? i} className={`flex ${fromSupport ? 'justify-start' : 'justify-end'}`}>
              <div className="max-w-[78%]">
                <div className="rounded-2xl px-3.5 py-2.5 text-sm"
                  style={fromSupport
                    ? { background: '#F3F4F6', color: '#111827', borderTopLeftRadius: 4 }
                    : { background: 'linear-gradient(135deg,#FF6B1A,#FF8C42)', color: 'white', borderTopRightRadius: 4 }}>
                  {m.body}
                </div>
                <div className={`mt-1 flex items-center gap-1 text-[10px] ${fromSupport ? '' : 'justify-end'}`} style={{ color: '#9CA3AF' }}>
                  {fromSupport && <ShieldCheck size={9} style={{ color: '#16A34A' }} />}
                  {fromSupport ? 'Support' : 'You'} · {fmtWhen(m.createdAt)}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={endRef} />
      </div>

      {/* Reply box */}
      {closed ? (
        <div className="flex items-center gap-2 border-t p-4 text-xs" style={{ borderColor: '#F3F4F6', color: '#9CA3AF' }}>
          <CheckCircle2 size={13} /> This request is closed. Start a new one if you still need help.
        </div>
      ) : (
        <form onSubmit={send} className="flex items-end gap-2 border-t p-3" style={{ borderColor: '#F3F4F6' }}>
          <textarea value={body} onChange={e => setBody(e.target.value)} rows={1} maxLength={5000}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(e) } }}
            placeholder="Write a reply…" className="flex-1 resize-none rounded-xl px-3 py-2.5 text-sm outline-none focus:border-orange-400"
            style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', color: '#111827', maxHeight: 120 }} />
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
