import type { NextRequest } from 'next/server'

// Kept identical to health-hub-africa/lib/server/forwardAnalyticsHeaders.ts —
// same trusted edge-header allowlist, same client-IP resolution. The two
// Next.js apps don't share a package, so this is duplicated rather than
// imported; keep them in sync if the header list ever changes.
const GEO_HEADERS = [
  'x-vercel-ip-country',
  'x-vercel-ip-country-region',
  'x-vercel-ip-region',
  'x-vercel-ip-city',
  'cf-ipcountry',
  'cloudfront-viewer-country',
  'cloudfront-viewer-country-region',
  'cloudfront-viewer-city',
] as const

export function forwardAnalyticsHeaders(req: NextRequest): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const userAgent = req.headers.get('user-agent')
  const forwardedFor = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  const clientIp = forwardedFor ?? req.headers.get('x-real-ip')

  if (userAgent) headers['user-agent'] = userAgent.slice(0, 1000)
  if (clientIp) headers['x-hha-client-ip'] = clientIp.slice(0, 100)

  for (const name of GEO_HEADERS) {
    const value = req.headers.get(name)
    if (value) headers[name] = value.slice(0, 1000)
  }

  return headers
}
