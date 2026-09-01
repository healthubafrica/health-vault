export type AcquisitionSource = 'social_media' | 'friend' | 'referral' | 'family'

export interface MarketingAttribution {
  utmSource?: string
  utmMedium?: string
  utmCampaign?: string
  utmTerm?: string
  utmContent?: string
  referrer?: string
  landingPage?: string
  timezone?: string
}

const STORAGE_KEY = 'hha-first-touch-attribution'

function clean(value: string | null, maxLength: number): string | undefined {
  const trimmed = value?.trim()
  return trimmed ? trimmed.slice(0, maxLength) : undefined
}

export function captureMarketingAttribution(): MarketingAttribution {
  if (typeof window === 'undefined') return {}

  let existing: MarketingAttribution = {}
  try {
    existing = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? '{}') as MarketingAttribution
  } catch {
    existing = {}
  }

  const params = new URLSearchParams(window.location.search)
  const captured: MarketingAttribution = {
    utmSource: clean(params.get('utm_source'), 120),
    utmMedium: clean(params.get('utm_medium'), 120),
    utmCampaign: clean(params.get('utm_campaign'), 160),
    utmTerm: clean(params.get('utm_term'), 160),
    utmContent: clean(params.get('utm_content'), 160),
    referrer: clean(document.referrer, 1000),
    landingPage: clean(window.location.href, 1000),
    timezone: clean(Intl.DateTimeFormat().resolvedOptions().timeZone, 100),
  }

  // Keep the first campaign touch for the full browser session. A later page
  // navigation should not overwrite the channel that originally brought the user in.
  const firstTouch = { ...captured, ...existing }
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(firstTouch))
  return firstTouch
}
