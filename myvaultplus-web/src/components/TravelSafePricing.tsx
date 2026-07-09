'use client'
import AnimatedSection from './AnimatedSection'
import AnimatedCard from './AnimatedCard'
import { formatKobo } from '@/lib/planData'
import {
  TRAVELSAFE_TIERS,
  TRAVELSAFE_FAMILY,
  TRAVELSAFE_ADDITIONAL_MEMBER_KOBO,
  TRAVELSAFE_ADDONS,
  TRAVELSAFE_COMPARE_ROWS,
  type TravelSafeTierSlug,
} from '@/lib/travelsafePlanData'

const TIER_THEME: Record<TravelSafeTierSlug, { bg: string; accent: string; badgeBg: string; badgeText: string; isDark: boolean }> = {
  essential: { bg: '#EBF5EC', accent: '#137333', badgeBg: '#137333', badgeText: '#fff', isDark: false },
  plus: { bg: '#E6F4F0', accent: '#0E8567', badgeBg: '#0E8567', badgeText: '#fff', isDark: false },
  premium: { bg: '#0C3328', accent: '#34E0A0', badgeBg: '#34E0A0', badgeText: '#0C3328', isDark: true },
  executive: { bg: '#07251C', accent: '#B59410', badgeBg: '#B59410', badgeText: '#fff', isDark: true },
}

export default function TravelSafePricing() {
  return (
    <div>
      {/* Tier cards */}
      <AnimatedSection stagger className="rg-4" style={{ alignItems: 'stretch', marginBottom: 56 }}>
        {TRAVELSAFE_TIERS.map((tier) => {
          const theme = TIER_THEME[tier.slug]
          return (
            <AnimatedCard
              key={tier.slug}
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
              {tier.isMostPopular && (
                <div
                  style={{
                    position: 'absolute',
                    top: -14,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: theme.badgeBg,
                    color: theme.badgeText,
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: '0.12em',
                    padding: '5px 16px',
                    borderRadius: 100,
                    whiteSpace: 'nowrap',
                  }}
                >
                  MOST POPULAR
                </div>
              )}

              <div
                style={{
                  fontFamily: 'var(--font-manrope), sans-serif',
                  fontSize: 13,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  color: theme.isDark ? theme.accent : '#07251C',
                  marginBottom: 6,
                  marginTop: tier.isMostPopular ? 14 : 0,
                }}
              >
                {tier.name}
              </div>

              {tier.bestFor.length > 0 && (
                <p style={{ fontSize: 12, lineHeight: 1.5, color: theme.isDark ? 'rgba(255,255,255,0.65)' : '#5A7068', margin: '0 0 16px' }}>
                  {tier.bestFor.join(', ')}
                </p>
              )}

              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                  <span style={{ fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 700, fontSize: 34, letterSpacing: '-0.03em', color: theme.isDark ? '#fff' : '#07251C' }}>
                    {formatKobo(tier.priceKobo)}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 500, color: theme.isDark ? 'rgba(255,255,255,0.6)' : '#7A8C84' }}>/month</span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, marginBottom: 24 }}>
                {tier.features.map((item) => (
                  <div key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, fontSize: 13 }}>
                    <span
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: '50%',
                        background: theme.isDark ? `${theme.accent}30` : `${theme.accent}20`,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        marginTop: 1,
                      }}
                    >
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none">
                        <path d="M5 12l4 4L19 7" stroke={theme.accent} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                    <span style={{ color: theme.isDark ? 'rgba(255,255,255,0.85)' : '#27433A' }}>{item}</span>
                  </div>
                ))}
              </div>

              <a
                href={tier.ctaHref}
                style={{
                  display: 'block',
                  textAlign: 'center',
                  background: theme.accent,
                  color: theme.isDark ? theme.badgeText : '#fff',
                  textDecoration: 'none',
                  fontWeight: 700,
                  fontSize: 12,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  padding: 14,
                  borderRadius: 100,
                }}
              >
                {tier.ctaLabel}
              </a>
            </AnimatedCard>
          )
        })}
      </AnimatedSection>

      {/* Compare matrix */}
      <div style={{ marginBottom: 56 }}>
        <h3 style={{ fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 600, fontSize: 22, color: '#07251C', textAlign: 'center', margin: '0 0 24px' }}>
          Compare TravelSafe™ Tiers
        </h3>
        <div style={{ background: '#DEDEDE', borderRadius: 28, padding: 16, overflowX: 'auto' }}>
          <div style={{ background: '#fff', borderRadius: 18, overflow: 'hidden', minWidth: 700 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#07251C' }}>
                  <th style={{ padding: '16px 20px', textAlign: 'left', fontSize: 13, color: '#6DC43F', fontWeight: 600 }}>Feature</th>
                  {['Essential', 'Plus', 'Premium', 'Executive'].map((h) => (
                    <th key={h} style={{ padding: '16px 14px', textAlign: 'center', fontSize: 12, color: '#fff', fontWeight: 600 }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TRAVELSAFE_COMPARE_ROWS.map((row, idx) => (
                  <tr key={row.feature} style={{ background: idx % 2 === 0 ? '#fff' : '#F7FAF7', borderBottom: '1px solid rgba(7,37,28,0.06)' }}>
                    <td style={{ padding: '13px 20px', fontWeight: 600, fontSize: 13.5, color: '#07251C' }}>{row.feature}</td>
                    {[row.essential, row.plus, row.premium, row.executive].map((val, vi) => (
                      <td
                        key={vi}
                        style={{
                          padding: '13px 14px',
                          textAlign: 'center',
                          fontSize: 13,
                          color: val === '✓' ? '#137333' : val === '—' ? '#C4CEC9' : '#27433A',
                          fontWeight: val === '✓' ? 700 : 500,
                        }}
                      >
                        {val}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Family plans */}
      <div style={{ marginBottom: 56 }}>
        <h3 style={{ fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 600, fontSize: 22, color: '#07251C', textAlign: 'center', margin: '0 0 24px' }}>
          Family Plans
        </h3>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
          {TRAVELSAFE_FAMILY.map((tier) => (
            <div key={tier.slug} style={{ background: '#fff', border: '1.5px solid rgba(7,37,28,0.1)', borderRadius: 16, padding: '20px 28px', textAlign: 'center', minWidth: 180 }}>
              <div style={{ fontSize: 12, color: '#5A7068', fontWeight: 600, marginBottom: 8 }}>{tier.name}</div>
              <div style={{ fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 700, fontSize: 22, color: '#07251C' }}>{formatKobo(tier.priceKobo)}</div>
              <div style={{ fontSize: 12, color: '#7A8C84', marginTop: 4 }}>per month</div>
            </div>
          ))}
        </div>
        <p style={{ textAlign: 'center', fontSize: 13.5, color: '#41584E' }}>
          Additional Family Member — {formatKobo(TRAVELSAFE_ADDITIONAL_MEMBER_KOBO)}/month
        </p>
      </div>

      {/* Corporate */}
      <div style={{ background: '#07251C', borderRadius: 28, padding: '56px 40px', textAlign: 'center', marginBottom: 56 }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#6DC43F', marginBottom: 16 }}>
          — Corporate Travel Protection
        </div>
        <h3 style={{ fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 700, fontSize: 'clamp(24px, 3vw, 34px)', color: '#fff', margin: '0 auto 20px', maxWidth: 560, lineHeight: 1.1 }}>
          Group travel health coverage for{' '}
          <em style={{ fontFamily: 'var(--font-manrope), sans-serif', fontStyle: 'italic', color: '#6DC43F' }}>every organisation.</em>
        </h3>
        <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 15, maxWidth: 480, margin: '0 auto 32px', lineHeight: 1.65 }}>
          Suitable for SMEs, Large Enterprises, NGOs, Government Agencies, and Educational Institutions.
        </p>
        <a
          href="/corporate"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            background: '#6DC43F',
            color: '#07251C',
            textDecoration: 'none',
            fontWeight: 700,
            fontSize: 13,
            letterSpacing: '0.07em',
            textTransform: 'uppercase',
            padding: '13px 13px 13px 28px',
            borderRadius: 100,
          }}
        >
          Request Proposal
          <span style={{ width: 32, height: 32, borderRadius: '50%', background: '#07251C', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
              <path d="M5 19L19 5M19 5H9M19 5v10" stroke="#6DC43F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </a>
      </div>

      {/* Add-ons */}
      <div>
        <h3 style={{ fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 600, fontSize: 22, color: '#07251C', textAlign: 'center', margin: '0 0 24px' }}>
          Optional Add-On Services
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
          {TRAVELSAFE_ADDONS.map((item) => (
            <div
              key={item.service}
              style={{ background: '#fff', borderRadius: 14, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, border: '1px solid rgba(7,37,28,0.07)' }}
            >
              <span style={{ fontSize: 14, color: '#27433A', fontWeight: 500 }}>{item.service}</span>
              <span style={{ fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 700, fontSize: 15, color: '#07251C', whiteSpace: 'nowrap' }}>{item.priceLabel}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
