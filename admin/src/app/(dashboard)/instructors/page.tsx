'use client'

import { useState } from 'react'
import { UserPlus } from 'lucide-react'
import { motion } from 'framer-motion'
import { PageHeader } from '@/components/ui/PageHeader'
import { UserTable } from '@/components/users/UserTable'
import { AddInstructorModal } from '@/components/instructors/AddInstructorModal'
import { useCurrentUser } from '@/lib/api/user'

export default function InstructorsPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const { data: me } = useCurrentUser()
  const isAdmin = me?.role === 'admin'

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          title="Instructors"
          subtitle="Course authors and educators"
          badge={{ label: 'Users', color: '#A78BFA' }}
        />
        {isAdmin && (
          <motion.button
            onClick={() => setModalOpen(true)}
            whileHover={{ y: -1, boxShadow: '0 6px 20px rgba(255,107,26,0.28)' }}
            whileTap={{ scale: 0.97 }}
            className="mt-1 flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #FF6B1A, #FF8C42)' }}
          >
            <UserPlus size={15} />
            Add Instructor
          </motion.button>
        )}
      </div>

      <UserTable role="instructor" label="Instructors" />

      {isAdmin && <AddInstructorModal open={modalOpen} onClose={() => setModalOpen(false)} />}
    </div>
  )
}
