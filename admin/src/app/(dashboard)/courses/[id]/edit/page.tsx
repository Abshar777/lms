'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowLeft, Edit2, Loader2, AlertCircle } from 'lucide-react'
import { use } from 'react'
import { useCourse } from '@/lib/api/courses'
import { CourseForm } from '@/components/courses/CourseForm'
import { LiveClassesSection } from '@/components/courses/LiveClassesSection'
import { CourseOutlineEditor } from '@/components/courses/CourseOutlineEditor'

export default function EditCoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data: course, isLoading, isError } = useCourse(id)

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={28} className="animate-spin" style={{ color: '#FF6B1A' }} />
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Loading course…</p>
        </div>
      </div>
    )
  }

  if (isError || !course) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl"
            style={{ background: 'rgba(239,68,68,0.12)' }}>
            <AlertCircle size={22} style={{ color: '#EF4444' }} />
          </div>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>Course not found</p>
          <Link href="/courses" className="text-sm font-semibold" style={{ color: '#FF6B1A' }}>
            Back to courses
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 26 }}
        className="mb-7">
        <Link href="/courses" className="mb-4 inline-flex items-center gap-1.5 text-sm transition-opacity hover:opacity-70"
          style={{ color: 'rgba(255,255,255,0.4)' }}>
          <ArrowLeft size={13} />Back to courses
        </Link>

        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl"
            style={{ background: 'rgba(255,107,26,0.15)', border: '1px solid rgba(255,107,26,0.25)' }}>
            <Edit2 size={17} style={{ color: '#FF6B1A' }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Bricolage Grotesque, sans-serif' }}>
              Edit course
            </h1>
            <p className="mt-0.5 max-w-md truncate text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
              {course.title}
            </p>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.06, type: 'spring', stiffness: 260, damping: 26 }}>
        <CourseForm course={course} />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.10, type: 'spring', stiffness: 260, damping: 26 }}>
        <CourseOutlineEditor courseId={course.id} />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.14, type: 'spring', stiffness: 260, damping: 26 }}>
        <LiveClassesSection courseId={course.id} />
      </motion.div>
    </div>
  )
}
