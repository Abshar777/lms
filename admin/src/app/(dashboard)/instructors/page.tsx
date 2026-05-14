import { PageHeader } from '@/components/ui/PageHeader'
import { UserTable } from '@/components/users/UserTable'

export const metadata = { title: 'Instructors' }

export default function InstructorsPage() {
  return (
    <div>
      <PageHeader
        title="Instructors"
        subtitle="Course authors and educators"
        badge={{ label: 'Users', color: '#A78BFA' }}
      />
      <UserTable role="instructor" label="Instructors" />
    </div>
  )
}
