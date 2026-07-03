'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Star, Loader2, AlertCircle, MessageSquare, ThumbsUp, Flag, CornerDownRight } from 'lucide-react'
import { useCourseReviews, useSubmitReview, useVoteHelpful, useReportReview, type Review } from '@/lib/api/reviews'
import { RatingHistogram } from './RatingHistogram'

interface Props {
  courseId:    string
  slug?:       string
  canReview:   boolean
  ratingAvg:   number
  ratingCount: number
}

function reviewerName(r: Review): string {
  if (typeof r.userId === 'object' && r.userId !== null) return r.userId.name
  return 'Student'
}
function reviewerAvatar(r: Review): string | undefined {
  if (typeof r.userId === 'object' && r.userId !== null) return r.userId.avatarUrl
  return undefined
}
function instructorName(r: Review): string {
  if (typeof r.instructorId === 'object' && r.instructorId !== null) return r.instructorId.name
  return 'Instructor'
}

export function CourseReviews({ courseId, slug, canReview, ratingAvg, ratingCount }: Props) {
  const { data, isLoading } = useCourseReviews(courseId)
  const submit       = useSubmitReview(courseId)
  const voteHelpful  = useVoteHelpful(courseId)
  const reportReview = useReportReview(courseId)

  return (
    <div>
      <h2 className="mb-4 text-base font-bold" style={{ color: '#0D0F1A', fontFamily: 'Bricolage Grotesque, sans-serif' }}>
        Reviews
        {ratingCount > 0 && (
          <span className="ml-3 text-sm font-medium" style={{ color: '#9CA3AF' }}>
            {ratingAvg.toFixed(1)} · {ratingCount.toLocaleString()} {ratingCount === 1 ? 'review' : 'reviews'}
          </span>
        )}
      </h2>

      {slug && (
        <div className="mb-4">
          <RatingHistogram slug={slug} />
        </div>
      )}

      {canReview && <WriteReview onSubmit={(r, c) => submit.mutateAsync({ rating: r, comment: c })} pending={submit.isPending} />}

      {isLoading && (
        <div className="mt-6 flex items-center gap-2 text-sm" style={{ color: '#9CA3AF' }}>
          <Loader2 size={14} className="animate-spin" /> Loading reviews…
        </div>
      )}

      {!isLoading && data && data.docs.length === 0 && (
        <div className="mt-6 flex items-center gap-2 rounded-2xl px-4 py-3 text-sm"
          style={{ background: '#F4F5F8', color: '#6B7280' }}>
          <MessageSquare size={15} /> No reviews yet. Be the first to share your thoughts.
        </div>
      )}

      <div className="mt-4 space-y-3">
        {data?.docs.map(r => (
          <motion.div key={r.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl bg-white p-4" style={{ border: '1px solid #E4E7ED' }}>
            {/* Reviewer row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 overflow-hidden rounded-full" style={{ background: 'rgba(0,87,184,0.15)' }}>
                  {reviewerAvatar(r)
                    ? <img src={reviewerAvatar(r)} alt="" className="h-full w-full object-cover" />
                    : <div className="flex h-full w-full items-center justify-center text-xs font-bold" style={{ color: '#0057b8' }}>
                        {reviewerName(r)[0]}
                      </div>}
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: '#0D0F1A' }}>{reviewerName(r)}</p>
                  <p className="text-[10px]" style={{ color: '#9CA3AF' }}>
                    {new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
              </div>
              <div className="flex">
                {[1,2,3,4,5].map(s => (
                  <Star key={s} size={13} fill={s <= r.rating ? '#F59E0B' : 'none'} style={{ color: '#F59E0B' }} />
                ))}
              </div>
            </div>

            {/* Comment */}
            {r.comment && (
              <p className="mt-2 text-sm leading-relaxed" style={{ color: '#4B5563' }}>{r.comment}</p>
            )}

            {/* Helpful / Report row */}
            <div className="mt-2 flex items-center gap-4">
              <button
                onClick={() => voteHelpful.mutate(r.id)}
                disabled={voteHelpful.isPending}
                className="flex items-center gap-1 text-xs transition-colors hover:text-[#0057b8] disabled:opacity-50"
                style={{ color: '#9CA3AF' }}>
                <ThumbsUp size={11} />
                Helpful{r.helpfulVotes > 0 ? ` (${r.helpfulVotes})` : ''}
              </button>
              <button
                onClick={() => {
                  if (!confirm('Report this review as inappropriate?')) return
                  reportReview.mutate(r.id)
                }}
                disabled={reportReview.isPending}
                className="flex items-center gap-1 text-xs transition-colors hover:text-red-500 disabled:opacity-50"
                style={{ color: '#D1D5DB' }}>
                <Flag size={11} />Report
              </button>
            </div>

            {/* Instructor reply (6.2) */}
            {r.instructorReply && (
              <div className="mt-3 rounded-xl p-3" style={{ background: 'rgba(0,87,184,0.06)', border: '1px solid rgba(0,87,184,0.15)' }}>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <CornerDownRight size={12} style={{ color: '#0057b8' }} />
                  <span className="text-[11px] font-semibold" style={{ color: '#0057b8' }}>
                    {instructorName(r)} (Instructor)
                  </span>
                  {r.instructorReplyAt && (
                    <span className="text-[10px]" style={{ color: '#9CA3AF' }}>
                      · {new Date(r.instructorReplyAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  )}
                </div>
                <p className="text-xs leading-relaxed" style={{ color: '#4B5563' }}>{r.instructorReply}</p>
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  )
}

/* ─── Inline write-review form ──────────────────────── */
function WriteReview({
  onSubmit, pending,
}: {
  onSubmit: (rating: number, comment?: string) => Promise<unknown>
  pending:  boolean
}) {
  const [rating,  setRating]  = useState(5)
  const [hover,   setHover]   = useState(0)
  const [comment, setComment] = useState('')
  const [error,   setError]   = useState<string | null>(null)
  const [done,    setDone]    = useState(false)

  const handle = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      await onSubmit(rating, comment.trim() || undefined)
      setDone(true)
      setTimeout(() => setDone(false), 2400)
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message
      setError(msg ?? 'Unable to submit review. Please try again.')
    }
  }

  return (
    <form onSubmit={handle} className="rounded-2xl bg-white p-4" style={{ border: '1px solid #E4E7ED' }}>
      <p className="text-sm font-semibold mb-2" style={{ color: '#0D0F1A' }}>Share your experience</p>
      <div className="flex items-center gap-1">
        {[1,2,3,4,5].map(s => (
          <button key={s} type="button"
            onMouseEnter={() => setHover(s)} onMouseLeave={() => setHover(0)}
            onClick={() => setRating(s)}
            className="transition-transform hover:scale-110">
            <Star size={20} fill={s <= (hover || rating) ? '#F59E0B' : 'none'} style={{ color: '#F59E0B' }} />
          </button>
        ))}
        <span className="ml-2 text-xs" style={{ color: '#9CA3AF' }}>{rating}/5</span>
      </div>
      <textarea
        value={comment}
        onChange={e => setComment(e.target.value)}
        placeholder="What did you like? What could be better?"
        maxLength={2000}
        rows={3}
        className="mt-3 w-full rounded-xl px-3 py-2 text-sm outline-none transition-all resize-none"
        style={{ background: '#F4F5F8', border: '1.5px solid transparent', color: '#0D0F1A', fontFamily: 'DM Sans, sans-serif' }}
        onFocus={e => { e.currentTarget.style.border = '1.5px solid #2F6BFF'; e.currentTarget.style.background = '#FFFFFF' }}
        onBlur={e => { e.currentTarget.style.border = '1.5px solid transparent'; e.currentTarget.style.background = '#F4F5F8' }}
      />
      <AnimatePresence>
        {error && (
          <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="mt-2 flex items-center gap-1 text-xs" style={{ color: '#EF4444' }}>
            <AlertCircle size={11} />{error}
          </motion.p>
        )}
      </AnimatePresence>
      <div className="mt-3 flex items-center justify-between">
        <p className="text-[11px]" style={{ color: '#9CA3AF' }}>
          {done ? '✓ Review saved' : `${comment.length}/2000`}
        </p>
        <button type="submit" disabled={pending}
          className="rounded-xl px-4 py-1.5 text-xs font-bold text-white transition-all disabled:opacity-60"
          style={{ background: '#0057b8' }}>
          {pending ? 'Saving…' : 'Post review'}
        </button>
      </div>
    </form>
  )
}
