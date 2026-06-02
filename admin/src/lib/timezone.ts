/**
 * timezone.ts — Display every date/time in UAE time (Asia/Dubai, UTC+4).
 *
 * The backend sends timestamps in UTC. By default the browser renders them in the
 * viewer's *device* timezone, so the admin dashboard would show times in whatever
 * zone the operator's machine is set to. This module pins all date/time *formatting*
 * to Dubai so the admin always works in UAE time.
 *
 * It works by wrapping the locale-aware formatters to inject `timeZone: 'Asia/Dubai'`
 * whenever the caller didn't pass an explicit `timeZone`. This covers every existing
 * `toLocaleDateString` / `toLocaleTimeString` / `toLocaleString` / `Intl.DateTimeFormat`
 * call across the app — and any added later — from one place.
 *
 * Note: `Number.prototype.toLocaleString` (used for counts) is a different method
 * and is intentionally left untouched.
 *
 * Installed once from `providers.tsx`, which runs during both server render and in
 * the browser, so SSR and client output match (no hydration mismatch).
 */
export const APP_TIMEZONE = 'Asia/Dubai'

let installed = false

const withTz = (options?: Intl.DateTimeFormatOptions): Intl.DateTimeFormatOptions =>
  options?.timeZone ? options : { ...options, timeZone: APP_TIMEZONE }

export function installAppTimezone(): void {
  if (installed) return
  installed = true

  /* Date.prototype.toLocale* */
  const dp = Date.prototype
  const origStr = dp.toLocaleString
  const origDate = dp.toLocaleDateString
  const origTime = dp.toLocaleTimeString

  dp.toLocaleString = function (locales?: Intl.LocalesArgument, options?: Intl.DateTimeFormatOptions) {
    return origStr.call(this, locales, withTz(options))
  }
  dp.toLocaleDateString = function (locales?: Intl.LocalesArgument, options?: Intl.DateTimeFormatOptions) {
    return origDate.call(this, locales, withTz(options))
  }
  dp.toLocaleTimeString = function (locales?: Intl.LocalesArgument, options?: Intl.DateTimeFormatOptions) {
    return origTime.call(this, locales, withTz(options))
  }

  /* Intl.DateTimeFormat — used directly by some components.
   * Typed as `any` so we can copy over `prototype`/statics (which are read-only
   * on the constructor type) before installing the patched version. */
  const OrigDTF = Intl.DateTimeFormat
  const PatchedDTF: any = function (
    this: unknown,
    locales?: Intl.LocalesArgument,
    options?: Intl.DateTimeFormatOptions,
  ) {
    return new (OrigDTF as unknown as { new (l?: unknown, o?: unknown): Intl.DateTimeFormat })(
      locales,
      withTz(options),
    )
  }

  PatchedDTF.prototype = OrigDTF.prototype
  PatchedDTF.supportedLocalesOf = OrigDTF.supportedLocalesOf.bind(OrigDTF)
  Intl.DateTimeFormat = PatchedDTF as typeof Intl.DateTimeFormat
}

// Install immediately on import (runs on both the server and the client).
installAppTimezone()

/* ─────────────────────────────────────────────────────────
   <input type="datetime-local"> helpers — keep the picker on UAE time.

   A datetime-local value is a naive "YYYY-MM-DDTHH:mm" wall-clock string with
   no timezone. By default `new Date(value)` parses it in the *device* timezone,
   so an admin in India entering "8:00 PM" would store 8 PM IST. These helpers
   instead treat the picker value as APP_TIMEZONE (UAE) wall-clock.
───────────────────────────────────────────────────────── */

/** Offset (APP_TIMEZONE wall time − UTC), in ms, for the given instant. */
function tzOffsetMs(date: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: APP_TIMEZONE, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(date)
  const m: Record<string, string> = {}
  for (const p of parts) m[p.type] = p.value
  const hour = m.hour === '24' ? '00' : m.hour
  const asIfUTC = Date.UTC(+m.year, +m.month - 1, +m.day, +hour, +m.minute, +m.second)
  return asIfUTC - date.getTime()
}

/** Picker value (UAE wall-clock "YYYY-MM-DDTHH:mm") → UTC ISO string for the API. */
export function datetimeLocalToISO(wall: string): string {
  if (!wall) return ''
  const naiveUTC = new Date(`${wall}:00.000Z`).getTime()  // parse the digits as if UTC
  const offset   = tzOffsetMs(new Date(naiveUTC))         // UAE is +4h (no DST)
  return new Date(naiveUTC - offset).toISOString()
}

/** Stored UTC ISO → picker value showing the UAE wall-clock. */
export function isoToDatetimeLocal(iso: string): string {
  if (!iso) return ''
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIMEZONE, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  }).formatToParts(new Date(iso))
  const get = (t: string) => parts.find(p => p.type === t)?.value ?? ''
  const hour = get('hour') === '24' ? '00' : get('hour')
  return `${get('year')}-${get('month')}-${get('day')}T${hour}:${get('minute')}`
}
