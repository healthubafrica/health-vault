import { useQuery } from '@tanstack/react-query';
import { payments } from '@/lib/api';
import { isPaystackActive } from '@/lib/gateway';

/**
 * Whether Paystack can be offered as a card gateway. The payment-method popup
 * only opens when this is true; otherwise callers go straight to Flutterwave,
 * so a missing or misconfigured Paystack key never shows patients an option
 * that would fail.
 */
export function useGatewayAvailability() {
  const { data } = useQuery({
    queryKey: ['payment-gateway-status'],
    queryFn: payments.getGatewayStatus,
    staleTime: 5 * 60_000,
  });
  const bank = data?.find((g) => g.gateway === 'bank_transfer');
  return { paystackActive: isPaystackActive(data), bank };
}
