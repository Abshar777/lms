'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Edit2, Trash2, GripVertical, ChevronDown,
  Video, FileText, HelpCircle, ClipboardList,
  Clock, Lock, Eye, X, Check,
  ChevronUp, BookOpen, Zap, MoreVertical,
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
import Spinner from '@/components/ui/Spinner'

/* ── Type config ─────────────────────────────────────────────── */
const TYPE_META: Record<AdminLesson['type'], {
  label: string; color: string; bg: string; border: string; Icon: React.ElementType
}> = {
  video:      { label: 'Video',      color: '#60A5FA', bg: 'rgba(96,165,250,0.1)',   border: 'rgba(96,165,250,0.2)',   Icon: Video        },
  article:    { label: 'Article',    color: '#A78BFA', bg: 'rgba(167,139,250,0.1)',  border: 'rgba(167,139,250,0.2)',  Icon: FileText     },
  quiz:       { label: 'Quiz',       color: '#FBBF24', bg: 'rgba(251,191,36,0.1)',   border: 'rgba(251,191,36,0.2)',   Icon: HelpCircle   },
  assignment: { label: 'Assignment', color: '#F472B6', bg: 'rgba(244,114,182,0.1)',  border: 'rgba(244,114,182,0.2)',  Icon: ClipboardList },
}

function fmt(mins: number) {
  if (!mins) return '0m'
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return h > 0 ? `${h}h${m > 0 ? ` ${m}m` : ''}` : `${m}m`
}

/* ── Skeleton ─────────────────────────────────────────────────── */
function OutlineSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map(i => (
        <div key={i} className="animate-pulse overflow-hidden rounded-2xl"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-3 p-4">
            <div className="h-8 w-8 rounded-xl" style={{ background: 'rgba(255,255,255,0.06)' }} />
            <div className="h-4 flex-1 rounded-lg" style={{ background: 'rgba(255,255,255,0.06)' }} />
            <div className="h-4 w-24 rounded-lg" style={{ background: 'rgba(255,255,255,0.06)' }} />
          </div>
          {i === 1 && (
            <div className="space-y-2 border-t p-4" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
              {[1, 2, 3].map(j => (
                <div key={j} className="flex items-center gap-3 rounded-xl p-3"
                  style={{ background: 'rgba(255,255,255,0.02)' }}>
                  <div className="h-7 w-7 rounded-lg" style={{ background: 'rgba(255,255,255,0.06)' }} />
                  <div className="h-3 flex-1 rounded-lg" style={{ background: 'rgba(255,255,255,0.06)' }} />
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

/* ── Main component ───────────────────────────────────────────── */
export function CourseOutlineEditor({ courseId }: { courseId: string }) {
  const { data: outline, isLoading } = useCourseOutline(courseId)
  const reorderSections = useReorderSections(courseId)
  const createSection   = useCreateSection(courseId)
  const toast           = useToast()
  const [newSection, setNewSection]   = useState('')
  const [addingSection, setAddingSection] = useState(false)
  const [collapsed, setCollapsed]     = useState<Record<string, boolean>>({})

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

  const totalLessons  = outline?.lessons.length ?? 0
  const totalSections = outline?.sections.length ?? 0
  const totalDuration = (outline?.lessons ?? []).reduce((acc, l) => acc + (l.durationMins ?? 0), 0)

  const onAddSection = async () => {
    const t = newSection.trim()
    if (!t) return
    try {
      await createSection.mutateAsync({ title: t })
      setNewSection('')
      setAddingSection(false)
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
    <div className="mt-8 overflow-hidden rounded-3xl"
      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-6 py-5"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl"
            style={{ background: 'rgba(0,87,184,0.15)', border: '1px solid rgba(0,87,184,0.2)' }}>
            <BookOpen size={16} style={{ color: '#0057b8' }} />
          </div>
          <div>
            <h2 className="text-base font-bold text-white" style={{ fontFamily: 'Bricolage Grotesque, sans-serif' }}>
              Curriculum
            </h2>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Build your course structure
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Stats pills */}
          <div className="hidden items-center gap-2 sm:flex">
            <span className="flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold"
              style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)' }}>
              <BookOpen size={10} />{totalSections} sections
            </span>
            <span className="flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold"
              style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)' }}>
              <Zap size={10} />{totalLessons} lessons
            </span>
            {totalDuration > 0 && (
              <span className="flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold"
                style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)' }}>
                <Clock size={10} />{fmt(totalDuration)}
              </span>
            )}
          </div>

          {/* Add section button */}
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            onClick={() => setAddingSection(true)}
            className="flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #0057b8, #003d80)', boxShadow: '0 4px 12px rgba(0,87,184,0.3)' }}>
            <Plus size={13} />Add section
          </motion.button>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="p-5">
        {isLoading ? (
          <OutlineSkeleton />
        ) : grouped.length === 0 && !addingSection ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-14">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
              style={{ background: 'rgba(0,87,184,0.1)', border: '1px solid rgba(0,87,184,0.15)' }}>
              <BookOpen size={22} style={{ color: 'rgba(0,87,184,0.7)' }} />
            </div>
            <p className="mb-1 text-sm font-semibold text-white">No curriculum yet</p>
            <p className="mb-5 text-xs text-center" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Add your first section to start building<br />your course structure
            </p>
            <motion.button
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={() => setAddingSection(true)}
              className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #0057b8, #003d80)', boxShadow: '0 4px 14px rgba(0,87,184,0.3)' }}>
              <Plus size={14} />Add first section
            </motion.button>
          </div>
        ) : (
          <div className="space-y-3">
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
        )}

        {/* Add section form */}
        <AnimatePresence>
          {addingSection && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="mt-3 overflow-hidden rounded-2xl"
              style={{ background: 'rgba(0,87,184,0.06)', border: '1px dashed rgba(0,87,184,0.35)' }}>
              <div className="flex items-center gap-3 p-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl shrink-0"
                  style={{ background: 'rgba(0,87,184,0.15)' }}>
                  <BookOpen size={14} style={{ color: '#0057b8' }} />
                </div>
                <input
                  autoFocus
                  value={newSection}
                  onChange={e => setNewSection(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') onAddSection()
                    if (e.key === 'Escape') { setAddingSection(false); setNewSection('') }
                  }}
                  placeholder="Section title, e.g. Getting Started…"
                  className="flex-1 bg-transparent text-sm font-semibold text-white outline-none placeholder:font-normal"
                  style={{ color: 'white' }}
                />
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => { setAddingSection(false); setNewSection('') }}
                    className="flex h-8 w-8 items-center justify-center rounded-xl transition-colors hover:bg-white/08"
                    style={{ color: 'rgba(255,255,255,0.4)' }}>
                    <X size={14} />
                  </button>
                  <button
                    onClick={onAddSection}
                    disabled={!newSection.trim() || createSection.isPending}
                    className="flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #0057b8, #003d80)' }}>
                    {createSection.isPending ? <Spinner size={11} /> : <Check size={11} />}
                    Add
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

/* ── Section row ──────────────────────────────────────────────── */
function SectionRow({
  courseId, section, lessons, index, total, collapsed,
  onToggleCollapsed, onMoveUp, onMoveDown,
}: {
  courseId: string; section: AdminSection; lessons: AdminLesson[]
  index: number; total: number; collapsed: boolean
  onToggleCollapsed: () => void; onMoveUp: () => void; onMoveDown: () => void
}) {
  const updateSection  = useUpdateSection(courseId)
  const deleteSection  = useDeleteSection(courseId)
  const reorderLessons = useReorderLessons(courseId)
  const toast          = useToast()
  const [editing, setEditing]         = useState(false)
  const [title, setTitle]             = useState(section.title)
  const [addingLesson, setAddingLesson] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

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
    try {
      await deleteSection.mutateAsync(section.id)
      toast.success('Section deleted')
    } catch (err: any) {
      toast.error('Could not delete', err?.response?.data?.error?.message)
      setConfirmDelete(false)
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
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      className="overflow-hidden rounded-2xl"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>

      {/* Section header */}
      <div className="flex items-center gap-3 px-4 py-3.5 transition-colors"
        style={{ background: 'rgba(255,255,255,0.02)' }}>

        {/* Drag + reorder */}
        <div className="flex shrink-0 flex-col items-center gap-px">
          <button onClick={onMoveUp} disabled={index === 0}
            className="flex h-4 w-4 items-center justify-center rounded transition-all hover:bg-white/08 disabled:opacity-20"
            style={{ color: 'rgba(255,255,255,0.45)' }}>
            <ChevronUp size={11} />
          </button>
          <GripVertical size={13} style={{ color: 'rgba(255,255,255,0.18)' }} />
          <button onClick={onMoveDown} disabled={index >= total - 1}
            className="flex h-4 w-4 items-center justify-center rounded transition-all hover:bg-white/08 disabled:opacity-20"
            style={{ color: 'rgba(255,255,255,0.45)' }}>
            <ChevronDown size={11} />
          </button>
        </div>

        {/* Number badge */}
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-xs font-bold"
          style={{ background: 'rgba(0,87,184,0.15)', color: '#0057b8', border: '1px solid rgba(0,87,184,0.2)' }}>
          {index + 1}
        </span>

        {/* Title / edit */}
        {editing ? (
          <input
            autoFocus value={title}
            onChange={e => setTitle(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={e => {
              if (e.key === 'Enter') saveTitle()
              if (e.key === 'Escape') { setEditing(false); setTitle(section.title) }
            }}
            className="flex-1 rounded-xl px-3 py-1.5 text-sm font-semibold text-white outline-none"
            style={{ background: 'rgba(0,87,184,0.08)', border: '1px solid rgba(0,87,184,0.45)' }}
          />
        ) : (
          <button
            onClick={onToggleCollapsed}
            className="flex flex-1 items-center justify-between gap-3 text-left min-w-0">
            <span className="text-sm font-semibold text-white truncate">{section.title}</span>
            <div className="flex shrink-0 items-center gap-2">
              <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
                {lessons.length} {lessons.length === 1 ? 'lesson' : 'lessons'}
                {totalSecs > 0 && ` · ${fmt(totalSecs)}`}
              </span>
              <motion.div animate={{ rotate: collapsed ? -90 : 0 }} transition={{ duration: 0.2 }}>
                <ChevronDown size={13} style={{ color: 'rgba(255,255,255,0.4)' }} />
              </motion.div>
            </div>
          </button>
        )}

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={() => { setEditing(v => !v); setTitle(section.title) }}
            className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-white/06"
            style={{ color: 'rgba(255,255,255,0.35)' }} title="Rename">
            <Edit2 size={12} />
          </button>

          <AnimatePresence mode="wait">
            {!confirmDelete ? (
              <motion.button key="del" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setConfirmDelete(true)}
                className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-red-500/10"
                style={{ color: 'rgba(248,113,113,0.6)' }} title="Delete section">
                <Trash2 size={12} />
              </motion.button>
            ) : (
              <motion.div key="confirm" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                className="flex items-center gap-1">
                <button onClick={onDelete} disabled={deleteSection.isPending}
                  className="rounded-lg px-2 py-1 text-[10px] font-bold text-white disabled:opacity-50"
                  style={{ background: '#EF4444' }}>
                  {deleteSection.isPending ? '…' : 'Delete'}
                </button>
                <button onClick={() => setConfirmDelete(false)}
                  className="flex h-6 w-6 items-center justify-center rounded-lg"
                  style={{ color: 'rgba(255,255,255,0.4)' }}>
                  <X size={11} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Lessons list */}
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeInOut' }}
            className="overflow-hidden">
            <div className="p-3 space-y-1.5"
              style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>

              {lessons.length === 0 && !addingLesson && (
                <div className="flex flex-col items-center justify-center py-6 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.08)' }}>
                  <p className="mb-1 text-xs font-medium" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    No lessons in this section
                  </p>
                  <button onClick={() => setAddingLesson(true)}
                    className="mt-2 flex items-center gap-1.5 text-xs font-semibold transition-opacity hover:opacity-70"
                    style={{ color: '#0057b8' }}>
                    <Plus size={11} />Add first lesson
                  </button>
                </div>
              )}

              {lessons.map((l, i) => (
                <LessonRow
                  key={l.id}
                  courseId={courseId}
                  lesson={l}
                  index={i}
                  total={lessons.length}
                  onMoveUp={() => moveLesson(i, -1)}
                  onMoveDown={() => moveLesson(i, +1)}
                />
              ))}

              {addingLesson ? (
                <AddLessonForm
                  courseId={courseId}
                  sectionId={section.id}
                  onClose={() => setAddingLesson(false)}
                />
              ) : lessons.length > 0 && (
                <motion.button
                  whileHover={{ x: 2 }}
                  onClick={() => setAddingLesson(true)}
                  className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold transition-colors w-full mt-1"
                  style={{ color: '#0057b8', background: 'rgba(0,87,184,0.04)', border: '1px dashed rgba(0,87,184,0.2)' }}>
                  <Plus size={12} />Add lesson
                </motion.button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

/* ── Lesson row ───────────────────────────────────────────────── */
function LessonRow({
  courseId, lesson, index, total, onMoveUp, onMoveDown,
}: {
  courseId: string; lesson: AdminLesson; index: number; total: number
  onMoveUp: () => void; onMoveDown: () => void
}) {
  const updateLesson = useUpdateLesson(courseId)
  const deleteLesson = useDeleteLesson(courseId)
  const toast        = useToast()
  const [editing,         setEditing]         = useState(false)
  const [editingContent,  setEditingContent]  = useState(false)
  const [confirmDelete,   setConfirmDelete]   = useState(false)
  const meta = TYPE_META[lesson.type]
  const Icon = meta.Icon

  const onDelete = async () => {
    try {
      await deleteLesson.mutateAsync(lesson.id)
      toast.success('Lesson deleted')
    } catch (err: any) {
      toast.error('Could not delete', err?.response?.data?.error?.message)
      setConfirmDelete(false)
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
    <motion.div
      layout
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      className="group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all"
      style={{ background: 'rgba(255,255,255,0.025)' }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.025)' }}>

      {/* Reorder */}
      <div className="flex shrink-0 flex-col items-center gap-px opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={onMoveUp} disabled={index === 0}
          className="flex h-3.5 w-3.5 items-center justify-center rounded disabled:opacity-20"
          style={{ color: 'rgba(255,255,255,0.4)' }}>
          <ChevronUp size={10} />
        </button>
        <GripVertical size={10} style={{ color: 'rgba(255,255,255,0.2)' }} />
        <button onClick={onMoveDown} disabled={index >= total - 1}
          className="flex h-3.5 w-3.5 items-center justify-center rounded disabled:opacity-20"
          style={{ color: 'rgba(255,255,255,0.4)' }}>
          <ChevronDown size={10} />
        </button>
      </div>

      {/* Type icon */}
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
        style={{ background: meta.bg, border: `1px solid ${meta.border}` }}>
        <Icon size={13} style={{ color: meta.color }} />
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white">{lesson.title}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-semibold rounded-md px-1.5 py-0.5"
            style={{ background: meta.bg, color: meta.color }}>
            {meta.label}
          </span>
          {lesson.durationMins > 0 && (
            <span className="flex items-center gap-1 text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
              <Clock size={9} />{fmt(lesson.durationMins)}
            </span>
          )}
          {lesson.isFree ? (
            <span className="flex items-center gap-1 text-[10px] font-semibold" style={{ color: '#4ADE80' }}>
              <Eye size={9} />Free preview
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[10px]" style={{ color: 'rgba(255,255,255,0.28)' }}>
              <Lock size={9} />Members only
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {(lesson.type === 'quiz' || lesson.type === 'assignment') && (
          <button
            onClick={() => setEditingContent(true)}
            className="rounded-lg px-2.5 py-1 text-[10px] font-semibold transition-colors hover:opacity-80"
            style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.border}` }}>
            Edit {lesson.type}
          </button>
        )}
        <button onClick={() => setEditing(true)}
          className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-white/08"
          style={{ color: 'rgba(255,255,255,0.4)' }} title="Edit lesson">
          <Edit2 size={12} />
        </button>

        <AnimatePresence mode="wait">
          {!confirmDelete ? (
            <motion.button key="d" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setConfirmDelete(true)}
              className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-red-500/10"
              style={{ color: 'rgba(248,113,113,0.6)' }} title="Delete">
              <Trash2 size={12} />
            </motion.button>
          ) : (
            <motion.div key="dc" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              className="flex items-center gap-1">
              <button onClick={onDelete} disabled={deleteLesson.isPending}
                className="rounded-lg px-2 py-0.5 text-[10px] font-bold text-white disabled:opacity-50"
                style={{ background: '#EF4444' }}>
                {deleteLesson.isPending ? '…' : 'Delete'}
              </button>
              <button onClick={() => setConfirmDelete(false)}
                className="flex h-5 w-5 items-center justify-center rounded"
                style={{ color: 'rgba(255,255,255,0.4)' }}>
                <X size={10} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

/* ── Type pill selector ───────────────────────────────────────── */
function TypeSelector({ value, onChange }: { value: AdminLesson['type']; onChange: (v: AdminLesson['type']) => void }) {
  const types = (['video', 'article', 'quiz', 'assignment'] as const)
  return (
    <div className="flex gap-1.5 flex-wrap">
      {types.map(t => {
        const m = TYPE_META[t]
        const Icon = m.Icon
        const active = value === t
        return (
          <button
            key={t} type="button"
            onClick={() => onChange(t)}
            className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all"
            style={{
              background:  active ? m.bg  : 'rgba(255,255,255,0.04)',
              color:       active ? m.color : 'rgba(255,255,255,0.4)',
              border:      active ? `1px solid ${m.border}` : '1px solid rgba(255,255,255,0.07)',
              boxShadow:   active ? `0 0 0 2px ${m.color}20` : 'none',
            }}>
            <Icon size={11} />{m.label}
          </button>
        )
      })}
    </div>
  )
}

/* ── Field wrapper ────────────────────────────────────────────── */
function FormField({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>{hint}</p>}
    </div>
  )
}

const fieldStyle = {
  background: 'rgba(255,255,255,0.05)',
  border:     '1px solid rgba(255,255,255,0.09)',
}
const fieldClass = "w-full rounded-xl px-3 py-2 text-sm text-white outline-none transition-all placeholder:text-white/25"

function onFocusField(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) {
  e.currentTarget.style.border = '1px solid rgba(0,87,184,0.5)'
  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,87,184,0.09)'
}
function onBlurField(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) {
  e.currentTarget.style.border = '1px solid rgba(255,255,255,0.09)'
  e.currentTarget.style.boxShadow = 'none'
}

/* ── Add lesson form ──────────────────────────────────────────── */
function AddLessonForm({ courseId, sectionId, onClose }: { courseId: string; sectionId: string; onClose: () => void }) {
  const createLesson = useCreateLesson(courseId)
  const toast        = useToast()
  const [title,      setTitle]      = useState('')
  const [type,       setType]       = useState<AdminLesson['type']>('video')
  const [contentUrl, setContentUrl] = useState('')
  const [duration,   setDuration]   = useState<number>(0)
  const [isFree,     setIsFree]     = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    try {
      await createLesson.mutateAsync({
        sectionId, title: title.trim(), type,
        contentUrl: contentUrl.trim() || undefined,
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
    <motion.form
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      onSubmit={onSubmit}
      className="mt-1 overflow-hidden rounded-2xl"
      style={{ background: 'rgba(0,87,184,0.04)', border: '1px solid rgba(0,87,184,0.2)' }}>

      {/* Form header */}
      <div className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <span className="text-xs font-bold" style={{ color: '#0057b8' }}>New lesson</span>
        <button type="button" onClick={onClose}
          className="flex h-6 w-6 items-center justify-center rounded-lg transition-colors hover:bg-white/08"
          style={{ color: 'rgba(255,255,255,0.4)' }}>
          <X size={13} />
        </button>
      </div>

      <div className="space-y-4 p-4">
        {/* Title */}
        <FormField label="Lesson title">
          <input
            autoFocus required
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Introduction to the Course"
            className={fieldClass}
            style={fieldStyle}
            onFocus={onFocusField} onBlur={onBlurField}
          />
        </FormField>

        {/* Type */}
        <FormField label="Lesson type">
          <TypeSelector value={type} onChange={setType} />
        </FormField>

        {/* Duration */}
        <FormField label="Duration (minutes)" hint="Leave 0 if unknown">
          <input
            type="number" min={0}
            value={duration || ''}
            onChange={e => setDuration(Number(e.target.value))}
            placeholder="e.g. 15"
            className={fieldClass}
            style={fieldStyle}
            onFocus={onFocusField} onBlur={onBlurField}
          />
        </FormField>

        {/* Media upload */}
        {(type === 'video' || type === 'article') && (
          <FormField label={type === 'video' ? 'Video content' : 'Article / resource'}>
            <MediaUploadField
              mode="compact"
              type={type === 'video' ? 'video' : 'image'}
              value={contentUrl}
              onChange={setContentUrl}
              placeholder={type === 'video' ? 'Video URL or upload file' : 'Article / resource URL'}
            />
          </FormField>
        )}

        {/* Free preview toggle */}
        <div className="flex items-center justify-between rounded-xl px-4 py-3"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div>
            <p className="text-xs font-semibold text-white">Free preview</p>
            <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Allow non-enrolled users to preview this lesson
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsFree(v => !v)}
            className="relative h-5 w-9 rounded-full transition-colors shrink-0"
            style={{ background: isFree ? '#0057b8' : 'rgba(255,255,255,0.12)' }}>
            <span className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform"
              style={{ left: isFree ? '18px' : '2px' }} />
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-1">
          <button type="button" onClick={onClose}
            className="rounded-xl px-4 py-2 text-xs font-semibold transition-colors hover:bg-white/06"
            style={{ color: 'rgba(255,255,255,0.5)' }}>
            Cancel
          </button>
          <button
            type="submit"
            disabled={!title.trim() || createLesson.isPending}
            className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #0057b8, #003d80)', boxShadow: '0 4px 12px rgba(0,87,184,0.25)' }}>
            {createLesson.isPending ? <Spinner size={11} /> : <Check size={11} />}
            Add lesson
          </button>
        </div>
      </div>
    </motion.form>
  )
}

/* ── Edit lesson form ─────────────────────────────────────────── */
function LessonEditForm({
  lesson, onSave, onCancel, pending,
}: {
  lesson:   AdminLesson
  onSave:   (dto: Partial<Omit<AdminLesson, 'id' | 'sectionId' | 'courseId' | 'createdAt' | 'updatedAt' | 'order'>>) => Promise<void>
  onCancel: () => void
  pending:  boolean
}) {
  const [title,      setTitle]      = useState(lesson.title)
  const [type,       setType]       = useState(lesson.type)
  const [contentUrl, setContentUrl] = useState(lesson.contentUrl ?? '')
  const [duration,   setDuration]   = useState(lesson.durationMins)
  const [isFree,     setIsFree]     = useState(lesson.isFree)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSave({ title: title.trim(), type, contentUrl: contentUrl.trim(), durationMins: duration, isFree })
  }

  return (
    <motion.form
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      onSubmit={submit}
      className="overflow-hidden rounded-2xl"
      style={{ background: 'rgba(96,165,250,0.04)', border: '1px solid rgba(96,165,250,0.2)' }}>

      {/* Form header */}
      <div className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <span className="text-xs font-bold" style={{ color: '#60A5FA' }}>Edit lesson</span>
        <button type="button" onClick={onCancel}
          className="flex h-6 w-6 items-center justify-center rounded-lg transition-colors hover:bg-white/08"
          style={{ color: 'rgba(255,255,255,0.4)' }}>
          <X size={13} />
        </button>
      </div>

      <div className="space-y-4 p-4">
        <FormField label="Lesson title">
          <input
            required value={title}
            onChange={e => setTitle(e.target.value)}
            className={fieldClass}
            style={fieldStyle}
            onFocus={onFocusField} onBlur={onBlurField}
          />
        </FormField>

        <FormField label="Lesson type">
          <TypeSelector value={type} onChange={setType} />
        </FormField>

        <FormField label="Duration (minutes)">
          <input
            type="number" min={0}
            value={duration || ''}
            onChange={e => setDuration(Number(e.target.value))}
            placeholder="e.g. 15"
            className={fieldClass}
            style={fieldStyle}
            onFocus={onFocusField} onBlur={onBlurField}
          />
        </FormField>

        {(type === 'video' || type === 'article') && (
          <FormField label={type === 'video' ? 'Video content' : 'Article / resource'}>
            <MediaUploadField
              mode="compact"
              type={type === 'video' ? 'video' : 'image'}
              value={contentUrl}
              onChange={setContentUrl}
              placeholder={type === 'video' ? 'Video URL or upload file' : 'Article / resource URL'}
            />
          </FormField>
        )}

        {(type === 'video' || type === 'article') && (
          <FormField label="Transcript">
            <TranscriptEditor lessonId={lesson.id} initialText={lesson.transcript} />
          </FormField>
        )}

        {/* Free toggle */}
        <div className="flex items-center justify-between rounded-xl px-4 py-3"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div>
            <p className="text-xs font-semibold text-white">Free preview</p>
            <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Allow non-enrolled users to preview this lesson
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsFree(v => !v)}
            className="relative h-5 w-9 rounded-full transition-colors shrink-0"
            style={{ background: isFree ? '#0057b8' : 'rgba(255,255,255,0.12)' }}>
            <span className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform"
              style={{ left: isFree ? '18px' : '2px' }} />
          </button>
        </div>

        <div className="flex items-center justify-end gap-2 pt-1">
          <button type="button" onClick={onCancel}
            className="rounded-xl px-4 py-2 text-xs font-semibold transition-colors hover:bg-white/06"
            style={{ color: 'rgba(255,255,255,0.5)' }}>
            Cancel
          </button>
          <button
            type="submit" disabled={pending}
            className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #3B82F6, #60A5FA)', boxShadow: '0 4px 12px rgba(59,130,246,0.25)' }}>
            {pending ? <Spinner size={11} /> : <Check size={11} />}
            Save changes
          </button>
        </div>
      </div>
    </motion.form>
  )
}
