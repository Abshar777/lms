import type { NextConfig } from 'next'
import { withSentryConfig } from '@sentry/nextjs'

/* Parse the R2 public URL (set at build time via NEXT_PUBLIC_R2_PUBLIC_URL). */
const r2PublicUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? ''
const r2Hostname  = r2PublicUrl
  ? (() => { try { return new URL(r2PublicUrl).hostname } catch { return '' } })()
  : ''

type RemotePattern = { protocol: 'https' | 'http'; hostname: string; port?: string; pathname?: string }

const r2Patterns: RemotePattern[] = [
  { protocol: 'https', hostname: '*.r2.dev' },
  { protocol: 'https', hostname: '*.r2.cloudflarestorage.com' },
  ...(r2Hostname ? [{ protocol: 'https' as const, hostname: r2Hostname }] : []),
]

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'plus.unsplash.com' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
      ...r2Patterns,
    ],
  },
}

export default withSentryConfig(nextConfig, {
  // Sentry org + project are optional — needed only for source-map uploads.
  // Set SENTRY_ORG, SENTRY_PROJECT, SENTRY_AUTH_TOKEN in .env to enable.
  org:     process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Suppress Sentry build-time output unless CI is running
  silent: !process.env.CI,

  // Upload wider sourcemaps (includes vendor code)
  widenClientFileUpload: true,

  // Tree-shake the Sentry logger in production
  disableLogger: true,

  // Don't instrument Vercel Cron Monitors (not used)
  automaticVercelMonitors: false,
})
