'use client'
import { motion, useInView, useReducedMotion } from 'framer-motion'
import { useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { EASE_OUT, cardVariant, staggerContainer, labelVariant, headingVariant, bodyVariant } from '@/lib/motion'

const ArrowRight = ({ color = '#07251C' }: { color?: string }) => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
    <path d="M5 12h14M13 6l6 6-6 6" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export default function Services() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, amount: 0.08 })
  const reduced = useReducedMotion()
  const initial = reduced ? 'visible' : 'hidden'
  const animate = inView ? 'visible' : 'hidden'

  return (
    <section
      style={{
        background: '#F7FAF7',
        borderTop: '1px solid rgba(7,37,28,0.07)',
        borderBottom: '1px solid rgba(7,37,28,0.07)',
      }}
    >
      <div ref={ref} className="section-inner-lg">
        {/* Section header — each element staggers in */}
        <motion.div
          style={{ textAlign: 'center', marginBottom: 56 }}
          variants={staggerContainer(0.14)}
          initial={initial}
          animate={animate}
        >
          <motion.div
            variants={labelVariant}
            style={{
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: '#137333',
              marginBottom: 18,
            }}
          >
            — Services
          </motion.div>
          <motion.h2
            variants={headingVariant}
            style={{
              fontFamily: 'var(--font-manrope), sans-serif',
              fontWeight: 600,
              fontSize: 'clamp(28px, 3.5vw, 40px)',
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
              margin: '0 auto 24px',
              maxWidth: 640,
            }}
          >
            Comprehensive care and{' '}
            <em
              style={{
                fontFamily: 'var(--font-manrope), sans-serif',
                fontStyle: 'italic',
                fontWeight: 700,
              }}
            >
              intelligent access.
            </em>
          </motion.h2>
          <motion.div variants={bodyVariant} style={{ display: 'inline-block' }}>
            <motion.div
              whileHover={!reduced ? { scale: 1.05, transition: { duration: 0.18 } } : undefined}
              whileTap={!reduced ? { scale: 0.97 } : undefined}
              style={{ display: 'inline-block' }}
            >
              <Link
                href="/services"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 10,
                  background: '#07251C',
                  color: '#fff',
                  textDecoration: 'none',
                  fontWeight: 600,
                  fontSize: 14,
                  padding: '10px 11px 10px 22px',
                  borderRadius: 100,
                }}
              >
                View All Services
                <span
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: '#6DC43F',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ArrowRight />
                </span>
              </Link>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Grid row 1 */}
        <motion.div
          variants={staggerContainer(0.08)}
          initial={initial}
          animate={animate}
          className="services-bento"
        >
          {/* TeleCare image card */}
          <motion.div
            variants={cardVariant}
            whileHover={!reduced ? { y: -14, scale: 1.02, transition: { duration: 0.22, ease: EASE_OUT } } : undefined}
            style={{
              background: '#07251C',
              borderRadius: 22,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              padding: 16,
              gap: 16,
            }}
          >
            <div
              style={{
                position: 'relative',
                height: 260,
                borderRadius: 12,
                overflow: 'hidden',
                flexShrink: 0,
              }}
            >
              <motion.div
                style={{ position: 'absolute', inset: 0 }}
                whileHover={!reduced ? { scale: 1.09, transition: { duration: 0.55, ease: EASE_OUT } } : undefined}
              >
                <Image
                  src="https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=800&h=600&fit=crop&crop=faces&q=80"
                  alt="Black woman doctor in telehealth video consultation"
                  fill
                  style={{ objectFit: 'cover', objectPosition: 'center top' }}
                  sizes="(max-width: 768px) 100vw, 500px"
                />
              </motion.div>
            </div>

            <div style={{ padding: '8px 8px 12px' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  background: 'rgba(109,196,63,0.18)',
                  color: '#6DC43F',
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '5px 12px',
                  borderRadius: 100,
                  letterSpacing: '0.04em',
                  marginBottom: 10,
                }}
              >
                TeleCare™
              </span>
              <h3
                style={{
                  fontFamily: 'var(--font-manrope), sans-serif',
                  fontWeight: 600,
                  fontSize: 18,
                  color: '#fff',
                  margin: '0 0 6px',
                }}
              >
                Remote Healthcare, Delivered to You
              </h3>
              <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13.5, lineHeight: 1.55, margin: 0 }}>
                Consult with qualified providers via video — from anywhere in Nigeria.
              </p>
            </div>
          </motion.div>

          {/* Expert Review */}
          <ServiceCard
            iconBg="#EAF7F1"
            icon={
              <svg width="21" height="21" viewBox="0 0 24 24" fill="none">
                <path d="M9 11l2 2 4-4" stroke="#137333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" stroke="#137333" strokeWidth="2" strokeLinejoin="round" />
              </svg>
            }
            title="Expert Review™"
            desc="Get a specialist second opinion on any diagnosis, treatment plan, or lab result — reviewed by a qualified clinical panel."
            bullets={['18+ specialist fields', 'Full document upload', 'PDF report to your Vault']}
            href="/expert-review"
            reduced={reduced ?? false}
          />

          {/* DispatchCare */}
          <ServiceCard
            iconBg="rgba(255,92,92,0.1)"
            icon={
              <svg width="21" height="21" viewBox="0 0 24 24" fill="none">
                <path d="M5 17h14l-1.5-5A4 4 0 0013.7 9h-3.4A4 4 0 006.5 12L5 17z" stroke="#FF5C5C" strokeWidth="2" strokeLinejoin="round" />
                <circle cx="8" cy="18" r="1.5" stroke="#FF5C5C" strokeWidth="2" />
                <circle cx="16" cy="18" r="1.5" stroke="#FF5C5C" strokeWidth="2" />
              </svg>
            }
            title="DispatchCare™"
            desc="24/7 emergency medical dispatch — one tap from any screen sends your location to the HHA operations team."
            bullets={['Auto-detects your location', 'Instant case ID + SMS alert', 'Available on all plans']}
            href="/dispatchcare"
            reduced={reduced ?? false}
          />
        </motion.div>

        {/* Grid row 2 — smaller cards */}
        <motion.div
          variants={staggerContainer(0.07)}
          initial={initial}
          animate={animate}
          className="rg-3"
          style={{ marginTop: 16 }}
        >
          {[
            {
              name: 'MinuteCare™',
              desc: 'Fast-track walk-in clinic scheduling. Skip the queue and arrive at the right time.',
              href: '/services',
            },
            {
              name: 'CareTest™',
              desc: 'Schedule diagnostic tests and lab work. Results linked directly to your Vault.',
              href: '/services',
            },
            {
              name: 'HealthConsult™',
              desc: 'Personalised preventive care programmes and care plan consultations.',
              href: '/services',
            },
          ].map((svc) => (
            <motion.div
              key={svc.name}
              variants={cardVariant}
              whileHover={!reduced ? { y: -14, scale: 1.03, transition: { duration: 0.22, ease: EASE_OUT } } : undefined}
              style={{
                background: '#fff',
                border: '1px solid rgba(7,37,28,0.09)',
                borderRadius: 20,
                padding: '24px 26px',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--font-manrope), sans-serif',
                  fontWeight: 600,
                  fontSize: 17,
                  color: '#07251C',
                }}
              >
                {svc.name}
              </div>
              <p style={{ color: '#41584E', fontSize: 14, lineHeight: 1.6, margin: 0, flex: 1 }}>
                {svc.desc}
              </p>
              <Link
                href={svc.href}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  color: '#137333',
                  fontWeight: 600,
                  fontSize: 13.5,
                  textDecoration: 'none',
                }}
              >
                Learn more
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                  <path d="M5 12h14M13 6l6 6-6 6" stroke="#137333" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

function ServiceCard({
  iconBg,
  icon,
  title,
  desc,
  bullets,
  href,
  reduced,
}: {
  iconBg: string
  icon: React.ReactNode
  title: string
  desc: string
  bullets: string[]
  href: string
  reduced: boolean
}) {
  return (
    <motion.div
      variants={cardVariant}
      whileHover={!reduced ? { y: -14, scale: 1.03, transition: { duration: 0.22, ease: EASE_OUT } } : undefined}
      style={{
        background: '#fff',
        border: '1px solid rgba(7,37,28,0.09)',
        borderRadius: 22,
        padding: 28,
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
      }}
    >
      <div>
        <span
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: iconBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon}
        </span>
        <h3
          style={{
            fontFamily: 'var(--font-manrope), sans-serif',
            fontWeight: 600,
            fontSize: 19,
            margin: '14px 0 7px',
          }}
        >
          {title}
        </h3>
        <p style={{ color: '#41584E', fontSize: 14, lineHeight: 1.6, margin: 0 }}>{desc}</p>
      </div>
      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ height: 1, background: 'rgba(7,37,28,0.08)' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {bullets.map((b) => (
            <div key={b} style={{ display: 'flex', gap: 8, fontSize: 13, color: '#27433A' }}>
              <span style={{ color: '#137333', fontWeight: 700 }}>✓</span>
              {b}
            </div>
          ))}
        </div>
        <Link
          href={href}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            color: '#137333',
            fontWeight: 600,
            fontSize: 13.5,
            textDecoration: 'none',
            marginTop: 4,
          }}
        >
          Learn more
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <path d="M5 12h14M13 6l6 6-6 6" stroke="#137333" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      </div>
    </motion.div>
  )
}
