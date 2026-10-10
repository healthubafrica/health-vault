import * as WebBrowser from 'expo-web-browser';

/** Deep link the portal's /payments/verify page redirects to when client=mobile. */
export const PAYMENT_RETURN_URL = 'myhealthvault://payments/verify';

export interface CheckoutReturn {
  reference?: string;
  status?: string;
}

/** Pulls the gateway reference/status out of the deep-link return URL. */
export function parseCheckoutReturn(url: string | undefined | null): CheckoutReturn {
  const query = (url ?? '').split('#')[0].split('?')[1] ?? '';
  const params: Record<string, string> = {};
  for (const pair of query.split('&')) {
    if (!pair) continue;
    const [k, v = ''] = pair.split('=');
    try {
      params[decodeURIComponent(k)] = decodeURIComponent(v.replace(/\+/g, ' '));
    } catch {
      // Ignore malformed pairs.
    }
  }
  return {
    reference: params.reference || params.trxref || params.tx_ref || undefined,
    status: params.status || undefined,
  };
}

/**
 * Opens the hosted checkout and resolves when the browser closes or the gateway
 * returns to the app. The return values are a hint only; callers still confirm
 * with GET /payments/verify.
 */
export async function openCheckout(authorizationUrl: string): Promise<CheckoutReturn> {
  const result = await WebBrowser.openAuthSessionAsync(authorizationUrl, PAYMENT_RETURN_URL);
  return result.type === 'success' ? parseCheckoutReturn(result.url) : {};
}
