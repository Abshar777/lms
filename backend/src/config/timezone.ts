/**
 * timezone.ts — Pin the whole backend to UAE time (Asia/Dubai, UTC+4).
 *
 * Timestamps are still STORED in UTC (MongoDB / Mongoose default). This only
 * affects how the server *interprets local time* and *formats* dates, e.g.:
 *   - email + notification time labels  (email.service, reminders.job)
 *   - cron schedules                    (the 7am "day-of" job now fires at 07:00 Dubai)
 *   - day-boundary math                 (setHours(0,0,0,0) → Dubai midnight)
 *   - logs
 *
 * Must be imported FIRST in the entrypoint, before any module touches `Date`.
 */
process.env.TZ = 'Asia/Dubai'

export const APP_TIMEZONE = 'Asia/Dubai'
