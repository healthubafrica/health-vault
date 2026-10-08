export type CardGateway = 'Paystack' | 'Flutterwave'

/** Preselected in the payment-method popup. */
export const DEFAULT_GATEWAY: CardGateway = 'Paystack'

/** Display order for the payment-method popup. */
export const CARD_GATEWAYS: readonly CardGateway[] = ['Paystack', 'Flutterwave']

/** True only when the API explicitly lists Paystack as active. */
export function isPaystackActive(statuses?: { gateway: string; active: boolean }[] | null): boolean {
  return statuses?.some((g) => g.gateway === 'paystack' && g.active) ?? false
}

/** Paystack is never sent unless the API reports it live — otherwise fall back to Flutterwave. */
export function effectiveGateway(selected: CardGateway, paystackActive: boolean): CardGateway {
  return selected === 'Paystack' && !paystackActive ? 'Flutterwave' : selected
}
