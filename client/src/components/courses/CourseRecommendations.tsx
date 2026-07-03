'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { Star, Users, Clock, Sparkles } from 'lucide-react'
import { useCourseRecommendations } from '@/lib/api/recommendations'
import type { Course } from '@/types/index'

function fmt(mins: number) {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return h > 0 ? `${h}h${m > 0 ? ` ${m}m` : ''}` : `${m}m`
}

function RecommendationCard({ course, i }: { course: Course; i: number }) {
  const levelColors: Record<string, string> = {
    beginner:     '#10B981',
    intermediate: '#F59E0B',
    advanced:     '#EF4444',
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.06, type: 'spring', stiffness: 280, damping: 26 }}>
      <Link href={`/courses/${course.slug}`} className="group block">
        <div className="rounded-2xl overflow-hidden bg-white transition-all duration-200
          group-hover:shadow-md group-hover:-translate-y-0.5"
          style={{ border: '1px solid #E4E7ED' }}>

          {/* Thumbnail */}
          <div className="relative aspect-video overflow-hidden bg-gray-100">
            {course.thumbnailUrl
              ? <img src={course.thumbnailUrl} alt={course.title}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
              : <div className="h-full w-full flex items-center justify-center"
                  style={{ background: '#FFF7ED' }}>
                  <Sparkles size={24} style={{ color: '#0057b8', opacity: 0.4 }} />
                </div>
            }
            {/* Free badge */}
            {course.isFree && (
              <span className="absolute top-2 left-2 rounded-lg px-2 py-0.5 text-[10px] font-bold text-white"
                style={{ background: '#10B981' }}>
                FREE
              </span>
            )}
          </div>

          {/* Info */}
          <div className="p-3.5">
            <p className="text-sm font-semibold line-clamp-2 leading-snug mb-1.5" style={{ color: '#0D0F1A' }}>
              {course.title}
            </p>

            {course.instructor && (
              <p className="text-[11px] mb-2 truncate" style={{ color: '#9CA3AF' }}>
                {course.instructor.name}
              </p>
            )}

            <div className="flex items-center gap-2.5 flex-wrap">
              {/* Rating */}
              {course.ratingCount > 0 && (
                <div className="flex items-center gap-1">
                  <Star size={11} fill="#F59E0B" style={{ color: '#F59E0B' }} />
                  <span className="text-[11px] font-semibold" style={{ color: '#111827' }}>
                    {course.ratingAvg.toFixed(1)}
                  </span>
                </div>
              )}
              {/* Duration */}
              {course.durationMins > 0 && (
                <div className="flex items-center gap-1" style={{ color: '#9CA3AF' }}>
                  <Clock size={11} />
                  <span className="text-[11px]">{fmt(course.durationMins)}</span>
                </div>
              )}
              {/* Enrolled */}
              <div className="flex items-center gap-1" style={{ color: '#9CA3AF' }}>
                <Users size={11} />
                <span className="text-[11px]">{course.enrolledCount.toLocaleString()}</span>
              </div>
            </div>

            {/* Level + price row */}
            <div className="mt-2.5 flex items-center justify-between">
              {course.level && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                  style={{
                    color: levelColors[course.level] ?? '#9CA3AF',
                    background: `${levelColors[course.level] ?? '#9CA3AF'}18`,
                  }}>
                  {course.level}
                </span>
              )}
              <span className="ml-auto text-sm font-bold" style={{ color: course.isFree ? '#10B981' : '#0D0F1A' }}>
                {course.isFree ? 'Free' : `$${course.price.toFixed(2)}`}
              </span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}

export function CourseRecommendations({ slug }: { slug: string }) {
  const { data: courses, isLoading } = useCourseRecommendations(slug)

  if (isLoading || !courses || courses.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.4 }}
      className="mt-12">
      <div className="mb-4 flex items-center gap-2">
        <Sparkles size={16} style={{ color: '#0057b8' }} />
        <h2 className="text-base font-bold" style={{ color: '#0D0F1A', fontFamily: 'Bricolage Grotesque, sans-serif' }}>
          You might also like
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {courses.slice(0, 4).map((course, i) => (
          <RecommendationCard key={course.id} course={course} i={i} />
        ))}
      </div>
    </motion.div>
  )
}
