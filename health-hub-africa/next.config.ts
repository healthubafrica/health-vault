import type { NextConfig } from 'next'
import { withSentryConfig } from '@sentry/nextjs'

const isDev = process.env.NODE_ENV !== 'production'

// script-src: dev needs 'unsafe-eval' (React uses eval for enhanced error
// stacks); production does not — Next/React never eval in prod. 'wasm-unsafe-eval'
// keeps any WebAssembly (e.g. LiveKit audio) working without granting JS eval.
// 'unsafe-inline' stays until we move to a per-request nonce (needs dynamic
// rendering + telemedicine/hydration QA — tracked as a follow-up).
const scriptSrc = isDev
  ? "script-src 'self' 'unsafe-eval' 'unsafe-inline'"
  : "script-src 'self' 'wasm-unsafe-eval' 'unsafe-inline'"

// LiveKit signalling runs over a WebSocket to the LiveKit Cloud project, which
// connect-src must allow explicitly — an https: source does not cover wss:.
// The client SDK also does a plain HTTPS fetch to /settings/regions for
// multi-region failover before it ever opens the socket, so both schemes
// are needed or that preflight call gets CSP-blocked and connect() hangs.
const LIVEKIT_ORIGINS = 'https://*.livekit.cloud wss://*.livekit.cloud'

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
          scriptSrc,
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data: blob: https:",
          "font-src 'self'",
          // Allow API calls + Sentry ingestion + direct S3 uploads (presigned URLs)
          // + LiveKit WebSocket signalling for telecare calls.
          "connect-src 'self' " +
            (process.env.NEXT_PUBLIC_API_URL ?? '') +
            ' https://*.sentry.io https://*.amazonaws.com ' +
            LIVEKIT_ORIGINS,
          "worker-src 'self' blob:",
          "frame-ancestors 'none'",
          "object-src 'none'",
        ].join('; '),
      },
    ]

    return [
      {
        // Camera/mic/geolocation blocked by default on every route except the
        // ones that genuinely need them (/telecare, /dispatch). Those routes are
        // excluded here rather than overridden by a second matching rule —
        // browsers intersect duplicate Permissions-Policy headers, so a
        // site-wide camera=() would otherwise silently cancel out the
        // camera=(self) grant below.
        source: '/((?!dispatch$|telecare$).*)',
        headers: [
          ...sharedHeaders,
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
      {
        // TeleCare is a video consultation — it needs camera + microphone.
        // Without this getUserMedia is blocked and the LiveKit room dies on
        // connect, which used to surface as the call ending instantly.
        source: '/telecare',
        headers: [
          ...sharedHeaders,
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(self), geolocation=()' },
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
