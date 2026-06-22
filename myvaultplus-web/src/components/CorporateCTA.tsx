'use client'
import { useRef } from 'react'
import { motion, useInView, useReducedMotion } from 'framer-motion'
import { EASE_OUT, staggerContainer, labelVariant, headingVariant, bodyVariant } from '@/lib/motion'

const sectors = [
  { icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4', label: 'Employers & Corporates', accent: false },
  { icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z', label: 'HMOs & Insurers', accent: false },
  { icon: 'M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9', label: 'Government Agencies', accent: false },
  { icon: 'M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222', label: 'Schools & Universities', accent: false },
  { icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6', label: 'Residential Estates', accent: false },
  { icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z', label: 'NGOs & Aid Organisations', accent: false },
  { icon: 'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064', label: 'International Organisations', accent: true },
]

const CARD_R = 20

export default function CorporateCTA() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, amount: 0.1 })
  const reduced = useReducedMotion()

  return (
    <section ref={ref} style={{ background: '#fff' }}>
      <div className="section-inner-lg">

        {/* Section label + heading */}
        <motion.div
          style={{ marginBottom: 40 }}
          variants={staggerContainer(0.12)}
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
              marginBottom: 16,
            }}
          >
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#07251C', display: 'inline-block' }} />
            Enterprise Solutions
          </motion.div>
          <motion.h2
            variants={headingVariant}
            style={{
              fontFamily: 'var(--font-manrope), sans-serif',
              fontWeight: 700,
              fontSize: 'clamp(28px, 4vw, 48px)',
              lineHeight: 1.08,
              letterSpacing: '-0.03em',
              margin: 0,
              maxWidth: 520,
              color: '#07251C',
            }}
          >
            Solutions For{' '}
            <em style={{ fontFamily: 'var(--font-playfair-display), serif', fontStyle: 'italic', color: '#137333' }}>
              Organisations
            </em>
          </motion.h2>
        </motion.div>

        {/* ── Bento grid ── */}
        <motion.div
          variants={staggerContainer(0.07)}
          initial={reduced ? 'visible' : 'hidden'}
          animate={inView ? 'visible' : 'hidden'}
          className="corporate-bento"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gridTemplateRows: 'repeat(3, minmax(160px, auto))',
            gap: 14,
          }}
        >

          {/* ── Hero CTA card — spans 2 cols × 2 rows ── */}
          <motion.div
            variants={{
              hidden: { opacity: 0, scale: 0.96 },
              visible: { opacity: 1, scale: 1, transition: { duration: 0.6, ease: EASE_OUT } },
            }}
            style={{
              gridColumn: '1 / 3',
              gridRow: '1 / 3',
              background: '#07251C',
              borderRadius: CARD_R,
              padding: 'clamp(28px, 3.5vw, 40px)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  background: 'rgba(109,196,63,0.15)',
                  border: '1px solid rgba(109,196,63,0.3)',
                  borderRadius: 100,
                  padding: '5px 12px',
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: '#6DC43F',
                  marginBottom: 20,
                }}
              >
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#6DC43F', display: 'inline-block' }} />
                Corporate & Enterprise
              </div>
              <h3
                style={{
                  fontFamily: 'var(--font-manrope), sans-serif',
                  fontWeight: 700,
                  fontSize: 'clamp(22px, 2.5vw, 32px)',
                  lineHeight: 1.15,
                  letterSpacing: '-0.02em',
                  color: '#fff',
                  margin: '0 0 14px',
                  maxWidth: 320,
                }}
              >
                Bring MyHealth Vault+™ to your entire organisation.
              </h3>
              <p
                style={{
                  fontSize: 14,
                  lineHeight: 1.65,
                  color: 'rgba(255,255,255,0.55)',
                  margin: 0,
                  maxWidth: 340,
                }}
              >
                Custom plans, FHIR integration, and staff health programme support. We handle the
                infrastructure so your people get seamless care.
              </p>
            </div>

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
                fontSize: 12,
                letterSpacing: '0.07em',
                textTransform: 'uppercase',
                padding: '12px 12px 12px 22px',
                borderRadius: 100,
                alignSelf: 'flex-start',
              }}
            >
              Schedule a Corporate Demo
              <span
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: '#07251C',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                  <path d="M5 19L19 5M19 5H9M19 5v10" stroke="#6DC43F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </a>
          </motion.div>

          {/* ── 4 sector cards — top-right 2×2 block ── */}
          {sectors.slice(0, 4).map((s, i) => (
            <motion.div
              key={s.label}
              variants={{
                hidden: { opacity: 0, y: 18 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE_OUT } },
              }}
              style={{
                gridColumn: i % 2 === 0 ? '3' : '4',
                gridRow: i < 2 ? '1' : '2',
                background: '#F7FAF7',
                border: '1px solid rgba(7,37,28,0.08)',
                borderRadius: CARD_R,
                padding: '22px 24px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: '#EAF7F1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                  <path d={s.icon} stroke="#137333" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-manrope), sans-serif',
                  fontWeight: 600,
                  fontSize: 14,
                  color: '#07251C',
                  lineHeight: 1.3,
                }}
              >
                {s.label}
              </div>
            </motion.div>
          ))}

          {/* ── Bottom row: 2 standard cards + 1 wide accent card ── */}
          {sectors.slice(4, 6).map((s, i) => (
            <motion.div
              key={s.label}
              variants={{
                hidden: { opacity: 0, y: 18 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE_OUT } },
              }}
              style={{
                gridColumn: `${i + 1}`,
                gridRow: '3',
                background: '#fff',
                border: '1px solid rgba(7,37,28,0.1)',
                borderRadius: CARD_R,
                padding: '22px 24px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: '#EAF7F1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                  <path d={s.icon} stroke="#137333" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-manrope), sans-serif',
                  fontWeight: 600,
                  fontSize: 14,
                  color: '#07251C',
                  lineHeight: 1.3,
                }}
              >
                {s.label}
              </div>
            </motion.div>
          ))}

          {/* ── International card — wide accent, col 3-4, row 3 ── */}
          <motion.div
            variants={{
              hidden: { opacity: 0, y: 18 },
              visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE_OUT } },
            }}
            style={{
              gridColumn: '3 / 5',
              gridRow: '3',
              background: '#6DC43F',
              borderRadius: CARD_R,
              padding: '22px 28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  background: 'rgba(7,37,28,0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
                  <path d={sectors[6].icon} stroke="#07251C" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 700, fontSize: 15, color: '#07251C', lineHeight: 1.25 }}>
                  International Organisations
                </div>
                <div style={{ fontSize: 12, color: 'rgba(7,37,28,0.6)', marginTop: 3 }}>
                  Cross-border health record sharing &amp; FHIR portability
                </div>
              </div>
            </div>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, opacity: 0.5 }}>
              <path d="M5 12h14M13 6l6 6-6 6" stroke="#07251C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </motion.div>

        </motion.div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .corporate-bento {
            grid-template-columns: 1fr 1fr !important;
            grid-template-rows: auto !important;
            gap: 10px !important;
          }
          .corporate-bento > *  { grid-column: auto !important; grid-row: auto !important; }
          /* Hero card full width */
          .corporate-bento > *:first-child { grid-column: 1 / -1 !important; }
          /* International card full width */
          .corporate-bento > *:last-child  { grid-column: 1 / -1 !important; }
        }
        @media (max-width: 380px) {
          .corporate-bento { grid-template-columns: 1fr !important; }
          .corporate-bento > * { grid-column: 1 !important; }
        }
      `}</style>
    </section>
  )
}
