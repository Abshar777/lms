'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import {
  Search, BookOpen, Star, Users, Clock, X,
  ChevronDown, SlidersHorizontal, Sparkles,
  Play, ChevronUp,
} from 'lucide-react'
import { useCourses } from '@/lib/api/courses'
import { useCategories } from '@/lib/api/categories'
import { useUIStore } from '@/store/ui.store'
import type { Course } from '@/types/index'

const STATUS_TABS = ['All Status', 'Not Started', 'In Progress', 'Completed']
const SORTS = [
  { value: 'popular',  label: 'Most popular' },
  { value: 'rating',   label: 'Highest rated' },
  { value: 'newest',   label: 'Newest' },
  { value: 'price_lo', label: 'Price: Low → High' },
  { value: 'price_hi', label: 'Price: High → Low' },
]
const LEVELS     = ['all', 'beginner', 'intermediate', 'advanced'] as const

type DurationKey = 'any' | 'lt1h' | '1to3' | '3to6' | 'gt6'
const DURATIONS: { key: DurationKey; label: string; min?: number; max?: number }[] = [
  { key: 'any',  label: 'Any length' },
  { key: 'lt1h', label: '< 1 hour',    max: 60 },
  { key: '1to3', label: '1 – 3 hours', min: 60,  max: 180 },
  { key: '3to6', label: '3 – 6 hours', min: 180, max: 360 },
  { key: 'gt6',  label: '> 6 hours',   min: 360 },
]

type PriceKey = 'any' | 'free' | 'lt30' | '30to100' | 'gt100'
const PRICES: { key: PriceKey; label: string; min?: number; max?: number; free?: boolean }[] = [
  { key: 'any',     label: 'Any price' },
  { key: 'free',    label: 'Free',         free: true },
  { key: 'lt30',    label: '$1 – $29',     min: 1,   max: 29 },
  { key: '30to100', label: '$30 – $99',    min: 30,  max: 99 },
  { key: 'gt100',   label: '$100+',        min: 100 },
]

const CONTENT_TYPES = [
  { value: 'all',    label: 'All',           color: '#6B7280', bg: '#F9FAFB'  },
  { value: 'course', label: 'Course',        color: '#2563EB', bg: '#EFF6FF'  },
  { value: 'quiz',   label: 'Quiz',          color: '#D97706', bg: '#FFFBEB'  },
  { value: 'path',   label: 'Learning Path', color: '#059669', bg: '#ECFDF5'  },
  { value: 'page',   label: 'Page',          color: '#7C3AED', bg: '#F5F3FF'  },
]

function fmt(mins: number) {
  const h = Math.floor(mins / 60); const m = mins % 60
  return h > 0 ? `${h}h ${m > 0 ? m + 'm' : ''}`.trim() : `${m}m`
}

const stagger  = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } }
const cardAnim = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 280, damping: 26 } } }

function TypeBadge({ type }: { type: string }) {
  const map: Record<string, { bg: string; color: string; dot: string }> = {
    'Course':        { bg: '#EFF6FF', color: '#2563EB', dot: '#3B82F6' },
    'Quiz':          { bg: '#FFFBEB', color: '#92400E', dot: '#F59E0B' },
    'Learning Path': { bg: '#F0FDF4', color: '#166534', dot: '#22C55E' },
    'Page':          { bg: '#FDF4FF', color: '#7E22CE', dot: '#A855F7' },
  }
  const s = map[type] ?? map['Course']
  return (
    <span className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-semibold"
      style={{ background: s.bg, color: s.color }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.dot }} />
      {type}
    </span>
  )
}

function ProgressHalf({ pct }: { pct: number }) {
  const r = 12, c = 2 * Math.PI * r
  return (
    <div className="flex items-center gap-1.5">
      <div className="relative inline-flex items-center justify-center">
        <svg width={28} height={28}>
          <circle cx={14} cy={14} r={r} fill="none" stroke="#F3F4F6" strokeWidth={2.5} />
          <motion.circle cx={14} cy={14} r={r} fill="none" stroke="#22C55E" strokeWidth={2.5}
            strokeLinecap="round" strokeDasharray={c}
            strokeDashoffset={c - (pct / 100) * c}
            style={{ transformOrigin: '50% 50%', rotate: '-90deg' }}
            initial={{ strokeDashoffset: c }}
            animate={{ strokeDashoffset: c - (pct / 100) * c }}
            transition={{ duration: 0.7, ease: 'easeOut' }} />
        </svg>
      </div>
      <span className="text-sm font-semibold" style={{ color: '#374151' }}>{pct}%</span>
    </div>
  )
}

export default function CoursesPage() {
  const { rightPanelOpen } = useUIStore()
  const [search,      setSearch]      = useState('')
  const [activeTab,   setActiveTab]   = useState('All Status')
  const [level,       setLevel]       = useState('all')
  const [category,    setCategory]    = useState('all')
  const [sort,        setSort]        = useState('popular')
  const [free,        setFree]        = useState(false)
  const [page,        setPage]        = useState(1)
  const [showSort,    setShowSort]    = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [contentType, setContentType] = useState('all')
  const [duration,    setDuration]    = useState<DurationKey>('any')
  const [priceRange,  setPriceRange]  = useState<PriceKey>('any')

  const lvl = level === 'all' ? '' : level
  const cat = category === 'all' ? '' : category
  const dur = DURATIONS.find(d => d.key === duration)
  const pr  = PRICES.find(p => p.key === priceRange)
  /* When user picks the dedicated "Free" price chip, override `free` so the
     backend filters by isFree=true (not just price=0). */
  const effectiveFree = pr?.free ? true : free

  const { data, isLoading } = useCourses({
    page, per_page: 8, search, level: lvl, category: cat, sort,
    free:         effectiveFree,
    duration_min: dur?.min,
    duration_max: dur?.max,
    price_min:    pr?.min,
    price_max:    pr?.max,
  })
  const { data: categoriesData } = useCategories()
  const categories: string[] = ['all', ...(categoriesData?.map(c => c.slug) ?? [])]
  const categoryLabel = (slug: string) => slug === 'all'
    ? 'All categories'
    : categoriesData?.find(c => c.slug === slug)?.name ?? slug

  const total = data?.meta.total_count ?? 0
  const activeFilterCount =
    (level !== 'all' ? 1 : 0) +
    (category !== 'all' ? 1 : 0) +
    (free || pr?.free ? 1 : 0) +
    (duration !== 'any' ? 1 : 0) +
    (priceRange !== 'any' && !pr?.free ? 1 : 0)

  return (
    <div>
      {/* ── Page header ──────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 26 }} className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles size={14} style={{ color: '#FF6B1A' }} />
          <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: '#FF6B1A' }}>Catalogue</span>
        </div>
        <h1 className="text-2xl font-bold" style={{ color: '#111827', fontFamily: 'Bricolage Grotesque, sans-serif' }}>
          All Materials
          <span className="ml-2 inline-flex items-center justify-center rounded-lg px-2 py-0.5 text-sm font-bold"
            style={{ background: '#F3F4F6', color: '#374151' }}>
            {total}
          </span>
        </h1>
      </motion.div>

      {/* ── Status tabs + controls ──────────────────── */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05, type: 'spring', stiffness: 280, damping: 26 }}
        className="mb-5 flex flex-col gap-2.5">

        {/* Row 1: status tabs (always scrollable, never breaks) + controls on same row ≥ sm */}
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          {/* Status tabs */}
          <div className="flex shrink-0 items-center gap-1 overflow-x-auto rounded-2xl p-1 scrollbar-none self-start sm:self-auto"
            style={{ background: '#F3F4F6' }}>
            {STATUS_TABS.map(tab => (
              <motion.button key={tab} onClick={() => setActiveTab(tab)}
                className="relative rounded-xl px-4 py-2 text-sm font-semibold transition-colors whitespace-nowrap"
                style={{ color: activeTab === tab ? '#111827' : '#9CA3AF' }}>
                {activeTab === tab && (
                  <motion.div layoutId="status-pill"
                    className="absolute inset-0 rounded-xl bg-white"
                    style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.10)' }}
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }} />
                )}
                <span className="relative z-10">{tab}</span>
              </motion.button>
            ))}
          </div>

          {/* Controls row — always in one line, never wraps */}
          <div className="flex shrink-0 items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#9CA3AF' }} />
              <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
                placeholder="Search..."
                className="w-36 rounded-xl py-2 pl-9 pr-4 text-sm outline-none transition-all focus:w-44"
                style={{ background: 'white', border: '1px solid #E5E7EB', color: '#111827' }}
                onFocus={e => { e.currentTarget.style.border = '1.5px solid #FF6B1A'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(255,107,26,0.08)' }}
                onBlur={e => { e.currentTarget.style.border = '1px solid #E5E7EB'; e.currentTarget.style.boxShadow = 'none' }} />
            </div>

            {/* Add Filter */}
            <motion.button whileTap={{ scale: 0.96 }} onClick={() => setShowFilters(v => !v)}
              className="relative flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold bg-white transition-colors hover:bg-gray-50"
              style={{ border: '1px solid #E5E7EB', color: '#374151' }}>
              <SlidersHorizontal size={13} />
              <span className="hidden sm:inline">Add Filter</span>
              {activeFilterCount > 0 && (
                <span className="ml-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold"
                  style={{ background: '#FF6B1A', color: 'white' }}>
                  {activeFilterCount}
                </span>
              )}
            </motion.button>

            {/* Sort by */}
            <div className="relative shrink-0">
              <motion.button whileTap={{ scale: 0.96 }} onClick={() => setShowSort(v => !v)}
                className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold bg-white transition-colors hover:bg-gray-50"
                style={{ border: '1px solid #E5E7EB', color: '#374151' }}>
                <ChevronDown size={13} />
                <span className="hidden sm:inline">Sort by</span>
              </motion.button>
              <AnimatePresence>
                {showSort && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowSort(false)} />
                    <motion.div initial={{ opacity: 0, y: -8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.96 }} transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                      className="absolute right-0 top-full mt-1 w-52 rounded-2xl p-1.5 z-50 bg-white"
                      style={{ border: '1px solid #E5E7EB', boxShadow: '0 16px 40px rgba(0,0,0,0.12)' }}>
                      {SORTS.map(s => (
                        <button key={s.value} onClick={() => { setSort(s.value); setShowSort(false); setPage(1) }}
                          className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm transition-colors hover:bg-gray-50"
                          style={{ color: sort === s.value ? '#FF6B1A' : '#374151', fontWeight: sort === s.value ? 600 : 400 }}>
                          {s.label}
                          {sort === s.value && <span className="h-1.5 w-1.5 rounded-full" style={{ background: '#FF6B1A' }} />}
                        </button>
                      ))}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Expandable filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="rounded-2xl bg-white p-4 space-y-3" style={{ border: '1px solid #E5E7EB' }}>
                {/* Content type */}
                <div>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#9CA3AF' }}>Type</p>
                  <div className="flex flex-wrap gap-2">
                    {CONTENT_TYPES.map(t => (
                      <button key={t.value} onClick={() => setContentType(t.value)}
                        className="rounded-xl px-3 py-1.5 text-xs font-semibold transition-all"
                        style={contentType === t.value
                          ? { background: t.bg, color: t.color, border: `1px solid ${t.color}40` }
                          : { background: '#F9FAFB', color: '#6B7280', border: '1px solid #E5E7EB' }}>
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Level */}
                <div>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#9CA3AF' }}>Level</p>
                  <div className="flex flex-wrap gap-2">
                    {LEVELS.map(l => (
                      <button key={l} onClick={() => { setLevel(l); setPage(1) }}
                        className="rounded-xl px-3 py-1.5 text-xs font-semibold capitalize transition-all"
                        style={level === l
                          ? { background: 'rgba(255,107,26,0.10)', color: '#FF6B1A', border: '1px solid rgba(255,107,26,0.28)' }
                          : { background: '#F9FAFB', color: '#6B7280', border: '1px solid #E5E7EB' }}>
                        {l === 'all' ? 'All levels' : l}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Category */}
                <div>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#9CA3AF' }}>Category</p>
                  <div className="flex flex-wrap gap-2">
                    {categories.map(c => (
                      <button key={c} onClick={() => { setCategory(c); setPage(1) }}
                        className="rounded-xl px-3 py-1.5 text-xs font-semibold transition-all"
                        style={category === c
                          ? { background: 'rgba(99,102,241,0.10)', color: '#4F46E5', border: '1px solid rgba(99,102,241,0.28)' }
                          : { background: '#F9FAFB', color: '#6B7280', border: '1px solid #E5E7EB' }}>
                        {categoryLabel(c)}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Duration */}
                <div>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#9CA3AF' }}>Duration</p>
                  <div className="flex flex-wrap gap-2">
                    {DURATIONS.map(d => (
                      <button key={d.key} onClick={() => { setDuration(d.key); setPage(1) }}
                        className="rounded-xl px-3 py-1.5 text-xs font-semibold transition-all"
                        style={duration === d.key
                          ? { background: 'rgba(59,130,246,0.10)', color: '#2563EB', border: '1px solid rgba(59,130,246,0.28)' }
                          : { background: '#F9FAFB', color: '#6B7280', border: '1px solid #E5E7EB' }}>
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Price range */}
                <div>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#9CA3AF' }}>Price</p>
                  <div className="flex flex-wrap gap-2">
                    {PRICES.map(p => (
                      <button key={p.key} onClick={() => { setPriceRange(p.key); setPage(1) }}
                        className="rounded-xl px-3 py-1.5 text-xs font-semibold transition-all"
                        style={priceRange === p.key
                          ? { background: 'rgba(34,197,94,0.10)', color: '#16A34A', border: '1px solid rgba(34,197,94,0.28)' }
                          : { background: '#F9FAFB', color: '#6B7280', border: '1px solid #E5E7EB' }}>
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Free toggle + clear */}
                <div className="flex items-center gap-3 pt-1" style={{ borderTop: '1px solid #F3F4F6' }}>
                  <button onClick={() => { setFree(v => !v); setPage(1) }}
                    className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all"
                    style={free
                      ? { background: 'rgba(34,197,94,0.10)', color: '#16A34A', border: '1px solid rgba(34,197,94,0.25)' }
                      : { background: '#F9FAFB', color: '#6B7280', border: '1px solid #E5E7EB' }}>
                    {free ? '✓ ' : ''}Free only
                  </button>
                  <button onClick={() => {
                    setLevel('all'); setCategory('all'); setFree(false); setContentType('all')
                    setDuration('any'); setPriceRange('any'); setPage(1)
                  }}
                    className="flex items-center gap-1 text-xs font-semibold transition-colors hover:text-red-500"
                    style={{ color: '#9CA3AF' }}>
                    <X size={11} />Clear all
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── Course grid ──────────────────────────────── */}
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div key="skeleton" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className={`grid gap-5 grid-cols-1 sm:grid-cols-2 ${rightPanelOpen ? 'xl:grid-cols-3 2xl:grid-cols-4' : 'lg:grid-cols-3 xl:grid-cols-4'}`}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="overflow-hidden rounded-2xl bg-white" style={{ border: '1px solid #E5E7EB' }}>
                <div className="h-40 animate-pulse" style={{ background: '#F3F4F6' }} />
                <div className="space-y-2.5 p-4">
                  <div className="h-4 w-16 rounded animate-pulse" style={{ background: '#EFF6FF' }} />
                  <div className="h-4 w-4/5 rounded animate-pulse" style={{ background: '#F3F4F6' }} />
                  <div className="h-3 w-2/5 rounded animate-pulse" style={{ background: '#F9FAFB' }} />
                  <div className="flex gap-2">
                    <div className="h-6 w-20 rounded-lg animate-pulse" style={{ background: '#F3F4F6' }} />
                    <div className="h-6 w-16 rounded-lg animate-pulse" style={{ background: '#F3F4F6' }} />
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        ) : data?.docs.length === 0 ? (
          <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl"
              style={{ background: '#F3F4F6', border: '1px solid #E5E7EB' }}>
              <BookOpen size={24} style={{ color: '#D1D5DB' }} />
            </div>
            <p className="text-base font-bold" style={{ color: '#111827' }}>No courses found</p>
            <p className="text-sm" style={{ color: '#9CA3AF' }}>Try adjusting your filters or search query</p>
            <button onClick={() => {
              setSearch(''); setLevel('all'); setCategory('all'); setFree(false)
              setDuration('any'); setPriceRange('any')
            }}
              className="mt-1 rounded-xl px-5 py-2 text-sm font-semibold transition-colors hover:opacity-90"
              style={{ background: 'rgba(255,107,26,0.10)', color: '#FF6B1A' }}>
              Clear filters
            </button>
          </motion.div>
        ) : (
          <motion.div key="grid" variants={stagger} initial="hidden" animate="show"
            className={`grid gap-5 grid-cols-1 sm:grid-cols-2 ${rightPanelOpen ? 'xl:grid-cols-3 2xl:grid-cols-4' : 'lg:grid-cols-3 xl:grid-cols-4'}`}>
            {data?.docs.map(course => (
              <motion.div key={course.id} variants={cardAnim}>
                <MaterialCard course={course} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Pagination ───────────────────────────────── */}
      {data && data.meta.total_pages > 1 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
          className="mt-8 flex items-center justify-center gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={!data.meta.has_prev}
            className="rounded-xl px-4 py-2 text-sm font-semibold transition-colors hover:bg-gray-50 disabled:opacity-40 bg-white"
            style={{ border: '1px solid #E5E7EB', color: '#374151' }}>
            Previous
          </button>
          {Array.from({ length: data.meta.total_pages }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => setPage(p)}
              className="h-9 w-9 rounded-xl text-sm font-semibold transition-all"
              style={p === page
                ? { background: '#111827', color: 'white' }
                : { color: '#6B7280', background: 'white', border: '1px solid #E5E7EB' }}>
              {p}
            </button>
          ))}
          <button onClick={() => setPage(p => p + 1)} disabled={!data.meta.has_next}
            className="rounded-xl px-4 py-2 text-sm font-semibold transition-colors hover:bg-gray-50 disabled:opacity-40 bg-white"
            style={{ border: '1px solid #E5E7EB', color: '#374151' }}>
            Next
          </button>
        </motion.div>
      )}
    </div>
  )
}

/* ── Material card ────────────────────────────────── */
function MaterialCard({ course }: { course: Course }) {
  const isInProgress = course.enrolledCount > 500
  const mockProgress = isInProgress ? Math.floor(30 + Math.random() * 60) : 0
  const notStarted   = !isInProgress

  function fmt(mins: number) {
    const h = Math.floor(mins / 60); const m = mins % 60
    return h > 0 ? `${h}h ${m > 0 ? m + 'm' : ''}`.trim() : `${m}m`
  }

  return (
    <Link href={`/courses/${course.slug}`}>
      <motion.div
        whileHover={{ y: -4, boxShadow: '0 20px 44px rgba(0,0,0,0.10)' }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 350, damping: 28 }}
        className="group overflow-hidden rounded-2xl bg-white cursor-pointer h-full flex flex-col"
        style={{ border: '1px solid #E5E7EB', boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}>

        {/* Thumbnail */}
        <div className="relative h-40 overflow-hidden">
          {course.thumbnailUrl
            ? <img src={course.thumbnailUrl} alt={course.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
            : <div className="flex h-full w-full items-center justify-center" style={{ background: '#F3F4F6' }}>
                <BookOpen size={32} style={{ color: '#D1D5DB' }} />
              </div>
          }
          {/* Overlay on hover */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center"
            style={{ background: 'rgba(17,24,39,0.35)' }}>
            <motion.div whileHover={{ scale: 1.1 }}
              className="flex h-11 w-11 items-center justify-center rounded-full"
              style={{ background: 'rgba(255,107,26,0.92)', boxShadow: '0 6px 18px rgba(255,107,26,0.45)' }}>
              <Play size={14} fill="white" color="white" />
            </motion.div>
          </div>
          {/* Badges */}
          <div className="absolute left-3 top-3 flex gap-1.5">
            {course.durationMins > 0 && (
              <span className="rounded-lg px-2 py-0.5 text-[10px] font-bold"
                style={{ background: 'rgba(17,24,39,0.72)', color: 'white', backdropFilter: 'blur(6px)' }}>
                {course.lessonCount ?? Math.ceil(course.durationMins / 10)} {course.lessonCount === 1 ? 'Chapter' : 'Materials'}
              </span>
            )}
          </div>
          {course.isFree && (
            <span className="absolute right-3 top-3 rounded-lg px-2 py-0.5 text-[10px] font-bold"
              style={{ background: 'rgba(34,197,94,0.15)', color: '#16A34A', border: '1px solid rgba(34,197,94,0.25)' }}>
              FREE
            </span>
          )}
        </div>

        {/* Content */}
        <div className="flex flex-col flex-1 p-4">
          {/* Type + certified badge */}
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <TypeBadge type="Course" />
            {course.ratingAvg >= 4.5 && (
              <span className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-semibold"
                style={{ background: '#EFF6FF', color: '#1D4ED8' }}>
                ✦ Top Rated
              </span>
            )}
          </div>

          <h3 className="line-clamp-2 text-sm font-bold leading-snug" style={{ color: '#111827' }}>
            {course.title}
          </h3>
          {course.instructor && (
            <p className="mt-1 text-xs" style={{ color: '#9CA3AF' }}>{course.instructor.name}</p>
          )}

          {/* Tags */}
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {course.category && (
              <span className="whitespace-nowrap rounded-lg px-2.5 py-1 text-[11px] font-medium"
                style={{ background: '#F3F4F6', color: '#4B5563' }}>{course.category.name}</span>
            )}
            {course.level && (
              <span className="whitespace-nowrap rounded-lg px-2.5 py-1 text-[11px] font-medium capitalize"
                style={{ background: '#F3F4F6', color: '#4B5563' }}>{course.level}</span>
            )}
            <span className="whitespace-nowrap rounded-lg px-2.5 py-1 text-[11px] font-medium"
              style={{ background: '#F3F4F6', color: '#4B5563' }}>Not Urgent</span>
          </div>

          {/* Bottom: progress or pts + action */}
          <div className="mt-auto pt-3 flex items-center justify-between" style={{ borderTop: '1px solid #F3F4F6', marginTop: 12 }}>
            {isInProgress ? (
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-20 overflow-hidden rounded-full" style={{ background: '#F3F4F6' }}>
                  <motion.div className="h-full rounded-full" style={{ background: '#22C55E', width: `${mockProgress}%` }}
                    initial={{ width: 0 }} animate={{ width: `${mockProgress}%` }}
                    transition={{ duration: 0.7, ease: 'easeOut', delay: 0.2 }} />
                </div>
                <span className="text-xs font-semibold" style={{ color: '#374151' }}>{mockProgress}%</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-xs" style={{ color: '#9CA3AF' }}>
                {course.ratingAvg > 0 && (
                  <span className="flex items-center gap-1 font-semibold" style={{ color: '#F59E0B' }}>
                    <Star size={11} fill="#F59E0B" />{course.ratingAvg.toFixed(1)}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Users size={10} />{course.enrolledCount.toLocaleString()}
                </span>
              </div>
            )}
            <motion.button
              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
              onClick={e => e.preventDefault()}
              className="rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all"
              style={isInProgress
                ? { background: '#111827', color: 'white' }
                : { background: 'transparent', color: '#111827', border: '1.5px solid #D1D5DB' }}>
              {isInProgress ? 'Continue' : 'Start'}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </Link>
  )
}
