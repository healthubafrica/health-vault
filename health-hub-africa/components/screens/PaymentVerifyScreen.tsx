'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { payments as paymentsApi } from '@/lib/api'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
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
          setGateway(res.gateway)
          setPaymentId(res.paymentId)
          setState('success')
        } else {
          setState('failed')
        }
      } catch {
        if (!cancelled) setState('failed')
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
      <div className="flex flex-col items-center justify-center gap-5 py-20 text-center px-4">
        <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'color-mix(in srgb, var(--color-success) 12%, transparent)' }}>
          <CheckCircle size={32} style={{ color: 'var(--color-success)' }} />
        </div>
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-display)' }}>
            Payment Confirmed
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
            Your payment via {gateway} was successful. Your subscription has been activated.
          </p>
        </div>
        <div className="flex gap-3">
          <Button size="sm" variant="ghost" onClick={openReceipt}>
            View Receipt
          </Button>
          <Button size="sm" onClick={() => router.push('/subscriptions')}>
            View Subscription
          </Button>
        </div>
      </div>
    )
  }

  if (state === 'failed') {
    return (
      <div className="flex flex-col items-center justify-center gap-5 py-20 text-center px-4">
        <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'color-mix(in srgb, var(--color-error) 12%, transparent)' }}>
          <XCircle size={32} style={{ color: 'var(--color-error)' }} />
        </div>
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-display)' }}>
            Payment Not Confirmed
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
            We could not confirm your payment. If you completed the payment, your subscription will be activated shortly via our payment confirmation system.
          </p>
        </div>
        <div className="flex gap-3">
          <Button size="sm" variant="ghost" onClick={() => router.push('/subscriptions')}>
            Check Subscription
          </Button>
          <Button size="sm" onClick={() => router.push('/dashboard')}>
            Go to Dashboard
          </Button>
        </div>
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
