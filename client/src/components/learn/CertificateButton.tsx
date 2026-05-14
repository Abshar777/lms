'use client'

import { useState } from 'react'
import { Award, Loader2 } from 'lucide-react'
import { api } from '@/lib/axios'

interface Props {
  enrollmentId: string
  courseTitle:  string
}

export function CertificateButton({ enrollmentId, courseTitle }: Props) {
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  const handleDownload = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get(`/certificates/${enrollmentId}`, {
        responseType: 'blob',
      })
      const url  = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      const link = document.createElement('a')
      link.href  = url
      link.download = `certificate-${courseTitle.replace(/\s+/g, '-').toLowerCase()}.pdf`
      link.click()
      URL.revokeObjectURL(url)
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message ?? 'Could not generate certificate'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <button onClick={handleDownload} disabled={loading}
        className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white transition-all disabled:opacity-60 hover:opacity-90"
        style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}>
        {loading
          ? <Loader2 size={15} className="animate-spin" />
          : <Award size={15} />}
        {loading ? 'Generating…' : 'Download certificate'}
      </button>
      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
    </div>
  )
}
