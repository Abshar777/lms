import { PageHeader } from '@/components/ui/PageHeader'
import { UserTable } from '@/components/users/UserTable'

export const metadata = { title: 'Students' }

export default function StudentsPage() {
  return (
    <div>
      <PageHeader
        title="Students"
        subtitle="Everyone enrolled on the platform"
        badge={{ label: 'Users', color: '#2F6BFF' }}
      />
      <UserTable role="student" label="Students" />
    </div>
  )
}
