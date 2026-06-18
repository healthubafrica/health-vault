'use client'

import { useState, useRef } from 'react'
import { motion, useInView, useReducedMotion } from 'framer-motion'
import Image from 'next/image'
import { EASE_OUT, staggerContainer, labelVariant, headingVariant, bodyVariant } from '@/lib/motion'

const items = [
  {
    icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
    titleColor: '#137333',
    title: 'Zero PHI on Your Device',
    desc: 'Records are never stored or cached locally; they are delivered only to your authenticated session on protected servers.',
    photo: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=600&h=600&fit=crop&q=80',
  },
  {
    icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
    titleColor: '#1D4ED8',
    title: 'End-to-End Protected',
    desc: 'Every request encrypted end-to-end. HTTPS/TLS on all connections, no exceptions.',
    photo: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=600&h=600&fit=crop&q=80',
  },
  {
    icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
    titleColor: '#B45309',
    title: 'Clinically Governed',
    desc: 'FHIR R4-compliant infrastructure governed by Health-Hub Africa® clinical standards. Accurate, structured, auditable.',
    photo: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=600&h=600&fit=crop&q=80',
  },
]

export default function Security() {
  const [hovered, setHovered] = useState(0)
  const headerRef = useRef(null)
  const inView = useInView(headerRef, { once: true, amount: 0.2 })
  const reduced = useReducedMotion()

  return (
    <section style={{ background: '#F7FAF7' }}>
      <div className="section-inner-lg">

        {/* ── Header — per-element stagger ── */}
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
            <span
              style={{
                width: 5,
                height: 5,
                borderRadius: '50%',
                background: '#07251C',
                display: 'inline-block',
              }}
            />
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
            <em
              style={{
                fontFamily: 'var(--font-playfair-display), serif',
                fontStyle: 'italic',
                fontWeight: 700,
              }}
            >
              governed infrastructure
            </em>
          </motion.h2>

          <motion.p
            variants={bodyVariant}
            style={{
              color: '#5A7068',
              fontSize: 15,
              maxWidth: 460,
              margin: '0 auto 28px',
              lineHeight: 1.65,
            }}
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
        </motion.div>

        {/* ── Outer gray wrapper ── */}
        <div
          className="security-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: items.map((_, i) => (hovered === i ? '2fr' : '1fr')).join(' '),
          }}
          onMouseLeave={() => setHovered(0)}
        >
          {items.map((item, i) => {
            const isActive = hovered === i
            return (
              /*
               * CARD — flex ROW:
               *   [left col: icon (top) + text (bottom)]   [right: square image]
               *
               * Card height is driven by the image size + card padding.
               * Both the left column and the image share the same vertical space,
               * so they are always on the same line.
               */
              <div
                key={i}
                className="security-card"
                onMouseEnter={() => setHovered(i)}
                style={{
                  background: '#fff',
                  borderRadius: 18,
                  overflow: 'hidden',
                  cursor: 'default',
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'stretch',
                  padding: 28,
                  gap: isActive ? 20 : 0,
                  transition: 'gap 0.44s cubic-bezier(0.4, 0, 0.2, 1)',
                  height: 316,
                }}
              >
                {/* ── Left column: icon at top, title+desc at bottom ── */}
                <div
                  style={{
                    flex: 1,
                    minWidth: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  {/* Icon badge */}
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 10,
                      background: '#6DC43F',
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

                  {/* Title + desc — bottom of left column */}
                  <div>
                    <h3
                      style={{
                        fontFamily: 'var(--font-manrope), sans-serif',
                        fontWeight: 600,
                        fontSize: 18,
                        margin: '0 0 8px',
                        color: item.titleColor,
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
                        color: '#5A7068',
                        margin: 0,
                      }}
                    >
                      {item.desc}
                    </p>
                  </div>
                </div>

                {/* ── Right: square image, inset, animates in on hover ── */}
                <div
                  className="security-img"
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
                  <Image
                    src={item.photo}
                    alt={item.title}
                    fill
                    style={{ objectFit: 'cover', objectPosition: 'center' }}
                    sizes="260px"
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
