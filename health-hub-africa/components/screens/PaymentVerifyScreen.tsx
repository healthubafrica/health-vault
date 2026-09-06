'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { payments as paymentsApi, analytics } from '@/lib/api'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { SuccessState, ErrorState } from '@/components/ui/states'
import { toast } from 'sonner'

type VerifyState = 'loading' | 'success' | 'failed' | 'no_reference'

export function PaymentVerifyScreen() {
  const params = useSearchParams()
  const router = useRouter()
  const reference = params.get('reference') ?? params.get('trxref')
  const [state, setState] = useState<VerifyState>(reference ? 'loading' : 'no_reference')
  const [gateway, setGateway] = useState<string | null>(null)
  const [paymentId, setPaymentId] = useState<string | null>(null)

  useEffect(() => {
    if (!reference) return

    let cancelled = false

    async function verify() {
      try {
        const res = await paymentsApi.verify(reference!)
        if (cancelled) return
        if (res.status === 'paid') {
          analytics.track('payment_success', { gateway: res.gateway })
          setGateway(res.gateway)
          setPaymentId(res.paymentId)
          setState('success')
        } else {
          analytics.track('payment_failure', { gateway: res.gateway, status: res.status })
          setState('failed')
        }
      } catch {
        if (!cancelled) {
          analytics.track('payment_failure', { reason: 'verify_error' })
          setState('failed')
        }
      }
    }

    verify()
    return () => { cancelled = true }
  }, [reference])

  async function openReceipt() {
    if (!paymentId) return
    // Pre-open synchronously (within the click handler) so browsers don't
    // treat the later async navigation as a blocked popup.
    const receiptWindow = window.open('', '_blank')
    try {
      const html = await paymentsApi.getReceiptHtml(paymentId)
      const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }))
      if (receiptWindow) {
        receiptWindow.location.href = url
      }
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch (err) {
      receiptWindow?.close()
      toast.error(err instanceof Error ? err.message : 'Failed to load receipt.')
    }
  }

  if (state === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <Loader2 size={40} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
        <p className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>
          Confirming your payment…
        </p>
      </div>
    )
  }

  if (state === 'success') {
    return (
      <div className="py-12 px-4">
        <SuccessState
          title="Payment Confirmed!"
          message={`Your payment via ${gateway ?? 'Paystack'} was successfully processed. Your plan has been activated.`}
          referenceId={reference ?? undefined}
          primaryActionLabel="View Subscription"
          onPrimaryAction={() => router.push('/subscriptions')}
          secondaryActionLabel="View Receipt"
          onSecondaryAction={openReceipt}
        />
      </div>
    )
  }

  if (state === 'failed') {
    return (
      <div className="py-12 px-4">
        <ErrorState
          title="Payment Not Confirmed"
          message="We could not confirm your transaction. If money was debited, your account will be updated automatically via webhook."
          code="ERR_PAYMENT_UNVERIFIED"
          onRetry={() => router.push('/payments')}
        />
      </div>
    )
  }

  // no_reference — landed here without a Paystack reference
  return (
    <div className="flex flex-col items-center justify-center gap-5 py-20 text-center px-4">
      <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
        No payment reference found. If you just completed a payment, your subscription will be activated shortly.
      </p>
      <Button size="sm" onClick={() => router.push('/subscriptions')}>
        Check Subscription
      </Button>
    </div>
  )
}
