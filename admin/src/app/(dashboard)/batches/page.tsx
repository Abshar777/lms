'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users, Plus, Search, GraduationCap, BookOpen,
  MoreHorizontal, Edit2, Trash2, Archive, Loader2,
  CheckCircle, UserPlus,
} from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { BatchModal } from '@/components/batches/BatchModal'
import { useBatches, useDeleteBatch, useUpdateBatch, type Batch, type BatchUser } from '@/lib/api/batches'
import { useCurrentUser } from '@/lib/api/user'

/* ── Helpers ─────────────────────────────────────────── */
function Avatar({ name, size = 8 }: { name: string; size?: number }) {
  return (
    <div
      className={`flex h-${size} w-${size} flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white`}
      style={{ background: 'linear-gradient(135deg,#FF6B1A,#FF8C42)', minWidth: `${size * 4}px`, minHeight: `${size * 4}px` }}
    >
      {name?.charAt(0)?.toUpperCase() ?? '?'}
    </div>
  )
}

function StatusBadge({ status }: { status: 'active' | 'archived' }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
      style={{
        background: status === 'active' ? 'rgba(16,185,129,0.12)' : 'rgba(156,163,175,0.15)',
        color:      status === 'active' ? '#059669' : '#6B7280',
      }}>
      {status === 'active' ? <CheckCircle size={9} /> : <Archive size={9} />}
      {status}
    </span>
  )
}

/* ── Batch card ──────────────────────────────────────── */
function BatchCard({
  batch,
  onEdit,
  onDelete,
  onArchive,
  isAdmin,
}: {
  batch:     Batch
  onEdit:    (b: Batch) => void
  onDelete:  (b: Batch) => void
  onArchive: (b: Batch) => void
  isAdmin:   boolean
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const mentor = typeof batch.mentorId === 'object' ? batch.mentorId as BatchUser : null
  const course = batch.courseId && typeof batch.courseId === 'object' ? batch.courseId as any : null
  const studentCount = Array.isArray(batch.studentIds) ? batch.studentIds.length : 0

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      className="relative rounded-2xl bg-white p-5 transition-shadow hover:shadow-md"
      style={{ border: '1px solid #E4E7ED' }}
    >
      {/* Top row: name + menu */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <StatusBadge status={batch.status} />
            {course && (
              <span className="flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                style={{ background: 'rgba(47,107,255,0.08)', color: '#2F6BFF' }}>
                <BookOpen size={8} />{(course as any).title?.slice(0, 20)}{(course as any).title?.length > 20 ? '…' : ''}
              </span>
            )}
          </div>
          <h3 className="text-sm font-bold truncate" style={{ color: '#0D0F1A' }}>{batch.name}</h3>
          {batch.description && (
            <p className="mt-0.5 text-xs line-clamp-2" style={{ color: '#6B7280' }}>{batch.description}</p>
          )}
        </div>

        {isAdmin && (
          <div className="relative flex-shrink-0">
            <button
              onClick={() => setMenuOpen(v => !v)}
              className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-gray-100"
              style={{ color: '#9CA3AF' }}>
              <MoreHorizontal size={15} />
            </button>
            <AnimatePresence>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.92, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.92 }}
                    className="absolute right-0 top-8 z-20 w-40 overflow-hidden rounded-xl bg-white py-1 shadow-xl"
                    style={{ border: '1px solid #E4E7ED' }}>
                    <button onClick={() => { onEdit(batch); setMenuOpen(false) }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium transition-colors hover:bg-gray-50"
                      style={{ color: '#374151' }}>
                      <Edit2 size={12} />Edit batch
                    </button>
                    <button onClick={() => { onArchive(batch); setMenuOpen(false) }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium transition-colors hover:bg-gray-50"
                      style={{ color: '#374151' }}>
                      <Archive size={12} />{batch.status === 'active' ? 'Archive' : 'Activate'}
                    </button>
                    <button onClick={() => { onDelete(batch); setMenuOpen(false) }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium transition-colors hover:bg-red-50"
                      style={{ color: '#DC2626' }}>
                      <Trash2 size={12} />Delete
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Mentor row */}
      {mentor && (
        <div className="flex items-center gap-2 mb-3 rounded-xl px-3 py-2"
          style={{ background: 'rgba(255,107,26,0.06)', border: '1px solid rgba(255,107,26,0.12)' }}>
          <GraduationCap size={13} style={{ color: '#FF6B1A' }} />
          <Avatar name={mentor.name} size={6} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold" style={{ color: '#0D0F1A' }}>{mentor.name}</p>
            <p className="truncate text-[10px]" style={{ color: '#9CA3AF' }}>Mentor</p>
          </div>
        </div>
      )}

      {/* Footer: student count + capacity */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Users size={13} style={{ color: '#6B7280' }} />
          <span className="text-xs font-semibold" style={{ color: '#374151' }}>
            {studentCount}
          </span>
          <span className="text-xs" style={{ color: '#9CA3AF' }}>
            / {batch.maxStudents} students
          </span>
        </div>
        {/* Capacity bar */}
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-20 overflow-hidden rounded-full" style={{ background: '#F4F5F8' }}>
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min(100, Math.round((studentCount / batch.maxStudents) * 100))}%`,
                background: studentCount >= batch.maxStudents
                  ? '#EF4444'
                  : studentCount >= batch.maxStudents * 0.8
                    ? '#F59E0B'
                    : '#10B981',
              }}
            />
          </div>
          <span className="text-[10px] font-medium" style={{ color: '#9CA3AF' }}>
            {Math.round((studentCount / batch.maxStudents) * 100)}%
          </span>
        </div>
      </div>
    </motion.div>
  )
}

/* ── Page ────────────────────────────────────────────── */
export default function BatchesPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing]     = useState<Batch | null>(null)
  const [search, setSearch]       = useState('')
  const [statusFilter, setStatus] = useState<'all' | 'active' | 'archived'>('all')
  const [deleteTarget, setDeleteTarget] = useState<Batch | null>(null)

  const { data: me } = useCurrentUser()
  const isAdmin = me?.role === 'admin'

  const { data, isLoading } = useBatches({
    status: statusFilter,
    search: search || undefined,
    per_page: 50,
  })

  const deleteBatch  = useDeleteBatch()
  const updateBatch  = useUpdateBatch()

  const handleEdit    = (b: Batch) => { setEditing(b); setModalOpen(true) }
  const handleArchive = (b: Batch) => {
    updateBatch.mutate({ id: b.id, data: { status: b.status === 'active' ? 'archived' : 'active' } })
  }
  const handleDelete  = async (b: Batch) => {
    if (!confirm(`Delete batch "${b.name}"? This cannot be undone.`)) return
    await deleteBatch.mutateAsync(b.id)
  }

  const batches = data?.docs ?? []

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <PageHeader
          title="Batches"
          subtitle="Cohort groups assigned to mentors"
          badge={{ label: 'Classes', color: '#FF6B1A' }}
        />
        {isAdmin && (
          <motion.button
            onClick={() => { setEditing(null); setModalOpen(true) }}
            whileHover={{ y: -1, boxShadow: '0 6px 20px rgba(255,107,26,0.28)' }}
            whileTap={{ scale: 0.97 }}
            className="mt-1 flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white flex-shrink-0"
            style={{ background: 'linear-gradient(135deg,#FF6B1A,#FF8C42)' }}>
            <Plus size={15} />New Batch
          </motion.button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {/* Search */}
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#D1D5DB' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search batches…"
            className="w-56 rounded-xl border border-[#E4E7ED] bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-[#FF6B1A] focus:ring-2 focus:ring-orange-100"
            style={{ color: '#0D0F1A' }}
          />
        </div>

        {/* Status filter pills */}
        {(['all', 'active', 'archived'] as const).map(s => (
          <button key={s} onClick={() => setStatus(s)}
            className="rounded-xl px-3 py-1.5 text-xs font-semibold capitalize transition-all"
            style={{
              background: statusFilter === s ? '#FF6B1A' : 'rgba(255,255,255,0.8)',
              color:      statusFilter === s ? '#fff' : '#6B7280',
              border:     statusFilter === s ? '1px solid #FF6B1A' : '1px solid #E4E7ED',
            }}>
            {s}
          </button>
        ))}
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="flex h-48 items-center justify-center gap-2 text-sm" style={{ color: '#9CA3AF' }}>
          <Loader2 size={16} className="animate-spin" />Loading batches…
        </div>
      ) : batches.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-4 py-20">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl"
            style={{ background: 'rgba(255,107,26,0.08)', border: '1px solid rgba(255,107,26,0.15)' }}>
            <Users size={28} style={{ color: '#FF6B1A' }} />
          </div>
          <p className="text-sm font-semibold" style={{ color: '#0D0F1A' }}>No batches yet</p>
          <p className="text-xs text-center max-w-xs" style={{ color: '#9CA3AF' }}>
            {isAdmin
              ? 'Create your first batch to assign students to a mentor and start scheduling classes.'
              : 'You haven\'t been assigned any batches yet.'}
          </p>
          {isAdmin && (
            <motion.button
              onClick={() => { setEditing(null); setModalOpen(true) }}
              whileHover={{ y: -1 }} whileTap={{ scale: 0.97 }}
              className="mt-2 flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white"
              style={{ background: 'linear-gradient(135deg,#FF6B1A,#FF8C42)' }}>
              <Plus size={15} />Create first batch
            </motion.button>
          )}
        </motion.div>
      ) : (
        <motion.div
          layout
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {batches.map(batch => (
              <BatchCard
                key={batch.id || (batch as any)._id}
                batch={batch}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onArchive={handleArchive}
                isAdmin={isAdmin}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Summary row */}
      {batches.length > 0 && (
        <p className="mt-4 text-xs" style={{ color: '#9CA3AF' }}>
          {batches.length} batch{batches.length > 1 ? 'es' : ''} shown
          {data?.meta?.total_count && data.meta.total_count > batches.length
            ? ` of ${data.meta.total_count} total`
            : ''}
        </p>
      )}

      {/* Modal */}
      <BatchModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null) }}
        editing={editing}
      />
    </div>
  )
}
