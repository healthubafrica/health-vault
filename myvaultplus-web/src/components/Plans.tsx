'use client'
import { useState, useRef } from 'react'
import { motion, useInView, useReducedMotion } from 'framer-motion'
import Link from 'next/link'
import { EASE_OUT, zoomOutCard, staggerContainer, labelVariant, headingVariant, bodyVariant } from '@/lib/motion'

type BillingMode = 'monthly' | 'annual'

interface PlanDef {
  slug: string
  iconBg: string
  iconColor: string
  iconPath: string
  badge: string
  displayBadge?: string
  desc: string
  monthlyKobo: number
  annualKobo: number
  launchAnnualKobo: number
  highlight: boolean
  ctaHref: string
  ctaLabel: string
  items: string[]
  hasFamilyOption: boolean
}

const PLANS: PlanDef[] = [
  {
    slug: 'free',
    iconBg: '#6DC43F',
    iconColor: '#07251C',
    iconPath: 'M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z',
    badge: 'FREE',
    desc: 'Your Health Passport at no cost. Core portal access with pay-per-use services.',
    monthlyKobo: 0,
    annualKobo: 0,
    launchAnnualKobo: 0,
    highlight: false,
    ctaHref: 'https://portal.myvaultplus.com/register',
    ctaLabel: 'Create Free Account',
    items: [
      'Digital Health Passport',
      'Personal Health Record Storage',
      'Emergency Health Profile',
      'Medication & Appointment Reminders',
      'Access to Pay-Per-Use Services',
    ],
    hasFamilyOption: false,
  },
  {
    slug: 'basiccare',
    iconBg: '#07251C',
    iconColor: '#6DC43F',
    iconPath: 'M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z',
    badge: 'BASICCARE™',
    desc: 'For individuals and young professionals. TeleCare, e-Prescriptions, and care navigation.',
    monthlyKobo: 1_250_000,
    annualKobo: 14_900_000,
    launchAnnualKobo: 9_900_000,
    highlight: false,
    ctaHref: '/plans',
    ctaLabel: 'Choose BasicCare™',
    items: [
      'Everything in FREE',
      '2 TeleCare™ Consultations Annually',
      'e-Prescriptions',
      'Care Navigation Support',
      'Discounted CareTest™ Services',
      '3% No Claim Discount',
    ],
    hasFamilyOption: false,
  },
  {
    slug: 'silvercare',
    iconBg: '#07251C',
    iconColor: '#6DC43F',
    iconPath: 'M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z',
    badge: 'SILVERCARE™',
    displayBadge: 'MOST POPULAR',
    desc: 'Comprehensive for individuals and families. 12 TeleCare sessions, wellness assessments, and more.',
    monthlyKobo: 2_490_000,
    annualKobo: 29_900_000,
    launchAnnualKobo: 24_900_000,
    highlight: true,
    ctaHref: '/plans',
    ctaLabel: 'Choose SilverCare™',
    items: [
      'Everything in BasicCare™',
      '12 TeleCare™ Consultations Annually',
      '2 Specialist Second Opinions',
      'Annual Wellness Assessment',
      'Chronic Disease Monitoring',
      '5% No Claim Discount',
    ],
    hasFamilyOption: true,
  },
  {
    slug: 'goldcare',
    iconBg: '#6DC43F',
    iconColor: '#07251C',
    iconPath: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
    badge: 'GOLDCARE™',
    displayBadge: 'BEST VALUE',
    desc: 'Executive-grade. Dedicated care coordinator, comprehensive screening, and TravelSafe™ Nigeria.',
    monthlyKobo: 4_990_000,
    annualKobo: 59_900_000,
    launchAnnualKobo: 49_900_000,
    highlight: false,
    ctaHref: '/plans',
    ctaLabel: 'Choose GoldCare™',
    items: [
      'Everything in SilverCare™',
      'Dedicated Care Coordinator',
      'Executive Health Review',
      'Priority DispatchCare™ Response',
      'TravelSafe™ Nigeria',
      '7% No Claim Discount',
    ],
    hasFamilyOption: true,
  },
  {
    slug: 'conciergecare',
    iconBg: '#07251C',
    iconColor: '#6DC43F',
    iconPath: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
    badge: 'CONCIERGCARE™',
    desc: 'White-glove health management. Dedicated Relationship Manager, TravelSafe™ Global.',
    monthlyKobo: 12_500_000,
    annualKobo: 150_000_000,
    launchAnnualKobo: 99_900_000,
    highlight: false,
    ctaHref: '/plans',
    ctaLabel: 'Choose ConciergeCare™',
    items: [
      'Dedicated Relationship Manager',
      'Concierge Care Coordination',
      'Priority Clinical Access',
      'Quarterly Health Reviews',
      'TravelSafe™ Global',
      'Enhanced Family Coordination',
    ],
    hasFamilyOption: true,
  },
]

function formatKobo(kobo: number): string {
  if (kobo === 0) return 'Free'
  return '₦' + (kobo / 100).toLocaleString('en-NG', { maximumFractionDigits: 0 })
}

export default function Plans() {
  const [billing, setBilling] = useState<BillingMode>('monthly')
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, amount: 0.08 })
  const reduced = useReducedMotion()
  const initial = reduced ? 'visible' : 'hidden'
  const animate = inView ? 'visible' : 'hidden'

  return (
    <section style={{ background: '#fff' }}>
      <div ref={ref} className="section-inner-lg">
        {/* Header — per-element stagger */}
        <motion.div
          style={{ textAlign: 'center', marginBottom: 60 }}
          variants={staggerContainer(0.14)}
          initial={initial}
          animate={animate}
        >
          <motion.div
            variants={labelVariant}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: '#07251C',
              marginBottom: 20,
            }}
          >
            <span
              style={{
                width: 5,
                height: 5,
                borderRadius: '50%',
                background: '#07251C',
                display: 'inline-block',
              }}
            />
            Pricing
          </motion.div>
          <motion.h2
            variants={headingVariant}
            style={{
              fontFamily: 'var(--font-manrope), sans-serif',
              fontWeight: 700,
              fontSize: 'clamp(32px, 4.5vw, 54px)',
              lineHeight: 1.06,
              letterSpacing: '-0.03em',
              margin: '0 auto 18px',
              maxWidth: 580,
            }}
          >
            Flexible Plans Built for Every Stage of Growth
          </motion.h2>
          <motion.p
            variants={bodyVariant}
            style={{
              color: '#5A7068',
              fontSize: 15,
              maxWidth: 500,
              margin: '0 auto 28px',
              lineHeight: 1.65,
            }}
          >
            Whether you&apos;re just starting or managing your full health journey, we offer plans
            that grow with you.
          </motion.p>
          <motion.div variants={bodyVariant} style={{ display: 'inline-block' }}>
            <motion.a
              href="https://portal.myvaultplus.com/register"
              whileHover={!reduced ? { scale: 1.05, transition: { duration: 0.18 } } : undefined}
              whileTap={!reduced ? { scale: 0.97 } : undefined}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                background: '#07251C',
                color: '#fff',
                textDecoration: 'none',
                fontWeight: 700,
                fontSize: 12,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                padding: '11px 11px 11px 22px',
                borderRadius: 100,
              }}
            >
              Get Started
              <span
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: '#6DC43F',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M5 19L19 5M19 5H9M19 5v10"
                    stroke="#07251C"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </motion.a>
          </motion.div>

          {/* Founding Member Banner */}
          <motion.div
            variants={bodyVariant}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              background: 'linear-gradient(90deg, #07251C 0%, #0A4E3C 100%)',
              border: '1.5px solid #6DC43F',
              borderRadius: 100,
              padding: '8px 18px 8px 12px',
              marginTop: 24,
              marginBottom: 8,
            }}
          >
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#6DC43F', display: 'inline-block', flexShrink: 0 }} />
            <span style={{ color: '#fff', fontSize: 12, fontWeight: 700, letterSpacing: '0.06em' }}>
              Founding Member Pricing — Available to the First 1,000 Members
            </span>
          </motion.div>

          {/* Billing Toggle */}
          <motion.div
            variants={bodyVariant}
            style={{ display: 'flex', alignItems: 'center', gap: 0, background: '#F0F4F0', borderRadius: 100, padding: 4, marginTop: 16, marginBottom: 4 }}
          >
            {(['monthly', 'annual'] as BillingMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setBilling(mode)}
                style={{
                  padding: '8px 22px',
                  borderRadius: 100,
                  border: 'none',
                  background: billing === mode ? '#07251C' : 'transparent',
                  color: billing === mode ? '#fff' : '#27433A',
                  fontFamily: 'var(--font-manrope), sans-serif',
                  fontWeight: 700,
                  fontSize: 12,
                  letterSpacing: '0.07em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  transition: 'background 0.18s, color 0.18s',
                }}
              >
                {mode === 'monthly' ? 'Monthly' : 'Annual (Save up to 20%)'}
              </button>
            ))}
          </motion.div>
        </motion.div>

        {/* Plan cards */}
        <motion.div
          variants={staggerContainer(0.08)}
          initial={initial}
          animate={animate}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 24,
            alignItems: 'stretch',
          }}
        >
          {PLANS.map((plan) => (
            <motion.div
              key={plan.slug}
              variants={zoomOutCard}
              whileHover={!reduced ? { y: -6, transition: { duration: 0.18, ease: EASE_OUT } } : undefined}
              style={{
                background: plan.highlight ? '#6DC43F' : '#fff',
                border: plan.highlight ? 'none' : '1.5px solid #D4D4D4',
                borderRadius: 20,
                padding: 28,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Icon badge */}
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 11,
                  background: plan.iconBg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 20,
                  flexShrink: 0,
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path
                    d={plan.iconPath}
                    stroke={plan.iconColor}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

              {/* Badge label */}
              <div
                style={{
                  fontFamily: 'var(--font-manrope), sans-serif',
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  color: '#07251C',
                  marginBottom: 10,
                }}
              >
                {plan.badge}
              </div>

              {/* Display badge chip */}
              {plan.displayBadge && (
                <div style={{ display: 'inline-flex', alignItems: 'center', background: '#6DC43F', color: '#07251C', fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', padding: '3px 10px', borderRadius: 100, marginBottom: 8 }}>
                  {plan.displayBadge}
                </div>
              )}

              {/* Description */}
              <p
                style={{
                  fontSize: 13.5,
                  lineHeight: 1.55,
                  color: plan.highlight ? '#0A4E3C' : '#5A7068',
                  margin: '0 0 22px',
                }}
              >
                {plan.desc}
              </p>

              {/* Price */}
              <div style={{ marginBottom: 26 }}>
                {billing === 'annual' && plan.launchAnnualKobo > 0 && plan.monthlyKobo > 0 ? (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                      <span style={{ fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 700, fontSize: 32, letterSpacing: '-0.03em', color: '#07251C' }}>
                        {formatKobo(plan.launchAnnualKobo)}
                      </span>
                      <span style={{ fontSize: 14, fontWeight: 500, color: plan.highlight ? '#0A4E3C' : '#7A8C84' }}>/year</span>
                    </div>
                    <div style={{ fontSize: 12, color: '#888', textDecoration: 'line-through', marginTop: 2 }}>
                      {formatKobo(plan.annualKobo)}/year regular
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <span style={{ fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 700, fontSize: 38, letterSpacing: '-0.03em', color: '#07251C' }}>
                      {formatKobo(plan.monthlyKobo)}
                    </span>
                    {plan.monthlyKobo > 0 && (
                      <span style={{ fontSize: 15, fontWeight: 500, color: plan.highlight ? '#0A4E3C' : '#7A8C84' }}>/month</span>
                    )}
                  </div>
                )}
              </div>

              {/* Features */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 11,
                  flex: 1,
                  marginBottom: 28,
                }}
              >
                {plan.items.map((item) => (
                  <div
                    key={item}
                    style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13.5 }}
                  >
                    <span
                      style={{
                        width: 19,
                        height: 19,
                        borderRadius: '50%',
                        background: '#07251C',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        marginTop: 1,
                      }}
                    >
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M5 12l4 4L19 7"
                          stroke="#6DC43F"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                    <span style={{ color: plan.highlight ? '#07251C' : '#27433A' }}>{item}</span>
                  </div>
                ))}
              </div>

              {/* CTA button */}
              <motion.a
                href={plan.ctaHref}
                whileHover={!reduced ? { opacity: 0.9, transition: { duration: 0.12 } } : undefined}
                style={{
                  display: 'block',
                  textAlign: 'center',
                  background: '#07251C',
                  color: plan.highlight ? '#6DC43F' : '#fff',
                  textDecoration: 'none',
                  fontWeight: 700,
                  fontSize: 12,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  padding: 14,
                  borderRadius: 100,
                }}
              >
                {plan.ctaLabel}
              </motion.a>
            </motion.div>
          ))}
        </motion.div>

        {/* Corporate note */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
          transition={{ duration: 0.9, ease: EASE_OUT, delay: 0.35 }}
          style={{
            marginTop: 20,
            background: '#F7FAF7',
            border: '1px solid rgba(0,0,0,0.08)',
            borderRadius: 16,
            padding: '20px 28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 24,
            flexWrap: 'wrap',
          }}
        >
          <p style={{ margin: 0, color: '#27433A', fontSize: 15, maxWidth: 620 }}>
            Corporate and HMO plans available for employers, estates, schools, and government
            organisations.
          </p>
          <Link
            href="/corporate"
            style={{
              color: '#137333',
              fontWeight: 600,
              fontSize: 14.5,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              whiteSpace: 'nowrap',
            }}
          >
            Enquire About Corporate Plans
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path
                d="M5 12h14M13 6l6 6-6 6"
                stroke="#137333"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
