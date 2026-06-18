/**
 * liveStatus.ts — effective live-class status based on the clock.
 *
 * A scheduled session is shown/counted as **Live Now** during the window:
 *   from 15 min BEFORE its start
 *   to   the session END time  (scheduledStart + durationMins)
 *
 * Timeline for a 'scheduled' session relative to now:
 *   now < start - 15m              → 'scheduled' (upcoming)
 *   start - 15m ≤ now < start + durationMins → 'live'  (live window)
 *   now ≥ start + durationMins     → 'ended'
 *
 * Sessions the backend has explicitly marked ('live' streaming, 'ended', 'cancelled')
 * keep that status — a real live stream is always live regardless of the clock.
 *
 * This is display/counting only; the stored DB status is never changed, so internal
 * (Mux) sessions can still be started late or rescheduled.
 */
export const LIVE_LEAD_MS = 15 * 60_000  // session becomes "live" 15 min before start

export function resolveLiveStatus(
  rawStatus: string,
  scheduledStart: Date | string,
  durationMins: number,
  now: number = Date.now(),
): string {
  if (rawStatus !== 'scheduled') return rawStatus   // live / ended / cancelled stay as-is
  const start = new Date(scheduledStart).getTime()
  const end   = start + durationMins * 60_000       // class end time
  if (now >= end) return 'ended'
  if (now >= start - LIVE_LEAD_MS) return 'live'
  return 'scheduled'
}
