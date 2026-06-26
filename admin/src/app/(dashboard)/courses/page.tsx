import { PageHeader } from '@/components/ui/PageHeader'
import { CourseTable } from '@/components/courses/CourseTable'

export const metadata = { title: 'Courses' }

export default function CoursesPage() {
  return (
    <div>
      <PageHeader
        title="Courses"
        subtitle="Manage and publish your course catalogue"
        badge={{ label: 'CRUD', color: '#0057b8' }}
      />
      <CourseTable />
    </div>
  )
}
