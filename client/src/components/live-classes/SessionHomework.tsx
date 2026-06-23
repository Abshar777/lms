'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, Send, CheckCircle, Clock, Award, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { useSessionHomework, useSubmitHomework, type Homework } from '@/lib/api/homework'

interface Props {
  sessionId: string
}

function statusBadge(status?: string, grade?: number) {
  if (!status) return null
  const map: Record<string, { label: string; color: string; bg: string }> = {
    submitted: { label: 'Submitted', color: '#F59E0B', bg: 'rgba(245,158,11,0.10)' },
    graded:    { label: grade !== undefined ? `Graded: ${grade}/100` : 'Graded', color: '#10B981', bg: 'rgba(16,185,129,0.10)' },
    returned:  { label: 'Returned', color: '#6366F1', bg: 'rgba(99,102,241,0.10)' },
  }
  const s = map[status] ?? { label: status, color: '#9CA3AF', bg: '#F3F4F6' }
  return (
    <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: s.bg, color: s.color }}>
      {s.label}
    </span>
  )
}

function HomeworkCard({ hw, sessionId }: { hw: Homework; sessionId: string }) {
  const [open,           setOpen]           = useState(false)
  const [submissionText, setSubmissionText] = useState('')
  const [submissionUrl,  setSubmissionUrl]  = useState('')
  const [submitted,      setSubmitted]      = useState(false)

  const submitMutation = useSubmitHomework(sessionId)

  const inputBase = 'w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-blue-100 dark:border-gray-700 dark:bg-gray-900 dark:text-white'

  const handleSubmit = async () => {
    if (!submissionText.trim() && !submissionUrl.trim()) return
    await submitMutation.mutateAsync({
      homeworkId: hw.id,
      submissionText: submissionText.trim() || undefined,
      submissionUrl:  submissionUrl.trim()  || undefined,
    })
    setSubmitted(true)
    setOpen(false)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-white dark:bg-gray-900 overflow-hidden border border-gray-200 dark:border-gray-700">
      <div
        className="flex items-start justify-between gap-3 p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50"
        onClick={() => setOpen(o => !o)}>
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="mt-0.5 rounded-lg p-1.5 flex-shrink-0" style={{ background: 'rgba(0,87,184,0.10)' }}>
            <BookOpen size={14} style={{ color: '#0057b8' }} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-900 dark:text-white">{hw.title}</p>
            {hw.dueDate && (
              <p className="mt-0.5 flex items-center gap-1 text-[11px] text-gray-400">
                <Clock size={10} />Due {new Date(hw.dueDate).toLocaleString()}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {submitted && statusBadge('submitted')}
          {open ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="p-4 space-y-3">
              {hw.description && (
                <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{hw.description}</p>
              )}
              {submitted ? (
                <div className="flex items-center gap-2 text-sm" style={{ color: '#10B981' }}>
                  <CheckCircle size={14} />Submission received!
                </div>
              ) : (
                <>
                  <textarea
                    className={inputBase}
                    rows={4}
                    placeholder="Write your answer here…"
                    value={submissionText}
                    onChange={e => setSubmissionText(e.target.value)}
                  />
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">or URL:</span>
                    <input
                      className={`${inputBase} pl-12`}
                      placeholder="https://…"
                      value={submissionUrl}
                      onChange={e => setSubmissionUrl(e.target.value)}
                    />
                  </div>
                  <button
                    disabled={(!submissionText.trim() && !submissionUrl.trim()) || submitMutation.isPending}
                    onClick={handleSubmit}
                    className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 transition-opacity hover:opacity-90"
                    style={{ background: 'linear-gradient(135deg,#0057b8,#1a73e8)' }}>
                    {submitMutation.isPending
                      ? <Loader2 size={13} className="animate-spin" />
                      : <Send size={13} />}
                    Submit
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export function SessionHomework({ sessionId }: Props) {
  const { data, isLoading } = useSessionHomework(sessionId)
  const list = Array.isArray(data) ? data : []

  if (isLoading) {
    return (
      <div className="flex h-20 items-center justify-center gap-2 text-sm text-gray-400">
        <Loader2 size={14} className="animate-spin" />Loading homework…
      </div>
    )
  }

  if (list.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 p-6 text-center">
        <BookOpen size={22} className="mx-auto mb-2 text-gray-300" />
        <p className="text-sm text-gray-400">No homework assigned for this session</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-4">
        <BookOpen size={15} style={{ color: '#0057b8' }} />
        <h3 className="text-sm font-bold text-gray-900 dark:text-white">
          Homework ({list.length})
        </h3>
      </div>
      {list.map(hw => (
        <HomeworkCard key={hw.id} hw={hw} sessionId={sessionId} />
      ))}
    </div>
  )
}
