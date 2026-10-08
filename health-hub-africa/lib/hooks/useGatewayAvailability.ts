'use client'

import { payments } from '@/lib/api'
import { useApi } from '@/lib/hooks/useApi'
import { isPaystackActive } from '@/lib/payments/gateway'

/**
 * Whether Paystack can be offered as a card gateway. The payment-method popup
 * only opens when this is true; otherwise callers go straight to Flutterwave,
 * so a missing/misconfigured Paystack key never shows patients an option that
 * would fail. `refetchKey` re-reads the statuses whenever it changes (e.g. once
 * a multi-step flow reaches the plan step and the user is certain to be signed in).
 */
export function useGatewayAvailability(refetchKey: unknown = null) {
  const { data: statuses } = useApi(() => payments.getGatewayStatus(), [refetchKey])
  return { paystackActive: isPaystackActive(statuses) }
}
