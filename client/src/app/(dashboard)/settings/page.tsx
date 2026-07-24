'use client'

import dynamic from 'next/dynamic'

const SettingsContent = dynamic(() => import('./_settings-client'), { ssr: false })

export default function SettingsPage() {
  return <SettingsContent />
}
