'use client'
import { useRef } from 'react'
import { motion, useInView, useReducedMotion } from 'framer-motion'
import Image from 'next/image'
import { EASE_OUT, staggerContainer, labelVariant, headingVariant, bodyVariant } from '@/lib/motion'

export default function FounderStory() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, amount: 0.12 })
  const reduced = useReducedMotion()

  return (
    <section ref={ref} style={{ background: '#fff' }}>
      <div className="section-inner-lg">
        <div
          className="founder-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'clamp(260px, 30%, 360px) 1fr',
            gap: 'clamp(40px, 6vw, 96px)',
            alignItems: 'center',
          }}
        >
          {/* Photo + signature column */}
          <motion.div
            initial={reduced ? {} : { opacity: 0, x: -32 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 1, ease: EASE_OUT, delay: 0.1 }}
            className="founder-photo"
          style={{ display: 'flex', flexDirection: 'column', gap: 20 }}
          >
            <div
              style={{
                borderRadius: 20,
                overflow: 'hidden',
                position: 'relative',
                aspectRatio: '3/4',
                background: '#E8F0EC',
              }}
            >
              <Image
                src="/dr-benjamin-obire.png"
                alt="Dr. Benjamin Obire — CEO, Health-Hub Africa"
                fill
                style={{ objectFit: 'cover', objectPosition: 'center top' }}
                sizes="360px"
              />
            </div>
            <div
              style={{
                background: '#F7FAF7',
                borderRadius: 14,
                padding: '16px 20px',
                border: '1px solid rgba(7,37,28,0.08)',
              }}
            >
              <div style={{ fontFamily: 'var(--font-playfair-display), serif', fontStyle: 'italic', fontSize: 20, color: '#07251C', marginBottom: 4 }}>
                Dr. Benjamin Obire
              </div>
              <div style={{ fontSize: 12, color: '#617870', fontWeight: 600, letterSpacing: '0.04em' }}>
                Founder & CEO · Health-Hub Africa®
              </div>
            </div>
          </motion.div>

          {/* Message column */}
          <motion.div
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
              Why We Built This
            </motion.div>

            <motion.h2
              variants={headingVariant}
              style={{
                fontFamily: 'var(--font-manrope), sans-serif',
                fontWeight: 700,
                fontSize: 'clamp(26px, 3.5vw, 44px)',
                lineHeight: 1.1,
                letterSpacing: '-0.03em',
                margin: '0 0 24px',
                color: '#07251C',
              }}
            >
              Why We Built{' '}
              <em style={{ fontFamily: 'var(--font-playfair-display), serif', fontStyle: 'italic', color: '#137333' }}>
                MyHealth Vault+™
              </em>
            </motion.h2>

            <motion.div variants={bodyVariant} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                'Every day, millions of Nigerians visit hospitals carrying no records — no lab reports, no medication history, no discharge summaries. Doctors make decisions in the dark. Patients are re-tested needlessly. Families are separated from critical health information in moments of crisis.',
                'I have seen patients lose years of medical history simply by changing clinics. I have watched families struggle to explain a loved one\'s conditions in an emergency. I built MyHealth Vault+™ because I believe every Nigerian deserves a complete, connected, portable health identity.',
                'MyHealth Vault+™ is your lifelong Health Passport — a single, secure digital record that travels with you across hospitals, specialists, employers, HMOs, and borders. It is the foundation of the Health-Hub Africa® mission: to make world-class healthcare accessible to every African.',
              ].map((para, i) => (
                <p key={i} style={{ fontSize: 15, lineHeight: 1.72, color: '#3D5249', margin: 0 }}>
                  {para}
                </p>
              ))}
            </motion.div>

            <motion.div
              variants={bodyVariant}
              style={{ marginTop: 32 }}
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
                  fontSize: 12,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  padding: '12px 12px 12px 22px',
                  borderRadius: 100,
                }}
              >
                Join Our Mission
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
              </a>
            </motion.div>
          </motion.div>
        </div>
      </div>

      <style>{`
        @media (max-width: 720px) {
          .founder-grid {
            grid-template-columns: 1fr !important;
            gap: 32px !important;
          }
          .founder-grid .founder-photo {
            max-width: 260px;
            margin: 0 auto;
          }
        }
      `}</style>
    </section>
  )
}
