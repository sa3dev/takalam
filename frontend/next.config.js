/** @type {import('next').NextConfig} */

const isProd = process.env.NODE_ENV === 'production'
const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000'

// Derive the ws: and wss: connect-src directive from the configured WS URL
const wsOrigin = wsUrl.replace(/^ws/, 'ws').replace(/^http/, 'ws')

const cspDirectives = [
  "default-src 'self'",
  // Next.js needs 'unsafe-inline' for its runtime scripts; nonce-based CSP would remove this
  // but requires custom server setup — deferred for now
  "script-src 'self' 'unsafe-inline'" + (isProd ? '' : " 'unsafe-eval'"),
  // Tailwind and component inline styles
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  // API calls go to same origin via Next.js proxy rewrite
  // WS connects directly to backend (can't be proxied)
  `connect-src 'self' ${wsOrigin}`,
  // blob: needed for audio playback via URL.createObjectURL
  "media-src 'self' blob:",
  "img-src 'self' data:",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ')

const nextConfig = {
  output: 'standalone',
  reactStrictMode: false,
  experimental: {
    serverActions: {
      allowedOrigins: [
        'localhost:3000',
        'frontend:3000',
        ...(process.env.NEXT_PUBLIC_DOMAIN ? [process.env.NEXT_PUBLIC_DOMAIN] : [])
      ]
    }
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000'
  },
  async rewrites() {
    // INTERNAL_API_URL for server-side proxy (Docker network between containers).
    // Falls back to NEXT_PUBLIC_API_URL for local dev without Docker.
    const backend = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
    return [
      {
        source: '/api/:path*',
        destination: `${backend}/api/:path*`,
      },
    ]
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy', value: cspDirectives },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'microphone=(self), camera=(), geolocation=()' },
        ],
      },
    ]
  },
}

module.exports = nextConfig
