'use client'

import { useRef } from 'react'
import { motion, useInView, useReducedMotion } from 'framer-motion'
import { EASE_OUT, staggerContainer, labelVariant, headingVariant, bodyVariant } from '@/lib/motion'
import type { CmsTestimonial } from '@/lib/cms'

const CARD_W = 300
const GAP = 16

interface TestimonialsProps {
  testimonials?: CmsTestimonial[]
}

export default function Testimonials({ testimonials = [] }: TestimonialsProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef(null)
  const inView = useInView(headerRef, { once: true, amount: 0.2 })
  const reduced = useReducedMotion()

  const scroll = (dir: 'prev' | 'next') => {
    if (!trackRef.current) return
    const amount = CARD_W + GAP
    trackRef.current.scrollBy({ left: dir === 'next' ? amount : -amount, behavior: 'smooth' })
  }

  return (
    <section style={{ background: '#fff', padding: '96px 0' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 clamp(16px, 4vw, 56px)' }}>

        {/* ── Header row — per-element stagger ── */}
        <motion.div
          ref={headerRef}
          variants={staggerContainer(0.14)}
          initial={reduced ? 'visible' : 'hidden'}
          animate={inView ? 'visible' : 'hidden'}
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            marginBottom: 48,
            gap: 24,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ maxWidth: 520 }}>
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
              <span
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: '50%',
                  background: '#07251C',
                  display: 'inline-block',
                }}
              />
              Testimonials
            </motion.div>

            <motion.h2
              variants={headingVariant}
              style={{
                fontFamily: 'var(--font-manrope), sans-serif',
                fontWeight: 700,
                fontSize: 'clamp(28px, 4vw, 46px)',
                lineHeight: 1.08,
                letterSpacing: '-0.03em',
                margin: '0 0 14px',
                color: '#07251C',
              }}
            >
              What they say about us?
            </motion.h2>
            <motion.p variants={bodyVariant} style={{ color: '#5A7068', fontSize: 15, lineHeight: 1.6, margin: 0 }}>
              Here&apos;s what they shared about their experience using MyHealth Vault+.
            </motion.p>
          </div>

          {/* Prev / Next arrows */}
          <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
            {(['prev', 'next'] as const).map((dir) => (
              <button
                key={dir}
                onClick={() => scroll(dir)}
                aria-label={dir === 'prev' ? 'Previous testimonials' : 'Next testimonials'}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  border: '1.5px solid rgba(7,37,28,0.18)',
                  background: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'background 0.18s, border-color 0.18s',
                }}
                onMouseEnter={(e) => {
                  ;(e.currentTarget as HTMLButtonElement).style.background = '#07251C'
                  ;(e.currentTarget as HTMLButtonElement).style.borderColor = '#07251C'
                  const svg = (e.currentTarget as HTMLButtonElement).querySelector('path')
                  if (svg) svg.setAttribute('stroke', '#fff')
                }}
                onMouseLeave={(e) => {
                  ;(e.currentTarget as HTMLButtonElement).style.background = '#fff'
                  ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(7,37,28,0.18)'
                  const svg = (e.currentTarget as HTMLButtonElement).querySelector('path')
                  if (svg) svg.setAttribute('stroke', '#07251C')
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path
                    d={dir === 'prev' ? 'M19 12H5M11 6l-6 6 6 6' : 'M5 12h14M13 6l6 6-6 6'}
                    stroke="#07251C"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            ))}
          </div>
        </motion.div>

        {/* ── Card track or founding-member CTA ── */}
        {testimonials.length > 0 ? (
          <motion.div
            ref={trackRef}
            initial={reduced ? {} : { opacity: 0, x: 80 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 1.05, ease: EASE_OUT, delay: 0.35 }}
            style={{
              display: 'flex',
              gap: GAP,
              overflowX: 'auto',
              scrollSnapType: 'x mandatory',
              scrollbarWidth: 'none',
              marginLeft: -4,
              marginRight: -4,
              paddingLeft: 4,
              paddingRight: 4,
              paddingBottom: 4,
            }}
          >
            {testimonials.map((t) => (
              <div
                key={t.id}
                style={{
                  flexShrink: 0,
                  width: CARD_W,
                  scrollSnapAlign: 'start',
                  borderRadius: 20,
                  overflow: 'hidden',
                  position: 'relative',
                  background: '#1a1a1a',
                  aspectRatio: '3/4',
                }}
              >
                {t.authorPhotoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={t.authorPhotoUrl}
                    alt={t.authorName}
                    style={{
                      position: 'absolute',
                      inset: 0,
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      objectPosition: 'center top',
                    }}
                  />
                )}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: t.authorPhotoUrl
                      ? 'linear-gradient(to bottom, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.10) 40%, rgba(0,0,0,0.78) 100%)'
                      : 'linear-gradient(160deg, #0E4A30 0%, #07251C 100%)',
                  }}
                />
                {t.authorCompany && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 18,
                      left: 18,
                      background: 'rgba(255,255,255,0.15)',
                      backdropFilter: 'blur(8px)',
                      borderRadius: 8,
                      padding: '5px 12px',
                      fontSize: 11,
                      fontWeight: 700,
                      color: '#fff',
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                    }}
                  >
                    {t.authorCompany}
                  </div>
                )}
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0 20px 22px' }}>
                  <div style={{ fontFamily: 'Georgia, serif', fontSize: 36, lineHeight: 1, color: '#6DC43F', marginBottom: 6 }}>❝</div>
                  <p style={{ fontSize: 13, lineHeight: 1.6, color: '#fff', margin: '0 0 10px', fontWeight: 400 }}>{t.quote}</p>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', margin: 0, fontWeight: 500 }}>
                    — {t.authorName}
                    {t.authorTitle ? `, ${t.authorTitle}` : ''}
                  </p>
                </div>
              </div>
            ))}
          </motion.div>
        ) : (
          <motion.div
            initial={reduced ? {} : { opacity: 0, y: 24 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.85, ease: EASE_OUT, delay: 0.3 }}
            style={{
              background: '#07251C',
              borderRadius: 24,
              padding: 'clamp(40px, 6vw, 72px) clamp(24px, 6vw, 72px)',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#6DC43F', marginBottom: 18 }}>
              Founding Members Programme
            </div>
            <h3
              style={{
                fontFamily: 'var(--font-manrope), sans-serif',
                fontWeight: 700,
                fontSize: 'clamp(24px, 3.5vw, 40px)',
                lineHeight: 1.1,
                letterSpacing: '-0.02em',
                color: '#fff',
                margin: '0 auto 18px',
                maxWidth: 560,
              }}
            >
              Help us build the future of healthcare access across Africa.
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.58)', fontSize: 15, lineHeight: 1.65, maxWidth: 480, margin: '0 auto 32px' }}>
              Create your FREE account today and join our founding members — patients who are shaping
              the MyHealth Vault+™ experience from day one.
            </p>
            <a
              href="https://portal.myvaultplus.com/register"
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
                  background: '#07251C',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                  <path d="M5 19L19 5M19 5H9M19 5v10" stroke="#6DC43F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </a>
          </motion.div>
        )}
      </div>

      {/* Hide scrollbar globally for this component */}
      <style>{`
        div::-webkit-scrollbar { display: none; }
      `}</style>
    </section>
  )
}
