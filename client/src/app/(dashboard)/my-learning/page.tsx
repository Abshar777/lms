'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import {
  BookOpen, Play, ChevronRight, Search,
  SlidersHorizontal, Star, Users, Clock, CheckCircle2,
  TrendingUp, ArrowRight,
} from 'lucide-react'

/* ── animation variants ─────────────────────────── */
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } }
const fadeUp  = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 280, damping: 26 } } }

/* ── mock data ───────────────────────────────────── */
const CONTINUING = [
  { id: '1', title: 'Creating Engaging Learning Journeys: UI/UX Best Practices',
    type: 'Course', progress: 80, thumb: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=400',
    lessons: 12, next: 'Mastering UI Design for Impactful Solutions' },
  { id: '2', title: 'The Art of Blending Aesthetics and Functionality in UI/UX Design',
    type: 'Course', progress: 30, thumb: 'https://images.unsplash.com/photo-1558655146-364adaf1fcc9?w=400',
    lessons: 8,  next: 'Advanced techniques commonly used in UI/UX Design' },
]

const MATERIALS = [
  { id: '1', type: 'Quiz',          title: '5 Steps Optimizing User Experience',        thumb: 'https://images.unsplash.com/photo-1551650975-87deedd944c3?w=400', tags: ['UI/UX Design','Urgent'],  progress: null, pts: 20, status: 'not_started' },
  { id: '2', type: 'Page',          title: 'Heuristics: 10 Usability Principles To Improve UI Design', thumb: 'https://images.unsplash.com/photo-1542744094-24638eff58bb?w=400', tags: ['Learning Design','Not Urgent'], progress: 40, status: 'in_progress' },
  { id: '3', type: 'Learning Path', title: 'General Knowledge & Methodology — Layout & Spacing',  thumb: 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=400', tags: ['Consistency','Not Urgent'],  progress: null, status: 'not_started' },
  { id: '4', type: 'Course',        title: 'Mastering UI Design for Impactful Solutions',          thumb: 'https://images.unsplash.com/photo-1467232004584-a241de8bcf5d?w=400', tags: ['UI/UX Design','Not Urgent'], progress: 50, status: 'in_progress' },
  { id: '5', type: 'Course',        title: 'Responsive Design Fundamentals',                       thumb: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=400', tags: ['Development','Not Urgent'],  progress: 100, status: 'completed' },
  { id: '6', type: 'Quiz',          title: 'Color Theory & Psychology in Design',                  thumb: 'https://images.unsplash.com/photo-1579547621113-e4bb2a19bdd6?w=400', tags: ['Design','Not Urgent'],       progress: 100, status: 'completed' },
]

const STATUS_TABS = ['All Status', 'Not Started', 'In Progress', 'Completed']

const TYPE_MAP: Record<string, { bg: string; color: string; dot: string }> = {
  'Course':        { bg: '#EFF6FF', color: '#2563EB', dot: '#3B82F6' },
  'Quiz':          { bg: '#FFFBEB', color: '#92400E', dot: '#F59E0B' },
  'Learning Path': { bg: '#F0FDF4', color: '#166534', dot: '#22C55E' },
  'Page':          { bg: '#FDF4FF', color: '#7E22CE', dot: '#A855F7' },
}

function TypeBadge({ type }: { type: string }) {
  const s = TYPE_MAP[type] ?? TYPE_MAP['Course']
  return (
    <span className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-semibold"
      style={{ background: s.bg, color: s.color }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.dot }} />
      {type}
    </span>
  )
}

export default function MyLearningPage() {
  const [activeTab, setActiveTab] = useState('All Status')
  const [search, setSearch] = useState('')

  const filtered = MATERIALS.filter(m => {
    const matchTab = activeTab === 'All Status'
      || (activeTab === 'Not Started' && m.status === 'not_started')
      || (activeTab === 'In Progress' && m.status === 'in_progress')
      || (activeTab === 'Completed'   && m.status === 'completed')
    const matchSearch = m.title.toLowerCase().includes(search.toLowerCase())
    return matchTab && matchSearch
  })

  return (
    <div className="space-y-8">

      {/* ── Continue Learning ───────────────────────── */}
      <motion.section variants={stagger} initial="hidden" animate="show">
        <motion.h2 variants={fadeUp} className="mb-4 text-xl font-bold"
          style={{ color: '#111827', fontFamily: 'Bricolage Grotesque, sans-serif' }}>
          Continue Learning
        </motion.h2>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {CONTINUING.map((c, i) => (
            <motion.div key={c.id} variants={fadeUp}
              whileHover={{ y: -4, boxShadow: '0 20px 48px rgba(0,0,0,0.10)' }}
              className="group overflow-hidden rounded-2xl bg-white transition-all"
              style={{ border: '1px solid #E5E7EB', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
              <div className="flex gap-4 p-4">
                {/* Thumbnail */}
                <div className="relative h-28 w-32 flex-shrink-0 overflow-hidden rounded-xl">
                  <img src={c.thumb} alt={c.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: 'rgba(17,24,39,0.4)' }}>
                    <motion.div whileHover={{ scale: 1.1 }}
                      className="flex h-10 w-10 items-center justify-center rounded-full"
                      style={{ background: 'rgba(255,107,26,0.92)', boxShadow: '0 6px 16px rgba(255,107,26,0.4)' }}>
                      <Play size={14} fill="white" color="white" />
                    </motion.div>
                  </div>
                  <span className="absolute left-2 top-2 rounded-lg px-2 py-0.5 text-[10px] font-bold text-white"
                    style={{ background: 'rgba(17,24,39,0.72)', backdropFilter: 'blur(4px)' }}>
                    {c.lessons} Materials
                  </span>
                </div>
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <TypeBadge type={c.type} />
                  <h3 className="mt-1.5 text-sm font-bold leading-snug line-clamp-2" style={{ color: '#111827' }}>
                    {c.title}
                  </h3>
                  {/* Progress */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs" style={{ color: '#9CA3AF' }}>Progress: <span className="font-bold" style={{ color: '#111827' }}>{c.progress}%</span></span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: '#F3F4F6' }}>
                      <motion.div className="h-full rounded-full" style={{ background: '#22C55E' }}
                        initial={{ width: 0 }} animate={{ width: `${c.progress}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 + i * 0.1 }} />
                    </div>
                  </div>
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                    className="mt-3 rounded-xl px-4 py-1.5 text-xs font-bold text-white"
                    style={{ background: '#111827' }}>
                    Continue
                  </motion.button>
                </div>
              </div>
              {/* AI Next recommendation */}
              <div className="flex items-center gap-2 px-4 py-2.5" style={{ borderTop: '1px solid #F3F4F6', background: '#FAFAFA' }}>
                <div className="flex h-5 w-5 items-center justify-center rounded-full flex-shrink-0"
                  style={{ background: 'rgba(99,102,241,0.12)' }}>
                  <span className="text-[9px]">✦</span>
                </div>
                <p className="text-xs" style={{ color: '#6B7280' }}>
                  Advance your learning with&nbsp;
                  <Link href="/courses" className="font-semibold" style={{ color: '#6366F1' }}>
                    {c.next} →
                  </Link>
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* ── All Materials ───────────────────────────── */}
      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold" style={{ color: '#111827', fontFamily: 'Bricolage Grotesque, sans-serif' }}>
            All Materials
            <span className="ml-2 inline-flex items-center justify-center rounded-lg px-2 py-0.5 text-sm font-bold"
              style={{ background: '#F3F4F6', color: '#374151' }}>
              {MATERIALS.length}
            </span>
          </h2>

          {/* Controls */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#9CA3AF' }} />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search..."
                className="rounded-xl py-2 pl-9 pr-4 text-sm outline-none w-40"
                style={{ background: 'white', border: '1px solid #E5E7EB', color: '#111827' }}
                onFocus={e => { e.currentTarget.style.border = '1.5px solid #FF6B1A'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(255,107,26,0.08)' }}
                onBlur={e => { e.currentTarget.style.border = '1px solid #E5E7EB'; e.currentTarget.style.boxShadow = 'none' }} />
            </div>
            <button className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold bg-white transition-colors hover:bg-gray-50"
              style={{ border: '1px solid #E5E7EB', color: '#374151' }}>
              <SlidersHorizontal size={13} />Add Filter
            </button>
          </div>
        </div>

        {/* Status tabs */}
        <div className="mb-5 flex items-center gap-1 rounded-2xl p-1 w-fit" style={{ background: '#F3F4F6' }}>
          {STATUS_TABS.map(tab => (
            <motion.button key={tab} onClick={() => setActiveTab(tab)}
              className="relative rounded-xl px-4 py-2 text-sm font-semibold transition-colors"
              style={{ color: activeTab === tab ? '#111827' : '#9CA3AF' }}>
              {activeTab === tab && (
                <motion.div layoutId="my-learning-tab"
                  className="absolute inset-0 rounded-xl bg-white"
                  style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.10)' }}
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }} />
              )}
              <span className="relative z-10">{tab}</span>
            </motion.button>
          ))}
        </div>

        {/* Grid */}
        <AnimatePresence mode="wait">
          {filtered.length === 0 ? (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-3xl"
                style={{ background: '#F3F4F6', border: '1px solid #E5E7EB' }}>
                <BookOpen size={22} style={{ color: '#D1D5DB' }} />
              </div>
              <p className="text-base font-bold" style={{ color: '#111827' }}>No materials found</p>
              <p className="text-sm" style={{ color: '#9CA3AF' }}>Try a different filter or search term</p>
            </motion.div>
          ) : (
            <motion.div key="grid"
              variants={stagger} initial="hidden" animate="show"
              className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {filtered.map(m => (
                <MaterialCard key={m.id} item={m} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </div>
  )
}

/* ── Material card ────────────────────────────────── */
function MaterialCard({ item }: { item: typeof MATERIALS[0] }) {
  const isDone = item.status === 'completed'
  const inProg = item.status === 'in_progress'

  return (
    <motion.div
      variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 280, damping: 26 } } }}
      whileHover={{ y: -4, boxShadow: '0 20px 44px rgba(0,0,0,0.10)' }}
      className="group overflow-hidden rounded-2xl bg-white cursor-pointer"
      style={{ border: '1px solid #E5E7EB', boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}>
      {/* Thumbnail */}
      <div className="relative h-40 overflow-hidden">
        <img src={item.thumb} alt={item.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
          style={{ background: 'rgba(17,24,39,0.35)' }}>
          <div className="flex h-11 w-11 items-center justify-center rounded-full"
            style={{ background: 'rgba(255,107,26,0.92)', boxShadow: '0 6px 16px rgba(255,107,26,0.4)' }}>
            <Play size={14} fill="white" color="white" />
          </div>
        </div>
        {isDone && (
          <div className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full"
            style={{ background: '#22C55E' }}>
            <CheckCircle2 size={16} color="white" />
          </div>
        )}
      </div>
      {/* Content */}
      <div className="p-4">
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <TypeBadge type={item.type} />
          {isDone && (
            <span className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-semibold"
              style={{ background: '#F0FDF4', color: '#16A34A' }}>✦ Certified</span>
          )}
        </div>
        <h3 className="line-clamp-2 text-sm font-bold leading-snug" style={{ color: '#111827' }}>{item.title}</h3>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {item.tags.map(t => (
            <span key={t} className="rounded-lg px-2.5 py-1 text-[11px] font-medium"
              style={{ background: '#F3F4F6', color: '#4B5563' }}>{t}</span>
          ))}
        </div>
        {/* Bottom row */}
        <div className="mt-3 flex items-center justify-between" style={{ borderTop: '1px solid #F3F4F6', paddingTop: 10 }}>
          {item.pts ? (
            <div>
              <p className="text-sm font-bold flex items-center gap-1" style={{ color: '#F59E0B' }}>
                ✦ {item.pts}pts
              </p>
              <p className="text-[10px]" style={{ color: '#9CA3AF' }}>Passing point {item.pts} pts</p>
            </div>
          ) : inProg ? (
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-16 overflow-hidden rounded-full" style={{ background: '#F3F4F6' }}>
                <motion.div className="h-full rounded-full" style={{ background: '#22C55E', width: `${item.progress}%` }}
                  initial={{ width: 0 }} animate={{ width: `${item.progress}%` }}
                  transition={{ duration: 0.7, ease: 'easeOut' }} />
              </div>
              <span className="text-xs font-semibold" style={{ color: '#374151' }}>{item.progress}%</span>
            </div>
          ) : isDone ? (
            <span className="text-xs font-semibold" style={{ color: '#22C55E' }}>Completed ✓</span>
          ) : (
            <span className="text-xs" style={{ color: '#9CA3AF' }}>Not Started</span>
          )}
          <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
            className="rounded-xl px-3.5 py-1.5 text-xs font-bold"
            style={inProg
              ? { background: '#111827', color: 'white' }
              : isDone
                ? { background: 'transparent', color: '#16A34A', border: '1.5px solid #BBF7D0' }
                : { background: 'transparent', color: '#111827', border: '1.5px solid #D1D5DB' }}>
            {inProg ? 'Continue' : isDone ? 'Review' : 'Start'}
          </motion.button>
        </div>
      </div>
    </motion.div>
  )
}
