'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Edit2, Trash2, GripVertical, ChevronDown, ChevronUp,
  Video, FileText, HelpCircle, Clock, Lock, Eye, Loader2, X, Check,
} from 'lucide-react'
import {
  useCourseOutline,
  useCreateSection, useUpdateSection, useDeleteSection, useReorderSections,
  useCreateLesson,  useUpdateLesson,  useDeleteLesson,  useReorderLessons,
  type AdminSection, type AdminLesson,
} from '@/lib/api/outline'
import { useToast } from '@/store/ui.store'
import { QuizEditor } from './QuizEditor'
import { AssignmentEditor } from './AssignmentEditor'
import { MediaUploadField } from '@/components/ui/MediaUploadField'
import { TranscriptEditor } from './TranscriptEditor'

interface Props {
  courseId: string
}

const TYPE_META: Record<AdminLesson['type'], { label: string; color: string; Icon: React.ElementType }> = {
  video:      { label: 'Video',      color: '#3B82F6', Icon: Video      },
  article:    { label: 'Article',    color: '#A855F7', Icon: FileText   },
  quiz:       { label: 'Quiz',       color: '#F59E0B', Icon: HelpCircle },
  assignment: { label: 'Assignment', color: '#EC4899', Icon: FileText   },
}

export function CourseOutlineEditor({ courseId }: Props) {
  const { data: outline, isLoading } = useCourseOutline(courseId)
  const reorderSections = useReorderSections(courseId)
  const createSection   = useCreateSection(courseId)
  const toast           = useToast()
  const [newSection, setNewSection] = useState('')
  const [collapsed, setCollapsed]   = useState<Record<string, boolean>>({})

  /* Group lessons under their section, ordered by section.order then lesson.order. */
  const grouped = useMemo(() => {
    if (!outline) return []
    return outline.sections
      .slice()
      .sort((a, b) => a.order - b.order)
      .map(s => ({
        section: s,
        lessons: outline.lessons.filter(l => l.sectionId === s.id).sort((a, b) => a.order - b.order),
      }))
  }, [outline])

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-10 text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
        <Loader2 size={14} className="animate-spin" />Loading curriculum…
      </div>
    )
  }

  const onAddSection = async () => {
    const t = newSection.trim()
    if (!t) return
    try {
      await createSection.mutateAsync(t)
      setNewSection('')
      toast.success('Section added')
    } catch (err: any) {
      toast.error('Could not add section', err?.response?.data?.error?.message)
    }
  }

  const moveSection = async (index: number, dir: -1 | 1) => {
    if (!outline) return
    const ordered = [...outline.sections].sort((a, b) => a.order - b.order)
    const target  = index + dir
    if (target < 0 || target >= ordered.length) return
    const reordered = [...ordered]
    const [moved] = reordered.splice(index, 1)
    if (moved) reordered.splice(target, 0, moved)
    try {
      await reorderSections.mutateAsync(reordered.map(s => s.id))
    } catch (err: any) {
      toast.error('Could not reorder', err?.response?.data?.error?.message)
    }
  }

  return (
    <div className="mt-8 rounded-2xl p-5"
      style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-white">Curriculum</h2>
          <p className="mt-0.5 text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Organize your course into sections and lessons.
          </p>
        </div>
        <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
          {outline?.sections.length ?? 0} sections · {outline?.lessons.length ?? 0} lessons
        </span>
      </div>

      <div className="space-y-2.5">
        <AnimatePresence initial={false}>
          {grouped.map((g, i) => (
            <SectionRow
              key={g.section.id}
              courseId={courseId}
              section={g.section}
              lessons={g.lessons}
              index={i}
              total={grouped.length}
              collapsed={!!collapsed[g.section.id]}
              onToggleCollapsed={() => setCollapsed(c => ({ ...c, [g.section.id]: !c[g.section.id] }))}
              onMoveUp={() => moveSection(i, -1)}
              onMoveDown={() => moveSection(i, +1)}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Add new section ----- */}
      <div className="mt-4 flex items-center gap-2">
        <input
          value={newSection}
          onChange={e => setNewSection(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') onAddSection() }}
          placeholder="New section title…"
          className="flex-1 rounded-xl px-3 py-2 text-sm text-white outline-none transition-all placeholder:text-white/25"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
          onFocus={e => { e.currentTarget.style.border = '1px solid rgba(255,107,26,0.5)' }}
          onBlur={e => { e.currentTarget.style.border = '1px solid rgba(255,255,255,0.08)' }}
        />
        <button onClick={onAddSection} disabled={!newSection.trim() || createSection.isPending}
          className="flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold text-white transition-all disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #FF6B1A, #FF8C42)' }}>
          {createSection.isPending ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
          Add section
        </button>
      </div>
    </div>
  )
}

/* ────────────── Section row ────────────── */
function SectionRow({
  courseId, section, lessons, index, total, collapsed,
  onToggleCollapsed, onMoveUp, onMoveDown,
}: {
  courseId: string
  section:  AdminSection
  lessons:  AdminLesson[]
  index:    number
  total:    number
  collapsed: boolean
  onToggleCollapsed: () => void
  onMoveUp:   () => void
  onMoveDown: () => void
}) {
  const updateSection = useUpdateSection(courseId)
  const deleteSection = useDeleteSection(courseId)
  const reorderLessons = useReorderLessons(courseId)
  const toast = useToast()
  const [editing, setEditing] = useState(false)
  const [title, setTitle]     = useState(section.title)
  const [addingLesson, setAddingLesson] = useState(false)

  const totalSecs = lessons.reduce((acc, l) => acc + (l.durationMins ?? 0), 0)

  const saveTitle = async () => {
    const t = title.trim()
    if (!t || t === section.title) { setEditing(false); setTitle(section.title); return }
    try {
      await updateSection.mutateAsync({ id: section.id, title: t })
      setEditing(false)
      toast.success('Section updated')
    } catch (err: any) {
      toast.error('Could not save', err?.response?.data?.error?.message)
    }
  }

  const onDelete = async () => {
    if (!confirm(`Delete section "${section.title}" and all its lessons? This cannot be undone.`)) return
    try {
      await deleteSection.mutateAsync(section.id)
      toast.success('Section deleted')
    } catch (err: any) {
      toast.error('Could not delete', err?.response?.data?.error?.message)
    }
  }

  const moveLesson = async (i: number, dir: -1 | 1) => {
    const t = i + dir
    if (t < 0 || t >= lessons.length) return
    const next = [...lessons]
    const [moved] = next.splice(i, 1)
    if (moved) next.splice(t, 0, moved)
    try {
      await reorderLessons.mutateAsync({ sectionId: section.id, ids: next.map(l => l.id) })
    } catch (err: any) {
      toast.error('Could not reorder', err?.response?.data?.error?.message)
    }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="overflow-hidden rounded-xl"
      style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>

      <div className="flex items-center gap-2 p-3" style={{ background: 'rgba(255,255,255,0.02)' }}>
        <div className="flex flex-col gap-0.5">
          <button onClick={onMoveUp}   disabled={index === 0}
            className="flex h-4 w-4 items-center justify-center rounded transition-colors hover:bg-white/05 disabled:opacity-25"
            style={{ color: 'rgba(255,255,255,0.4)' }}><ChevronUp size={10} /></button>
          <button onClick={onMoveDown} disabled={index >= total - 1}
            className="flex h-4 w-4 items-center justify-center rounded transition-colors hover:bg-white/05 disabled:opacity-25"
            style={{ color: 'rgba(255,255,255,0.4)' }}><ChevronDown size={10} /></button>
        </div>
        <GripVertical size={14} style={{ color: 'rgba(255,255,255,0.2)' }} />

        <span className="flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold"
          style={{ background: 'rgba(255,107,26,0.15)', color: '#FF6B1A' }}>{index + 1}</span>

        {editing ? (
          <input autoFocus value={title}
            onChange={e => setTitle(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={e => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') { setEditing(false); setTitle(section.title) } }}
            className="flex-1 rounded-lg bg-transparent px-2 py-1 text-sm font-semibold text-white outline-none"
            style={{ border: '1px solid rgba(255,107,26,0.5)' }} />
        ) : (
          <button onClick={onToggleCollapsed}
            className="flex flex-1 items-center justify-between gap-2 text-left transition-opacity hover:opacity-80">
            <span className="text-sm font-semibold text-white truncate">{section.title}</span>
            <span className="flex items-center gap-2 text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
              {lessons.length} lessons · {fmt(totalSecs)}
              <motion.span animate={{ rotate: collapsed ? -90 : 0 }}>
                <ChevronDown size={12} />
              </motion.span>
            </span>
          </button>
        )}

        <div className="flex items-center gap-1">
          <button onClick={() => setEditing(v => !v)}
            className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-white/05"
            style={{ color: 'rgba(255,255,255,0.4)' }}>
            <Edit2 size={11} />
          </button>
          <button onClick={onDelete} disabled={deleteSection.isPending}
            className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-red-500/10"
            style={{ color: 'rgba(248,113,113,0.7)' }}>
            <Trash2 size={11} />
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden">
            <div className="border-t p-3 space-y-1.5" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
              {lessons.length === 0 && !addingLesson && (
                <p className="px-2 py-1 text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  No lessons yet. Add the first one below.
                </p>
              )}
              {lessons.map((l, i) => (
                <LessonRow key={l.id} courseId={courseId} lesson={l} index={i} total={lessons.length}
                  onMoveUp={() => moveLesson(i, -1)} onMoveDown={() => moveLesson(i, +1)} />
              ))}

              {addingLesson ? (
                <AddLessonForm courseId={courseId} sectionId={section.id} onClose={() => setAddingLesson(false)} />
              ) : (
                <button onClick={() => setAddingLesson(true)}
                  className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors hover:bg-white/05"
                  style={{ color: '#FF6B1A' }}>
                  <Plus size={11} />Add lesson
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

/* ────────────── Lesson row ────────────── */
function LessonRow({
  courseId, lesson, index, total, onMoveUp, onMoveDown,
}: {
  courseId: string
  lesson:   AdminLesson
  index:    number
  total:    number
  onMoveUp:   () => void
  onMoveDown: () => void
}) {
  const updateLesson = useUpdateLesson(courseId)
  const deleteLesson = useDeleteLesson(courseId)
  const toast        = useToast()
  const [editing,       setEditing]       = useState(false)
  const [editingContent, setEditingContent] = useState(false)  // quiz/assignment editor
  const meta = TYPE_META[lesson.type]
  const Icon = meta.Icon

  const onDelete = async () => {
    if (!confirm(`Delete lesson "${lesson.title}"? This cannot be undone.`)) return
    try {
      await deleteLesson.mutateAsync(lesson.id)
      toast.success('Lesson deleted')
    } catch (err: any) {
      toast.error('Could not delete', err?.response?.data?.error?.message)
    }
  }

  if (editingContent && lesson.type === 'quiz') {
    return <QuizEditor lessonId={lesson.id} onClose={() => setEditingContent(false)} />
  }
  if (editingContent && lesson.type === 'assignment') {
    return <AssignmentEditor lessonId={lesson.id} onClose={() => setEditingContent(false)} />
  }

  if (editing) {
    return (
      <LessonEditForm
        lesson={lesson}
        onCancel={() => setEditing(false)}
        onSave={async (dto) => {
          try {
            await updateLesson.mutateAsync({ id: lesson.id, ...dto })
            setEditing(false)
            toast.success('Lesson updated')
          } catch (err: any) {
            toast.error('Could not save', err?.response?.data?.error?.message)
          }
        }}
        pending={updateLesson.isPending}
      />
    )
  }

  return (
    <motion.div layout className="space-y-0">
      <div className="flex items-center gap-2 rounded-lg px-2.5 py-2 transition-colors hover:bg-white/02"
        style={{ background: 'rgba(255,255,255,0.02)' }}>
        <div className="flex flex-col gap-0.5">
          <button onClick={onMoveUp}   disabled={index === 0}
            className="flex h-3.5 w-3.5 items-center justify-center rounded transition-colors hover:bg-white/05 disabled:opacity-25"
            style={{ color: 'rgba(255,255,255,0.4)' }}><ChevronUp size={9} /></button>
          <button onClick={onMoveDown} disabled={index >= total - 1}
            className="flex h-3.5 w-3.5 items-center justify-center rounded transition-colors hover:bg-white/05 disabled:opacity-25"
            style={{ color: 'rgba(255,255,255,0.4)' }}><ChevronDown size={9} /></button>
        </div>

        <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg"
          style={{ background: `${meta.color}1A`, border: `1px solid ${meta.color}33` }}>
          <Icon size={12} style={{ color: meta.color }} />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm text-white truncate">{lesson.title}</p>
          <div className="mt-0.5 flex items-center gap-2 text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
            <span className="capitalize">{lesson.type}</span>
            {lesson.durationMins > 0 && (
              <span className="flex items-center gap-0.5"><Clock size={9} />{fmt(lesson.durationMins)}</span>
            )}
            {lesson.isFree
              ? <span className="flex items-center gap-0.5" style={{ color: '#4ADE80' }}><Eye size={9} />Free preview</span>
              : <span className="flex items-center gap-0.5"><Lock size={9} />Members</span>}
          </div>
        </div>

        <div className="flex items-center gap-1">
          {(lesson.type === 'quiz' || lesson.type === 'assignment') && (
            <button onClick={() => setEditingContent(true)}
              className="rounded-lg px-2 py-1 text-[10px] font-semibold transition-colors hover:bg-white/08"
              style={{ color: meta.color, border: `1px solid ${meta.color}33` }}>
              Edit {lesson.type}
            </button>
          )}
          <button onClick={() => setEditing(true)}
            className="flex h-6 w-6 items-center justify-center rounded-lg transition-colors hover:bg-white/05"
            style={{ color: 'rgba(255,255,255,0.4)' }}>
            <Edit2 size={10} />
          </button>
          <button onClick={onDelete}
            className="flex h-6 w-6 items-center justify-center rounded-lg transition-colors hover:bg-red-500/10"
            style={{ color: 'rgba(248,113,113,0.7)' }}>
            <Trash2 size={10} />
          </button>
        </div>
      </div>
    </motion.div>
  )
}

/* ────────────── Add-lesson inline form ────────────── */
function AddLessonForm({ courseId, sectionId, onClose }: { courseId: string; sectionId: string; onClose: () => void }) {
  const createLesson = useCreateLesson(courseId)
  const toast        = useToast()
  const [title, setTitle] = useState('')
  const [type, setType]   = useState<AdminLesson['type']>('video')
  const [contentUrl, setContentUrl] = useState('')
  const [duration, setDuration]     = useState<number>(0)
  const [isFree, setIsFree]         = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    try {
      await createLesson.mutateAsync({
        sectionId, title: title.trim(), type,
        contentUrl:   contentUrl.trim() || undefined,
        durationMins: duration || 0,
        isFree,
      })
      toast.success('Lesson added')
      onClose()
    } catch (err: any) {
      toast.error('Could not add lesson', err?.response?.data?.error?.message)
    }
  }

  return (
    <form onSubmit={onSubmit}
      className="rounded-xl p-3 space-y-2"
      style={{ background: 'rgba(255,107,26,0.05)', border: '1px solid rgba(255,107,26,0.18)' }}>
      <input value={title} onChange={e => setTitle(e.target.value)} autoFocus
        placeholder="Lesson title" required
        className="w-full rounded-lg px-3 py-1.5 text-sm text-white outline-none"
        style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.08)' }} />

      <div className="grid grid-cols-2 gap-2">
        <select value={type} onChange={e => setType(e.target.value as AdminLesson['type'])}
          className="rounded-lg bg-[#0F1018] px-2 py-1.5 text-xs text-white outline-none"
          style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
          <option value="video">Video</option>
          <option value="article">Article</option>
          <option value="quiz">Quiz</option>
          <option value="assignment">Assignment</option>
        </select>
        <input type="number" min={0} value={duration || ''} onChange={e => setDuration(Number(e.target.value))} placeholder="Duration (mins)"
          className="rounded-lg px-2 py-1.5 text-xs text-white outline-none placeholder:text-white/25"
          style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.08)' }} />
      </div>

      {/* Content URL / upload — shown for video and article types */}
      {(type === 'video' || type === 'article') && (
        <MediaUploadField
          mode="compact"
          type={type === 'video' ? 'video' : 'image'}
          value={contentUrl}
          onChange={setContentUrl}
          placeholder={type === 'video' ? 'Video URL or upload ↗' : 'Article / resource URL'}
        />
      )}

      <div className="flex items-center justify-between">
        <label className="flex items-center gap-1.5 text-xs cursor-pointer" style={{ color: 'rgba(255,255,255,0.6)' }}>
          <input type="checkbox" checked={isFree} onChange={e => setIsFree(e.target.checked)} />
          Free preview
        </label>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onClose}
            className="rounded-lg px-3 py-1 text-xs font-semibold transition-colors hover:bg-white/05"
            style={{ color: 'rgba(255,255,255,0.5)' }}>
            <X size={10} className="inline" /> Cancel
          </button>
          <button type="submit" disabled={createLesson.isPending}
            className="flex items-center gap-1 rounded-lg px-3 py-1 text-xs font-bold text-white transition-all disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #FF6B1A, #FF8C42)' }}>
            {createLesson.isPending ? <Loader2 size={10} className="animate-spin" /> : <Check size={10} />}
            Add
          </button>
        </div>
      </div>
    </form>
  )
}

/* ────────────── Edit-lesson inline form ────────────── */
function LessonEditForm({
  lesson, onSave, onCancel, pending,
}: {
  lesson:   AdminLesson
  onSave:   (dto: Partial<Omit<AdminLesson, 'id' | 'sectionId' | 'courseId' | 'createdAt' | 'updatedAt' | 'order'>>) => Promise<void>
  onCancel: () => void
  pending:  boolean
}) {
  const [title, setTitle]           = useState(lesson.title)
  const [type, setType]             = useState(lesson.type)
  const [contentUrl, setContentUrl] = useState(lesson.contentUrl ?? '')
  const [duration, setDuration]     = useState(lesson.durationMins)
  const [isFree, setIsFree]         = useState(lesson.isFree)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSave({
      title:       title.trim(),
      type,
      contentUrl:  contentUrl.trim(),
      durationMins: duration,
      isFree,
    })
  }

  return (
    <form onSubmit={submit}
      className="rounded-xl p-3 space-y-2"
      style={{ background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.20)' }}>
      <input value={title} onChange={e => setTitle(e.target.value)} required
        className="w-full rounded-lg px-3 py-1.5 text-sm text-white outline-none"
        style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.08)' }} />

      <div className="grid grid-cols-2 gap-2">
        <select value={type} onChange={e => setType(e.target.value as AdminLesson['type'])}
          className="rounded-lg bg-[#0F1018] px-2 py-1.5 text-xs text-white outline-none"
          style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
          <option value="video">Video</option>
          <option value="article">Article</option>
          <option value="quiz">Quiz</option>
          <option value="assignment">Assignment</option>
        </select>
        <input type="number" min={0} value={duration || ''} onChange={e => setDuration(Number(e.target.value))} placeholder="Duration (mins)"
          className="rounded-lg px-2 py-1.5 text-xs text-white outline-none placeholder:text-white/25"
          style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.08)' }} />
      </div>

      {/* Content URL / upload — shown for video and article types */}
      {(type === 'video' || type === 'article') && (
        <MediaUploadField
          mode="compact"
          type={type === 'video' ? 'video' : 'image'}
          value={contentUrl}
          onChange={setContentUrl}
          placeholder={type === 'video' ? 'Video URL or upload ↗' : 'Article / resource URL'}
        />
      )}

      {/* Transcript — collapsible editor for video/article lessons */}
      {(type === 'video' || type === 'article') && (
        <TranscriptEditor lessonId={lesson.id} initialText={lesson.transcript} />
      )}

      <div className="flex items-center justify-between">
        <label className="flex items-center gap-1.5 text-xs cursor-pointer" style={{ color: 'rgba(255,255,255,0.6)' }}>
          <input type="checkbox" checked={isFree} onChange={e => setIsFree(e.target.checked)} />
          Free preview
        </label>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onCancel}
            className="rounded-lg px-3 py-1 text-xs font-semibold transition-colors hover:bg-white/05"
            style={{ color: 'rgba(255,255,255,0.5)' }}>
            Cancel
          </button>
          <button type="submit" disabled={pending}
            className="flex items-center gap-1 rounded-lg px-3 py-1 text-xs font-bold text-white transition-all disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #3B82F6, #60A5FA)' }}>
            {pending ? <Loader2 size={10} className="animate-spin" /> : <Check size={10} />}
            Save
          </button>
        </div>
      </div>
    </form>
  )
}

function fmt(mins: number) {
  const h = Math.floor(mins / 60); const m = mins % 60
  return h > 0 ? `${h}h ${m > 0 ? m + 'm' : ''}`.trim() : `${m}m`
}
