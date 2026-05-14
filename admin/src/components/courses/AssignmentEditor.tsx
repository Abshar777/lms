'use client'

import { useState } from 'react'
import { Save, Loader2 } from 'lucide-react'
import { useAdminAssignment, useUpsertAssignment } from '@/lib/api/outline'
import { useToast } from '@/store/ui.store'

interface Props {
  lessonId: string
  onClose:  () => void
}

export function AssignmentEditor({ lessonId, onClose }: Props) {
  const { data: existing, isLoading } = useAdminAssignment(lessonId)
  const upsert = useUpsertAssignment(lessonId)
  const toast  = useToast()

  const [title,        setTitle]        = useState(() => existing?.title ?? '')
  const [instructions, setInstructions] = useState(() => existing?.instructions ?? '')
  const [dueDate,      setDueDate]      = useState(() => existing?.dueDate ? existing.dueDate.split('T')[0] : '')
  const [maxScore,     setMaxScore]     = useState(() => existing?.maxScore ?? 100)

  const [synced, setSynced] = useState(false)
  if (!isLoading && !synced && existing) {
    setTitle(existing.title)
    setInstructions(existing.instructions)
    setDueDate(existing.dueDate ? existing.dueDate.split('T')[0] ?? '' : '')
    setMaxScore(existing.maxScore)
    setSynced(true)
  }

  async function handleSave() {
    if (!title.trim()) { toast.error('Title required', 'Enter an assignment title'); return }
    if (!instructions.trim()) { toast.error('Instructions required', 'Enter assignment instructions'); return }
    try {
      await upsert.mutateAsync({
        title: title.trim(),
        instructions: instructions.trim(),
        dueDate: dueDate || undefined,
        maxScore,
      })
      toast.success('Assignment saved')
      onClose()
    } catch (err: any) {
      toast.error('Save failed', err?.response?.data?.error?.message)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-4 text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>
        <Loader2 size={14} className="animate-spin" />Loading…
      </div>
    )
  }

  return (
    <div className="space-y-3 rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white">Assignment Editor</h3>
        <div className="flex items-center gap-2">
          <button onClick={onClose}
            className="rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors hover:bg-white/08"
            style={{ color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.08)' }}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={upsert.isPending}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-white disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #FF6B1A, #FF8C42)' }}>
            {upsert.isPending ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
            Save
          </button>
        </div>
      </div>

      <label className="block space-y-1">
        <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>Title</span>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Assignment title…"
          className="w-full rounded-xl px-3 py-2 text-sm text-white outline-none"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
        />
      </label>

      <label className="block space-y-1">
        <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>Instructions</span>
        <textarea rows={5} value={instructions} onChange={e => setInstructions(e.target.value)}
          placeholder="Describe what the student should submit…"
          className="w-full resize-none rounded-xl px-3 py-2 text-sm text-white outline-none"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>Due date (optional)</span>
          <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
            className="w-full rounded-xl px-3 py-2 text-sm text-white outline-none"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', colorScheme: 'dark' }}
          />
        </label>
        <label className="space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>Max score</span>
          <input type="number" min={1} value={maxScore} onChange={e => setMaxScore(Number(e.target.value))}
            className="w-full rounded-xl px-3 py-2 text-sm text-white outline-none"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
          />
        </label>
      </div>
    </div>
  )
}
