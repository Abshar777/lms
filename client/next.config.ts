import type { NextConfig } from 'next'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

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

export default nextConfig
