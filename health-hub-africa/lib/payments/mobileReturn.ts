type Params = Record<string, string | string[] | undefined>

const MOBILE_VERIFY_LINK = 'myhealthvault://payments/verify'

const first = (v: string | string[] | undefined): string | undefined => (Array.isArray(v) ? v[0] : v) || undefined

/**
 * When a gateway redirects back with client=mobile, the app (not the portal)
 * finishes the flow: returns the myhealthvault:// deep link carrying the
 * reference and status. Returns null for the normal web flow.
 */
export function mobileReturnUrl(params: Params): string | null {
  if (first(params.client) !== 'mobile') return null
  const out = new URLSearchParams()
  const reference = first(params.reference) ?? first(params.trxref) ?? first(params.tx_ref)
  const status = first(params.status)
  if (reference) out.set('reference', reference)
  if (status) out.set('status', status)
  const qs = out.toString()
  return qs ? `${MOBILE_VERIFY_LINK}?${qs}` : MOBILE_VERIFY_LINK
}
