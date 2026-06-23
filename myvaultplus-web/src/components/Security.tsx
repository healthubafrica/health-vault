'use client'

import { useRef, useState } from 'react'
import { motion, useInView, useReducedMotion } from 'framer-motion'
import { staggerContainer, labelVariant, headingVariant, bodyVariant } from '@/lib/motion'

const rowOne = [
  {
    icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
    titleColor: '#6DC43F',
    title: 'NDPR Compliance',
    desc: "Fully compliant with Nigeria's Data Protection Regulation. Your health data is handled according to Nigerian law and patient rights.",
    photo: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=600&h=600&fit=crop&q=80',
  },
  {
    icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
    titleColor: '#6DC43F',
    title: 'HIPAA-Aligned Practices',
    desc: 'Built to meet HIPAA standards for the protection of protected health information (PHI), following international best practices.',
    photo: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=600&h=600&fit=crop&q=80',
  },
  {
    icon: 'M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
    titleColor: '#6DC43F',
    title: 'FHIR Interoperability',
    desc: 'FHIR R4-compliant infrastructure enables seamless, secure exchange of records across hospitals, labs, specialists, and HMOs.',
    photo: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=600&h=600&fit=crop&q=80',
  },
]

const rowTwo = [
  {
    icon: 'M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4',
    titleColor: '#6DC43F',
    title: 'Encrypted Data Storage',
    desc: 'All health records encrypted at rest and in transit. No data is stored or cached locally — delivered only to your authenticated session.',
    photo: 'https://images.unsplash.com/photo-1516841273335-e39b37888115?w=600&h=600&fit=crop&q=80',
  },
  {
    icon: 'M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z',
    titleColor: '#6DC43F',
    title: 'Secure Record Sharing',
    desc: 'Share your medical history with providers, employers, HMOs, or specialists via controlled, time-limited, consent-based access.',
    photo: 'https://images.unsplash.com/photo-1551190822-a9333d879b1f?w=600&h=600&fit=crop&q=80',
  },
]

const allItems = [...rowOne, ...rowTwo]

type SecurityItem = (typeof rowOne)[0]

/** Desktop: accordion row — hovered card expands and reveals its photo. */
function AccordionRow({ items }: { items: SecurityItem[] }) {
  const [hovered, setHovered] = useState(0)

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: items.map((_, i) => (hovered === i ? '2fr' : '1fr')).join(' '),
        gap: 12,
        transition: 'grid-template-columns 0.44s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
      onMouseLeave={() => setHovered(0)}
    >
      {items.map((item, i) => {
        const isActive = hovered === i
        return (
          <div
            key={item.title}
            onMouseEnter={() => setHovered(i)}
            style={{
              background: '#fff',
              borderRadius: 18,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'stretch',
              padding: 28,
              gap: isActive ? 20 : 0,
              transition: 'gap 0.44s cubic-bezier(0.4, 0, 0.2, 1)',
              height: 316,
            }}
          >
            {/* Left column: icon at top, title+desc at bottom */}
            <div
              style={{
                flex: 1,
                minWidth: 0,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 10,
                  background: item.titleColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path
                    d={item.icon}
                    stroke="#07251C"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

              <div>
                <h3
                  style={{
                    fontFamily: 'var(--font-manrope), sans-serif',
                    fontWeight: 700,
                    fontSize: 18,
                    margin: '0 0 8px',
                    color: item.titleColor,
                    letterSpacing: '-0.01em',
                    lineHeight: 1.25,
                  }}
                >
                  {item.title}
                </h3>
                <p style={{ fontSize: 13, lineHeight: 1.65, color: '#5A7068', margin: 0 }}>
                  {item.desc}
                </p>
              </div>
            </div>

            {/* Right: square image, inset, animates in on hover */}
            <div
              style={{
                flexShrink: 0,
                width: isActive ? 260 : 0,
                height: 260,
                alignSelf: 'center',
                overflow: 'hidden',
                borderRadius: 14,
                position: 'relative',
                transition: 'width 0.44s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.photo}
                alt={item.title}
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  objectPosition: 'center',
                }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

/** Mobile: always-visible photo with a dark overlay (no hover interaction needed on touch). */
function TrustCard({ item }: { item: SecurityItem }) {
  return (
    <div
      className="security-card"
      style={{
        position: 'relative',
        borderRadius: 18,
        overflow: 'hidden',
        height: 220,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={item.photo}
        alt={item.title}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'center',
        }}
      />

      <div className="security-overlay" />

      <div
        style={{
          position: 'absolute',
          inset: 0,
          padding: 26,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          zIndex: 1,
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 10,
            background: 'rgba(109,196,63,0.25)',
            border: '1px solid rgba(109,196,63,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            backdropFilter: 'blur(6px)',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path
              d={item.icon}
              stroke="#6DC43F"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <div>
          <h3
            style={{
              fontFamily: 'var(--font-manrope), sans-serif',
              fontWeight: 700,
              fontSize: 17,
              margin: '0 0 8px',
              color: '#fff',
              letterSpacing: '-0.01em',
              lineHeight: 1.25,
            }}
          >
            {item.title}
          </h3>
          <p
            style={{
              fontSize: 13,
              lineHeight: 1.65,
              color: 'rgba(255,255,255,0.78)',
              margin: 0,
            }}
          >
            {item.desc}
          </p>
        </div>
      </div>
    </div>
  )
}

export default function Security() {
  const headerRef = useRef(null)
  const inView = useInView(headerRef, { once: true, amount: 0.2 })
  const reduced = useReducedMotion()

  return (
    <section style={{ background: '#F7FAF7' }}>
      <style>{`
        .security-overlay {
          position: absolute;
          inset: 0;
          background: rgba(4, 18, 12, 0.82);
          transition: background 0.38s ease;
          z-index: 0;
        }
        .security-card:hover .security-overlay {
          background: rgba(4, 18, 12, 0.44);
        }
        .security-desktop-only { display: block; }
        .security-mobile-only { display: none; }
        @media (max-width: 768px) {
          .security-desktop-only { display: none !important; }
          .security-mobile-only { display: flex !important; flex-direction: column; gap: 10px; padding: 12px; }
        }
      `}</style>

      <div className="section-inner-lg">

        {/* Header */}
        <motion.div
          ref={headerRef}
          style={{ textAlign: 'center', marginBottom: 64 }}
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
              marginBottom: 20,
            }}
          >
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#07251C', display: 'inline-block' }} />
            Security &amp; Trust
          </motion.div>

          <motion.h2
            variants={headingVariant}
            style={{
              fontFamily: 'var(--font-manrope), sans-serif',
              fontWeight: 700,
              fontSize: 'clamp(30px, 4vw, 50px)',
              lineHeight: 1.08,
              letterSpacing: '-0.03em',
              margin: '0 auto 18px',
              maxWidth: 560,
              color: '#07251C',
            }}
          >
            Comprehensive protection and clinically{' '}
            <em style={{ fontFamily: 'var(--font-playfair-display), serif', fontStyle: 'italic', fontWeight: 700 }}>
              governed infrastructure
            </em>
          </motion.h2>

          <motion.p
            variants={bodyVariant}
            style={{ color: '#5A7068', fontSize: 15, maxWidth: 460, margin: '0 auto 28px', lineHeight: 1.65 }}
          >
            Whether you&apos;re checking results or sharing records with a specialist, your data
            stays encrypted and never exposed.
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
                fontSize: 11,
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
                  <path d="M5 19L19 5M19 5H9M19 5v10" stroke="#07251C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </motion.a>
          </motion.div>
        </motion.div>

        {/* ── Desktop: accordion rows, hover to reveal photo ── */}
        <div className="security-desktop-only">
          <div
            style={{
              background: '#DEDEDE',
              borderRadius: 28,
              padding: 16,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <AccordionRow items={rowOne} />
            <div style={{ maxWidth: 'calc(66.667% - 4px)', margin: '0 auto', width: '100%' }}>
              <AccordionRow items={rowTwo} />
            </div>
          </div>
        </div>

        {/* ── Mobile: stacked cards, photo always visible ── */}
        <div className="security-mobile-only">
          {allItems.map((item) => (
            <TrustCard key={item.title} item={item} />
          ))}
        </div>

      </div>
    </section>
  )
}
