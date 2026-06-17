'use client'

import { useState } from 'react'
import { MessageSquare, ChevronDown, ChevronRight, ThumbsUp, CheckCircle2, Trash2, Loader2, Send, PlusCircle } from 'lucide-react'
import {
  useThreads, useCreateThread, useUpvoteThread, useResolveThread, useDeleteThread,
  useComments, useCreateComment, useUpvoteComment, useDeleteComment,
  type DiscussionThread, type DiscussionComment, type DiscussionAuthor,
} from '@/lib/api/discussion'
import { useCurrentUser } from '@/lib/api/user'
import { Button } from '@/components/ui/button'

function authorInfo(a: DiscussionAuthor | string): { id?: string; name: string; avatarUrl?: string; role: string } {
  if (typeof a === 'string') return { id: a, name: 'User', avatarUrl: undefined, role: 'student' }
  return a
}

function Avatar({ author }: { author: DiscussionAuthor | string }) {
  const { name, avatarUrl } = authorInfo(author)
  return avatarUrl
    ? <img src={avatarUrl} alt={name} className="h-6 w-6 rounded-full object-cover flex-shrink-0" />
    : (
      <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
        style={{ background: '#FF6B1A' }}>
        {name.charAt(0).toUpperCase()}
      </div>
    )
}

function TimeAgo({ date }: { date: string }) {
  const diff = (Date.now() - new Date(date).getTime()) / 1000
  const label = diff < 60 ? 'just now'
    : diff < 3600 ? `${Math.floor(diff / 60)}m ago`
    : diff < 86400 ? `${Math.floor(diff / 3600)}h ago`
    : `${Math.floor(diff / 86400)}d ago`
  return <span className="text-[10px]" style={{ color: '#9CA3AF' }}>{label}</span>
}

/* ─── Comment list for a thread ─────────────────────────── */
function CommentList({ thread, lessonId }: { thread: DiscussionThread; lessonId: string }) {
  const { data: comments, isLoading } = useComments(thread.id)
  const { data: me } = useCurrentUser()
  const createComment  = useCreateComment(thread.id, lessonId)
  const upvoteComment  = useUpvoteComment(thread.id)
  const deleteComment  = useDeleteComment(thread.id, lessonId)
  const [body, setBody] = useState('')

  const submit = async () => {
    if (!body.trim()) return
    await createComment.mutateAsync({ body: body.trim() })
    setBody('')
  }

  return (
    <div className="border-t pt-3 mt-3" style={{ borderColor: '#F0F1F5' }}>
      {isLoading && <div className="flex justify-center py-3"><Loader2 size={14} className="animate-spin" style={{ color: '#9CA3AF' }} /></div>}
      <div className="space-y-3">
        {comments?.map(c => {
          const auth = authorInfo(c.authorId)
          const isOwn = me?.id === (typeof c.authorId === 'string' ? c.authorId : auth.id ?? '')
          return (
            <div key={c.id} className="flex gap-2">
              <Avatar author={c.authorId} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-semibold" style={{ color: '#374151' }}>{auth.name}</span>
                  {auth.role === 'instructor' && (
                    <span className="rounded-full px-1.5 py-0.5 text-[9px] font-bold"
                      style={{ background: 'rgba(255,107,26,0.12)', color: '#FF6B1A' }}>
                      Instructor
                    </span>
                  )}
                  {c.isInstructorAnswer && (
                    <span className="flex items-center gap-0.5 text-[9px] font-bold"
                      style={{ color: '#22C55E' }}>
                      <CheckCircle2 size={10} /> Accepted
                    </span>
                  )}
                  <TimeAgo date={c.createdAt} />
                </div>
                <p className="mt-0.5 text-xs leading-relaxed whitespace-pre-wrap" style={{ color: '#4B5563' }}>{c.body}</p>
                <div className="mt-1 flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => upvoteComment.mutate(c.id)}
                    className="flex items-center gap-1 text-[10px] transition-colors hover:text-orange-500 h-auto p-0"
                    style={{ color: '#9CA3AF' }}
                  >
                    <ThumbsUp size={10} />{c.upvoteCount > 0 ? c.upvoteCount : ''}
                  </Button>
                  {isOwn && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteComment.mutate(c.id)}
                      className="flex items-center gap-1 text-[10px] transition-colors hover:text-red-500 h-auto p-0"
                      style={{ color: '#D1D5DB' }}
                    >
                      <Trash2 size={10} />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Reply input */}
      <div className="mt-3 flex gap-2">
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder="Write a reply…"
          rows={2}
          className="flex-1 resize-none rounded-xl px-3 py-2 text-xs outline-none"
          style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', color: '#0D0F1A' }}
        />
        <Button
          variant="default"
          size="icon"
          onClick={submit}
          disabled={!body.trim() || createComment.isPending}
          className="h-8 w-8 rounded-xl disabled:opacity-40"
        >
          {createComment.isPending
            ? <Loader2 size={12} className="animate-spin text-white" />
            : <Send size={12} className="text-white" />}
        </Button>
      </div>
    </div>
  )
}

/* ─── Single thread card ─────────────────────────── */
function ThreadCard({ thread, lessonId }: { thread: DiscussionThread; lessonId: string }) {
  const [expanded, setExpanded] = useState(false)
  const { data: me } = useCurrentUser()
  const upvote  = useUpvoteThread(lessonId)
  const resolve = useResolveThread(lessonId)
  const del     = useDeleteThread(lessonId)
  const auth = authorInfo(thread.authorId)
  const isOwn = me?.id === (typeof thread.authorId === 'string' ? thread.authorId : auth.id ?? '')

  return (
    <div className="rounded-xl p-3" style={{ background: '#F9FAFB', border: '1px solid #F0F1F5' }}>
      <div className="flex items-start gap-2">
        <Avatar author={thread.authorId} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-semibold" style={{ color: '#374151' }}>{auth.name}</span>
            {thread.isPinned && <span className="text-[9px] font-bold" style={{ color: '#FF6B1A' }}>📌 Pinned</span>}
            {thread.isResolved && <span className="text-[9px] font-bold" style={{ color: '#22C55E' }}>✓ Resolved</span>}
            <TimeAgo date={thread.createdAt} />
          </div>
          {thread.title && (
            <p className="mt-0.5 text-xs font-semibold" style={{ color: '#0D0F1A' }}>{thread.title}</p>
          )}
          <p className="mt-0.5 text-xs leading-relaxed line-clamp-3" style={{ color: '#4B5563' }}>{thread.body}</p>
          <div className="mt-2 flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => upvote.mutate(thread.id)}
              className="flex items-center gap-1 text-[10px] transition-colors hover:text-orange-500 h-auto p-0"
              style={{ color: '#9CA3AF' }}
            >
              <ThumbsUp size={10} />{thread.upvoteCount > 0 ? thread.upvoteCount : ''}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(e => !e)}
              className="flex items-center gap-1 text-[10px] transition-colors hover:text-orange-500 h-auto p-0"
              style={{ color: '#9CA3AF' }}
            >
              <MessageSquare size={10} />{thread.commentCount} {expanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
            </Button>
            {(isOwn || me?.role === 'admin') && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => resolve.mutate({ threadId: thread.id, isResolved: !thread.isResolved })}
                  className="text-[10px] transition-colors hover:text-green-600 h-auto p-0"
                  style={{ color: '#9CA3AF' }}
                >
                  {thread.isResolved ? 'Reopen' : 'Mark resolved'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => del.mutate(thread.id)}
                  className="text-[10px] transition-colors hover:text-red-500 h-auto p-0"
                  style={{ color: '#D1D5DB' }}
                >
                  Delete
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
      {expanded && <CommentList thread={thread} lessonId={lessonId} />}
    </div>
  )
}

/* ─── Main panel ─────────────────────────────────── */
export function DiscussionPanel({ lessonId }: { lessonId: string }) {
  const { data: threads, isLoading } = useThreads(lessonId)
  const createThread = useCreateThread(lessonId)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', body: '' })

  const submit = async () => {
    if (!form.body.trim()) return
    await createThread.mutateAsync({ title: form.title.trim() || undefined, body: form.body.trim() })
    setForm({ title: '', body: '' })
    setShowForm(false)
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: '#9CA3AF' }}>
          Questions & Answers
        </p>
        <Button
          variant="default"
          size="sm"
          onClick={() => setShowForm(f => !f)}
          className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold"
        >
          <PlusCircle size={11} /> Ask
        </Button>
      </div>

      {showForm && (
        <div className="rounded-xl p-3 space-y-2" style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
          <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder="Title (optional)"
            className="w-full rounded-lg px-3 py-1.5 text-xs outline-none"
            style={{ background: 'white', border: '1px solid #E5E7EB', color: '#0D0F1A' }} />
          <textarea value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
            placeholder="Describe your question…"
            rows={3}
            className="w-full resize-none rounded-lg px-3 py-1.5 text-xs outline-none"
            style={{ background: 'white', border: '1px solid #E5E7EB', color: '#0D0F1A' }} />
          <div className="flex gap-2 justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowForm(false)}
              className="text-xs h-auto py-1"
              style={{ color: '#9CA3AF' }}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={submit}
              disabled={!form.body.trim() || createThread.isPending}
              className="rounded-lg px-3 py-1.5 text-xs font-bold disabled:opacity-50"
            >
              {createThread.isPending ? 'Posting…' : 'Post'}
            </Button>
          </div>
        </div>
      )}

      {isLoading
        ? <div className="flex justify-center py-8"><Loader2 size={18} className="animate-spin" style={{ color: '#D1D5DB' }} /></div>
        : threads?.length === 0
          ? (
            <div className="py-8 text-center">
              <MessageSquare size={24} className="mx-auto mb-2" style={{ color: '#E5E7EB' }} />
              <p className="text-xs" style={{ color: '#9CA3AF' }}>No questions yet. Ask the first one!</p>
            </div>
          )
          : <div className="space-y-2">{threads?.map(t => <ThreadCard key={t.id} thread={t} lessonId={lessonId} />)}</div>
      }
    </div>
  )
}
