/**
 * liveStatus.ts — effective live-class status based on the clock.
 *
 * A scheduled session is shown/counted as **Live Now** during a 45-minute window:
 *   from 30 min BEFORE its start (when the reminder email goes out)
 *   to   15 min AFTER its start (the booking cutoff).
 *
 * Timeline for a 'scheduled' session relative to now:
 *   now < start - 30m              → 'scheduled' (upcoming)
 *   start - 30m ≤ now ≤ start + 15m → 'live'      (the 45-min window)
 *   now > start + 15m              → 'ended'
 *
 * Sessions the backend has explicitly marked ('live' streaming, 'ended', 'cancelled')
 * keep that status — a real live stream is always live regardless of the clock.
 *
 * This is display/counting only; the stored DB status is never changed, so internal
 * (Mux) sessions can still be started late or rescheduled.
 */
export const LIVE_LEAD_MS  = 30 * 60_000  // becomes "live" 30 min before start
export const LIVE_GRACE_MS = 15 * 60_000  // stays  "live" until 15 min after start

export function resolveLiveStatus(
  rawStatus: string,
  scheduledStart: Date | string,
  now: number = Date.now(),
): string {
  if (rawStatus !== 'scheduled') return rawStatus   // live / ended / cancelled stay as-is
  const start = new Date(scheduledStart).getTime()
  if (now > start + LIVE_GRACE_MS) return 'ended'
  if (now >= start - LIVE_LEAD_MS) return 'live'
  return 'scheduled'
}
