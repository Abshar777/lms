import type { Metadata, Viewport } from 'next'
import { Providers } from './providers'
import './globals.css'

export const metadata: Metadata = {
  title: { template: '%s — Delta Admin', default: 'Delta Institutions Admin' },
  description: 'Delta Institutions administration portal',
  icons: {
    icon:     [{ url: '/icons/icon.svg', type: 'image/svg+xml' }],
    shortcut: '/icons/icon.svg',
    apple:    '/icons/icon.svg',
  },
  manifest:        '/manifest.webmanifest',
  applicationName: 'Delta Institutions Admin',
  appleWebApp: {
    capable:        true,
    title:          'Delta Admin',
    statusBarStyle: 'default',
  },
}

export const viewport: Viewport = {
  themeColor:   '#0057b8',
  width:        'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
