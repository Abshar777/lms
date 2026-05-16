'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ListChecks, Activity, Clock, CheckCircle2, Play,
  Flame, X, ChevronRight, Loader2, Sparkles, BookOpen,
  Trophy, Target, Video, Radio, Calendar, ArrowUpRight,
  TrendingUp, Zap,
} from 'lucide-react'
import { useCurrentUser } from '@/lib/api/user'
import { useMyEnrollments, useMyActivity, type MyEnrollment, type ActivityItem } from '@/lib/api/enrollments'
import { useUpcomingLiveClasses, isLive, type LiveClass } from '@/lib/api/liveClasses'
import { useUIStore } from '@/store/ui.store'

/* ── Helpers ──────────────────────────────────────────── */
function fmtMins(mins: number): string {
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60); const m = mins % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

function relTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const min = Math.floor(ms / 60_000)
  if (min < 1)  return 'just now'
  if (min < 60) return `${min}m ago`
  const h = Math.floor(min / 60)
  if (h < 24)   return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7)    return `${d}d ago`
  return `${Math.floor(d / 7)}w ago`
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

/* ── Section header ───────────────────────────────────── */
function SectionHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <div className="flex h-5 w-5 items-center justify-center rounded-md"
        style={{ background: 'rgba(255,107,26,0.10)' }}>
        <Icon size={11} style={{ color: '#FF6B1A' }} />
      </div>
      <h3 className="text-[11px] font-bold uppercase tracking-[0.08em]" style={{ color: '#9CA3AF' }}>{title}</h3>
    </div>
  )
}

/* ── Divider ──────────────────────────────────────────── */
function Divider() {
  return <div className="h-px w-full" style={{ background: 'linear-gradient(90deg, #F3F4F6, #E5E7EB 40%, #F3F4F6)' }} />
}

/* ── Right sidebar ────────────────────────────────────── */
export function RightSidebar() {
  const { rightPanelOpen, setRightPanel } = useUIStore()
  const { data: user }        = useCurrentUser()
  const { data: enrollments } = useMyEnrollments()
  const { data: activity }    = useMyActivity(6)
  const { data: upcomingLive } = useUpcomingLiveClasses(4)

  const todos = useMemo(() => {
    if (!enrollments) return []
    const items: Array<{ kind: 'continue' | 'start'; course: NonNullable<ReturnType<typeof asCourse>>; enrollment: MyEnrollment }> = []
    for (const e of enrollments) {
      const c = asCourse(e)
      if (!c) continue
      if (e.status === 'completed' || e.progressPercent >= 100) continue
      if (e.progressPercent > 0) items.push({ kind: 'continue', course: c, enrollment: e })
      else                       items.push({ kind: 'start',    course: c, enrollment: e })
    }
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

  const avatarInitial  = (user?.name?.trim()?.[0] ?? '?').toUpperCase()
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
            background: 'linear-gradient(180deg, #FAFBFC 0%, #F8F9FB 100%)',
            borderLeft: '1px solid #EAECF0',
            boxShadow: '-12px 0 32px rgba(13,15,26,0.05)',
          }}>

          <div className="flex w-full flex-col gap-4 p-4">

            {/* ── Profile card ─────────────────────────── */}
            <motion.section
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 }}
              className="relative overflow-hidden rounded-2xl p-4"
              style={{
                background: 'linear-gradient(135deg, #fff7f0 0%, #fff 60%)',
                border: '1px solid rgba(255,107,26,0.18)',
                boxShadow: '0 2px 12px rgba(255,107,26,0.08)',
              }}>

              {/* Decorative glow blob */}
              <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full opacity-25 blur-2xl"
                style={{ background: 'radial-gradient(circle, #FF6B1A, transparent)' }} />

              <button onClick={() => setRightPanel(false)} aria-label="Hide sidebar"
                className="absolute right-2.5 top-2.5 flex h-6 w-6 items-center justify-center rounded-lg transition-colors hover:bg-white/80"
                style={{ color: '#9CA3AF' }}>
                <X size={13} />
              </button>

              <div className="flex items-center gap-3">
                <div className="relative flex-shrink-0">
                  <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl text-base font-bold text-white ring-2 ring-orange-100"
                    style={{ background: 'linear-gradient(135deg, #FF6B1A, #FF8C42)', boxShadow: '0 4px 12px rgba(255,107,26,0.30)' }}>
                    {hasAvatarImage
                      ? <img src={user!.avatarUrl} alt="" className="h-full w-full object-cover" />
                      : avatarInitial}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full ring-2 ring-white"
                    style={{ background: '#22C55E' }} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold" style={{ color: '#0D0F1A' }}>{user?.name ?? '—'}</p>
                  <p className="truncate text-[11px]" style={{ color: '#9CA3AF' }}>
                    {user?.headline ?? (user?.role ? user.role[0]!.toUpperCase() + user.role.slice(1) : 'Student')}
                  </p>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2">
                <StatPill icon={Target}   value={stats.active}    label="Active"    color="#FF6B1A" bg="rgba(255,107,26,0.08)" />
                <StatPill icon={Trophy}   value={stats.completed} label="Done"      color="#22C55E" bg="rgba(34,197,94,0.08)"  />
                <StatPill icon={Flame}    value={activity?.week.lessonsCompleted ?? 0} label="This week" color="#F59E0B" bg="rgba(245,158,11,0.08)" />
              </div>
            </motion.section>

            <Divider />

            {/* ── Upcoming live ──────────────────────── */}
            {upcomingLive && upcomingLive.length > 0 && (
              <motion.section
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.07 }}>
                <SectionHeader icon={Video} title="Live classes" />
                <div className="space-y-1.5">
                  {upcomingLive.slice(0, 3).map((l, i) => <LiveRow key={l.id} live={l} index={i} />)}
                </div>
              </motion.section>
            )}

            {upcomingLive && upcomingLive.length > 0 && <Divider />}

            {/* ── Today's plan ───────────────────────── */}
            <motion.section
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.10 }}>
              <SectionHeader icon={ListChecks} title="Today's plan" />

              {!enrollments && (
                <div className="flex items-center gap-2 px-1 py-2 text-xs" style={{ color: '#9CA3AF' }}>
                  <Loader2 size={12} className="animate-spin" /> Loading…
                </div>
              )}
              {enrollments && todos.length === 0 && (
                <div className="rounded-xl px-3 py-2.5 text-xs"
                  style={{ background: '#F4F5F8', color: '#6B7280', border: '1px solid #EAECF0' }}>
                  Nothing queued.{' '}
                  <Link href="/courses" className="font-semibold transition-opacity hover:opacity-70"
                    style={{ color: '#FF6B1A' }}>Browse catalogue →</Link>
                </div>
              )}
              <div className="space-y-1.5">
                {todos.map((t, i) => {
                  const href = t.enrollment.lastLessonId
                    ? `/learn/${t.course.slug}/${t.enrollment.lastLessonId}`
                    : `/courses/${t.course.slug}`
                  return (
                    <motion.div key={t.enrollment.id}
                      initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.12 + i * 0.05 }}>
                      <Link href={href}>
                        <div className="group flex items-center gap-2.5 rounded-xl p-2.5 transition-all hover:bg-orange-50"
                          style={{ border: '1px solid #F0F1F5', background: 'white' }}>
                          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105"
                            style={{
                              background: t.kind === 'continue' ? 'linear-gradient(135deg,rgba(255,107,26,0.15),rgba(255,140,66,0.08))' : '#F4F5F8',
                              border: t.kind === 'continue' ? '1px solid rgba(255,107,26,0.20)' : '1px solid #EAECF0',
                            }}>
                            {t.kind === 'continue'
                              ? <Play size={11} fill="#FF6B1A" color="#FF6B1A" />
                              : <Sparkles size={11} style={{ color: '#6B7280' }} />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-semibold" style={{ color: '#0D0F1A' }}>
                              {t.kind === 'continue' ? 'Continue' : 'Start'}{' '}{t.course.title}
                            </p>
                            {t.kind === 'continue' && (
                              <div className="mt-1 flex items-center gap-1.5">
                                <div className="h-1 flex-1 overflow-hidden rounded-full" style={{ background: '#F3F4F6' }}>
                                  <div className="h-full rounded-full transition-all"
                                    style={{ background: 'linear-gradient(90deg,#22C55E,#4ADE80)', width: `${t.enrollment.progressPercent}%` }} />
                                </div>
                                <span className="text-[10px] font-bold tabular-nums" style={{ color: '#22C55E' }}>
                                  {t.enrollment.progressPercent}%
                                </span>
                              </div>
                            )}
                          </div>
                          <ChevronRight size={11} className="flex-shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                            style={{ color: '#FF6B1A' }} />
                        </div>
                      </Link>
                    </motion.div>
                  )
                })}
              </div>
            </motion.section>

            <Divider />

            {/* ── Recent activity ────────────────────── */}
            <motion.section
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}>
              <SectionHeader icon={Activity} title="Recent activity" />

              {!activity && (
                <div className="flex items-center gap-2 px-1 py-2 text-xs" style={{ color: '#9CA3AF' }}>
                  <Loader2 size={12} className="animate-spin" /> Loading…
                </div>
              )}
              {activity && activity.items.length === 0 && (
                <div className="rounded-xl px-3 py-2.5 text-xs"
                  style={{ background: '#F4F5F8', color: '#6B7280', border: '1px solid #EAECF0' }}>
                  Mark a lesson complete and it&apos;ll show up here.
                </div>
              )}
              <div className="space-y-2.5">
                {activity?.items.map((a, i) => {
                  const c = activityCourse(a)
                  const l = activityLesson(a)
                  return (
                    <motion.div key={a.id}
                      initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.17 + i * 0.04 }}
                      className="flex items-start gap-2.5">
                      <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full"
                        style={{ background: 'rgba(34,197,94,0.10)', border: '1px solid rgba(34,197,94,0.22)' }}>
                        <CheckCircle2 size={11} style={{ color: '#22C55E' }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-1 text-xs leading-snug" style={{ color: '#0D0F1A' }}>
                          Completed{' '}<span className="font-semibold">{l?.title ?? 'a lesson'}</span>
                        </p>
                        {c && (
                          <Link href={`/courses/${c.slug}`}
                            className="mt-0.5 block line-clamp-1 text-[11px] transition-colors hover:text-orange-500"
                            style={{ color: '#9CA3AF' }}>
                            {c.title}
                          </Link>
                        )}
                        <p className="mt-0.5 flex items-center gap-1 text-[10px]" style={{ color: '#C4C9D4' }}>
                          <Clock size={9} />{relTime(a.completedAt ?? a.updatedAt)}
                          {l && l.durationMins > 0 && <> · {fmtMins(l.durationMins)}</>}
                        </p>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </motion.section>

            {/* ── Week summary ───────────────────────── */}
            {activity && (activity.week.lessonsCompleted > 0 || activity.week.minutesWatched > 0) && (
              <>
                <Divider />
                <motion.section
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.19 }}
                  className="relative overflow-hidden rounded-2xl p-4"
                  style={{ background: '#0D0F1A' }}>
                  {/* Glow accent */}
                  <div className="pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-full opacity-40 blur-2xl"
                    style={{ background: '#FF6B1A' }} />
                  <div className="relative">
                    <div className="mb-2 flex items-center gap-1.5">
                      <Flame size={12} style={{ color: '#FF6B1A' }} />
                      <span className="text-[10px] font-bold uppercase tracking-[0.09em]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                        This week
                      </span>
                    </div>
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-lg font-bold text-white">
                          {activity.week.lessonsCompleted}
                          <span className="ml-1 text-sm font-normal" style={{ color: 'rgba(255,255,255,0.45)' }}>
                            lesson{activity.week.lessonsCompleted === 1 ? '' : 's'}
                          </span>
                        </p>
                        {activity.week.minutesWatched > 0 && (
                          <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                            {fmtMins(activity.week.minutesWatched)} watched
                          </p>
                        )}
                      </div>
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl"
                        style={{ background: 'rgba(255,107,26,0.18)', border: '1px solid rgba(255,107,26,0.25)' }}>
                        <TrendingUp size={13} style={{ color: '#FF6B1A' }} />
                      </div>
                    </div>
                    <p className="mt-2 text-[11px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
                      Keep the streak going — your next lesson is waiting.
                    </p>
                  </div>
                </motion.section>
              </>
            )}

            <Divider />

            {/* ── Quick links ────────────────────────── */}
            <motion.section
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}>
              <SectionHeader icon={BookOpen} title="Quick links" />
              <div className="grid grid-cols-2 gap-1.5">
                <QuickTile href="/my-learning"  label="My library"       icon={BookOpen} />
                <QuickTile href="/courses"       label="Browse"           icon={Sparkles} />
                <QuickTile href="/favorites"     label="Saved"            icon={Trophy}   />
                <QuickTile href="/settings"      label="Settings"         icon={Target}   />
              </div>
            </motion.section>

          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  )
}

/* ── Sub-components ───────────────────────────────────── */
function StatPill({ icon: Icon, value, label, color, bg }: {
  icon: React.ElementType; value: number; label: string; color: string; bg: string
}) {
  return (
    <div className="flex flex-col gap-1 rounded-xl p-2.5"
      style={{ background: 'white', border: '1px solid #EAECF0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <div className="flex items-center gap-1.5">
        <div className="flex h-5 w-5 items-center justify-center rounded-md" style={{ background: bg }}>
          <Icon size={10} style={{ color }} />
        </div>
        <span className="text-sm font-bold" style={{ color: '#0D0F1A' }}>{value}</span>
      </div>
      <p className="text-[10px] font-medium" style={{ color: '#9CA3AF' }}>{label}</p>
    </div>
  )
}

function LiveRow({ live, index }: { live: LiveClass; index: number }) {
  const liveNow = isLive(live)
  const course  = typeof live.course === 'object' ? live.course : null
  const when    = new Date(live.scheduledStart).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  })
  return (
    <motion.a
      href={live.meetingUrl} target="_blank" rel="noreferrer noopener"
      initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.09 + index * 0.04 }}
      className="group flex items-center gap-2.5 rounded-xl p-2.5 transition-all hover:bg-orange-50"
      style={{ border: '1px solid #F0F1F5', background: 'white' }}>
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105"
        style={{
          background: liveNow ? 'rgba(239,68,68,0.08)' : 'rgba(99,102,241,0.08)',
          border: `1px solid ${liveNow ? 'rgba(239,68,68,0.22)' : 'rgba(99,102,241,0.18)'}`,
        }}>
        {liveNow
          ? <Radio size={11} style={{ color: '#EF4444' }} />
          : <Calendar size={11} style={{ color: '#6366F1' }} />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold" style={{ color: '#0D0F1A' }}>{live.title}</p>
        <p className="mt-0.5 text-[10px]" style={{ color: '#9CA3AF' }}>
          {liveNow
            ? <span style={{ color: '#EF4444', fontWeight: 700 }}>● LIVE NOW</span>
            : <>{when}{course && ` · ${course.title}`}</>}
        </p>
      </div>
      <ArrowUpRight size={11} className="flex-shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
        style={{ color: liveNow ? '#EF4444' : '#6366F1' }} />
    </motion.a>
  )
}

function QuickTile({ href, label, icon: Icon }: { href: string; label: string; icon: React.ElementType }) {
  return (
    <Link href={href}>
      <div className="group flex items-center gap-2 rounded-xl px-3 py-2.5 transition-all hover:bg-white hover:shadow-sm"
        style={{ border: '1px solid transparent' }}
        onMouseEnter={e => { e.currentTarget.style.border = '1px solid #EAECF0' }}
        onMouseLeave={e => { e.currentTarget.style.border = '1px solid transparent' }}>
        <Icon size={12} className="flex-shrink-0 transition-colors group-hover:text-orange-500"
          style={{ color: '#9CA3AF' }} />
        <span className="text-xs font-medium transition-colors group-hover:text-gray-800"
          style={{ color: '#6B7280' }}>{label}</span>
      </div>
    </Link>
  )
}

/* ── Floating toggle ──────────────────────────────────── */
export function RightSidebarToggle() {
  const { rightPanelOpen, setRightPanel } = useUIStore()
  if (rightPanelOpen) return null
  return (
    <motion.button
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      onClick={() => setRightPanel(true)}
      aria-label="Show activity panel"
      className="fixed right-4 top-[120px] z-20 hidden h-10 w-10 items-center justify-center rounded-full transition-shadow hover:shadow-xl lg:flex"
      style={{ background: 'white', border: '1px solid #E5E7EB', boxShadow: '0 4px 14px rgba(0,0,0,0.10)' }}>
      <Zap size={15} style={{ color: '#FF6B1A' }} />
    </motion.button>
  )
}
