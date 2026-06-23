'use client'
import { useState } from 'react'
import { PLANS } from '@/lib/planData'

type Profile = '' | 'individual' | 'family' | 'executive' | 'family-executive'
type Location = '' | 'nigeria' | 'international'

type Answers = {
  profile: Profile
  location: Location
}

type Recommendation = {
  slug: string
  reason: string
  familyNote?: string
}

// Maps each (profile, location) combination to a plan slug from PLANS.
// Display name, CTA copy, and pricing are resolved from planData at render time.
const RECOMMENDATIONS: Record<string, Recommendation> = {
  'individual-nigeria': {
    slug: 'basiccare',
    reason: 'Great for individuals in Nigeria needing TeleCare access and care navigation.',
  },
  'individual-international': {
    slug: 'silvercare',
    reason: 'Individual coverage with stronger care coordination for those who travel.',
  },
  'family-nigeria': {
    slug: 'silvercare',
    reason: 'The most popular choice for Nigerian families — comprehensive and great value.',
    familyNote: 'Add family members at checkout for family pricing.',
  },
  'family-international': {
    slug: 'conciergecare',
    reason: 'International family coverage with TravelSafe™ Global and concierge coordination.',
    familyNote: 'Add family members at checkout for family pricing.',
  },
  'executive-nigeria': {
    slug: 'goldcare',
    reason: 'Executive-grade with dedicated care coordinator, priority dispatch, and TravelSafe™ Nigeria.',
  },
  'executive-international': {
    slug: 'goldcare',
    reason: 'Best value for executives, with the option to add international coverage.',
  },
  'family-executive-nigeria': {
    slug: 'goldcare',
    reason: 'Executive-level care for the whole family with priority DispatchCare™ and TravelSafe™.',
    familyNote: 'Add family members at checkout for family pricing.',
  },
  'family-executive-international': {
    slug: 'conciergecare',
    reason: 'White-glove family coverage with global travel protection and concierge management.',
    familyNote: 'Add family members at checkout for family pricing.',
  },
}

const PROFILES: { value: Exclude<Profile, ''>; label: string }[] = [
  { value: 'individual', label: 'Individual' },
  { value: 'family', label: 'Family' },
  { value: 'executive', label: 'Executive (Individual)' },
  { value: 'family-executive', label: 'Executive Family' },
]

const LOCATIONS: { value: Exclude<Location, ''>; label: string }[] = [
  { value: 'nigeria', label: 'Within Nigeria' },
  { value: 'international', label: 'International / Diaspora' },
]

export default function PlanWizard() {
  const [answers, setAnswers] = useState<Answers>({ profile: '', location: '' })
  const [showResult, setShowResult] = useState(false)

  const key = answers.profile && answers.location ? `${answers.profile}-${answers.location}` : null
  const recommendation = key ? RECOMMENDATIONS[key] : null
  const plan = recommendation ? PLANS.find((p) => p.slug === recommendation.slug) : null

  function reset() {
    setAnswers({ profile: '', location: '' })
    setShowResult(false)
  }

  return (
    <div style={{ background: '#F7FAF7', borderRadius: 24, padding: '48px 40px', maxWidth: 720, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 36 }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#137333', marginBottom: 12 }}>
          — Plan Finder
        </div>
        <h3
          style={{
            fontFamily: 'var(--font-manrope), sans-serif',
            fontWeight: 700,
            fontSize: 'clamp(22px, 3vw, 30px)',
            color: '#07251C',
            margin: '0 0 10px',
          }}
        >
          Not sure which plan is right for you?
        </h3>
        <p style={{ color: '#5A7068', fontSize: 14, margin: 0 }}>
          Answer two quick questions and we&apos;ll match you to the best plan.
        </p>
      </div>

      {!showResult ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          {/* Q1 */}
          <div>
            <p style={{ fontWeight: 700, fontSize: 15, color: '#07251C', marginBottom: 12 }}>1. Who are you covering?</p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {PROFILES.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setAnswers((a) => ({ ...a, profile: p.value }))}
                  style={{
                    padding: '10px 20px',
                    borderRadius: 100,
                    border: `1.5px solid ${answers.profile === p.value ? '#07251C' : '#D4D4D4'}`,
                    background: answers.profile === p.value ? '#07251C' : '#fff',
                    color: answers.profile === p.value ? '#fff' : '#27433A',
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Q2 */}
          <div>
            <p style={{ fontWeight: 700, fontSize: 15, color: '#07251C', marginBottom: 12 }}>2. Where are you primarily based?</p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {LOCATIONS.map((l) => (
                <button
                  key={l.value}
                  type="button"
                  onClick={() => setAnswers((a) => ({ ...a, location: l.value }))}
                  style={{
                    padding: '10px 20px',
                    borderRadius: 100,
                    border: `1.5px solid ${answers.location === l.value ? '#07251C' : '#D4D4D4'}`,
                    background: answers.location === l.value ? '#07251C' : '#fff',
                    color: answers.location === l.value ? '#fff' : '#27433A',
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            disabled={!answers.profile || !answers.location}
            onClick={() => setShowResult(true)}
            style={{
              padding: '14px 32px',
              borderRadius: 100,
              border: 'none',
              background: answers.profile && answers.location ? '#07251C' : '#D4D4D4',
              color: '#fff',
              fontWeight: 700,
              fontSize: 13,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              cursor: answers.profile && answers.location ? 'pointer' : 'not-allowed',
              alignSelf: 'flex-start',
            }}
          >
            Find My Plan →
          </button>
        </div>
      ) : plan && recommendation ? (
        <div style={{ textAlign: 'center' }}>
          <div style={{ background: '#07251C', borderRadius: 20, padding: '32px 36px', marginBottom: 24 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', color: '#6DC43F', textTransform: 'uppercase', marginBottom: 10 }}>
              We recommend
            </div>
            <div style={{ fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 700, fontSize: 32, color: '#fff', marginBottom: 12 }}>
              {plan.name}
            </div>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, margin: '0 0 8px' }}>{recommendation.reason}</p>
            {recommendation.familyNote && (
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, margin: '0 0 24px' }}>{recommendation.familyNote}</p>
            )}
            <a
              href={plan.ctaHref}
              style={{
                display: 'inline-block',
                marginTop: recommendation.familyNote ? 0 : 16,
                background: '#6DC43F',
                color: '#07251C',
                textDecoration: 'none',
                fontWeight: 700,
                fontSize: 13,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                padding: '12px 28px',
                borderRadius: 100,
              }}
            >
              {plan.ctaLabel}
            </a>
          </div>
          <button
            type="button"
            onClick={reset}
            style={{ background: 'none', border: 'none', color: '#137333', fontWeight: 600, fontSize: 14, cursor: 'pointer', textDecoration: 'underline' }}
          >
            Start over
          </button>
        </div>
      ) : null}
    </div>
  )
}
