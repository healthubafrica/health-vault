import type { NextConfig } from 'next'
import { withSentryConfig } from '@sentry/nextjs'

const nextConfig: NextConfig = {
  async headers() {
    const sharedHeaders = [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-XSS-Protection', value: '1; mode=block' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      {
        key: 'Strict-Transport-Security',
        value: 'max-age=63072000; includeSubDomains; preload',
      },
      {
        key: 'Content-Security-Policy',
        value: [
          "default-src 'self'",
          "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data: blob: https:",
          "font-src 'self'",
          // Allow API calls + Sentry ingestion + direct S3 uploads (presigned URLs)
          "connect-src 'self' " +
            (process.env.NEXT_PUBLIC_API_URL ?? '') +
            ' https://*.sentry.io https://*.amazonaws.com',
          "worker-src 'self' blob:",
          "frame-ancestors 'none'",
          "object-src 'none'",
        ].join('; '),
      },
    ]

    return [
      {
        // Geolocation blocked by default on every route except /dispatch.
        // Excluding /dispatch here (instead of overriding it with a second
        // matching rule) avoids sending two Permissions-Policy headers for
        // the same response — browsers intersect duplicate headers, so a
        // site-wide geolocation=() would otherwise silently cancel out the
        // geolocation=(self) grant below on /dispatch.
        source: '/((?!dispatch$).*)',
        headers: [
          ...sharedHeaders,
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
      {
        // Dispatch page requires geolocation to pinpoint emergency location
        source: '/dispatch',
        headers: [
          ...sharedHeaders,
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
        ],
      },
    ]
  },
}

export default withSentryConfig(nextConfig, {
  // Sentry organisation + project (set in CI / Vercel env vars for source maps)
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Upload source maps only in CI to keep local builds fast
  silent: !process.env.CI,



  // Disable the default Sentry tunnel route (/monitoring) — we send directly
  disableLogger: true,

  // Automatically tree-shake Sentry debug code in production bundles
  widenClientFileUpload: true,
})
