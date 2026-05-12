import { PageHeader } from '@/components/ui/PageHeader'
import { CourseTable } from '@/components/courses/CourseTable'
import Link from 'next/link'

export const metadata = { title: 'Courses' }

export default function CoursesPage() {
  return (
    <div>
      <PageHeader
        title="Courses"
        subtitle="Manage and publish your course catalogue"
        badge={{ label: 'CRUD', color: '#FF6B1A' }}
        actions={
          <Link href="/courses/new">
            <button
              className="flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #FF6B1A, #FF8C42)', boxShadow: '0 4px 16px rgba(255,107,26,0.30)' }}>
              + New Course
            </button>
          </Link>
        }
      />
      <CourseTable />
    </div>
  )
}
