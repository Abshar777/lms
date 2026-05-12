'use client'

import { use } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  ArrowLeft, Star, Users, Clock, Globe, BookOpen,
  CheckCircle2, Play, Tag, Loader2, AlertCircle, Zap,
} from 'lucide-react'
import { useCourse } from '@/lib/api/courses'

function fmt(mins: number) {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return h > 0 ? `${h}h ${m > 0 ? m + 'm' : ''}`.trim() : `${m}m`
}

const LEVEL_COLOR: Record<string, { text: string; bg: string; border: string }> = {
  beginner:     { text: '#10B981', bg: 'rgba(16,185,129,0.10)',  border: 'rgba(16,185,129,0.25)'  },
  intermediate: { text: '#F59E0B', bg: 'rgba(245,158,11,0.10)', border: 'rgba(245,158,11,0.25)'  },
  advanced:     { text: '#EF4444', bg: 'rgba(239,68,68,0.10)',  border: 'rgba(239,68,68,0.25)'   },
}

const whatYouLearn = [
  'Build real-world projects from scratch',
  'Master core concepts and best practices',
  'Understand industry-standard patterns',
  'Deploy and ship production-ready apps',
  'Get hands-on with guided exercises',
  'Access lifetime updates and new content',
]

const curriculum = [
  { section: 'Getting Started', lessons: 5,  duration: '45m' },
  { section: 'Core Concepts',   lessons: 12, duration: '2h 10m' },
  { section: 'Advanced Topics', lessons: 8,  duration: '1h 30m' },
  { section: 'Real Projects',   lessons: 6,  duration: '1h 45m' },
  { section: 'Final Capstone',  lessons: 3,  duration: '50m' },
]

export default function CourseDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const { data: course, isLoading, isError } = useCourse(slug)

  if (isLoading) {
    return (
      <div className="flex h-[70vh] flex-col items-center justify-center gap-3">
        <Loader2 size={30} className="animate-spin" style={{ color: '#FF6B1A' }} />
        <p className="text-sm" style={{ color: '#9CA3AF' }}>Loading course…</p>
      </div>
    )
  }

  if (isError || !course) {
    return (
      <div className="flex h-[70vh] flex-col items-center justify-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-3xl"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)' }}>
          <AlertCircle size={24} style={{ color: '#EF4444' }} />
        </div>
        <p className="text-base font-semibold" style={{ color: '#0D0F1A' }}>Course not found</p>
        <Link href="/courses" className="text-sm font-semibold" style={{ color: '#FF6B1A' }}>
          ← Back to courses
        </Link>
      </div>
    )
  }

  const level = course.level ? LEVEL_COLOR[course.level] : null

  return (
    <div className="mx-auto max-w-5xl">
      {/* Back */}
      <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 26 }} className="mb-6">
        <Link href="/courses" className="inline-flex items-center gap-1.5 text-sm transition-opacity hover:opacity-70"
          style={{ color: '#9CA3AF' }}>
          <ArrowLeft size={13} />Back to courses
        </Link>
      </motion.div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_340px]">
        {/* ── Left col ─────────────────────────────── */}
        <div>
          {/* Hero */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}>
            {/* Category + level */}
            <div className="mb-3 flex items-center gap-2">
              {course.category && (
                <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#FF6B1A' }}>
                  {course.category.name}
                </span>
              )}
              {course.level && level && (
                <>
                  <span style={{ color: '#E4E7ED' }}>·</span>
                  <span className="rounded-lg px-2 py-0.5 text-[10px] font-bold capitalize"
                    style={{ background: level.bg, color: level.text, border: `1px solid ${level.border}` }}>
                    {course.level}
                  </span>
                </>
              )}
            </div>

            <h1 className="text-3xl font-bold leading-tight tracking-tight"
              style={{ color: '#0D0F1A', fontFamily: 'Bricolage Grotesque, sans-serif' }}>
              {course.title}
            </h1>

            {/* Stats */}
            <div className="mt-4 flex flex-wrap items-center gap-4">
              {course.ratingAvg > 0 && (
                <div className="flex items-center gap-1.5">
                  <div className="flex">
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} size={14} fill={s <= Math.round(course.ratingAvg) ? '#F59E0B' : 'none'}
                        style={{ color: '#F59E0B' }} />
                    ))}
                  </div>
                  <span className="text-sm font-bold" style={{ color: '#F59E0B' }}>{course.ratingAvg.toFixed(1)}</span>
                  <span className="text-xs" style={{ color: '#9CA3AF' }}>({course.ratingCount.toLocaleString()} reviews)</span>
                </div>
              )}
              <div className="flex items-center gap-1.5 text-sm" style={{ color: '#6B7280' }}>
                <Users size={14} />{course.enrolledCount.toLocaleString()} students
              </div>
              {course.durationMins > 0 && (
                <div className="flex items-center gap-1.5 text-sm" style={{ color: '#6B7280' }}>
                  <Clock size={14} />{fmt(course.durationMins)} total
                </div>
              )}
              <div className="flex items-center gap-1.5 text-sm" style={{ color: '#6B7280' }}>
                <Globe size={14} />{course.language}
              </div>
            </div>

            {/* Instructor */}
            {course.instructor && (
              <div className="mt-4 flex items-center gap-2.5">
                <div className="h-8 w-8 overflow-hidden rounded-full"
                  style={{ background: 'rgba(255,107,26,0.15)' }}>
                  {course.instructor.avatarUrl
                    ? <img src={course.instructor.avatarUrl} alt="" className="h-full w-full object-cover" />
                    : <div className="flex h-full w-full items-center justify-center text-xs font-bold"
                        style={{ color: '#FF6B1A' }}>
                        {course.instructor.name[0]}
                      </div>}
                </div>
                <p className="text-sm" style={{ color: '#6B7280' }}>
                  Created by <span className="font-semibold" style={{ color: '#0D0F1A' }}>{course.instructor.name}</span>
                </p>
              </div>
            )}
          </motion.div>

          {/* Thumbnail (mobile) */}
          {course.thumbnailUrl && (
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.06 }} className="mt-6 overflow-hidden rounded-2xl lg:hidden"
              style={{ border: '1px solid #E4E7ED' }}>
              <img src={course.thumbnailUrl} alt={course.title} className="w-full object-cover" style={{ maxHeight: 240 }} />
            </motion.div>
          )}

          {/* Description */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }} className="mt-8">
            <h2 className="mb-3 text-lg font-bold" style={{ color: '#0D0F1A', fontFamily: 'Bricolage Grotesque, sans-serif' }}>
              About this course
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: '#4B5563' }}>
              {course.description ?? 'No description available.'}
            </p>
          </motion.div>

          {/* What you'll learn */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.14 }} className="mt-8 rounded-2xl p-5"
            style={{ background: '#FFFBF7', border: '1px solid rgba(255,107,26,0.14)' }}>
            <h2 className="mb-4 text-base font-bold" style={{ color: '#0D0F1A', fontFamily: 'Bricolage Grotesque, sans-serif' }}>
              What you&apos;ll learn
            </h2>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {whatYouLearn.map((item, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.18 + i * 0.04 }} className="flex items-start gap-2.5">
                  <CheckCircle2 size={15} className="mt-0.5 flex-shrink-0" style={{ color: '#10B981' }} />
                  <p className="text-sm" style={{ color: '#4B5563' }}>{item}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Curriculum */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 }} className="mt-8">
            <h2 className="mb-4 text-base font-bold" style={{ color: '#0D0F1A', fontFamily: 'Bricolage Grotesque, sans-serif' }}>
              Course curriculum
            </h2>
            <div className="space-y-2">
              {curriculum.map((s, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + i * 0.04 }}
                  className="flex items-center justify-between rounded-xl px-4 py-3 bg-white transition-colors hover:bg-gray-50"
                  style={{ border: '1px solid #E4E7ED' }}>
                  <div className="flex items-center gap-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold"
                      style={{ background: 'rgba(255,107,26,0.10)', color: '#FF6B1A' }}>{i + 1}</div>
                    <span className="text-sm font-medium" style={{ color: '#0D0F1A' }}>{s.section}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs" style={{ color: '#9CA3AF' }}>
                    <span>{s.lessons} lessons</span>
                    <span style={{ color: '#E4E7ED' }}>·</span>
                    <span>{s.duration}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Tags */}
          {course.tags && course.tags.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
              className="mt-8 flex flex-wrap items-center gap-2">
              <Tag size={13} style={{ color: '#9CA3AF' }} />
              {course.tags.map(t => (
                <span key={t} className="rounded-lg px-2.5 py-1 text-xs font-medium"
                  style={{ background: 'rgba(255,107,26,0.08)', color: '#FF6B1A', border: '1px solid rgba(255,107,26,0.16)' }}>
                  {t}
                </span>
              ))}
            </motion.div>
          )}
        </div>

        {/* ── Right col — sticky CTA card ──────────── */}
        <div className="lg:relative">
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.08, type: 'spring', stiffness: 260, damping: 26 }}
            className="lg:sticky lg:top-[76px] overflow-hidden rounded-3xl bg-white"
            style={{ border: '1px solid #E4E7ED', boxShadow: '0 8px 32px rgba(13,15,26,0.10)' }}>

            {/* Thumbnail */}
            {course.thumbnailUrl && (
              <div className="relative hidden overflow-hidden lg:block" style={{ height: 180 }}>
                <img src={course.thumbnailUrl} alt={course.title} className="h-full w-full object-cover" />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 40%, rgba(13,15,26,0.6))' }} />
                <motion.div whileHover={{ scale: 1.1 }} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex h-14 w-14 cursor-pointer items-center justify-center rounded-full"
                  style={{ background: 'rgba(255,107,26,0.92)', backdropFilter: 'blur(8px)', boxShadow: '0 8px 24px rgba(255,107,26,0.45)' }}>
                  <Play size={18} fill="white" color="white" />
                </motion.div>
                <span className="absolute bottom-3 left-3 rounded-lg px-2 py-1 text-[10px] font-semibold"
                  style={{ background: 'rgba(255,255,255,0.92)', color: '#4B5563', backdropFilter: 'blur(8px)' }}>
                  Preview available
                </span>
              </div>
            )}

            <div className="p-5">
              {/* Price */}
              <div className="mb-5 flex items-center gap-3">
                <p className="text-3xl font-bold" style={{ color: '#0D0F1A', fontFamily: 'Bricolage Grotesque, sans-serif' }}>
                  {course.isFree ? 'Free' : `$${course.price}`}
                </p>
                {!course.isFree && (
                  <span className="rounded-lg px-2 py-0.5 text-xs font-bold"
                    style={{ background: 'rgba(16,185,129,0.10)', color: '#10B981', border: '1px solid rgba(16,185,129,0.22)' }}>
                    Limited offer
                  </span>
                )}
              </div>

              {/* CTA */}
              <motion.button
                whileHover={{ y: -2, boxShadow: '0 12px 32px rgba(255,107,26,0.40)' }}
                whileTap={{ scale: 0.97 }}
                className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold text-white transition-all"
                style={{ background: 'linear-gradient(135deg, #FF6B1A, #FF8C42)', boxShadow: '0 6px 24px rgba(255,107,26,0.30)' }}>
                <Zap size={15} fill="white" />
                {course.isFree ? 'Enroll for free' : 'Enroll now'}
              </motion.button>

              <p className="mt-2.5 text-center text-[11px]" style={{ color: '#9CA3AF' }}>
                30-day money-back guarantee
              </p>

              {/* Meta list */}
              <div className="mt-5 space-y-3" style={{ borderTop: '1px solid #F0F1F5', paddingTop: 16 }}>
                {[
                  { icon: Clock,    label: 'Total duration', value: fmt(course.durationMins) },
                  { icon: BookOpen, label: 'Lectures',       value: `${curriculum.reduce((a, s) => a + s.lessons, 0)} lessons` },
                  { icon: Globe,    label: 'Language',       value: course.language },
                  { icon: Users,    label: 'Students',       value: course.enrolledCount.toLocaleString() },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2" style={{ color: '#9CA3AF' }}>
                      <Icon size={13} />{label}
                    </div>
                    <span className="font-semibold" style={{ color: '#0D0F1A' }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
