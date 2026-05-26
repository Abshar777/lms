'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Star, CheckCircle, Loader2, MessageSquare } from 'lucide-react'
import { useSessionFeedback, useSubmitFeedback } from '@/lib/api/feedback'

interface Props {
  sessionId:   string
  sessionTitle: string
}

export function SessionFeedback({ sessionId, sessionTitle }: Props) {
  const { data: existing, isLoading } = useSessionFeedback(sessionId)
  const mutation = useSubmitFeedback(sessionId)

  const [hovered,  setHovered]  = useState(0)
  const [selected, setSelected] = useState(0)
  const [comment,  setComment]  = useState('')
  const [done,     setDone]     = useState(false)

  if (isLoading) return null

  /* Already submitted */
  if (existing || done) {
    const rating = existing?.rating ?? selected
    return (
      <div className="rounded-2xl p-4" style={{ background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.18)' }}>
        <div className="flex items-center gap-2">
          <CheckCircle size={14} style={{ color: '#10B981' }} />
          <p className="text-sm font-semibold" style={{ color: '#10B981' }}>
            Feedback submitted — {rating} star{rating !== 1 ? 's' : ''}
          </p>
        </div>
        {existing?.comment && (
          <p className="mt-1.5 text-xs" style={{ color: '#6B7280' }}>{existing.comment}</p>
        )}
      </div>
    )
  }

  const active = hovered || selected

  return (
    <div className="rounded-2xl p-4" style={{ border: '1px solid #E4E7ED', background: '#fff' }}>
      <div className="flex items-center gap-2 mb-3">
        <MessageSquare size={14} style={{ color: '#FF6B1A' }} />
        <p className="text-sm font-bold" style={{ color: '#0D0F1A' }}>Rate this session</p>
      </div>

      {/* Stars */}
      <div className="flex items-center gap-1 mb-3">
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            type="button"
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            onClick={() => setSelected(star)}
            className="transition-transform hover:scale-110"
          >
            <Star
              size={24}
              fill={star <= active ? '#F59E0B' : 'none'}
              style={{ color: star <= active ? '#F59E0B' : '#D1D5DB' }}
            />
          </button>
        ))}
        {selected > 0 && (
          <span className="ml-2 text-xs font-semibold" style={{ color: '#F59E0B' }}>
            {['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'][selected]}
          </span>
        )}
      </div>

      <AnimatePresence>
        {selected > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <textarea
              className="w-full rounded-xl border border-[#E4E7ED] px-3 py-2 text-sm outline-none focus:border-[#FF6B1A] mb-3 resize-none"
              rows={2}
              placeholder="Share your thoughts (optional)"
              style={{ color: '#374151' }}
              value={comment}
              onChange={e => setComment(e.target.value)}
            />
            <button
              onClick={async () => {
                await mutation.mutateAsync({ rating: selected, comment: comment || undefined })
                setDone(true)
              }}
              disabled={mutation.isPending}
              className="flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg,#FF6B1A,#FF8C42)' }}
            >
              {mutation.isPending
                ? <><Loader2 size={12} className="animate-spin" /><span>Submitting…</span></>
                : <><CheckCircle size={12} /><span>Submit feedback</span></>}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
