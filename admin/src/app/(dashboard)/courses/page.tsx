import { PageHeader } from '@/components/ui/PageHeader'
import { CourseTable } from '@/components/courses/CourseTable'

export const metadata = { title: 'Courses' }

export default function CoursesPage() {
  return (
    <div>
      <PageHeader
        title="Courses"
        subtitle="Manage and publish your course catalogue"
        badge={{ label: 'CRUD', color: '#FF6B1A' }}
      />
      <CourseTable />
    </div>
  )
}
