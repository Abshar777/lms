import type { Metadata, Viewport } from 'next'
import { Bricolage_Grotesque, DM_Sans, JetBrains_Mono } from 'next/font/google'
import { Providers } from './providers'
import './globals.css'

const displayFont = Bricolage_Grotesque({ subsets: ['latin'], variable: '--font-display', weight: ['400','500','600','700','800'], display: 'swap' })
const bodyFont    = DM_Sans({ subsets: ['latin'], variable: '--font-body', weight: ['400','500','600','700'], display: 'swap' })
const monoFont    = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono', weight: ['400','500'], display: 'swap' })

export const metadata: Metadata = {
  title: { template: '%s — LearnOS Admin', default: 'LearnOS Admin' },
  description: 'LearnOS administration portal',
  icons: {
    icon:     [{ url: '/icons/icon.svg', type: 'image/svg+xml' }],
    shortcut: '/icons/icon.svg',
    apple:    '/icons/icon.svg',
  },
  manifest:        '/manifest.webmanifest',
  applicationName: 'LearnOS Admin',
  appleWebApp: {
    capable:        true,
    title:          'LearnOS Admin',
    statusBarStyle: 'default',
  },
}

export const viewport: Viewport = {
  themeColor:   '#0D0F1A',
  width:        'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${displayFont.variable} ${bodyFont.variable} ${monoFont.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
