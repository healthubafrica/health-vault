// First-touch UTM/referrer capture for the marketing site — mirrors
// health-hub-africa/lib/marketingAttribution.ts's captureMarketingAttribution().
// The two apps don't share a package, so this is a small, deliberate
// duplication rather than a cross-app import.
export interface VisitorAttribution {
  utmSource?: string
  utmMedium?: string
  utmCampaign?: string
  utmTerm?: string
  utmContent?: string
  referrer?: string
  timezone?: string
}

const STORAGE_KEY = 'mvp-first-touch-attribution'

function clean(value: string | null, maxLength: number): string | undefined {
  const trimmed = value?.trim()
  return trimmed ? trimmed.slice(0, maxLength) : undefined
}

export function captureVisitorAttribution(): VisitorAttribution {
  if (typeof window === 'undefined') return {}

  let existing: VisitorAttribution = {}
  try {
    existing = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? '{}') as VisitorAttribution
  } catch {
    existing = {}
  }

  const params = new URLSearchParams(window.location.search)
  const captured: VisitorAttribution = {
    utmSource: clean(params.get('utm_source'), 120),
    utmMedium: clean(params.get('utm_medium'), 120),
    utmCampaign: clean(params.get('utm_campaign'), 160),
    utmTerm: clean(params.get('utm_term'), 160),
    utmContent: clean(params.get('utm_content'), 160),
    referrer: clean(document.referrer, 1000),
    timezone: clean(Intl.DateTimeFormat().resolvedOptions().timeZone, 100),
  }

  // Keep the first campaign touch for the whole browser session — a later
  // pageview within the same visit should not overwrite the channel that
  // originally brought the visitor in.
  const firstTouch = { ...captured, ...existing }
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(firstTouch))
  return firstTouch
}
