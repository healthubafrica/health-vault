'use client'
import { useState } from 'react'
import { PLANS, formatKobo } from '@/lib/planData'

const RETAIL_ESTIMATES: Record<string, number> = {
  basiccare: 35_000_000,
  silvercare: 75_000_000,
  goldcare: 120_000_000,
  conciergcare: 250_000_000,
}

export default function SavingsCalculator() {
  const [selectedSlug, setSelectedSlug] = useState('silvercare')
  const plan = PLANS.find((p) => p.slug === selectedSlug) ?? PLANS[2]
  const retail = RETAIL_ESTIMATES[selectedSlug] ?? 0
  const membership = plan.launchAnnualKobo || plan.annualKobo
  const savings = retail - membership
  const pct = retail > 0 ? Math.round((savings / retail) * 100) : 0

  return (
    <div style={{ background: '#07251C', borderRadius: 24, padding: '48px 40px', maxWidth: 760, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 36 }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#6DC43F', marginBottom: 12 }}>— Savings Calculator</div>
        <h3 style={{ fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 700, fontSize: 'clamp(22px, 3vw, 30px)', color: '#fff', margin: 0 }}>
          How much could you save?
        </h3>
      </div>

      {/* Plan selector */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 40 }}>
        {PLANS.filter((p) => p.slug !== 'free').map((p) => (
          <button
            key={p.slug}
            onClick={() => setSelectedSlug(p.slug)}
            style={{
              padding: '10px 20px',
              borderRadius: 100,
              border: `1.5px solid ${selectedSlug === p.slug ? '#6DC43F' : 'rgba(255,255,255,0.2)'}`,
              background: selectedSlug === p.slug ? '#6DC43F' : 'transparent',
              color: selectedSlug === p.slug ? '#07251C' : 'rgba(255,255,255,0.8)',
              fontFamily: 'var(--font-manrope), sans-serif',
              fontWeight: 700,
              fontSize: 12,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              transition: 'all 0.18s',
            }}
          >
            {p.name}
          </button>
        ))}
      </div>

      {/* Results */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16 }}>
        {[
          { label: 'Retail Value of Services', value: formatKobo(retail), sub: 'if purchased individually' },
          { label: 'Membership Cost', value: formatKobo(membership), sub: 'founding member annual price', highlight: false },
          { label: 'Annual Savings', value: formatKobo(savings), sub: `you save ${pct}%`, highlight: true },
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
    </div>
  )
}
