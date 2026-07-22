import type { NextConfig } from 'next'

const isDev = process.env.NODE_ENV !== 'production'

// dev needs 'unsafe-eval' (React eval for error stacks); prod does not.
// 'wasm-unsafe-eval' keeps WebAssembly (e.g. LiveKit audio) working without
// granting JS eval. 'unsafe-inline' stays until a per-request nonce migration.
const scriptSrc = isDev
  ? "script-src 'self' 'unsafe-eval' 'unsafe-inline'"
  : "script-src 'self' 'wasm-unsafe-eval' 'unsafe-inline'"

// LiveKit signalling runs over a WebSocket to the LiveKit Cloud project, which
// connect-src must allow explicitly — an https: source does not cover wss:.
// The client SDK also does a plain HTTPS fetch to /settings/regions for
// multi-region failover before it ever opens the socket, so both schemes
// are needed or that preflight call gets CSP-blocked and connect() hangs.
const LIVEKIT_ORIGINS = 'https://*.livekit.cloud wss://*.livekit.cloud'

// Routes that run a video consultation and therefore need camera + microphone.
const TELECARE_ROUTES = ['/provider/telecare', '/operations/telecare']

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
      "connect-src 'self' " + (process.env.NEXT_PUBLIC_API_URL ?? '') + ' ' + LIVEKIT_ORIGINS,
      "worker-src 'self' blob:",
      "frame-ancestors 'none'",
      "object-src 'none'",
    ].join('; '),
  },
]

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Camera/mic blocked by default everywhere except the telecare routes.
        // Those are excluded here rather than overridden by a second matching
        // rule — browsers intersect duplicate Permissions-Policy headers, so a
        // site-wide camera=() would silently cancel out the camera=(self) grant.
        source: '/((?!provider/telecare$|operations/telecare$).*)',
        headers: [
          ...sharedHeaders,
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
      // Telecare consultations need camera + microphone. Without this
      // getUserMedia is blocked and the LiveKit room dies on connect, which
      // surfaced as "Join Call" jumping straight to the Encounter notes modal.
      ...TELECARE_ROUTES.map((source) => ({
        source,
        headers: [
          ...sharedHeaders,
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(self), geolocation=()' },
        ],
      })),
    ]
  },
}

export default nextConfig
