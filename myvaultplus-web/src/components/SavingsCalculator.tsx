'use client'
import { useState } from 'react'
import { PLANS, SAVINGS_SERVICES, SAVINGS_DEFAULTS, SAVINGS_BIG_THRESHOLD_KOBO, formatKobo } from '@/lib/planData'

const PLAN_SLUGS = ['basiccare', 'silvercare', 'goldcare', 'conciergecare']

function defaultsFor(slug: string): Record<string, number> {
  const defaults = SAVINGS_DEFAULTS[slug] ?? {}
  const quantities: Record<string, number> = {}
  for (const service of SAVINGS_SERVICES) {
    quantities[service.key] = defaults[service.key] ?? 0
  }
  return quantities
}

export default function SavingsCalculator() {
  const [selectedSlug, setSelectedSlug] = useState('silvercare')
  const [quantities, setQuantities] = useState<Record<string, number>>(() => defaultsFor('silvercare'))

  const plan = PLANS.find((p) => p.slug === selectedSlug) ?? PLANS[2]

  const handlePlanChange = (slug: string) => {
    setSelectedSlug(slug)
    setQuantities(defaultsFor(slug))
  }

  const handleQuantityChange = (key: string, rawValue: number, max: number) => {
    const clamped = Math.max(0, Math.min(max, Math.round(rawValue || 0)))
    setQuantities((prev) => ({ ...prev, [key]: clamped }))
  }

  const retail = SAVINGS_SERVICES.reduce((sum, s) => sum + (quantities[s.key] ?? 0) * s.priceKobo, 0)
  const membership = plan.annualKobo
  const savings = retail - membership
  const pct = retail > 0 ? Math.round((savings / retail) * 100) : 0

  let message: string
  if (savings > SAVINGS_BIG_THRESHOLD_KOBO) {
    message = `Based on your projected healthcare utilization, this membership could potentially save you more than ${formatKobo(SAVINGS_BIG_THRESHOLD_KOBO)} annually.`
  } else if (savings > 0) {
    message = `You could save approximately ${formatKobo(savings)} annually with ${plan.name}.`
  } else {
    message = 'Membership may still provide significant value through emergency readiness, care coordination, priority access, and preventive healthcare services.'
  }

  return (
    <div style={{ background: '#07251C', borderRadius: 24, padding: '48px 40px', maxWidth: 920, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 36 }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#6DC43F', marginBottom: 12 }}>— Savings Calculator</div>
        <h3 style={{ fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 700, fontSize: 'clamp(22px, 3vw, 30px)', color: '#fff', margin: 0 }}>
          How much could you save?
        </h3>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, marginTop: 12, maxWidth: 480, marginLeft: 'auto', marginRight: 'auto' }}>
          Estimate your expected healthcare usage to see the retail value versus your membership cost.
        </p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 32 }}>
        <select
          value={selectedSlug}
          onChange={(e) => handlePlanChange(e.target.value)}
          aria-label="Select membership plan"
          style={{
            padding: '12px 20px',
            borderRadius: 100,
            border: '1.5px solid rgba(255,255,255,0.25)',
            background: '#0E3326',
            color: '#fff',
            fontFamily: 'var(--font-manrope), sans-serif',
            fontWeight: 700,
            fontSize: 13,
            letterSpacing: '0.04em',
            cursor: 'pointer',
          }}
        >
          {PLAN_SLUGS.map((slug) => {
            const p = PLANS.find((pl) => pl.slug === slug)
            return p ? <option key={slug} value={slug}>{p.name}</option> : null
          })}
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 36 }}>
        {SAVINGS_SERVICES.map((service) => (
          <div key={service.key} style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: '12px 16px' }}>
            <label htmlFor={`savings-${service.key}`} style={{ display: 'block', fontSize: 12, color: 'rgba(255,255,255,0.65)', marginBottom: 6 }}>
              {service.label}
            </label>
            <input
              id={`savings-${service.key}`}
              type="number"
              min={service.min}
              max={service.max}
              value={quantities[service.key] ?? 0}
              onChange={(e) => handleQuantityChange(service.key, Number(e.target.value), service.max)}
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                borderBottom: '1.5px solid rgba(255,255,255,0.25)',
                color: '#fff',
                fontFamily: 'var(--font-manrope), sans-serif',
                fontWeight: 700,
                fontSize: 18,
                padding: '4px 0',
                outline: 'none',
              }}
            />
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 28 }}>
        {[
          { label: 'Retail Value', value: formatKobo(retail), sub: 'if purchased individually' },
          { label: 'Membership Cost', value: formatKobo(membership), sub: 'annual plan price' },
          { label: 'Estimated Savings', value: formatKobo(savings), sub: savings >= 0 ? 'vs. pay-per-use' : 'over plan cost', highlight: savings > 0 },
          { label: 'Savings Percentage', value: `${pct}%`, sub: 'of retail value', highlight: savings > 0 },
        ].map((item) => (
          <div key={item.label} style={{ background: item.highlight ? '#6DC43F' : 'rgba(255,255,255,0.07)', borderRadius: 16, padding: '20px 24px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: item.highlight ? '#07251C' : 'rgba(255,255,255,0.5)', marginBottom: 10 }}>
              {item.label}
            </div>
            <div style={{ fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 700, fontSize: 28, letterSpacing: '-0.02em', color: item.highlight ? '#07251C' : '#fff' }}>
              {item.value}
            </div>
            <div style={{ fontSize: 12, color: item.highlight ? 'rgba(7,37,28,0.7)' : 'rgba(255,255,255,0.4)', marginTop: 4 }}>
              {item.sub}
            </div>
          </div>
        ))}
      </div>

      <div style={{ textAlign: 'center', padding: '18px 24px', borderRadius: 14, background: savings > 0 ? 'rgba(109,196,63,0.12)' : 'rgba(255,255,255,0.06)', border: `1px solid ${savings > 0 ? 'rgba(109,196,63,0.35)' : 'rgba(255,255,255,0.12)'}` }}>
        <p style={{ margin: 0, color: savings > 0 ? '#6DC43F' : 'rgba(255,255,255,0.75)', fontSize: 14.5, fontWeight: 600, lineHeight: 1.5 }}>
          {message}
        </p>
      </div>
    </div>
  )
}
