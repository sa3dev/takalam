/** @type {import('next').NextConfig} */
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
  }
}

module.exports = nextConfig
