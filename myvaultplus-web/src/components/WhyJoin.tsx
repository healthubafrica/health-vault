'use client'
import { useRef } from 'react'
import { motion, useInView, useReducedMotion } from 'framer-motion'
import { EASE_OUT, staggerContainer, labelVariant, headingVariant, bodyVariant } from '@/lib/motion'

const benefits = [
  { icon: 'M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4', text: 'Store all your health records securely in one place — forever' },
  { icon: 'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064', text: 'Access your complete medical history from anywhere in the world' },
  { icon: 'M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z', text: 'Share records with new doctors, specialists, or employers with one tap' },
  { icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4', text: 'Build a lifelong digital health record that follows you across providers' },
  { icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.437L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9', text: 'Emergency responders can access critical health info when you cannot speak' },
  { icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z', text: 'Get second opinions from specialists across Nigeria without leaving home' },
  { icon: 'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z', text: 'Keep all lab reports and imaging results organised and searchable' },
  { icon: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z', text: 'Manage health records for your entire family under one account' },
  { icon: 'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064', text: 'Use your Health Passport for travel, immigration medicals, and international care' },
]

export default function WhyJoin() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, amount: 0.08 })
  const reduced = useReducedMotion()

  return (
    <section ref={ref} style={{ background: '#F7FAF7' }}>
      <div className="section-inner-lg">
        {/* Header */}
        <motion.div
          style={{ textAlign: 'center', marginBottom: 56 }}
          variants={staggerContainer(0.14)}
          initial={reduced ? 'visible' : 'hidden'}
          animate={inView ? 'visible' : 'hidden'}
        >
          <motion.div
            variants={labelVariant}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: '#07251C',
              marginBottom: 18,
            }}
          >
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#07251C', display: 'inline-block' }} />
            Why Join
          </motion.div>
          <motion.h2
            variants={headingVariant}
            style={{
              fontFamily: 'var(--font-manrope), sans-serif',
              fontWeight: 700,
              fontSize: 'clamp(28px, 4vw, 48px)',
              lineHeight: 1.08,
              letterSpacing: '-0.03em',
              margin: '0 auto 18px',
              maxWidth: 640,
              color: '#07251C',
            }}
          >
            Why Thousands of Nigerians Need{' '}
            <em style={{ fontFamily: 'var(--font-playfair-display), serif', fontStyle: 'italic', color: '#137333' }}>
              MyHealth Vault+™
            </em>
          </motion.h2>
          <motion.p
            variants={bodyVariant}
            style={{ color: '#5A7068', fontSize: 15, maxWidth: 480, margin: '0 auto', lineHeight: 1.65 }}
          >
            Most Nigerians lose their medical history when they change hospitals or relocate. Your
            Health Passport ends that — once and for all.
          </motion.p>
        </motion.div>

        {/* Benefits grid */}
        <motion.div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 16,
            marginBottom: 56,
          }}
          variants={staggerContainer(0.06)}
          initial={reduced ? 'visible' : 'hidden'}
          animate={inView ? 'visible' : 'hidden'}
        >
          {benefits.map((b, i) => (
            <motion.div
              key={i}
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE_OUT } },
              }}
              style={{
                background: '#fff',
                border: '1px solid rgba(7,37,28,0.08)',
                borderRadius: 14,
                padding: '18px 20px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 14,
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 9,
                  background: '#EAF7F1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: 1,
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d={b.icon} stroke="#137333" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <p style={{ fontSize: 14, lineHeight: 1.55, color: '#27433A', margin: 0, fontWeight: 500 }}>{b.text}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={reduced ? {} : { opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.75, ease: EASE_OUT, delay: 0.4 }}
          className="whyjoin-cta"
          style={{ textAlign: 'center' }}
        >
          <a
            href="https://portal.myvaultplus.com/register"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              background: '#07251C',
              color: '#fff',
              textDecoration: 'none',
              fontWeight: 700,
              fontSize: 13,
              letterSpacing: '0.07em',
              textTransform: 'uppercase',
              padding: '13px 13px 13px 26px',
              borderRadius: 100,
            }}
          >
            Create Your FREE Health Passport
            <span
              style={{
                width: 30,
                height: 30,
                borderRadius: '50%',
                background: '#6DC43F',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path d="M5 19L19 5M19 5H9M19 5v10" stroke="#07251C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </a>
        </motion.div>
      </div>

      <style>{`
        @media (max-width: 480px) {
          .whyjoin-cta a {
            width: 100%;
            justify-content: center;
            font-size: 11px !important;
            padding: 12px 12px 12px 20px !important;
          }
        }
      `}</style>
    </section>
  )
}
