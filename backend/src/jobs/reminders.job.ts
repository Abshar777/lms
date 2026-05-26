/**
 * Reminder cron job — runs on backend startup.
 * Sends booking reminders via email (and optionally WhatsApp).
 *
 * Schedule:
 *  - Every hour: check for sessions starting in ~24h → day-before email
 *  - Every hour: check for sessions starting in ~30min → pre-session email
 *  - Every day 7am: check for sessions today → day-of email
 *
 * Requires: npm install node-cron
 */
import cron from 'node-cron'
import {
  sendSessionLinkReminder,
  sendDayOfReminder,
  sendPreSessionReminder,
} from '@/services/email.service.ts'

interface BookingWithRefs {
  _id: any
  userId: { name: string; email: string }
  liveClassId: {
    title: string
    scheduledStart: Date
    meetingUrl?: string
    muxPlaybackId?: string
  }
  reminderDayBeforeSent: boolean
  reminderDayOfSent:     boolean
  reminderPreSessionSent: boolean
}

function getJoinUrl(lc: BookingWithRefs['liveClassId']): string {
  return lc.meetingUrl ?? `${process.env.CLIENT_URL ?? 'http://localhost:3000'}/live-classes`
}

async function runDayBeforeReminders(): Promise<void> {
  try {
    const { ClassBookingModel } = await import('@/models/schema.ts')
    const now   = new Date()
    const from  = new Date(now.getTime() + 23 * 60 * 60 * 1000)   // 23h from now
    const to    = new Date(now.getTime() + 25 * 60 * 60 * 1000)   // 25h from now

    const bookings = await ClassBookingModel.find({
      status: 'booked',
      reminderDayBeforeSent: false,
    })
      .populate<{ userId: { name: string; email: string } }>('userId', 'name email')
      .populate<{ liveClassId: BookingWithRefs['liveClassId'] }>('liveClassId', 'title scheduledStart meetingUrl muxPlaybackId')
      .lean({ virtuals: true }) as unknown as BookingWithRefs[]

    const due = bookings.filter(b => {
      const start = new Date(b.liveClassId.scheduledStart)
      return start >= from && start <= to
    })

    for (const b of due) {
      const dateStr = new Date(b.liveClassId.scheduledStart).toLocaleString()
      await sendSessionLinkReminder(
        b.userId.email,
        b.userId.name,
        b.liveClassId.title,
        dateStr,
        getJoinUrl(b.liveClassId),
      ).catch(e => console.error('[Reminder] day-before email failed:', e))
      await ClassBookingModel.findByIdAndUpdate(b._id, { reminderDayBeforeSent: true })
    }
    if (due.length) console.log(`[Reminders] Day-before: sent ${due.length} emails`)
  } catch (e) {
    console.error('[Reminders] day-before job error:', e)
  }
}

async function runDayOfReminders(): Promise<void> {
  try {
    const { ClassBookingModel } = await import('@/models/schema.ts')
    const now   = new Date()
    const start = new Date(now)
    start.setHours(0, 0, 0, 0)
    const end   = new Date(now)
    end.setHours(23, 59, 59, 999)

    const bookings = await ClassBookingModel.find({
      status: 'booked',
      reminderDayOfSent: false,
    })
      .populate<{ userId: { name: string; email: string } }>('userId', 'name email')
      .populate<{ liveClassId: BookingWithRefs['liveClassId'] }>('liveClassId', 'title scheduledStart meetingUrl muxPlaybackId')
      .lean({ virtuals: true }) as unknown as BookingWithRefs[]

    const due = bookings.filter(b => {
      const s = new Date(b.liveClassId.scheduledStart)
      return s >= start && s <= end
    })

    for (const b of due) {
      const timeStr = new Date(b.liveClassId.scheduledStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      await sendDayOfReminder(
        b.userId.email,
        b.userId.name,
        b.liveClassId.title,
        timeStr,
        getJoinUrl(b.liveClassId),
      ).catch(e => console.error('[Reminder] day-of email failed:', e))
      await ClassBookingModel.findByIdAndUpdate(b._id, { reminderDayOfSent: true })
    }
    if (due.length) console.log(`[Reminders] Day-of: sent ${due.length} emails`)
  } catch (e) {
    console.error('[Reminders] day-of job error:', e)
  }
}

async function runPreSessionReminders(): Promise<void> {
  try {
    const { ClassBookingModel } = await import('@/models/schema.ts')
    const now  = new Date()
    const from = new Date(now.getTime() + 25 * 60 * 1000)   // 25min from now
    const to   = new Date(now.getTime() + 35 * 60 * 1000)   // 35min from now

    const bookings = await ClassBookingModel.find({
      status: 'booked',
      reminderPreSessionSent: false,
    })
      .populate<{ userId: { name: string; email: string } }>('userId', 'name email')
      .populate<{ liveClassId: BookingWithRefs['liveClassId'] }>('liveClassId', 'title scheduledStart meetingUrl muxPlaybackId')
      .lean({ virtuals: true }) as unknown as BookingWithRefs[]

    const due = bookings.filter(b => {
      const s = new Date(b.liveClassId.scheduledStart)
      return s >= from && s <= to
    })

    for (const b of due) {
      await sendPreSessionReminder(
        b.userId.email,
        b.userId.name,
        b.liveClassId.title,
        30,
        getJoinUrl(b.liveClassId),
      ).catch(e => console.error('[Reminder] pre-session email failed:', e))
      await ClassBookingModel.findByIdAndUpdate(b._id, { reminderPreSessionSent: true })
    }
    if (due.length) console.log(`[Reminders] Pre-session: sent ${due.length} emails`)
  } catch (e) {
    console.error('[Reminders] pre-session job error:', e)
  }
}

export function startReminderJobs(): void {
  // Every hour: day-before reminders
  cron.schedule('0 * * * *', runDayBeforeReminders)

  // Every day at 7am: day-of reminders
  cron.schedule('0 7 * * *', runDayOfReminders)

  // Every hour: pre-session reminders
  cron.schedule('30 * * * *', runPreSessionReminders)

  console.log('[Reminders] Cron jobs scheduled')
}
