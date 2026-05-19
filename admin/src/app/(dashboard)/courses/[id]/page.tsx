'use client'

import { use } from 'react'
import { CourseDetail } from '@/components/courses/CourseDetail'

export default function CourseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <CourseDetail id={id} />
}
