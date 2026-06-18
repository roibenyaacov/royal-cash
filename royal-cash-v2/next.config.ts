import type { NextConfig } from 'next'

const securityHeaders = [
  // Force browsers to honor the declared content-type — no MIME sniffing.
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Block the app from being framed by other origins (clickjacking).
  { key: 'X-Frame-Options', value: 'DENY' },
  // Minimize information leaked to other origins via the Referer header.
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Disable powerful browser features the app does not use.
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=()',
  },
]

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ]
  },
}

export default nextConfig
