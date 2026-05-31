'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Loader2, Mail, Calendar, CheckCircle2, XCircle,
  ChevronLeft, ChevronRight, MoreHorizontal, ShieldCheck, ShieldOff, ArrowUp, ArrowDown, Pencil,
} from 'lucide-react'
import { useUsers, useUpdateUser, type AdminUser } from '@/lib/api/users'
import { useToast } from '@/store/ui.store'
import { EditStudentModal } from '@/components/users/EditStudentModal'

interface Props {
  role:  'student' | 'instructor'
  label: string
}

function fmtDate(d?: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function UserTable({ role, label }: Props) {
  const [search, setSearch] = useState('')
  const [page, setPage]     = useState(1)
  const { data, isLoading } = useUsers(role, { search, page, per_page: 20 })

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="relative max-w-xs flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.3)' }} />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder={`Search ${label.toLowerCase()}…`}
            className="w-full rounded-xl py-2 pl-9 pr-4 text-sm text-white outline-none transition-all placeholder:text-white/25"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
            onFocus={e => { e.currentTarget.style.border = '1px solid rgba(255,107,26,0.5)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(255,107,26,0.10)' }}
            onBlur={e => { e.currentTarget.style.border = '1px solid rgba(255,255,255,0.08)'; e.currentTarget.style.boxShadow = 'none' }} />
        </div>
        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
          {data && `${data.meta.total_count.toLocaleString()} ${label.toLowerCase()}`}
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] border-collapse">
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              {['Name', 'Email', 'Status', 'Joined', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left"
                  style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={5} className="px-4 py-12 text-center">
                <div className="inline-flex items-center gap-2 text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  <Loader2 size={14} className="animate-spin" />Loading…
                </div>
              </td></tr>
            )}
            {!isLoading && data?.docs.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-16 text-center text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>
                No {label.toLowerCase()} found
              </td></tr>
            )}
            {!isLoading && data?.docs.map((u, i) => <UserRow key={u.id} user={u} index={i} />)}
          </tbody>
        </table>
        </div>{/* overflow-x-auto */}

        {data && data.meta.total_pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3"
            style={{ borderTop: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
              Page {page} of {data.meta.total_pages}
            </p>
            <div className="flex items-center gap-1.5">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={!data.meta.has_prev}
                className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-white/08 disabled:opacity-30"
                style={{ color: 'rgba(255,255,255,0.6)' }}>
                <ChevronLeft size={13} />
              </button>
              <button onClick={() => setPage(p => p + 1)} disabled={!data.meta.has_next}
                className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-white/08 disabled:opacity-30"
                style={{ color: 'rgba(255,255,255,0.6)' }}>
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function UserRow({ user, index }: { user: AdminUser; index: number }) {
  const update    = useUpdateUser()
  const toast     = useToast()
  const [menuOpen,  setMenuOpen]  = useState(false)
  const [editOpen,  setEditOpen]  = useState(false)

  const setActive = async (active: boolean) => {
    setMenuOpen(false)
    if (!active && !confirm(`Deactivate ${user.name}? They will be signed out everywhere.`)) return
    try {
      await update.mutateAsync({ id: user.id, isActive: active })
      toast.success(active ? 'User activated' : 'User deactivated')
    } catch (err: any) {
      toast.error('Could not update user', err?.response?.data?.error?.message)
    }
  }

  const setRole = async (role: AdminUser['role']) => {
    setMenuOpen(false)
    if (!confirm(`Change ${user.name}'s role to "${role}"?`)) return
    try {
      await update.mutateAsync({ id: user.id, role })
      toast.success(`Role set to ${role}`)
    } catch (err: any) {
      toast.error('Could not update role', err?.response?.data?.error?.message)
    }
  }

  return (
    <>
    <motion.tr
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.025 }}
      style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.025)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-full"
            style={{ background: 'rgba(255,107,26,0.15)', border: '1px solid rgba(255,107,26,0.25)' }}>
            {user.avatarUrl
              ? <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
              : <span className="text-xs font-bold" style={{ color: '#FF6B1A' }}>{user.name[0]?.toUpperCase() ?? '?'}</span>}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{user.name}</p>
            {user.headline && (
              <p className="mt-0.5 truncate text-[11px]" style={{ color: 'rgba(255,255,255,0.35)', maxWidth: 240 }}>
                {user.headline}
              </p>
            )}
          </div>
        </div>
      </td>
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-1.5" style={{ color: 'rgba(255,255,255,0.55)' }}>
          <Mail size={12} />
          <span className="text-sm truncate max-w-[220px]">{user.email}</span>
        </div>
      </td>
      <td className="px-4 py-3.5">
        <span className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-semibold"
          style={user.isActive
            ? { background: 'rgba(74,222,128,0.12)', color: '#4ADE80' }
            : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}>
          {user.isActive
            ? <><CheckCircle2 size={11} />Active</>
            : <><XCircle size={11} />Inactive</>}
        </span>
      </td>
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-1.5 text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
          <Calendar size={11} />{fmtDate(user.createdAt)}
        </div>
      </td>
      <td className="px-4 py-3.5 relative">
        <div className="flex items-center gap-1">
          <button onClick={() => setEditOpen(true)}
            className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-white/05"
            style={{ color: 'rgba(255,255,255,0.45)' }}
            title="Edit profile">
            <Pencil size={12} />
          </button>
          <button onClick={() => setMenuOpen(v => !v)} disabled={update.isPending}
            className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-white/05 disabled:opacity-40"
            style={{ color: 'rgba(255,255,255,0.45)' }}>
            {update.isPending ? <Loader2 size={12} className="animate-spin" /> : <MoreHorizontal size={13} />}
          </button>
        </div>
        <AnimatePresence>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
              <motion.div initial={{ opacity: 0, y: -6, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.96 }}
                className="absolute right-2 top-10 z-40 w-52 rounded-2xl p-1.5 z-50"
                style={{ background: '#13141C', border: '1px solid rgba(255,255,255,0.07)', boxShadow: '0 16px 40px rgba(0,0,0,0.45)' }}>
                <button onClick={() => setActive(!user.isActive)}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-colors hover:bg-white/05"
                  style={{ color: user.isActive ? '#F87171' : '#4ADE80' }}>
                  {user.isActive ? <><ShieldOff size={12} />Deactivate</> : <><ShieldCheck size={12} />Activate</>}
                </button>
                {user.role !== 'instructor' && (
                  <button onClick={() => setRole('instructor')}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-colors hover:bg-white/05"
                    style={{ color: 'rgba(255,255,255,0.75)' }}>
                    <ArrowUp size={12} />Make instructor
                  </button>
                )}
                {user.role !== 'student' && (
                  <button onClick={() => setRole('student')}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-colors hover:bg-white/05"
                    style={{ color: 'rgba(255,255,255,0.75)' }}>
                    <ArrowDown size={12} />Demote to student
                  </button>
                )}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </td>
    </motion.tr>

    {/* Edit modal — rendered outside the <tr> to avoid DOM nesting issues */}
    <AnimatePresence>
      {editOpen && (
        <EditStudentModal
          user={user}
          onClose={() => setEditOpen(false)}
          onSuccess={() => setEditOpen(false)}
        />
      )}
    </AnimatePresence>
    </>
  )
}
