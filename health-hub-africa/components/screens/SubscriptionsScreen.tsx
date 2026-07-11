'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Pill } from '@/components/ui/Pill'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Check } from 'lucide-react'
import { subscriptions, type SubscriptionPlan } from '@/lib/api'
import { useApi } from '@/lib/hooks/useApi'
import { ListSkeleton } from '@/components/skeletons/ListSkeleton'
import { ErrorState } from '@/components/ui/ErrorState'
import { toast } from 'sonner'

function planFeatures(plan: SubscriptionPlan): string[] {
  return Array.isArray(plan.features) ? (plan.features as string[]) : []
}

const PLAN_THEME: Record<string, { bg: string; accent: string; badgeBg: string; badgeText: string; isDark: boolean }> = {
  BasicCare:     { bg: '#E6F4F0', accent: '#0E8567', badgeBg: '#0E8567', badgeText: '#fff',    isDark: false },
  SilverCare:    { bg: '#0C3328', accent: '#34E0A0', badgeBg: '#34E0A0', badgeText: '#0C3328', isDark: true  },
  GoldCare:      { bg: '#07251C', accent: '#B59410', badgeBg: '#B59410', badgeText: '#fff',    isDark: true  },
  ConciergeCare: { bg: '#052018', accent: '#6DC43F', badgeBg: '#6DC43F', badgeText: '#07251C', isDark: true  },
}
const DEFAULT_THEME = { bg: 'var(--color-surface)', accent: '#6DC43F', badgeBg: '#6DC43F', badgeText: '#fff', isDark: false }

export function SubscriptionsScreen() {
  const { data: subRes, isInitialLoad: subLoading, error, refetch } = useApi(() => subscriptions.getMy())
  const { data: plansRes, isInitialLoad: plansLoading } = useApi(() => subscriptions.listPlans())
  const [saving, setSaving] = useState<string | null>(null)
  const [billing, setBilling] = useState<'monthly' | 'annually'>('monthly')
  const [expandedPlans, setExpandedPlans] = useState<Set<string>>(new Set())

  const toggleExpanded = (planId: string) => {
    setExpandedPlans(prev => {
      const next = new Set(prev)
      if (next.has(planId)) {
        next.delete(planId)
      } else {
        next.add(planId)
      }
      return next
    })
  }

  const activeSub = subRes?.data
  const allPlans = plansRes?.data ?? []
  const freePlan = allPlans.find(p => p.tier === 'Free')
  const paidPlans = allPlans.filter(p => p.tier !== 'Free')

  // currentPlanId includes Free (when no active sub)
  const currentPlanId = activeSub?.plan.id ?? freePlan?.id

  async function handleSubscribe(plan: SubscriptionPlan) {
    const isSwitch = !!activeSub
    const label = `${plan.name} (${billing})`
    const confirmMsg = isSwitch
      ? `Switch to ${label}? You'll be taken to a secure payment page.`
      : `Subscribe to ${label}? You'll be taken to a secure payment page.`
    if (!window.confirm(confirmMsg)) return
    try {
      setSaving(plan.id)
      const res = await subscriptions.upgrade(plan.id, billing)
      // Redirect to the gateway's hosted checkout. The subscription is
      // activated by the payment webhook once the charge succeeds.
      toast.success(`Redirecting to ${res.gateway} to complete payment…`)
      window.location.href = res.authorizationUrl
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not start payment')
      setSaving(null)
    }
  }

  async function handleCancel() {
    if (!activeSub) return
    if (!window.confirm(`Cancel ${activeSub.plan.name}? You'll revert to the Free Plan.`)) return
    try {
      await subscriptions.cancel(activeSub.id)
      toast.success('Plan cancelled — you\'re now on the Free Plan')
      refetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Cancellation failed')
    }
  }

  if (subLoading || plansLoading) return <ListSkeleton ariaLabel="Loading subscription plans" />
  if (error && !subRes) return <ErrorState message={error} onRetry={refetch} />

  return (
    <div className="flex flex-col gap-5 pb-20 md:pb-5">
      <div>
        <h1 className="text-xl font-bold" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-display)' }}>
          Subscription
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
          Choose the plan that fits your care needs
        </p>
      </div>

      {/* ── Current plan banner ── */}
      <div
        className="flex items-center justify-between p-4 rounded-2xl border"
        style={{
          background: activeSub ? 'var(--color-success-bg)' : 'var(--color-bg)',
          borderColor: activeSub ? '#6DC43F' : 'var(--color-border)',
        }}
      >
        <div>
          <p
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: activeSub ? '#006022' : 'var(--color-text-muted)' }}
          >
            Current Plan
          </p>
          <p
            className="text-base font-bold mt-0.5"
            style={{ color: 'var(--color-text)', fontFamily: 'var(--font-display)' }}
          >
            {activeSub ? activeSub.plan.name : 'Free Plan'}
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {activeSub ? `Renews ${formatDate(activeSub.expiresAt)}` : 'Upgrade to unlock premium care'}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Pill variant={activeSub ? 'success' : 'neutral'}>
            {activeSub ? activeSub.status : 'Free'}
          </Pill>
          {activeSub && (
            <button
              onClick={handleCancel}
              className="text-xs"
              style={{ color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
            >
              Cancel plan
            </button>
          )}
        </div>
      </div>

      {paidPlans.length === 0 ? (
        <p className="text-sm text-center py-8" style={{ color: 'var(--color-text-muted)' }}>
          No plans available right now. Please check back soon.
        </p>
      ) : (
        <>
          {/* ── Billing toggle ── */}
          <div
            className="flex gap-1 p-1 rounded-full"
            style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', alignSelf: 'flex-start' }}
          >
            {(['monthly', 'annually'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setBilling(mode)}
                className="text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-full transition-all"
                style={{
                  background: billing === mode ? 'var(--color-text)' : 'transparent',
                  color: billing === mode ? 'var(--color-bg)' : 'var(--color-text-muted)',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                {mode === 'monthly' ? 'Monthly' : 'Annual · Save ~20%'}
              </button>
            ))}
          </div>

          {/* ── Plan cards ── */}
          <div className="flex flex-col gap-3">
            {paidPlans.map(plan => {
              const isCurrent = currentPlanId === plan.id
              const isLoading = saving === plan.id
              const theme = PLAN_THEME[plan.tier] ?? DEFAULT_THEME
              const price = billing === 'annually' && plan.annualPriceKobo
                ? plan.annualPriceKobo / 100
                : plan.priceKobo / 100
              const features = planFeatures(plan)

              return (
                <div
                  key={plan.id}
                  className="rounded-2xl border flex flex-col p-5 relative transition-all"
                  style={{
                    background: theme.bg,
                    borderColor: isCurrent ? theme.accent : theme.isDark ? theme.accent + '55' : 'var(--color-border)',
                    boxShadow: isCurrent ? `0 0 0 2px ${theme.accent}44` : undefined,
                  }}
                >
                  {/* Header: name + price */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <p
                        className="text-sm font-bold"
                        style={{ color: theme.isDark ? '#fff' : 'var(--color-text)', fontFamily: 'var(--font-display)' }}
                      >
                        {plan.name}
                      </p>
                      {plan.bestFor && (
                        <p className="text-[11px] mt-0.5" style={{ color: theme.isDark ? 'rgba(255,255,255,0.6)' : 'var(--color-text-faint)' }}>
                          Best for {plan.bestFor}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end shrink-0 gap-1">
                      {/* Badges */}
                      {isCurrent && (
                        <span
                          className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full mb-0.5"
                          style={{ background: theme.accent, color: theme.badgeText }}
                        >
                          ✓ Active
                        </span>
                      )}
                      {!isCurrent && plan.isMostPopular && (
                        <span
                          className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full mb-0.5"
                          style={{ background: theme.accent + '22', color: theme.accent }}
                        >
                          Most Popular
                        </span>
                      )}
                      <div className="text-right">
                        <span
                          className="text-xl font-bold leading-none"
                          style={{ color: theme.accent, fontFamily: 'var(--font-display)' }}
                        >
                          {formatCurrency(price)}
                        </span>
                        <span className="block text-[11px] mt-0.5" style={{ color: theme.isDark ? 'rgba(255,255,255,0.65)' : 'var(--color-text-muted)' }}>
                          /{billing === 'annually' ? 'year' : 'month'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Features */}
                  {features.length > 0 && (
                    <ul className="flex flex-col gap-1.5 mb-4">
                      {(expandedPlans.has(plan.id) ? features : features.slice(0, 5)).map(f => (
                        <li key={f} className="flex items-start gap-2">
                          <Check size={12} className="mt-0.5 shrink-0" style={{ color: theme.accent }} />
                          <span
                            className="text-xs leading-relaxed"
                            style={{ color: theme.isDark ? 'rgba(255,255,255,0.75)' : 'var(--color-text-muted)' }}
                          >
                            {f}
                          </span>
                        </li>
                      ))}
                      {features.length > 5 && (
                        <li>
                          <button
                            type="button"
                            onClick={() => toggleExpanded(plan.id)}
                            className="text-xs pl-5 text-left"
                            style={{ color: theme.isDark ? 'rgba(255,255,255,0.5)' : 'var(--color-text-faint)' }}
                          >
                            {expandedPlans.has(plan.id)
                              ? 'Show less'
                              : `+${features.length - 5} more features included`}
                          </button>
                        </li>
                      )}
                    </ul>
                  )}

                  {/* CTA */}
                  <Button
                    variant={theme.isDark || isCurrent ? 'primary' : 'secondary'}
                    fullWidth
                    size="md"
                    disabled={isCurrent || !!saving}
                    onClick={isCurrent ? undefined : () => handleSubscribe(plan)}
                  >
                    {isCurrent
                      ? '✓ Your Current Plan'
                      : isLoading
                      ? 'Processing…'
                      : activeSub
                      ? `Switch to ${plan.name}`
                      : `Get ${plan.name}`}
                  </Button>
                </div>
              )
            })}
          </div>

          {/* Free plan note for paid subscribers */}
          {activeSub && freePlan && (
            <p className="text-xs text-center" style={{ color: 'var(--color-text-faint)' }}>
              Cancel anytime to revert to the Free Plan · No partial refunds
            </p>
          )}
        </>
      )}
    </div>
  )
}
