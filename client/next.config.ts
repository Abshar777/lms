import type { NextConfig } from 'next'
import { withSentryConfig } from '@sentry/nextjs'

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ?? process.env.NEXT_PUBLIC_API_BASE_URL
  ?? 'http://localhost:4000'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'plus.unsplash.com' },
    ],
  },
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion'],
  },
  // Proxy /api/v1/* → backend so client never hard-codes the backend URL
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${API_BASE}/api/v1/:path*`,
      },
    ]
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
