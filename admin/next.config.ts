import type { NextConfig } from 'next'
import { withSentryConfig } from '@sentry/nextjs'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
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
