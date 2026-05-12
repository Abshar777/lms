'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { Heart, BookOpen, Star, Users, Play, Search, Trash2 } from 'lucide-react'
import { useFeaturedCourses } from '@/lib/api/courses'

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } }
const cardAnim = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 280, damping: 26 } } }

function TypeBadge({ type }: { type: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-semibold"
      style={{ background: '#EFF6FF', color: '#2563EB' }}>
      <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
      {type}
    </span>
  )
}

export default function FavoritesPage() {
  const { data: courses, isLoading } = useFeaturedCourses()
  const [search, setSearch] = useState('')
  const [removed, setRemoved] = useState<Set<string>>(new Set())

  const visible = (courses ?? []).filter(c =>
    !removed.has(c.id) && c.title.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 26 }}
        className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Heart size={16} fill="#FF6B1A" style={{ color: '#FF6B1A' }} />
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#FF6B1A' }}>Saved</span>
          </div>
          <h1 className="text-2xl font-bold" style={{ color: '#111827', fontFamily: 'Bricolage Grotesque, sans-serif' }}>
            Favorites
            <span className="ml-2 inline-flex items-center justify-center rounded-lg px-2 py-0.5 text-sm font-bold"
              style={{ background: '#FFF7ED', color: '#FF6B1A', border: '1px solid rgba(255,107,26,0.2)' }}>
              {visible.length}
            </span>
          </h1>
          <p className="mt-1 text-sm" style={{ color: '#9CA3AF' }}>Courses you&apos;ve saved to revisit later.</p>
        </div>
        {/* Search */}
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#9CA3AF' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search favorites..."
            className="rounded-xl py-2 pl-9 pr-4 text-sm outline-none w-52"
            style={{ background: 'white', border: '1px solid #E5E7EB', color: '#111827' }}
            onFocus={e => { e.currentTarget.style.border = '1.5px solid #FF6B1A'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(255,107,26,0.08)' }}
            onBlur={e => { e.currentTarget.style.border = '1px solid #E5E7EB'; e.currentTarget.style.boxShadow = 'none' }} />
        </div>
      </motion.div>

      {/* Grid */}
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div key="sk" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="overflow-hidden rounded-2xl bg-white" style={{ border: '1px solid #E5E7EB' }}>
                <div className="h-40 animate-pulse" style={{ background: '#F3F4F6' }} />
                <div className="space-y-2 p-4">
                  <div className="h-4 w-3/4 rounded animate-pulse" style={{ background: '#F3F4F6' }} />
                  <div className="h-3 w-1/2 rounded animate-pulse" style={{ background: '#F9FAFB' }} />
                </div>
              </div>
            ))}
          </motion.div>
        ) : visible.length === 0 ? (
          <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl"
              style={{ background: '#FFF7ED', border: '1px solid rgba(255,107,26,0.18)' }}>
              <Heart size={24} style={{ color: '#FF6B1A' }} />
            </div>
            <p className="text-base font-bold" style={{ color: '#111827' }}>No favorites yet</p>
            <p className="text-sm" style={{ color: '#9CA3AF' }}>Browse courses and save ones you like</p>
            <Link href="/courses">
              <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}
                className="mt-1 rounded-xl px-5 py-2.5 text-sm font-bold text-white"
                style={{ background: 'linear-gradient(135deg,#FF6B1A,#FF8C42)', boxShadow: '0 4px 16px rgba(255,107,26,0.3)' }}>
                Browse Courses
              </motion.button>
            </Link>
          </motion.div>
        ) : (
          <motion.div key="grid" variants={stagger} initial="hidden" animate="show"
            className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {visible.map(course => (
              <motion.div key={course.id} variants={cardAnim} layout exit={{ opacity: 0, scale: 0.9 }}>
                <FavoriteCard course={course} onRemove={() => setRemoved(p => new Set([...p, course.id]))} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function FavoriteCard({ course, onRemove }: {
  course: import('@/types/index').Course,
  onRemove: () => void
}) {
  return (
    <Link href={`/courses/${course.slug}`}>
      <motion.div
        whileHover={{ y: -4, boxShadow: '0 20px 44px rgba(0,0,0,0.10)' }}
        whileTap={{ scale: 0.98 }}
        className="group relative overflow-hidden rounded-2xl bg-white cursor-pointer"
        style={{ border: '1px solid #E5E7EB', boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}>
        {/* Remove btn */}
        <motion.button
          whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
          onClick={e => { e.preventDefault(); e.stopPropagation(); onRemove() }}
          className="absolute right-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-xl bg-white opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.12)', color: '#EF4444' }}>
          <Trash2 size={13} />
        </motion.button>
        {/* Heart badge */}
        <div className="absolute left-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-xl"
          style={{ background: 'rgba(255,107,26,0.12)' }}>
          <Heart size={13} fill="#FF6B1A" style={{ color: '#FF6B1A' }} />
        </div>
        {/* Thumbnail */}
        <div className="relative h-40 overflow-hidden">
          {course.thumbnailUrl
            ? <img src={course.thumbnailUrl} alt={course.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
            : <div className="flex h-full w-full items-center justify-center" style={{ background: '#F3F4F6' }}>
                <BookOpen size={28} style={{ color: '#D1D5DB' }} />
              </div>
          }
          {course.isFree && (
            <span className="absolute right-3 bottom-3 rounded-lg px-2 py-0.5 text-[10px] font-bold"
              style={{ background: 'rgba(34,197,94,0.15)', color: '#16A34A', border: '1px solid rgba(34,197,94,0.25)' }}>
              FREE
            </span>
          )}
        </div>
        {/* Content */}
        <div className="p-4">
          {course.category && (
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#FF6B1A' }}>
              {course.category.name}
            </p>
          )}
          <TypeBadge type="Course" />
          <p className="mt-2 line-clamp-2 text-sm font-bold leading-snug" style={{ color: '#111827' }}>{course.title}</p>
          <p className="mt-1 text-xs" style={{ color: '#9CA3AF' }}>{course.instructor?.name}</p>
          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {course.ratingAvg > 0 && (
                <span className="flex items-center gap-1 text-xs font-bold" style={{ color: '#F59E0B' }}>
                  <Star size={11} fill="#F59E0B" />{course.ratingAvg.toFixed(1)}
                </span>
              )}
              <span className="flex items-center gap-1 text-[11px]" style={{ color: '#9CA3AF' }}>
                <Users size={10} />{course.enrolledCount.toLocaleString()}
              </span>
            </div>
            <p className="text-sm font-bold" style={{ color: course.isFree ? '#16A34A' : '#111827' }}>
              {course.isFree ? 'Free' : `$${course.price}`}
            </p>
          </div>
        </div>
      </motion.div>
    </Link>
  )
}
