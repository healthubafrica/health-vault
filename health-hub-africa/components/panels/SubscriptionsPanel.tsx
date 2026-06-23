'use client'

import { Pill } from '@/components/ui/Pill'
import { Button } from '@/components/ui/Button'
import { subscriptions } from '@/lib/api'
import { useApi } from '@/lib/hooks/useApi'
import { Check } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { useRouter } from 'next/navigation'

export function SubscriptionsPanel() {
  const router = useRouter()
  const { data: subRes } = useApi(() => subscriptions.getMy())
  const activeSub = subRes?.data
  const features: string[] = Array.isArray(activeSub?.plan?.features)
    ? (activeSub!.plan.features as string[])
    : []

  return (
    <div className="flex flex-col gap-5 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
        Your Plan
      </p>

      {activeSub ? (
        <>
          <div
            className="p-4 rounded-2xl border"
            style={{ background: 'var(--color-success-bg)', borderColor: '#6DC43F' }}
          >
            <div className="flex items-center justify-between mb-1">
              <p className="text-base font-bold" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-display)' }}>
                {activeSub.plan.name} Plan
              </p>
              <Pill variant="success">Active</Pill>
            </div>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              Renews {formatDate(activeSub.expiresAt)}
            </p>
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-muted)' }}>
              Plan Benefits
            </p>
            <ul className="flex flex-col gap-2">
              {features.map(f => (
                <li key={f} className="flex items-start gap-2">
                  <Check size={13} className="mt-0.5 shrink-0 text-[#6DC43F]" />
                  <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{f}</span>
                </li>
              ))}
            </ul>
          </div>
        </>
      ) : (
        <div
          className="p-4 rounded-2xl border"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        >
          <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>No active subscription</p>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
            Subscribe to a plan to unlock premium benefits.
          </p>
        </div>
      )}

      <Button size="sm" fullWidth onClick={() => router.push('/subscriptions')}>
        {activeSub ? 'Upgrade Plan' : 'View Plans'}
      </Button>
    </div>
  )
}
