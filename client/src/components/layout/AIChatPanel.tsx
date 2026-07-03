'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Send, Sparkles, Bot, User, Loader2, RotateCcw } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useAIChat, type ChatMessage } from '@/lib/api/ai'

/* ─── Context extraction from URL ───────────────────── */
function useAIContext(): { lessonId?: string; courseSlug?: string } {
  const pathname = usePathname()
  // /learn/[slug]/[lessonId]
  const learnMatch = pathname.match(/^\/learn\/([^/]+)\/([^/]+)/)
  if (learnMatch) {
    return { courseSlug: learnMatch[1], lessonId: learnMatch[2] }
  }
  // /courses/[slug]
  const courseMatch = pathname.match(/^\/courses\/([^/]+)/)
  if (courseMatch) {
    return { courseSlug: courseMatch[1] }
  }
  return {}
}

/* ─── Message bubble ─────────────────────────────────── */
function Bubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div className={`flex-shrink-0 flex h-7 w-7 items-center justify-center rounded-full text-white
        ${isUser ? '' : ''}`}
        style={{ background: isUser ? '#0057b8' : '#6B7280' }}>
        {isUser ? <User size={12} /> : <Bot size={12} />}
      </div>

      {/* Text */}
      <div
        className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed whitespace-pre-wrap
          ${isUser
            ? 'rounded-tr-sm text-white'
            : 'rounded-tl-sm'}`}
        style={isUser
          ? { background: '#0057b8' }
          : { background: '#F3F4F6', color: '#374151' }}>
        {msg.content}
      </div>
    </div>
  )
}

/* ─── Panel ──────────────────────────────────────────── */
interface AIChatPanelProps {
  open:    boolean
  onClose: () => void
}

export function AIChatPanel({ open, onClose }: AIChatPanelProps) {
  const [history, setHistory] = useState<ChatMessage[]>([])
  const [input,   setInput]   = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLTextAreaElement>(null)
  const { lessonId, courseSlug } = useAIContext()

  const chat = useAIChat()

  /* Context label shown in header */
  const contextLabel = lessonId
    ? 'Lesson context'
    : courseSlug
      ? 'Course context'
      : 'General'

  /* Scroll to bottom when new messages arrive */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [history, chat.isPending])

  /* Focus input when panel opens */
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [open])

  const send = useCallback(async () => {
    const msg = input.trim()
    if (!msg || chat.isPending) return
    setInput('')

    const userMsg: ChatMessage = { role: 'user', content: msg }
    setHistory(prev => [...prev, userMsg])

    chat.mutate(
      { message: msg, history, lessonId, courseSlug },
      {
        onSuccess: reply => {
          setHistory(prev => [...prev, { role: 'assistant', content: reply }])
        },
        onError: err => {
          const errMsg = err instanceof Error ? err.message : 'Something went wrong. Please try again.'
          setHistory(prev => [...prev, { role: 'assistant', content: `⚠️ ${errMsg}` }])
        },
      },
    )
  }, [input, chat, history, lessonId, courseSlug])

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void send()
    }
  }

  const clearHistory = () => setHistory([])

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop (mobile) */}
          <motion.div
            key="ai-backdrop"
            className="fixed inset-0 z-40 sm:hidden"
            style={{ background: 'rgba(0,0,0,0.3)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            key="ai-panel"
            className="fixed right-0 top-0 bottom-0 z-50 flex flex-col bg-white w-full sm:w-[380px]"
            style={{ borderLeft: '1px solid #E5E7EB', boxShadow: '-8px 0 32px rgba(0,0,0,0.10)' }}
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}>

            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3.5 flex-shrink-0"
              style={{ borderBottom: '1px solid #F3F4F6' }}>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl"
                style={{ background: '#0057b8' }}>
                <Sparkles size={14} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold" style={{ color: '#111827' }}>Ask AI</p>
                <p className="text-[10px]" style={{ color: '#9CA3AF' }}>{contextLabel}</p>
              </div>
              {history.length > 0 && (
                <button
                  onClick={clearHistory}
                  title="Clear chat"
                  className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-gray-100"
                  style={{ color: '#9CA3AF' }}>
                  <RotateCcw size={13} />
                </button>
              )}
              <button
                onClick={onClose}
                className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-gray-100"
                style={{ color: '#6B7280' }}>
                <X size={15} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
              {history.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center py-8">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl mb-3"
                    style={{ background: '#FFF7ED' }}>
                    <Sparkles size={22} style={{ color: '#0057b8' }} />
                  </div>
                  <p className="text-sm font-semibold mb-1" style={{ color: '#111827' }}>
                    Hi, I&apos;m your AI tutor
                  </p>
                  <p className="text-xs leading-relaxed max-w-[220px]" style={{ color: '#9CA3AF' }}>
                    Ask me anything about this {lessonId ? 'lesson' : courseSlug ? 'course' : 'topic'}.
                    I&apos;ll help you understand concepts, work through problems, and review material.
                  </p>
                  <div className="mt-4 flex flex-col gap-2 w-full">
                    {[
                      lessonId ? 'Summarise this lesson for me' : 'What will I learn in this course?',
                      'Can you give me a quick quiz question?',
                      'Explain this concept with a simple example',
                    ].map(suggestion => (
                      <button
                        key={suggestion}
                        onClick={() => { setInput(suggestion); inputRef.current?.focus() }}
                        className="text-left rounded-xl px-3 py-2 text-xs transition-colors hover:bg-blue-50"
                        style={{ border: '1px solid #E5E7EB', color: '#374151' }}>
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {history.map((msg, i) => (
                <Bubble key={i} msg={msg} />
              ))}

              {chat.isPending && (
                <div className="flex gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full"
                    style={{ background: '#6B7280' }}>
                    <Bot size={12} className="text-white" />
                  </div>
                  <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm px-3.5 py-2.5"
                    style={{ background: '#F3F4F6' }}>
                    <Loader2 size={12} className="animate-spin" style={{ color: '#9CA3AF' }} />
                    <span className="text-xs" style={{ color: '#9CA3AF' }}>Thinking…</span>
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="px-4 pb-4 flex-shrink-0" style={{ borderTop: '1px solid #F3F4F6', paddingTop: '12px' }}>
              <div className="flex items-end gap-2 rounded-xl p-2"
                style={{ border: '1.5px solid #E5E7EB', background: '#FAFAFA' }}>
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder="Ask a question… (Enter to send)"
                  rows={1}
                  className="flex-1 resize-none bg-transparent text-xs outline-none leading-relaxed"
                  style={{
                    color: '#111827',
                    maxHeight: '120px',
                    minHeight: '20px',
                  }}
                />
                <motion.button
                  onClick={() => void send()}
                  disabled={!input.trim() || chat.isPending}
                  whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  className="flex-shrink-0 flex h-7 w-7 items-center justify-center rounded-lg text-white disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: '#0057b8' }}>
                  <Send size={12} />
                </motion.button>
              </div>
              <p className="mt-1.5 text-center text-[9px]" style={{ color: '#D1D5DB' }}>
                AI can make mistakes. Verify important information.
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
