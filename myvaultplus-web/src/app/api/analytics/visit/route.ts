import { NextRequest, NextResponse } from 'next/server'
import { forwardAnalyticsHeaders } from '@/lib/server/forwardAnalyticsHeaders'

const BACKEND = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000') + '/api/v1'

// Same-origin BFF for the visitor beacon: resolves real geo/IP from trusted
// edge headers server-side (never trusted from the client body), then
// forwards to the backend. Always 204s — a dropped pageview beacon should
// never surface an error to the visitor's browser.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))

  try {
    await fetch(`${BACKEND}/analytics/visit`, {
      method: 'POST',
      headers: forwardAnalyticsHeaders(req),
      body: JSON.stringify({
        path: body?.path,
        referrer: body?.referrer,
        landingPage: body?.landingPage,
        utmSource: body?.utmSource,
        utmMedium: body?.utmMedium,
        utmCampaign: body?.utmCampaign,
        utmTerm: body?.utmTerm,
        utmContent: body?.utmContent,
        timezone: body?.timezone,
      }),
    })
  } catch {
    // Best-effort — never fail the beacon request over this.
  }

  return new NextResponse(null, { status: 204 })
}
