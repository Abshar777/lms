'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import {
  Search, Plus, Edit2, Trash2, BookOpen, Star, Users,
  ChevronUp, ChevronDown, ChevronLeft, ChevronRight,
  CheckSquare, Square, Globe, Archive, Trash,
} from 'lucide-react'
import { useCourses, useBulkCourses } from '@/lib/api/courses'
import { useUIStore } from '@/store/ui.store'
import type { Course, CourseStatus } from '@/types/index'

const STATUS_STYLES: Record<CourseStatus, { label: string; bg: string; color: string; dot: string }> = {
  published: { label: 'Published', bg: 'rgba(34,197,94,0.12)',  color: '#4ADE80', dot: '#4ADE80' },
  draft:     { label: 'Draft',     bg: 'rgba(234,179,8,0.12)',  color: '#FACC15', dot: '#FACC15' },
  archived:  { label: 'Archived',  bg: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.35)', dot: 'rgba(255,255,255,0.3)' },
}

const LEVEL_LABEL: Record<string, string> = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' }

type SortKey = 'title' | 'enrolledCount' | 'ratingAvg' | 'price' | 'createdAt'

const skeletonRows = Array.from({ length: 5 })

function SkeletonRow() {
  return (
    <tr>
      <td className="px-3 py-3.5"><div className="h-4 w-4 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.06)' }} /></td>
      {[40, 20, 12, 12, 10, 14].map((w, i) => (
        <td key={i} className="px-4 py-3.5">
          <div className="h-4 rounded-lg animate-pulse" style={{ width: `${w}%`, background: 'rgba(255,255,255,0.06)' }} />
        </td>
      ))}
      <td className="px-4 py-3.5"><div className="h-4 w-16 rounded-lg animate-pulse" style={{ background: 'rgba(255,255,255,0.06)' }} /></td>
    </tr>
  )
}

/* ─── Bulk action bar ────────────────────────────────── */
function BulkBar({ selected, onPublish, onArchive, onDelete, onClear, isPending }: {
  selected:  number
  onPublish: () => void
  onArchive: () => void
  onDelete:  () => void
  onClear:   () => void
  isPending: boolean
}) {
  return (
    <AnimatePresence>
      {selected > 0 && (
        <motion.div
          initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 32 }}
          className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 flex items-center gap-2 rounded-2xl px-4 py-3 shadow-2xl"
          style={{ background: '#1A1B26', border: '1px solid rgba(255,255,255,0.12)' }}>
          <span className="mr-1 text-xs font-semibold text-white/60">{selected} selected</span>
          <div className="mx-2 h-4 w-px" style={{ background: 'rgba(255,255,255,0.12)' }} />
          <button onClick={onPublish} disabled={isPending}
            className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50"
            style={{ background: 'rgba(74,222,128,0.12)', color: '#4ADE80' }}>
            <Globe size={12} />Publish
          </button>
          <button onClick={onArchive} disabled={isPending}
            className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50"
            style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}>
            <Archive size={12} />Archive
          </button>
          <button onClick={onDelete} disabled={isPending}
            className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50"
            style={{ background: 'rgba(239,68,68,0.12)', color: '#F87171' }}>
            <Trash size={12} />Delete
          </button>
          <div className="mx-2 h-4 w-px" style={{ background: 'rgba(255,255,255,0.12)' }} />
          <button onClick={onClear} className="text-xs text-white/30 hover:text-white/60 transition-colors">✕</button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* ─── Main table ─────────────────────────────────────── */
export function CourseTable() {
  const [search,    setSearch]    = useState('')
  const [status,    setStatus]    = useState<string>('all')
  const [page,      setPage]      = useState(1)
  const [sortKey,   setSortKey]   = useState<SortKey>('createdAt')
  const [sortDir,   setSortDir]   = useState<'asc' | 'desc'>('desc')
  const [selected,  setSelected]  = useState<Set<string>>(new Set())

  const { openDeleteModal } = useUIStore()
  const bulk = useBulkCourses()

  const { data, isLoading } = useCourses({ page, per_page: 8, search, status, sort: `${sortKey}:${sortDir}` })

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const SortIcon = ({ col }: { col: SortKey }) =>
    sortKey === col
      ? sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
      : <ChevronDown size={12} style={{ opacity: 0.3 }} />

  const statusFilters = [
    { value: 'all', label: 'All' }, { value: 'published', label: 'Published' },
    { value: 'draft', label: 'Draft' }, { value: 'archived', label: 'Archived' },
  ]

  /* Selection helpers */
  const ids       = data?.docs.map(c => c.id) ?? []
  const allChecked = ids.length > 0 && ids.every(id => selected.has(id))
  const someChecked = ids.some(id => selected.has(id))

  const toggleAll = () => {
    if (allChecked) {
      setSelected(prev => { const n = new Set(prev); ids.forEach(id => n.delete(id)); return n })
    } else {
      setSelected(prev => new Set([...prev, ...ids]))
    }
  }

  const toggleOne = (id: string) => {
    setSelected(prev => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id); else n.add(id)
      return n
    })
  }

  const runBulk = async (action: 'publish' | 'archive' | 'delete') => {
    if (action === 'delete' && !confirm(`Delete ${selected.size} course(s)? This cannot be undone.`)) return
    await bulk.mutateAsync({ ids: Array.from(selected), action })
    setSelected(new Set())
  }

  return (
    <div>
      {/* ── Toolbar ─────────────────────────────────── */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-xs flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.3)' }} />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search courses…"
            className="w-full rounded-xl py-2 pl-9 pr-4 text-sm text-white outline-none transition-all placeholder:text-white/25"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
            onFocus={e => { e.currentTarget.style.border = '1px solid rgba(255,107,26,0.5)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(255,107,26,0.10)' }}
            onBlur={e => { e.currentTarget.style.border = '1px solid rgba(255,255,255,0.08)'; e.currentTarget.style.boxShadow = 'none' }}
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-xl p-0.5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            {statusFilters.map(f => (
              <button key={f.value} onClick={() => { setStatus(f.value); setPage(1) }}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold transition-all"
                style={status === f.value
                  ? { background: 'rgba(255,107,26,0.18)', color: '#FF6B1A' }
                  : { color: 'rgba(255,255,255,0.4)' }}>
                {f.label}
              </button>
            ))}
          </div>
          <Link href="/courses/new">
            <motion.button whileHover={{ y: -1 }} whileTap={{ scale: 0.97 }}
              className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-white"
              style={{ background: 'linear-gradient(135deg, #FF6B1A, #FF8C42)', boxShadow: '0 4px 14px rgba(255,107,26,0.28)' }}>
              <Plus size={13} />New Course
            </motion.button>
          </Link>
        </div>
      </div>

      {/* ── Table ──────────────────────────────────── */}
      <div className="overflow-hidden rounded-2xl" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse">
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                {/* Select-all checkbox */}
                <th className="px-3 py-3 w-10">
                  <button onClick={toggleAll} className="flex items-center justify-center" title={allChecked ? 'Deselect all' : 'Select all'}>
                    {allChecked
                      ? <CheckSquare size={15} style={{ color: '#FF6B1A' }} />
                      : someChecked
                        ? <CheckSquare size={15} style={{ color: 'rgba(255,107,26,0.5)' }} />
                        : <Square size={15} style={{ color: 'rgba(255,255,255,0.2)' }} />}
                  </button>
                </th>
                {[
                  { label: 'Course',   col: 'title'        as SortKey },
                  { label: 'Status' },
                  { label: 'Students', col: 'enrolledCount' as SortKey },
                  { label: 'Rating',   col: 'ratingAvg'    as SortKey },
                  { label: 'Price',    col: 'price'        as SortKey },
                  { label: 'Created',  col: 'createdAt'    as SortKey },
                  { label: '' },
                ].map((h, i) => (
                  <th key={i} className="px-4 py-3 text-left"
                    style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    {h.col ? (
                      <button onClick={() => handleSort(h.col!)} className="flex items-center gap-1 transition-opacity hover:opacity-80">
                        {h.label} <SortIcon col={h.col} />
                      </button>
                    ) : h.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? skeletonRows.map((_, i) => <SkeletonRow key={i} />)
                : data?.docs.map((course, i) => (
                    <CourseRow
                      key={course.id}
                      course={course}
                      index={i}
                      checked={selected.has(course.id)}
                      onToggle={() => toggleOne(course.id)}
                      onDelete={() => openDeleteModal(course.id, course.title)}
                    />
                  ))
              }
              {!isLoading && data?.docs.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: 'rgba(255,255,255,0.05)' }}>
                        <BookOpen size={20} style={{ color: 'rgba(255,255,255,0.2)' }} />
                      </div>
                      <p className="text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>No courses found</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ───────────────────────────── */}
        {data && data.meta.total_pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
              Showing {((page - 1) * 8) + 1}–{Math.min(page * 8, data.meta.total_count)} of {data.meta.total_count}
            </p>
            <div className="flex items-center gap-1.5">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={!data.meta.has_prev}
                className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors disabled:opacity-30"
                style={{ color: 'rgba(255,255,255,0.6)' }}><ChevronLeft size={13} /></button>
              {Array.from({ length: data.meta.total_pages }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setPage(p)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-xs font-semibold transition-colors"
                  style={p === page
                    ? { background: 'rgba(255,107,26,0.2)', color: '#FF6B1A' }
                    : { color: 'rgba(255,255,255,0.4)' }}>
                  {p}
                </button>
              ))}
              <button onClick={() => setPage(p => p + 1)} disabled={!data.meta.has_next}
                className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors disabled:opacity-30"
                style={{ color: 'rgba(255,255,255,0.6)' }}><ChevronRight size={13} /></button>
            </div>
          </div>
        )}
      </div>

      {/* ── Floating bulk action bar ─────────────────── */}
      <BulkBar
        selected={selected.size}
        onPublish={() => void runBulk('publish')}
        onArchive={() => void runBulk('archive')}
        onDelete={() => void runBulk('delete')}
        onClear={() => setSelected(new Set())}
        isPending={bulk.isPending}
      />
    </div>
  )
}

/* ─── Course row ─────────────────────────────────────── */
function CourseRow({ course, index, checked, onToggle, onDelete }: {
  course:   Course
  index:    number
  checked:  boolean
  onToggle: () => void
  onDelete: () => void
}) {
  const st = STATUS_STYLES[course.status]

  return (
    <motion.tr
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="group transition-colors"
      style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: checked ? 'rgba(255,107,26,0.06)' : 'transparent' }}
      onMouseEnter={e => { if (!checked) e.currentTarget.style.background = 'rgba(255,255,255,0.025)' }}
      onMouseLeave={e => { if (!checked) e.currentTarget.style.background = 'transparent' }}>

      {/* Checkbox */}
      <td className="px-3 py-3.5">
        <button onClick={onToggle} className="flex items-center justify-center">
          {checked
            ? <CheckSquare size={15} style={{ color: '#FF6B1A' }} />
            : <Square size={15} style={{ color: 'rgba(255,255,255,0.2)' }} className="opacity-0 group-hover:opacity-100 transition-opacity" />}
        </button>
      </td>

      {/* Course */}
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-3">
          <div className="relative h-10 w-16 flex-shrink-0 overflow-hidden rounded-xl" style={{ background: 'rgba(255,255,255,0.05)' }}>
            {course.thumbnailUrl
              ? <img src={course.thumbnailUrl} alt="" className="h-full w-full object-cover" />
              : <div className="flex h-full w-full items-center justify-center"><BookOpen size={14} style={{ color: 'rgba(255,255,255,0.2)' }} /></div>}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white max-w-[200px]">{course.title}</p>
            <div className="mt-0.5 flex items-center gap-1.5">
              {course.level && <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>{LEVEL_LABEL[course.level]}</span>}
              {course.instructor && (
                <><span style={{ color: 'rgba(255,255,255,0.15)' }}>·</span>
                  <span className="text-[10px] truncate max-w-[100px]" style={{ color: 'rgba(255,255,255,0.3)' }}>{course.instructor.name}</span></>
              )}
            </div>
          </div>
        </div>
      </td>

      {/* Status */}
      <td className="px-4 py-3.5">
        <span className="flex w-fit items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-semibold" style={{ background: st.bg, color: st.color }}>
          <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: st.dot }} />{st.label}
        </span>
      </td>

      {/* Students */}
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-1.5" style={{ color: 'rgba(255,255,255,0.55)' }}>
          <Users size={12} /><span className="text-sm">{course.enrolledCount.toLocaleString()}</span>
        </div>
      </td>

      {/* Rating */}
      <td className="px-4 py-3.5">
        {course.ratingAvg > 0
          ? <div className="flex items-center gap-1" style={{ color: '#FACC15' }}>
              <Star size={12} fill="#FACC15" /><span className="text-sm font-medium">{course.ratingAvg.toFixed(1)}</span>
              <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.25)' }}>({course.ratingCount})</span>
            </div>
          : <span className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>—</span>}
      </td>

      {/* Price */}
      <td className="px-4 py-3.5">
        {course.isFree
          ? <span className="text-xs font-semibold" style={{ color: '#4ADE80' }}>Free</span>
          : <span className="text-sm font-semibold text-white">${course.price.toFixed(2)}</span>}
      </td>

      {/* Created */}
      <td className="px-4 py-3.5">
        <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
          {new Date(course.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
        </span>
      </td>

      {/* Actions */}
      <td className="px-4 py-3.5">
        <div className="relative flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Link href={`/courses/${course.id}/edit`}>
            <button className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-white/10"
              style={{ color: 'rgba(255,255,255,0.5)' }} title="Edit"><Edit2 size={13} /></button>
          </Link>
          <button onClick={onDelete}
            className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-red-500/15"
            style={{ color: 'rgba(255,255,255,0.5)' }} title="Delete"><Trash2 size={13} /></button>
        </div>
      </td>
    </motion.tr>
  )
}
