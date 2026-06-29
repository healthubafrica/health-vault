'use client'
import { useState } from 'react'
import AnimatedSection from './AnimatedSection'
import AnimatedCard from './AnimatedCard'
import { PLANS, formatKobo, type Plan, type FamilyTier } from '@/lib/planData'

type BillingMode = 'monthly' | 'annual'

const PLAN_THEME: Record<string, { bg: string; accent: string; badgeBg: string; badgeText: string; isDark: boolean }> = {
  free:          { bg: '#EBF5EC', accent: '#137333', badgeBg: '#137333', badgeText: '#fff',    isDark: false },
  basiccare:     { bg: '#E6F4F0', accent: '#0E8567', badgeBg: '#0E8567', badgeText: '#fff',    isDark: false },
  silvercare:    { bg: '#0C3328', accent: '#34E0A0', badgeBg: '#34E0A0', badgeText: '#0C3328', isDark: true  },
  goldcare:      { bg: '#07251C', accent: '#B59410', badgeBg: '#B59410', badgeText: '#fff',    isDark: true  },
  conciergecare: { bg: '#052018', accent: '#6DC43F', badgeBg: '#6DC43F', badgeText: '#07251C', isDark: true  },
}
const DEFAULT_THEME = { bg: '#fff', accent: '#07251C', badgeBg: '#07251C', badgeText: '#fff', isDark: false }

function resolveFamilyPrice(plan: Plan, familySize: number): number {
  if (!plan.familyPricing.length || familySize <= 1) return 0
  const tier = plan.familyPricing.find((t: FamilyTier) => {
    if (typeof t.members === 'number') return t.members === familySize
    if (familySize >= 6 && t.members === '6-10') return true
    return false
  })
  return tier?.annualPriceKobo ?? 0
}

export default function PlanCards() {
  const [billing, setBilling] = useState<BillingMode>('monthly')
  const [familySizes, setFamilySizes] = useState<Record<string, number>>({})

  function setFamilySize(slug: string, size: number) {
    setFamilySizes((prev) => ({ ...prev, [slug]: size }))
  }

  return (
    <div>
      {/* Billing toggle */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 48 }}>
        <div style={{ display: 'inline-flex', background: '#F0F4F0', borderRadius: 100, padding: 4 }}>
          {(['monthly', 'annual'] as BillingMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setBilling(mode)}
              style={{
                padding: '10px 28px',
                borderRadius: 100,
                border: 'none',
                background: billing === mode ? '#07251C' : 'transparent',
                color: billing === mode ? '#fff' : '#27433A',
                fontFamily: 'var(--font-manrope), sans-serif',
                fontWeight: 700,
                fontSize: 13,
                letterSpacing: '0.07em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                transition: 'background 0.18s, color 0.18s',
              }}
            >
              {mode === 'monthly' ? 'Monthly' : 'Annual — Save up to 20%'}
            </button>
          ))}
        </div>
      </div>

      {/* Plan grid — 5 cards */}
      <AnimatedSection stagger className="rg-3" style={{ alignItems: 'stretch', flexWrap: 'wrap' }}>
        {PLANS.map((plan) => {
          const theme = PLAN_THEME[plan.slug] ?? DEFAULT_THEME
          const familySize = familySizes[plan.slug] ?? 1
          const familyPrice = billing === 'annual' ? resolveFamilyPrice(plan, familySize) : 0
          const showFamilyPrice = familyPrice > 0

          let displayPrice: string
          let displaySub: string
          let strikethrough: string | null = null

          if (billing === 'annual' && plan.annualKobo > 0) {
            if (showFamilyPrice) {
              displayPrice = formatKobo(familyPrice)
              displaySub = '/year (family)'
            } else if (plan.launchAnnualKobo > 0) {
              displayPrice = formatKobo(plan.launchAnnualKobo)
              displaySub = '/year'
              strikethrough = formatKobo(plan.annualKobo)
            } else {
              displayPrice = formatKobo(plan.annualKobo)
              displaySub = '/year'
            }
          } else {
            displayPrice = formatKobo(plan.monthlyKobo)
            displaySub = plan.monthlyKobo > 0 ? '/month' : ''
          }

          return (
            <AnimatedCard
              key={plan.slug}
              style={{
                background: theme.bg,
                border: theme.isDark ? 'none' : `1.5px solid ${theme.accent}55`,
                borderRadius: 20,
                padding: 28,
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                minWidth: 240,
              }}
            >
              {/* Badges */}
              {plan.isMostPopular && (
                <div style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', background: theme.badgeBg, color: theme.badgeText, fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', padding: '5px 16px', borderRadius: 100, whiteSpace: 'nowrap' }}>
                  MOST POPULAR
                </div>
              )}
              {plan.isBestValue && (
                <div style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', background: theme.badgeBg, color: theme.badgeText, fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', padding: '5px 16px', borderRadius: 100, whiteSpace: 'nowrap', border: `1.5px solid ${theme.accent}` }}>
                  BEST VALUE
                </div>
              )}

              {/* Plan name */}
              <div style={{ fontFamily: 'var(--font-manrope), sans-serif', fontSize: 13, fontWeight: 700, letterSpacing: '0.08em', color: theme.isDark ? theme.accent : '#07251C', marginBottom: 6, marginTop: plan.isMostPopular || plan.isBestValue ? 14 : 0 }}>
                {plan.name}
              </div>

              {plan.bestFor && (
                <p style={{ fontSize: 12, lineHeight: 1.5, color: theme.isDark ? 'rgba(255,255,255,0.65)' : '#5A7068', margin: '0 0 16px' }}>
                  {plan.bestFor}
                </p>
              )}

              {/* Price */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                  <span style={{ fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 700, fontSize: 34, letterSpacing: '-0.03em', color: theme.isDark ? '#fff' : '#07251C' }}>
                    {displayPrice}
                  </span>
                  {displaySub && (
                    <span style={{ fontSize: 13, fontWeight: 500, color: theme.isDark ? 'rgba(255,255,255,0.6)' : '#7A8C84' }}>
                      {displaySub}
                    </span>
                  )}
                </div>
                {strikethrough && (
                  <div style={{ fontSize: 12, color: theme.isDark ? 'rgba(255,255,255,0.45)' : '#aaa', textDecoration: 'line-through', marginTop: 2 }}>
                    {strikethrough}/year regular
                  </div>
                )}
              </div>

              {/* Family size selector (annual only, plans with family pricing) */}
              {billing === 'annual' && plan.familyPricing.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: theme.isDark ? 'rgba(255,255,255,0.7)' : '#5A7068', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
                    Family Members
                  </label>
                  <select
                    value={familySize}
                    onChange={(e) => setFamilySize(plan.slug, Number(e.target.value))}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 10, border: `1.5px solid ${theme.isDark ? 'rgba(255,255,255,0.25)' : theme.accent + '55'}`, background: theme.isDark ? 'rgba(255,255,255,0.1)' : '#fff', color: theme.isDark ? '#fff' : '#07251C', fontSize: 13, fontFamily: 'var(--font-manrope), sans-serif' }}
                  >
                    <option value={1}>Just me (individual)</option>
                    <option value={2}>2 Members</option>
                    <option value={3}>3 Members</option>
                    <option value={4}>4 Members</option>
                    <option value={5}>5 Members</option>
                    <option value={6}>6–10 Members</option>
                  </select>
                </div>
              )}

              {/* Features */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, marginBottom: 24 }}>
                {plan.features.map((item) => (
                  <div key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, fontSize: 13 }}>
                    <span style={{ width: 18, height: 18, borderRadius: '50%', background: theme.isDark ? `${theme.accent}30` : `${theme.accent}20`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none"><path d="M5 12l4 4L19 7" stroke={theme.accent} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </span>
                    <span style={{ color: theme.isDark ? 'rgba(255,255,255,0.85)' : '#27433A' }}>{item}</span>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <a
                href={plan.ctaHref}
                style={{ display: 'block', textAlign: 'center', background: theme.accent, color: theme.isDark ? theme.badgeText : '#fff', textDecoration: 'none', fontWeight: 700, fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', padding: 14, borderRadius: 100 }}
              >
                {plan.ctaLabel}
              </a>
            </AnimatedCard>
          )
        })}
      </AnimatedSection>
    </div>
  )
}
