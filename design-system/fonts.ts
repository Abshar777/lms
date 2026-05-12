/**
 * LMS Design System — Next.js Font Config
 * Import and apply in app/layout.tsx
 */

import { Bricolage_Grotesque, DM_Sans, JetBrains_Mono } from 'next/font/google'

export const displayFont = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['200', '300', '400', '500', '600', '700', '800'],
  display: 'swap',
})

export const bodyFont = DM_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  weight: ['300', '400', '500', '600', '700'],
  style: ['normal', 'italic'],
  display: 'swap',
})

export const monoFont = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['400', '500'],
  display: 'swap',
})

/** Combine all font class names — spread onto <html> element */
export const fontClassNames = [
  displayFont.variable,
  bodyFont.variable,
  monoFont.variable,
].join(' ')
