/**
 * timezone.ts — Display every date/time in UAE time (Asia/Dubai, UTC+4).
 *
 * The backend sends timestamps in UTC. By default the browser renders them in the
 * viewer's *device* timezone, so two users in different countries would see
 * different clock times for the same live class. This module pins all date/time
 * *formatting* to Dubai so everyone sees the same UAE time.
 *
 * It works by wrapping the locale-aware formatters to inject `timeZone: 'Asia/Dubai'`
 * whenever the caller didn't pass an explicit `timeZone`. This covers every existing
 * `toLocaleDateString` / `toLocaleTimeString` / `toLocaleString` / `Intl.DateTimeFormat`
 * call across the app — and any added later — from one place.
 *
 * Note: `Number.prototype.toLocaleString` (used for counts like "2,998 students")
 * is a different method and is intentionally left untouched.
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
