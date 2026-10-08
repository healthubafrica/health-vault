'use client'

import { useState } from 'react'
import { payments } from '@/lib/api'
import { useApi } from '@/lib/hooks/useApi'
import { effectiveGateway, isPaystackActive, type CardGateway } from '@/lib/payments/gateway'

/**
 * Card-gateway choice for any flow that charges via a hosted checkout.
 * `gateway` is always safe to send: it falls back to Flutterwave unless the
 * API reports Paystack live, and `paystackActive` tells the UI whether to
 * show the chooser at all. `refetchKey` re-reads the statuses whenever it
 * changes (e.g. once a multi-step flow reaches the plan step and the user is
 * certain to be signed in).
 */
export function useGatewayChoice(refetchKey: unknown = null) {
  const { data: statuses } = useApi(() => payments.getGatewayStatus(), [refetchKey])
  const [selected, setSelected] = useState<CardGateway>('Flutterwave')
  const paystackActive = isPaystackActive(statuses)

  return {
    paystackActive,
    gateway: effectiveGateway(selected, paystackActive),
    setGateway: setSelected,
  }
}
