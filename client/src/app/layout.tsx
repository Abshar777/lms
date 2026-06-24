import type { Metadata, Viewport } from 'next'
import { Bricolage_Grotesque, DM_Sans, JetBrains_Mono } from 'next/font/google'
import { Providers } from './providers'
import './globals.css'

/* ─── Fonts ─────────────────────────────────────── */
const displayFont = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['200', '300', '400', '500', '600', '700', '800'],
  display: 'swap',
})

const bodyFont = DM_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  weight: ['300', '400', '500', '600', '700'],
  style: ['normal', 'italic'],
  display: 'swap',
})

const monoFont = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['400', '500'],
  display: 'swap',
})

/* ─── Metadata ──────────────────────────────────── */
export const metadata: Metadata = {
  title: { template: '%s — Delta Institutions', default: 'Delta Institutions — Leading Trading Academy' },
  description: 'UAE leading trading academy — begin your learning journey at Delta Institutions.',
  icons: {
    icon:     [{ url: '/icons/icone.png', type: 'image/png' }],
    shortcut: '/icons/icone.png',
    apple:    '/icons/icone.png',
  },
  manifest:    '/manifest.webmanifest',
  applicationName: 'Delta Institutions',
  appleWebApp: {
    capable:    true,
    title:      'Delta Institutions',
    statusBarStyle: 'default',
  },
}

export const viewport: Viewport = {
  themeColor: '#0057b8',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${displayFont.variable} ${bodyFont.variable} ${monoFont.variable}`}
    >
      <body><Providers>{children}</Providers></body>
    </html>
  )
}
