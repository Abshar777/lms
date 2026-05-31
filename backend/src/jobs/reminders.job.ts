/**
 * reminders.job.ts — Booking reminder cron jobs
 *
 * Three tiers of reminders for every booked class slot:
 *   1. Day-before  — sent when session is 23–25 h away   (runs every hour)
 *   2. Day-of      — sent on the morning of the session   (runs daily at 7am)
 *   3. Pre-session — sent when session is 25–35 min away  (runs every hour)
 *
 * Each reminder:
 *   a) Creates an in-app notification  (always, even if SMTP is unconfigured)
 *   b) Sends an email                  (non-blocking)
 *   c) If email fails → creates a 'system' in-app notification so the student
 *      still gets alerted inside the app
 *
 * Duplicate prevention: reminder flag fields on ClassBooking
 *   (reminderDayBeforeSent / reminderDayOfSent / reminderPreSessionSent)
 *   are set to true after the first successful dispatch.
 */
import cron from 'node-cron'
import { logger } from '@/utils/logger.ts'
import { NotificationService } from '@/services/notification.service.ts'
import {
  sendSessionLinkReminder,
  sendDayOfReminder,
  sendPreSessionReminder,
  sendFiveMinReminder,
  sendClassStartingReminder,
} from '@/services/email.service.ts'

const notifSvc = new NotificationService()

/* ── Types ──────────────────────────────────────────── */
interface BookingWithRefs {
  _id:    any
  userId: { _id: any; id: string; name: string; email: string }
  liveClassId: {
    id:             string
    title:          string
    scheduledStart: Date
    meetingUrl?:    string
    muxPlaybackId?: string
  }
  reminderDayBeforeSent:  boolean
  reminderDayOfSent:      boolean
  reminderPreSessionSent: boolean
  reminder5MinSent:       boolean
  reminderAtTimeSent:     boolean
}

/* ── Helpers ─────────────────────────────────────────── */
function getJoinUrl(lc: BookingWithRefs['liveClassId']): string {
  return lc.meetingUrl
    ?? `${process.env['CLIENT_URL'] ?? 'http://localhost:3000'}/live-classes/${lc.id}/watch`
}

function fmtFull(d: Date): string {
  return d.toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })
}

function fmtTime(d: Date): string {
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

/**
 * Dispatch one reminder:
 *   1. In-app notification (always)
 *   2. Email — on failure → extra system notification
 */
async function dispatch(
  userId:       string,
  sessionTitle: string,
  sessionStart: Date,
  kind:         'day-before' | 'day-of' | 'pre-session',
  emailFn:      () => Promise<void>,
): Promise<void> {
  const dateLabel = fmtFull(sessionStart)
  const timeLabel = fmtTime(sessionStart)

  /* ── Notification body by kind ── */
  const notifBody = {
    'day-before':  `📅 Reminder: "${sessionTitle}" is tomorrow at ${timeLabel}. Make sure you're ready!`,
    'day-of':      `⏰ Today's class: "${sessionTitle}" starts at ${timeLabel}. Join on time!`,
    'pre-session': `🚀 "${sessionTitle}" starts in ~30 minutes. Get ready to join!`,
  }[kind]

  const notifTitle = {
    'day-before':  `Class tomorrow: ${sessionTitle}`,
    'day-of':      `Class today: ${sessionTitle} at ${timeLabel}`,
    'pre-session': `Starting soon: ${sessionTitle}`,
  }[kind]

  /* 1. In-app notification — always fires */
  await notifSvc.create(userId, {
    kind:  'class-reminder',
    title: notifTitle,
    body:  notifBody,
    link:  '/class-bookings',
  }).catch(err => logger.error({ err, userId, kind }, '[Reminder] Failed to create in-app notification'))

  /* 2. Email — failure creates a system notification instead of silently dropping */
  try {
    await emailFn()
  } catch (err) {
    logger.error({ err, userId, sessionTitle, kind }, '[Reminder] Email delivery failed')
    await notifSvc.create(userId, {
      kind:  'system',
      title: 'Reminder email could not be sent',
      body:  `We tried to email you about "${sessionTitle}" (${dateLabel}) but delivery failed. Check your Class Schedule to stay on track.`,
      link:  '/class-bookings',
    }).catch(() => {/* truly non-fatal */})
  }
}

/* ── Day-before job ──────────────────────────────────── */
async function runDayBeforeReminders(): Promise<void> {
  try {
    const { ClassBookingModel } = await import('@/models/schema.ts')
    const now  = new Date()
    const from = new Date(now.getTime() + 23 * 60 * 60 * 1000)
    const to   = new Date(now.getTime() + 25 * 60 * 60 * 1000)

    const bookings = await ClassBookingModel.find({
      status: 'booked',
      reminderDayBeforeSent: false,
    })
      .populate<{ userId: BookingWithRefs['userId'] }>('userId', 'name email')
      .populate<{ liveClassId: BookingWithRefs['liveClassId'] }>('liveClassId', 'id title scheduledStart meetingUrl muxPlaybackId')
      .lean({ virtuals: true }) as unknown as BookingWithRefs[]

    const due = bookings.filter(b => {
      const s = new Date(b.liveClassId.scheduledStart)
      return s >= from && s <= to
    })

    for (const b of due) {
      const userId   = b.userId.id ?? b.userId._id?.toString()
      const start    = new Date(b.liveClassId.scheduledStart)
      const joinUrl  = getJoinUrl(b.liveClassId)

      await dispatch(userId, b.liveClassId.title, start, 'day-before', () =>
        sendSessionLinkReminder(b.userId.email, b.userId.name, b.liveClassId.title, fmtFull(start), joinUrl),
      )

      await ClassBookingModel.findByIdAndUpdate(b._id, { reminderDayBeforeSent: true })
    }

    if (due.length) logger.info(`[Reminders] Day-before: dispatched ${due.length} reminders`)
  } catch (err) {
    logger.error({ err }, '[Reminders] day-before job error')
  }
}

/* ── Day-of job ─────────────────────────────────────── */
async function runDayOfReminders(): Promise<void> {
  try {
    const { ClassBookingModel } = await import('@/models/schema.ts')
    const now   = new Date()
    const start = new Date(now); start.setHours(0, 0, 0, 0)
    const end   = new Date(now); end.setHours(23, 59, 59, 999)

    const bookings = await ClassBookingModel.find({
      status: 'booked',
      reminderDayOfSent: false,
    })
      .populate<{ userId: BookingWithRefs['userId'] }>('userId', 'name email')
      .populate<{ liveClassId: BookingWithRefs['liveClassId'] }>('liveClassId', 'id title scheduledStart meetingUrl muxPlaybackId')
      .lean({ virtuals: true }) as unknown as BookingWithRefs[]

    const due = bookings.filter(b => {
      const s = new Date(b.liveClassId.scheduledStart)
      return s >= start && s <= end
    })

    for (const b of due) {
      const userId  = b.userId.id ?? b.userId._id?.toString()
      const classAt = new Date(b.liveClassId.scheduledStart)
      const joinUrl = getJoinUrl(b.liveClassId)

      await dispatch(userId, b.liveClassId.title, classAt, 'day-of', () =>
        sendDayOfReminder(b.userId.email, b.userId.name, b.liveClassId.title, fmtTime(classAt), joinUrl),
      )

      await ClassBookingModel.findByIdAndUpdate(b._id, { reminderDayOfSent: true })
    }

    if (due.length) logger.info(`[Reminders] Day-of: dispatched ${due.length} reminders`)
  } catch (err) {
    logger.error({ err }, '[Reminders] day-of job error')
  }
}

/* ── Pre-session job (30 min) ────────────────────────── */
async function runPreSessionReminders(): Promise<void> {
  try {
    const { ClassBookingModel } = await import('@/models/schema.ts')
    const now  = new Date()
    const from = new Date(now.getTime() + 25 * 60 * 1000)
    const to   = new Date(now.getTime() + 35 * 60 * 1000)

    const bookings = await ClassBookingModel.find({
      status: 'booked',
      reminderPreSessionSent: false,
    })
      .populate<{ userId: BookingWithRefs['userId'] }>('userId', 'name email')
      .populate<{ liveClassId: BookingWithRefs['liveClassId'] }>('liveClassId', 'id title scheduledStart meetingUrl muxPlaybackId')
      .lean({ virtuals: true }) as unknown as BookingWithRefs[]

    const due = bookings.filter(b => {
      const s = new Date(b.liveClassId.scheduledStart)
      return s >= from && s <= to
    })

    for (const b of due) {
      const userId  = b.userId.id ?? b.userId._id?.toString()
      const classAt = new Date(b.liveClassId.scheduledStart)

      await dispatch(userId, b.liveClassId.title, classAt, 'pre-session', () =>
        sendPreSessionReminder(b.userId.email, b.userId.name, b.liveClassId.title, 30),
      )

      await ClassBookingModel.findByIdAndUpdate(b._id, { reminderPreSessionSent: true })
    }

    if (due.length) logger.info(`[Reminders] Pre-session: dispatched ${due.length} reminders`)
  } catch (err) {
    logger.error({ err }, '[Reminders] pre-session job error')
  }
}

/* ── 5-min job ───────────────────────────────────────── */
async function runFiveMinReminders(): Promise<void> {
  try {
    const { ClassBookingModel } = await import('@/models/schema.ts')
    const now  = new Date()
    const from = new Date(now.getTime() + 3 * 60 * 1000)
    const to   = new Date(now.getTime() + 8 * 60 * 1000)

    const bookings = await ClassBookingModel.find({
      status: 'booked',
      reminder5MinSent: false,
    })
      .populate<{ userId: BookingWithRefs['userId'] }>('userId', 'name email')
      .populate<{ liveClassId: BookingWithRefs['liveClassId'] }>('liveClassId', 'id title scheduledStart meetingUrl muxPlaybackId')
      .lean({ virtuals: true }) as unknown as BookingWithRefs[]

    const due = bookings.filter(b => {
      const s = new Date(b.liveClassId.scheduledStart)
      return s >= from && s <= to
    })

    for (const b of due) {
      const userId  = b.userId.id ?? b.userId._id?.toString()
      const classAt = new Date(b.liveClassId.scheduledStart)
      const joinUrl = getJoinUrl(b.liveClassId)

      await dispatch(userId, b.liveClassId.title, classAt, 'pre-session', () =>
        sendFiveMinReminder(b.userId.email, b.userId.name, b.liveClassId.title, joinUrl),
      )

      await ClassBookingModel.findByIdAndUpdate(b._id, { reminder5MinSent: true })
    }

    if (due.length) logger.info(`[Reminders] 5-min: dispatched ${due.length} reminders`)
  } catch (err) {
    logger.error({ err }, '[Reminders] 5-min job error')
  }
}

/* ── At-time job ─────────────────────────────────────── */
async function runAtTimeReminders(): Promise<void> {
  try {
    const { ClassBookingModel } = await import('@/models/schema.ts')
    const now  = new Date()
    const from = new Date(now.getTime() - 5 * 60 * 1000)   // up to 5 min ago
    const to   = new Date(now.getTime())                    // up to now

    const bookings = await ClassBookingModel.find({
      status: 'booked',
      reminderAtTimeSent: false,
    })
      .populate<{ userId: BookingWithRefs['userId'] }>('userId', 'name email')
      .populate<{ liveClassId: BookingWithRefs['liveClassId'] }>('liveClassId', 'id title scheduledStart meetingUrl muxPlaybackId')
      .lean({ virtuals: true }) as unknown as BookingWithRefs[]

    const due = bookings.filter(b => {
      const s = new Date(b.liveClassId.scheduledStart)
      return s >= from && s <= to
    })

    for (const b of due) {
      const userId  = b.userId.id ?? b.userId._id?.toString()
      const classAt = new Date(b.liveClassId.scheduledStart)
      const joinUrl = getJoinUrl(b.liveClassId)

      await dispatch(userId, b.liveClassId.title, classAt, 'pre-session', () =>
        sendClassStartingReminder(b.userId.email, b.userId.name, b.liveClassId.title, joinUrl),
      )

      await ClassBookingModel.findByIdAndUpdate(b._id, { reminderAtTimeSent: true })
    }

    if (due.length) logger.info(`[Reminders] At-time: dispatched ${due.length} reminders`)
  } catch (err) {
    logger.error({ err }, '[Reminders] at-time job error')
  }
}

/* ── Entry point ─────────────────────────────────────── */
export function startReminderJobs(): void {
  // Every hour at :00 — day-before reminders (23–25 h window)
  cron.schedule('0 * * * *', runDayBeforeReminders)

  // Every day at 7:00am — day-of reminders
  cron.schedule('0 7 * * *', runDayOfReminders)

  // Every hour at :30 — pre-session reminders (25–35 min window, NO link)
  cron.schedule('30 * * * *', runPreSessionReminders)

  // Every 5 min — 5-min reminder WITH link (3–8 min window)
  cron.schedule('*/5 * * * *', runFiveMinReminders)

  // Every 5 min — at-time reminder WITH link (0–5 min after start)
  cron.schedule('*/5 * * * *', runAtTimeReminders)

  logger.info('[Reminders] Cron jobs scheduled')
}
