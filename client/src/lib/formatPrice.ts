/* ─────────────────────────────────────────────────────
   formatPrice — locale-aware currency formatter (5.6)
   ─────────────────────────────────────────────────────
   Uses Intl.NumberFormat with the browser's locale so
   Americans see "$29.99", Germans see "29,99 $", etc.
   SSR-safe: falls back to 'en-US' when navigator is
   not available (Next.js server components).
───────────────────────────────────────────────────── */
export function formatPrice(
  amount: number,
  currency = 'usd',
  locale?: string,
): string {
  const userLocale =
    locale ??
    (typeof navigator !== 'undefined' ? navigator.language : 'en-US')

  return new Intl.NumberFormat(userLocale, {
    style:    'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

/** Compact version: "$29" instead of "$29.00" for display in badges */
export function formatPriceCompact(amount: number, currency = 'usd'): string {
  if (amount === 0) return 'Free'
  return formatPrice(amount, currency)
}
