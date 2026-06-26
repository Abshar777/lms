'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowLeft, Sparkles } from 'lucide-react'
import { CourseForm } from '@/components/courses/CourseForm'

export default function NewCoursePage() {
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
            style={{ background: 'rgba(0,87,184,0.15)', border: '1px solid rgba(0,87,184,0.25)' }}>
            <Sparkles size={18} style={{ color: '#0057b8' }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Bricolage Grotesque, sans-serif' }}>
              Create new course
            </h1>
            <p className="mt-0.5 text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Fill in the details to publish your course
            </p>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.06, type: 'spring', stiffness: 260, damping: 26 }}>
        <CourseForm />
      </motion.div>
    </div>
  )
}
