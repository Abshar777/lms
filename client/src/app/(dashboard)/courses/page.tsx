'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Search, BookOpen, Star, Users, Clock, X,
  ChevronDown, SlidersHorizontal, Sparkles,
  Play, ShoppingCart, Check, Loader2,
} from 'lucide-react'
import { useCourses } from '@/lib/api/courses'
import { useCategories } from '@/lib/api/categories'
import { useMyEnrollments, useEnroll } from '@/lib/api/enrollments'
import { useCurrentUser } from '@/lib/api/user'
import { useUIStore } from '@/store/ui.store'
import { FavoriteButton } from '@/components/courses/FavoriteButton'
import { useCartStore } from '@/store/cart.store'
import { Button, MotionButton } from '@/components/ui/button'
import type { Course } from '@/types/index'

const STATUS_TABS = ['All Status', 'Not Started', 'In Progress', 'Completed']
const SORTS = [
  { value: 'popular',  label: 'Most popular' },
  { value: 'rating',   label: 'Highest rated' },
  { value: 'newest',   label: 'Newest' },
  { value: 'price_lo', label: 'Price: Low → High' },
  { value: 'price_hi', label: 'Price: High → Low' },
]
const LEVELS = ['all', 'beginner', 'intermediate', 'advanced'] as const

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
  { key: 'free',    label: 'Free',      free: true },
  { key: 'lt30',    label: '$1 – $29',  min: 1,   max: 29 },
  { key: '30to100', label: '$30 – $99', min: 30,  max: 99 },
  { key: 'gt100',   label: '$100+',     min: 100 },
]

const CONTENT_TYPES = [
  { value: 'all',    label: 'All',           color: '#6B7280', bg: '#F9FAFB' },
  { value: 'course', label: 'Course',        color: '#2563EB', bg: '#EFF6FF' },
  { value: 'quiz',   label: 'Quiz',          color: '#D97706', bg: '#FFFBEB' },
  { value: 'path',   label: 'Learning Path', color: '#059669', bg: '#ECFDF5' },
  { value: 'page',   label: 'Page',          color: '#7C3AED', bg: '#F5F3FF' },
]

function fmt(mins: number) {
  const h = Math.floor(mins / 60); const m = mins % 60
  return h > 0 ? `${h}h ${m > 0 ? m + 'm' : ''}`.trim() : `${m}m`
}

const stagger  = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } }
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
    <span className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-semibold"
      style={{ background: s.bg, color: s.color }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.dot }} />
      {type}
    </span>
  )
}

export default function CoursesPage() {
  const { rightPanelOpen } = useUIStore()
  const { data: currentUser } = useCurrentUser()
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
  const effectiveFree = pr?.free ? true : free

  const { data, isLoading } = useCourses({
    page, per_page: 12, search, level: lvl, category: cat, sort,
    free:         effectiveFree,
    duration_min: dur?.min,
    duration_max: dur?.max,
    price_min:    pr?.min,
    price_max:    pr?.max,
    program:      currentUser?.category ?? undefined,
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

  /* Responsive grid: no desktop sidebar, so more columns available */
  const gridCols = `grid-cols-1 sm:grid-cols-2 md:grid-cols-3 ${rightPanelOpen ? 'xl:grid-cols-3' : 'xl:grid-cols-4'}`

  return (
    <div>
      {/* ── Page header ───────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 26 }} className="mb-5">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles size={13} style={{ color: '#FF6B1A' }} />
          <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#FF6B1A' }}>Catalogue</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-2xl font-bold" style={{ color: '#111827', fontFamily: 'Bricolage Grotesque, sans-serif' }}>
            All Materials
          </h1>
          <span className="inline-flex items-center justify-center rounded-lg px-2 py-0.5 text-sm font-bold"
            style={{ background: '#F3F4F6', color: '#374151' }}>
            {total}
          </span>
        </div>
      </motion.div>

      {/* ── Status tabs + controls ────────────────── */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05, type: 'spring', stiffness: 280, damping: 26 }}
        className="mb-5 flex flex-col gap-2.5">

        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          {/* Status tabs */}
          <div className="flex shrink-0 items-center gap-1 overflow-x-auto rounded-2xl p-1 scrollbar-none self-start"
            style={{ background: '#F3F4F6' }}>
            {STATUS_TABS.map(tab => (
              <MotionButton key={tab} onClick={() => setActiveTab(tab)}
                variant="ghost"
                size="sm"
                className="relative rounded-xl px-3 py-1.5 text-sm font-semibold transition-colors whitespace-nowrap h-auto"
                style={{ color: activeTab === tab ? '#111827' : '#9CA3AF' }}>
                {activeTab === tab && (
                  <motion.div layoutId="status-pill"
                    className="absolute inset-0 rounded-xl bg-white"
                    style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.10)' }}
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }} />
                )}
                <span className="relative z-10">{tab}</span>
              </MotionButton>
            ))}
          </div>

          {/* Controls */}
          <div className="flex shrink-0 items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: '#9CA3AF' }} />
              <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
                placeholder="Search…"
                className="w-36 rounded-xl py-2 pl-9 pr-3 text-sm transition-all focus:w-48"
                style={{ background: 'white', border: '1px solid #E5E7EB', color: '#111827' }} />
            </div>

            {/* Filter */}
            <MotionButton whileTap={{ scale: 0.96 }} onClick={() => setShowFilters(v => !v)}
              variant="outline"
              size="sm"
              className="relative flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold h-auto"
              style={{ borderColor: showFilters ? '#FF6B1A' : '#E5E7EB', color: showFilters ? '#FF6B1A' : '#374151' }}>
              <SlidersHorizontal size={13} />
              <span className="hidden sm:inline">Filters</span>
              {activeFilterCount > 0 && (
                <span className="ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold"
                  style={{ background: '#FF6B1A', color: 'white' }}>
                  {activeFilterCount}
                </span>
              )}
            </MotionButton>

            {/* Sort */}
            <div className="relative shrink-0">
              <MotionButton whileTap={{ scale: 0.96 }} onClick={() => setShowSort(v => !v)}
                variant="outline"
                size="sm"
                className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold h-auto"
                style={{ borderColor: '#E5E7EB', color: '#374151' }}>
                <ChevronDown size={13} className={`transition-transform ${showSort ? 'rotate-180' : ''}`} />
                <span className="hidden sm:inline">Sort</span>
              </MotionButton>
              <AnimatePresence>
                {showSort && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowSort(false)} />
                    <motion.div initial={{ opacity: 0, y: -8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.96 }} transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                      className="absolute right-0 top-full mt-1 w-52 rounded-2xl p-1.5 z-50 bg-white"
                      style={{ border: '1px solid #E5E7EB', boxShadow: '0 16px 40px rgba(0,0,0,0.10)' }}>
                      {SORTS.map(s => (
                        <Button key={s.value} onClick={() => { setSort(s.value); setShowSort(false); setPage(1) }}
                          variant="ghost"
                          size="sm"
                          className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm h-auto"
                          style={{ color: sort === s.value ? '#FF6B1A' : '#374151', fontWeight: sort === s.value ? 600 : 400 }}>
                          {s.label}
                          {sort === s.value && <span className="h-1.5 w-1.5 rounded-full" style={{ background: '#FF6B1A' }} />}
                        </Button>
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
                {/* Type */}
                <div>
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#9CA3AF' }}>Type</p>
                  <div className="flex flex-wrap gap-2">
                    {CONTENT_TYPES.map(t => (
                      <Button key={t.value} onClick={() => setContentType(t.value)}
                        variant="ghost"
                        size="sm"
                        className="rounded-xl px-3 py-1.5 text-xs font-semibold h-auto transition-all"
                        style={contentType === t.value
                          ? { background: t.bg, color: t.color, border: `1px solid ${t.color}40` }
                          : { background: '#F9FAFB', color: '#6B7280', border: '1px solid #E5E7EB' }}>
                        {t.label}
                      </Button>
                    ))}
                  </div>
                </div>
                {/* Level */}
                <div>
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#9CA3AF' }}>Level</p>
                  <div className="flex flex-wrap gap-2">
                    {LEVELS.map(l => (
                      <Button key={l} onClick={() => { setLevel(l); setPage(1) }}
                        variant="ghost"
                        size="sm"
                        className="rounded-xl px-3 py-1.5 text-xs font-semibold capitalize h-auto transition-all"
                        style={level === l
                          ? { background: 'rgba(255,107,26,0.10)', color: '#FF6B1A', border: '1px solid rgba(255,107,26,0.28)' }
                          : { background: '#F9FAFB', color: '#6B7280', border: '1px solid #E5E7EB' }}>
                        {l === 'all' ? 'All levels' : l}
                      </Button>
                    ))}
                  </div>
                </div>
                {/* Category */}
                <div>
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#9CA3AF' }}>Category</p>
                  <div className="flex flex-wrap gap-2">
                    {categories.map(c => (
                      <Button key={c} onClick={() => { setCategory(c); setPage(1) }}
                        variant="ghost"
                        size="sm"
                        className="rounded-xl px-3 py-1.5 text-xs font-semibold h-auto transition-all"
                        style={category === c
                          ? { background: 'rgba(99,102,241,0.10)', color: '#4F46E5', border: '1px solid rgba(99,102,241,0.28)' }
                          : { background: '#F9FAFB', color: '#6B7280', border: '1px solid #E5E7EB' }}>
                        {categoryLabel(c)}
                      </Button>
                    ))}
                  </div>
                </div>
                {/* Duration */}
                <div>
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#9CA3AF' }}>Duration</p>
                  <div className="flex flex-wrap gap-2">
                    {DURATIONS.map(d => (
                      <Button key={d.key} onClick={() => { setDuration(d.key); setPage(1) }}
                        variant="ghost"
                        size="sm"
                        className="rounded-xl px-3 py-1.5 text-xs font-semibold h-auto transition-all"
                        style={duration === d.key
                          ? { background: 'rgba(59,130,246,0.10)', color: '#2563EB', border: '1px solid rgba(59,130,246,0.28)' }
                          : { background: '#F9FAFB', color: '#6B7280', border: '1px solid #E5E7EB' }}>
                        {d.label}
                      </Button>
                    ))}
                  </div>
                </div>
                {/* Price */}
                <div>
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#9CA3AF' }}>Price</p>
                  <div className="flex flex-wrap gap-2">
                    {PRICES.map(p => (
                      <Button key={p.key} onClick={() => { setPriceRange(p.key); setPage(1) }}
                        variant="ghost"
                        size="sm"
                        className="rounded-xl px-3 py-1.5 text-xs font-semibold h-auto transition-all"
                        style={priceRange === p.key
                          ? { background: 'rgba(34,197,94,0.10)', color: '#16A34A', border: '1px solid rgba(34,197,94,0.28)' }
                          : { background: '#F9FAFB', color: '#6B7280', border: '1px solid #E5E7EB' }}>
                        {p.label}
                      </Button>
                    ))}
                  </div>
                </div>
                {/* Free toggle + clear */}
                <div className="flex items-center gap-3 pt-1" style={{ borderTop: '1px solid #F3F4F6' }}>
                  <Button onClick={() => { setFree(v => !v); setPage(1) }}
                    variant="ghost"
                    size="sm"
                    className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold h-auto transition-all"
                    style={free
                      ? { background: 'rgba(34,197,94,0.10)', color: '#16A34A', border: '1px solid rgba(34,197,94,0.25)' }
                      : { background: '#F9FAFB', color: '#6B7280', border: '1px solid #E5E7EB' }}>
                    {free ? '✓ ' : ''}Free only
                  </Button>
                  <Button onClick={() => {
                    setLevel('all'); setCategory('all'); setFree(false)
                    setContentType('all'); setDuration('any'); setPriceRange('any'); setPage(1)
                  }}
                    variant="ghost"
                    size="sm"
                    className="flex items-center gap-1 text-xs font-semibold h-auto transition-colors hover:text-red-500"
                    style={{ color: '#9CA3AF' }}>
                    <X size={11} />Clear all
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── Course grid ───────────────────────────── */}
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div key="skeleton" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className={`grid gap-4 ${gridCols}`}>
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="overflow-hidden rounded-2xl bg-white" style={{ border: '1px solid #E5E7EB' }}>
                <div className="aspect-video animate-pulse" style={{ background: '#F3F4F6' }} />
                <div className="space-y-2.5 p-4">
                  <div className="h-3.5 w-16 rounded animate-pulse" style={{ background: '#EFF6FF' }} />
                  <div className="h-4 w-4/5 rounded animate-pulse" style={{ background: '#F3F4F6' }} />
                  <div className="h-3 w-2/5 rounded animate-pulse" style={{ background: '#F9FAFB' }} />
                  <div className="flex gap-2">
                    <div className="h-5 w-16 rounded-lg animate-pulse" style={{ background: '#F3F4F6' }} />
                    <div className="h-5 w-12 rounded-lg animate-pulse" style={{ background: '#F3F4F6' }} />
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
            <p className="text-sm text-center" style={{ color: '#9CA3AF' }}>Try adjusting your filters or search query</p>
            <Button onClick={() => {
              setSearch(''); setLevel('all'); setCategory('all'); setFree(false)
              setDuration('any'); setPriceRange('any')
            }}
              variant="ghost"
              size="sm"
              className="mt-1 rounded-xl px-5 py-2 text-sm font-semibold h-auto transition-colors hover:opacity-90"
              style={{ background: 'rgba(255,107,26,0.10)', color: '#FF6B1A' }}>
              Clear filters
            </Button>
          </motion.div>
        ) : (
          <motion.div key="grid" variants={stagger} initial="hidden" animate="show"
            className={`grid gap-4 ${gridCols}`}>
            {data?.docs.map(course => (
              <motion.div key={course.id} variants={cardAnim}>
                <MaterialCard course={course} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Pagination ────────────────────────────── */}
      {data && data.meta.total_pages > 1 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
          className="mt-8 flex items-center justify-center gap-2 flex-wrap">
          <Button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={!data.meta.has_prev}
            variant="outline"
            size="sm"
            className="rounded-xl px-4 py-2 text-sm font-semibold h-auto disabled:opacity-40"
            style={{ borderColor: '#E5E7EB', color: '#374151' }}>
            Previous
          </Button>
          {Array.from({ length: Math.min(data.meta.total_pages, 7) }, (_, i) => i + 1).map(p => (
            <Button key={p} onClick={() => setPage(p)}
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-xl text-sm font-semibold"
              style={p === page
                ? { background: '#111827', color: 'white' }
                : { color: '#6B7280', background: 'white', border: '1px solid #E5E7EB' }}>
              {p}
            </Button>
          ))}
          <Button onClick={() => setPage(p => p + 1)} disabled={!data.meta.has_next}
            variant="outline"
            size="sm"
            className="rounded-xl px-4 py-2 text-sm font-semibold h-auto disabled:opacity-40"
            style={{ borderColor: '#E5E7EB', color: '#374151' }}>
            Next
          </Button>
        </motion.div>
      )}
    </div>
  )
}

/* ── Material card ────────────────────────────────────── */
function MaterialCard({ course }: { course: Course }) {
  const router     = useRouter()
  const addToCart  = useCartStore(s => s.addItem)
  const isInCart   = useCartStore(s => s.isInCart)
  const inCart     = isInCart(course.id)
  const isFree     = course.isFree || !course.price || course.price === 0

  const { data: enrollments } = useMyEnrollments()
  const enroll = useEnroll()
  const isEnrolled = enrollments?.some(e => {
    const cid = typeof e.courseId === 'string' ? e.courseId : e.courseId?.id
    return cid === course.id
  }) ?? false

  /* Free → enroll (never cart). Paid → cart. Already enrolled → open course. */
  const handleAction = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (isEnrolled) {
      router.push(`/courses/${course.slug}`)
      return
    }

    if (isFree) {
      try {
        await enroll.mutateAsync(course.id)
        router.push(`/courses/${course.slug}`)
      } catch {
        /* error surfaced on the course detail page */
      }
      return
    }

    addToCart({
      id:             course.id,
      slug:           course.slug,
      title:          course.title,
      thumbnailUrl:   course.thumbnailUrl,
      price:          course.price,
      isFree:         course.isFree,
      instructorName: course.instructor?.name,
    })
  }

  return (
    <Link href={`/courses/${course.slug}`} className="block h-full">
      <motion.div
        whileHover={{ y: -3, boxShadow: '0 16px 40px rgba(0,0,0,0.09)' }}
        whileTap={{ scale: 0.99 }}
        transition={{ type: 'spring', stiffness: 350, damping: 28 }}
        className="group overflow-hidden rounded-2xl bg-white cursor-pointer h-full flex flex-col"
        style={{ border: '1px solid #E5E7EB', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>

        {/* ── Thumbnail ── */}
        <div className="relative aspect-video overflow-hidden flex-shrink-0">
          {course.thumbnailUrl
            ? <img src={course.thumbnailUrl} alt={course.title}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
            : <div className="flex h-full w-full items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #F3F4F6, #E9EAED)' }}>
                <BookOpen size={28} style={{ color: '#D1D5DB' }} />
              </div>
          }

          {/* Dark overlay on hover */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center"
            style={{ background: 'rgba(13,15,26,0.30)' }}>
            <motion.div whileHover={{ scale: 1.1 }}
              className="flex h-10 w-10 items-center justify-center rounded-full"
              style={{ background: 'rgba(255,107,26,0.90)', boxShadow: '0 6px 18px rgba(255,107,26,0.40)' }}>
              <Play size={13} fill="white" color="white" />
            </motion.div>
          </div>

          {/* Top-left: materials count */}
          <div className="absolute left-2.5 top-2.5 flex gap-1.5">
            {course.durationMins > 0 && (
              <span className="rounded-lg px-2 py-0.5 text-[10px] font-bold"
                style={{ background: 'rgba(13,15,26,0.68)', color: 'white', backdropFilter: 'blur(6px)' }}>
                {fmt(course.durationMins)}
              </span>
            )}
          </div>

          {/* Top-right: save button */}
          <div className="absolute right-2.5 top-2.5">
            <FavoriteButton courseId={course.id} variant="icon" />
          </div>

          {/* Free badge */}
          {isFree && (
            <span className="absolute bottom-2.5 left-2.5 rounded-lg px-2 py-0.5 text-[10px] font-bold"
              style={{ background: 'rgba(34,197,94,0.18)', color: '#15803D', border: '1px solid rgba(34,197,94,0.28)', backdropFilter: 'blur(4px)' }}>
              FREE
            </span>
          )}
        </div>

        {/* ── Content ── */}
        <div className="flex flex-1 flex-col gap-2 p-3.5">

          {/* Type + Top Rated */}
          <div className="flex items-center justify-between gap-1 flex-wrap">
            <TypeBadge type="Course" />
            {course.ratingAvg >= 4.5 && (
              <span className="text-[10px] font-semibold" style={{ color: '#F59E0B' }}>✦ Top Rated</span>
            )}
          </div>

          {/* Title */}
          <h3 className="line-clamp-2 text-sm font-bold leading-snug" style={{ color: '#111827' }}>
            {course.title}
          </h3>

          {/* Instructor */}
          {course.instructor && (
            <p className="text-xs truncate" style={{ color: '#9CA3AF' }}>
              {course.instructor.name}
            </p>
          )}

          {/* Rating + enrolled */}
          <div className="flex items-center gap-2.5 text-xs flex-wrap">
            {course.ratingAvg > 0 && (
              <span className="flex items-center gap-1 font-semibold" style={{ color: '#F59E0B' }}>
                <Star size={10} fill="#F59E0B" />{course.ratingAvg.toFixed(1)}
              </span>
            )}
            <span className="flex items-center gap-1" style={{ color: '#9CA3AF' }}>
              <Users size={10} />{course.enrolledCount.toLocaleString()}
            </span>
            {course.category && (
              <span className="rounded-md px-1.5 py-0.5 text-[10px] font-medium"
                style={{ background: '#F3F4F6', color: '#6B7280' }}>{course.category.name}</span>
            )}
          </div>

          {/* ── Footer: price + action ── */}
          <div className="mt-auto flex items-center justify-between gap-2 pt-3"
            style={{ borderTop: '1px solid #F3F4F6' }}>

            {/* Price */}
            <div>
              {isFree ? (
                <span className="text-sm font-bold" style={{ color: '#16A34A' }}>Free</span>
              ) : (
                <span className="text-sm font-bold" style={{ color: '#111827' }}>
                  ${course.price ?? 0}
                </span>
              )}
              {course.level && (
                <p className="text-[10px] capitalize" style={{ color: '#9CA3AF' }}>{course.level}</p>
              )}
            </div>

            {/* Cart / Enroll button */}
            <MotionButton
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={handleAction}
              disabled={enroll.isPending}
              variant={(isEnrolled || (!isFree && inCart)) ? 'ghost' : 'default'}
              size="sm"
              className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-bold whitespace-nowrap h-auto disabled:opacity-70"
              style={(isEnrolled || (!isFree && inCart))
                ? { background: '#F0FDF4', color: '#16A34A', border: '1px solid rgba(34,197,94,0.28)' }
                : isFree
                  ? { background: 'linear-gradient(135deg, #22C55E, #16A34A)', color: 'white', boxShadow: '0 2px 8px rgba(34,197,94,0.25)' }
                  : { background: 'linear-gradient(135deg, #FF6B1A, #FF8C42)', color: 'white', boxShadow: '0 2px 8px rgba(255,107,26,0.25)' }
              }>
              {isEnrolled
                ? <><Check size={10} />Enrolled</>
                : enroll.isPending
                  ? <><Loader2 size={10} className="animate-spin" />Enrolling…</>
                  : isFree
                    ? <><Play size={10} fill="white" />Enroll Free</>
                    : inCart
                      ? <><Check size={10} />Added</>
                      : <><ShoppingCart size={10} />Add to Cart</>
              }
            </MotionButton>
          </div>
        </div>
      </motion.div>
    </Link>
  )
}
