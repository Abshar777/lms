'use client'

import { use, useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowLeft, BookOpen, Star, Users, Play, Sparkles, Loader2 } from 'lucide-react'
import { useCourses } from '@/lib/api/courses'
import { useCategories } from '@/lib/api/categories'
import type { Course } from '@/types/index'

const stagger  = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } }
const cardAnim = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 280, damping: 26 } } }

const CATEGORY_ICONS: Record<string, { fg: string; bg: string }> = {
  programming:    { fg: '#3B82F6', bg: 'rgba(59,130,246,0.08)' },
  design:         { fg: '#EC4899', bg: 'rgba(236,72,153,0.08)' },
  business:       { fg: '#10B981', bg: 'rgba(16,185,129,0.08)' },
  marketing:      { fg: '#F59E0B', bg: 'rgba(245,158,11,0.08)' },
  'data-science': { fg: '#8B5CF6', bg: 'rgba(139,92,246,0.08)' },
  photography:    { fg: '#EF4444', bg: 'rgba(239,68,68,0.08)' },
  music:          { fg: '#A855F7', bg: 'rgba(168,85,247,0.08)' },
  language:       { fg: '#06B6D4', bg: 'rgba(6,182,212,0.08)' },
}
const fallback = { fg: '#0057b8', bg: 'rgba(0,87,184,0.08)' }

export default function CategoryLandingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState('popular')

  const { data: categoriesData } = useCategories()
  const category = categoriesData?.find(c => c.slug === slug)
  const palette = (category && CATEGORY_ICONS[slug]) ?? fallback

  const { data, isLoading } = useCourses({
    page, per_page: 12, category: slug, sort,
  })

  const total = data?.meta.total_count ?? 0

  return (
    <div>
      {/* Back */}
      <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className="mb-4">
        <Link href="/courses" className="inline-flex items-center gap-1.5 text-sm transition-opacity hover:opacity-70"
          style={{ color: '#9CA3AF' }}>
          <ArrowLeft size={13} />Back to all courses
        </Link>
      </motion.div>

      {/* Hero ----- */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 26 }}
        className="mb-8 overflow-hidden rounded-3xl p-6 sm:p-8"
        style={{ background: palette.bg, border: `1px solid ${palette.fg}22` }}>
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl"
            style={{ background: 'white', border: `1px solid ${palette.fg}30` }}>
            <Sparkles size={22} style={{ color: palette.fg }} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: palette.fg }}>
                Category
              </span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight"
              style={{ color: '#111827', fontFamily: 'Bricolage Grotesque, sans-serif' }}>
              {category?.name ?? slug.replace(/-/g, ' ')}
            </h1>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: '#4B5563' }}>
              {category?.description ?? 'Browse curated courses in this category.'}
            </p>
            <div className="mt-3 flex items-center gap-4 text-xs" style={{ color: '#6B7280' }}>
              <span className="inline-flex items-center gap-1.5">
                <BookOpen size={12} />
                <span className="font-semibold" style={{ color: '#111827' }}>{total}</span>
                {total === 1 ? 'course' : 'courses'}
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Sort row */}
      <div className="mb-5 flex items-center justify-between gap-3">
        <p className="text-sm" style={{ color: '#6B7280' }}>
          {isLoading ? 'Loading…' : `Showing ${data?.docs.length ?? 0} of ${total}`}
        </p>
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: '#9CA3AF' }}>Sort by</span>
          <select value={sort} onChange={e => { setSort(e.target.value); setPage(1) }}
            className="rounded-xl bg-white px-3 py-1.5 text-sm font-semibold outline-none"
            style={{ border: '1px solid #E5E7EB', color: '#374151' }}>
            <option value="popular">Most popular</option>
            <option value="rating">Highest rated</option>
            <option value="newest">Newest</option>
            <option value="price_lo">Price: Low → High</option>
            <option value="price_hi">Price: High → Low</option>
          </select>
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm" style={{ color: '#9CA3AF' }}>
          <Loader2 size={14} className="animate-spin" />Loading courses…
        </div>
      ) : data && data.docs.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 py-24">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl"
            style={{ background: '#F3F4F6', border: '1px solid #E5E7EB' }}>
            <BookOpen size={24} style={{ color: '#D1D5DB' }} />
          </div>
          <p className="text-base font-bold" style={{ color: '#111827' }}>No courses yet</p>
          <p className="text-sm" style={{ color: '#9CA3AF' }}>Check back soon — new content is added regularly.</p>
          <Link href="/courses"
            className="mt-1 rounded-xl px-5 py-2 text-sm font-semibold transition-colors hover:opacity-90"
            style={{ background: 'rgba(0,87,184,0.10)', color: '#0057b8' }}>
            Browse all courses
          </Link>
        </div>
      ) : (
        <motion.div variants={stagger} initial="hidden" animate="show"
          className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {data?.docs.map(c => (
            <motion.div key={c.id} variants={cardAnim}>
              <CategoryCard course={c} accent={palette.fg} />
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Pagination */}
      {data && data.meta.total_pages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={!data.meta.has_prev}
            className="rounded-xl px-4 py-2 text-sm font-semibold bg-white transition-colors hover:bg-gray-50 disabled:opacity-40"
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
            className="rounded-xl px-4 py-2 text-sm font-semibold bg-white transition-colors hover:bg-gray-50 disabled:opacity-40"
            style={{ border: '1px solid #E5E7EB', color: '#374151' }}>
            Next
          </button>
        </div>
      )}
    </div>
  )
}

function CategoryCard({ course, accent }: { course: Course; accent: string }) {
  return (
    <Link href={`/courses/${course.slug}`}>
      <motion.div whileHover={{ y: -4, boxShadow: '0 20px 44px rgba(0,0,0,0.10)' }} whileTap={{ scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 350, damping: 28 }}
        className="group h-full overflow-hidden rounded-2xl bg-white cursor-pointer flex flex-col"
        style={{ border: '1px solid #E5E7EB', boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}>

        <div className="relative h-40 overflow-hidden">
          {course.thumbnailUrl
            ? <img src={course.thumbnailUrl} alt={course.title}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
            : <div className="flex h-full w-full items-center justify-center" style={{ background: '#F3F4F6' }}>
                <BookOpen size={32} style={{ color: '#D1D5DB' }} />
              </div>
          }
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
            style={{ background: 'rgba(17,24,39,0.35)' }}>
            <div className="flex h-11 w-11 items-center justify-center rounded-full"
              style={{ background: `${accent}EE` }}>
              <Play size={14} fill="white" color="white" />
            </div>
          </div>
          {course.isFree && (
            <span className="absolute right-3 top-3 rounded-lg px-2 py-0.5 text-[10px] font-bold"
              style={{ background: 'rgba(34,197,94,0.15)', color: '#16A34A', border: '1px solid rgba(34,197,94,0.25)' }}>
              FREE
            </span>
          )}
        </div>

        <div className="flex flex-col flex-1 p-4">
          <h3 className="line-clamp-2 text-sm font-bold leading-snug" style={{ color: '#111827' }}>
            {course.title}
          </h3>
          {course.instructor && (
            <p className="mt-1 text-xs" style={{ color: '#9CA3AF' }}>{course.instructor.name}</p>
          )}

          <div className="mt-auto pt-3 flex items-center justify-between text-xs"
            style={{ borderTop: '1px solid #F3F4F6', marginTop: 12, color: '#9CA3AF' }}>
            <div className="flex items-center gap-3">
              {course.ratingAvg > 0 && (
                <span className="flex items-center gap-1 font-semibold" style={{ color: '#F59E0B' }}>
                  <Star size={11} fill="#F59E0B" />{course.ratingAvg.toFixed(1)}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Users size={10} />{course.enrolledCount.toLocaleString()}
              </span>
            </div>
            <span className="font-bold" style={{ color: '#111827' }}>
              {course.isFree ? 'Free' : `$${course.price}`}
            </span>
          </div>
        </div>
      </motion.div>
    </Link>
  )
}
