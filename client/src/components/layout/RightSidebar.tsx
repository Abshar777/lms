'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ListChecks, Activity, Clock, CheckCircle2, Play,
  Flame, X, ChevronRight, Loader2, Sparkles, BookOpen,
  Trophy, Target, Video, Radio, Calendar,
} from 'lucide-react'
import { useCurrentUser } from '@/lib/api/user'
import { useMyEnrollments, useMyActivity, type MyEnrollment, type ActivityItem } from '@/lib/api/enrollments'
import { useUpcomingLiveClasses, isLive, type LiveClass } from '@/lib/api/liveClasses'
import { useUIStore } from '@/store/ui.store'

/* ─────────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────────── */

function fmtMins(mins: number): string {
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

function relTime(iso: string): string {
  const ms  = Date.now() - new Date(iso).getTime()
  const min = Math.floor(ms / 60_000)
  if (min < 1)        return 'just now'
  if (min < 60)       return `${min}m ago`
  const h = Math.floor(min / 60)
  if (h < 24)         return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7)          return `${d}d ago`
  const w = Math.floor(d / 7)
  return `${w}w ago`
}

function asCourse(e: MyEnrollment) {
  return typeof e.courseId === 'object' && e.courseId !== null ? e.courseId : null
}

function activityCourse(a: ActivityItem) {
  return typeof a.courseId === 'object' && a.courseId !== null ? a.courseId : null
}
function activityLesson(a: ActivityItem) {
  return typeof a.lessonId === 'object' && a.lessonId !== null ? a.lessonId : null
}

/* ─────────────────────────────────────────────────────
   Right sidebar
───────────────────────────────────────────────────── */

export function RightSidebar() {
  const { rightPanelOpen, setRightPanel } = useUIStore()
  const { data: user }                    = useCurrentUser()
  const { data: enrollments }             = useMyEnrollments()
  const { data: activity }                = useMyActivity(6)
  const { data: upcomingLive }            = useUpcomingLiveClasses(4)

  /* Build today's todos from enrollments: continue in-progress, start not-started */
  const todos = useMemo(() => {
    if (!enrollments) return []
    const items: Array<{ kind: 'continue' | 'start'; course: NonNullable<ReturnType<typeof asCourse>>; enrollment: MyEnrollment }> = []
    for (const e of enrollments) {
      const c = asCourse(e)
      if (!c) continue
      if (e.status === 'completed' || e.progressPercent >= 100) continue
      if (e.progressPercent > 0)        items.push({ kind: 'continue', course: c, enrollment: e })
      else                              items.push({ kind: 'start',    course: c, enrollment: e })
    }
    /* Continue items first, then up to 4 total */
    items.sort((a, b) => (a.kind === b.kind ? 0 : a.kind === 'continue' ? -1 : 1))
    return items.slice(0, 4)
  }, [enrollments])

  const stats = useMemo(() => {
    if (!enrollments) return { active: 0, completed: 0 }
    return {
      active:    enrollments.filter(e => e.status !== 'completed' && (e.progressPercent ?? 0) < 100).length,
      completed: enrollments.filter(e => e.status === 'completed' || (e.progressPercent ?? 0) >= 100).length,
    }
  }, [enrollments])

  const avatarInitial = (user?.name?.trim()?.[0] ?? '?').toUpperCase()
  const hasAvatarImage = !!user?.avatarUrl

  return (
    <AnimatePresence>
      {rightPanelOpen && (
        <motion.aside
          initial={{ x: 320, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 320, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed right-0 top-[100px] z-20 hidden h-[calc(100vh-100px)] w-[320px] flex-shrink-0 overflow-y-auto lg:flex"
          style={{
            background: 'white',
            borderLeft: '1px solid #E5E7EB',
            boxShadow: '-8px 0 24px rgba(13,15,26,0.04)',
          }}>

          <div className="flex w-full flex-col gap-5 p-5">

            {/* ─── Profile card ──────────────────────── */}
            <motion.section
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
              className="relative overflow-hidden rounded-2xl p-4"
              style={{
                background: 'linear-gradient(135deg, rgba(255,107,26,0.08) 0%, rgba(255,140,66,0.04) 100%)',
                border: '1px solid rgba(255,107,26,0.15)',
              }}>
              <button
                onClick={() => setRightPanel(false)}
                aria-label="Hide sidebar"
                className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-white/60"
                style={{ color: '#9CA3AF' }}>
                <X size={14} />
              </button>

              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-full text-base font-bold text-white"
                  style={{ background: 'linear-gradient(135deg, #FF6B1A, #FF8C42)' }}>
                  {hasAvatarImage
                    ? <img src={user!.avatarUrl} alt="" className="h-full w-full object-cover" />
                    : avatarInitial}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold" style={{ color: '#0D0F1A' }}>{user?.name ?? '—'}</p>
                  <p className="truncate text-[11px]" style={{ color: '#6B7280' }}>{user?.headline ?? (user?.role ? user.role[0]!.toUpperCase() + user.role.slice(1) : 'Student')}</p>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2">
                <ProfileStat icon={Target}     value={stats.active}    label="Active"     color="#FF6B1A" />
                <ProfileStat icon={Trophy}     value={stats.completed} label="Completed"  color="#22C55E" />
                <ProfileStat icon={Flame}      value={activity?.week.lessonsCompleted ?? 0} label="This week" color="#F59E0B" />
              </div>
            </motion.section>

            {/* ─── Upcoming live classes ─────────────── */}
            {upcomingLive && upcomingLive.length > 0 && (
              <motion.section
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
                <SectionHeader icon={Video} title="Upcoming live" />
                <div className="space-y-2">
                  {upcomingLive.slice(0, 3).map((l, i) => <LiveRow key={l.id} live={l} index={i} />)}
                </div>
              </motion.section>
            )}

            {/* ─── Today's todos ─────────────────────── */}
            <motion.section
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <SectionHeader icon={ListChecks} title="Today's plan" />
              {!enrollments && (
                <div className="flex items-center gap-2 px-1 py-2 text-xs" style={{ color: '#9CA3AF' }}>
                  <Loader2 size={12} className="animate-spin" />Loading…
                </div>
              )}
              {enrollments && todos.length === 0 && (
                <div className="rounded-xl px-3 py-3 text-xs"
                  style={{ background: '#F4F5F8', color: '#6B7280' }}>
                  Nothing queued. <Link href="/courses" className="font-semibold" style={{ color: '#FF6B1A' }}>Browse the catalogue →</Link>
                </div>
              )}
              <div className="space-y-2">
                {todos.map((t, i) => {
                  const href = t.enrollment.lastLessonId
                    ? `/learn/${t.course.slug}/${t.enrollment.lastLessonId}`
                    : `/courses/${t.course.slug}`
                  return (
                    <motion.div key={t.enrollment.id}
                      initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.12 + i * 0.05 }}>
                      <Link href={href}>
                        <div className="group flex items-center gap-2.5 rounded-xl p-2.5 transition-colors hover:bg-orange-50"
                          style={{ border: '1px solid #F0F1F5' }}>
                          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg"
                            style={{ background: t.kind === 'continue' ? 'rgba(255,107,26,0.10)' : '#F4F5F8' }}>
                            {t.kind === 'continue'
                              ? <Play size={12} fill="#FF6B1A" color="#FF6B1A" />
                              : <Sparkles size={12} style={{ color: '#6B7280' }} />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-semibold" style={{ color: '#0D0F1A' }}>
                              {t.kind === 'continue' ? 'Continue' : 'Start'} {t.course.title}
                            </p>
                            {t.kind === 'continue' && (
                              <div className="mt-1 flex items-center gap-1.5">
                                <div className="h-1 flex-1 overflow-hidden rounded-full" style={{ background: '#F3F4F6' }}>
                                  <div className="h-full rounded-full" style={{ background: '#22C55E', width: `${t.enrollment.progressPercent}%` }} />
                                </div>
                                <span className="text-[10px] font-semibold" style={{ color: '#22C55E' }}>
                                  {t.enrollment.progressPercent}%
                                </span>
                              </div>
                            )}
                          </div>
                          <ChevronRight size={12} className="flex-shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                            style={{ color: '#FF6B1A' }} />
                        </div>
                      </Link>
                    </motion.div>
                  )
                })}
              </div>
            </motion.section>

            {/* ─── Recent activity ───────────────────── */}
            <motion.section
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <SectionHeader icon={Activity} title="Recent activity" />
              {!activity && (
                <div className="flex items-center gap-2 px-1 py-2 text-xs" style={{ color: '#9CA3AF' }}>
                  <Loader2 size={12} className="animate-spin" />Loading…
                </div>
              )}
              {activity && activity.items.length === 0 && (
                <div className="rounded-xl px-3 py-3 text-xs"
                  style={{ background: '#F4F5F8', color: '#6B7280' }}>
                  Mark a lesson complete and it&apos;ll show up here.
                </div>
              )}
              <div className="space-y-2.5">
                {activity?.items.map((a, i) => {
                  const c = activityCourse(a)
                  const l = activityLesson(a)
                  return (
                    <motion.div key={a.id}
                      initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.18 + i * 0.04 }}
                      className="flex items-start gap-2.5">
                      <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full"
                        style={{ background: 'rgba(34,197,94,0.10)', border: '1px solid rgba(34,197,94,0.22)' }}>
                        <CheckCircle2 size={11} style={{ color: '#22C55E' }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-1 text-xs leading-snug" style={{ color: '#0D0F1A' }}>
                          Completed <span className="font-semibold">{l?.title ?? 'a lesson'}</span>
                        </p>
                        {c && (
                          <Link href={`/courses/${c.slug}`} className="line-clamp-1 mt-0.5 block text-[11px] transition-opacity hover:opacity-70"
                            style={{ color: '#9CA3AF' }}>
                            {c.title}
                          </Link>
                        )}
                        <p className="mt-0.5 flex items-center gap-1 text-[10px]" style={{ color: '#9CA3AF' }}>
                          <Clock size={9} />{relTime(a.completedAt ?? a.updatedAt)}
                          {l && l.durationMins > 0 && <> · {fmtMins(l.durationMins)}</>}
                        </p>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </motion.section>

            {/* ─── Week summary ──────────────────────── */}
            {activity && (activity.week.lessonsCompleted > 0 || activity.week.minutesWatched > 0) && (
              <motion.section
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                className="rounded-2xl p-3.5"
                style={{ background: '#0D0F1A', color: 'white' }}>
                <div className="mb-1.5 flex items-center gap-1.5">
                  <Flame size={11} style={{ color: '#FF6B1A' }} />
                  <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#9CA3AF' }}>This week</span>
                </div>
                <p className="text-sm font-semibold">
                  {activity.week.lessonsCompleted} lesson{activity.week.lessonsCompleted === 1 ? '' : 's'}
                  {activity.week.minutesWatched > 0 && <span style={{ color: '#9CA3AF' }}> · {fmtMins(activity.week.minutesWatched)} watched</span>}
                </p>
                <p className="mt-1 text-[11px]" style={{ color: '#9CA3AF' }}>
                  Keep the streak going — your next lesson is waiting above.
                </p>
              </motion.section>
            )}

            {/* ─── Quick links ───────────────────────── */}
            <motion.section
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
              <SectionHeader icon={BookOpen} title="Quick links" />
              <div className="space-y-1">
                <QuickLink href="/my-learning" label="My library" />
                <QuickLink href="/courses"     label="Browse catalogue" />
                <QuickLink href="/favorites"   label="Saved courses" />
                <QuickLink href="/settings"    label="Profile & settings" />
              </div>
            </motion.section>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  )
}

/* ─────────────────────────────────────────────────────
   Sub-components
───────────────────────────────────────────────────── */

function ProfileStat({ icon: Icon, value, label, color }: {
  icon: React.ElementType; value: number; label: string; color: string
}) {
  return (
    <div className="rounded-xl bg-white p-2"
      style={{ border: '1px solid #E5E7EB' }}>
      <div className="flex items-center gap-1">
        <Icon size={10} style={{ color }} />
        <span className="text-xs font-bold" style={{ color: '#0D0F1A' }}>{value}</span>
      </div>
      <p className="mt-0.5 text-[10px]" style={{ color: '#9CA3AF' }}>{label}</p>
    </div>
  )
}

function SectionHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="mb-2 flex items-center gap-1.5">
      <Icon size={12} style={{ color: '#FF6B1A' }} />
      <h3 className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: '#9CA3AF' }}>{title}</h3>
    </div>
  )
}

function LiveRow({ live, index }: { live: LiveClass; index: number }) {
  const liveNow = isLive(live)
  const course  = typeof live.course === 'object' ? live.course : null
  const when    = new Date(live.scheduledStart).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
  return (
    <motion.a
      href={live.meetingUrl}
      target="_blank"
      rel="noreferrer noopener"
      initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + index * 0.04 }}
      className="group flex items-center gap-2.5 rounded-xl p-2.5 transition-colors hover:bg-orange-50"
      style={{ border: '1px solid #F0F1F5' }}>
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg"
        style={{
          background: liveNow ? 'rgba(239,68,68,0.10)' : 'rgba(99,102,241,0.08)',
          border:     `1px solid ${liveNow ? 'rgba(239,68,68,0.25)' : 'rgba(99,102,241,0.20)'}`,
        }}>
        {liveNow ? <Radio size={12} style={{ color: '#EF4444' }} /> : <Calendar size={12} style={{ color: '#6366F1' }} />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold" style={{ color: '#0D0F1A' }}>{live.title}</p>
        <div className="mt-0.5 flex items-center gap-1 text-[10px]" style={{ color: '#9CA3AF' }}>
          {liveNow
            ? <span style={{ color: '#EF4444', fontWeight: 600 }}>LIVE NOW</span>
            : <>{when}</>}
          {course && <> · <span className="truncate">{course.title}</span></>}
        </div>
      </div>
    </motion.a>
  )
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href}>
      <div className="group flex items-center justify-between rounded-lg px-3 py-2 transition-colors hover:bg-orange-50">
        <span className="text-xs font-medium" style={{ color: '#374151' }}>{label}</span>
        <ChevronRight size={11} className="opacity-0 transition-opacity group-hover:opacity-100" style={{ color: '#FF6B1A' }} />
      </div>
    </Link>
  )
}

/* ─────────────────────────────────────────────────────
   Floating toggle button — shown when sidebar is closed
───────────────────────────────────────────────────── */
export function RightSidebarToggle() {
  const { rightPanelOpen, setRightPanel } = useUIStore()
  if (rightPanelOpen) return null
  return (
    <motion.button
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      onClick={() => setRightPanel(true)}
      aria-label="Show activity panel"
      className="fixed right-4 top-[120px] z-20 hidden h-10 w-10 items-center justify-center rounded-full shadow-lg transition-shadow hover:shadow-xl lg:flex"
      style={{ background: 'white', border: '1px solid #E5E7EB' }}>
      <Activity size={15} style={{ color: '#FF6B1A' }} />
    </motion.button>
  )
}
