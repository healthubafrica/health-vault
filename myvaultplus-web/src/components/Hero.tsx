'use client'
import { motion, useReducedMotion } from 'framer-motion'
import { EASE_OUT } from '@/lib/motion'
import RoundCarousel from './RoundCarousel'

const HERO_CARD_IMAGES = [
  '/hero-cards/tags.png',
  '/hero-cards/profile.png',
  '/hero-cards/dark.png',
  '/hero-cards/founding.png',
  '/hero-cards/appt.png',
  '/hero-cards/earlyaccess.png',
  '/hero-cards/lab-hero.png',
  '/hero-cards/dispatch-hero.png',
  '/hero-cards/review.png',
  '/hero-cards/score.png',
].map((src) => ({ src }))

export default function Hero() {
  const reduced = useReducedMotion()
  return (
    /* Outer wrapper: margin + border-radius gives the card look */
    <div style={{ margin: '16px 16px 0', borderRadius: 28, overflow: 'hidden' }}>
    <section
      style={{
        position: 'relative',
        background: '#041E14',
        overflow: 'hidden',
        minHeight: 'clamp(560px, 92vh, 960px)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Full-bleed background photo */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="https://images.unsplash.com/photo-1684607631667-7502878ad293?w=1920&h=1080&fit=crop&q=85"
        alt="Healthcare professional in surgical mask and gloves"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'center',
        }}
      />

      {/* Dark overlay so text stays legible */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(160deg, rgba(4,30,20,0.72) 0%, rgba(7,37,28,0.60) 50%, rgba(4,18,12,0.78) 100%)',
          pointerEvents: 'none',
        }}
      />

      {/* ── Hero text block ── */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          position: 'relative',
          zIndex: 1,
          paddingTop: 'clamp(44px,10vw,112px)',
        }}
      >
      <div
        style={{
          maxWidth: 760,
          width: '100%',
          padding: '0 clamp(16px,4vw,32px)',
          textAlign: 'center',
        }}
      >
        {/* Headline */}
        <motion.h1
          initial={reduced ? false : { opacity: 0, y: 72, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 1.3, ease: EASE_OUT, delay: 0.08 }}
          style={{
            margin: '0 0 clamp(10px,3vw,18px)',
            lineHeight: 1.06,
            fontFamily: 'var(--font-manrope), sans-serif',
          }}
        >
          <span
            style={{
              display: 'block',
              fontWeight: 600,
              fontSize: 'clamp(11px, 2.2vw, 26px)',
              color: 'rgba(255,255,255,0.75)',
              textShadow: '0 2px 20px rgba(0,0,0,0.18)',
              letterSpacing: '0.01em',
              lineHeight: 1.3,
              marginBottom: 4,
            }}
          >
            MyHealth Vault+™ Health Passport
          </span>
          <span
            style={{
              display: 'block',
              fontFamily: 'var(--font-manrope), sans-serif',
              fontStyle: 'italic',
              fontWeight: 700,
              fontSize: 'clamp(24px, 6vw, 64px)',
              color: '#6DC43F',
              letterSpacing: '-0.02em',
              lineHeight: 1.06,
            }}
          >
            One Patient. One Record. Anywhere.
          </span>
        </motion.h1>

        <motion.p
          initial={reduced ? false : { opacity: 0, y: 48 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.85, ease: EASE_OUT, delay: 0.28 }}
          style={{
            color: 'rgba(255,255,255,0.78)',
            fontSize: 'clamp(13px, 3.5vw, 16px)',
            lineHeight: 1.6,
            maxWidth: 520,
            margin: '0 auto clamp(18px, 5vw, 32px)',
          }}
        >
          Your lifelong digital health record that travels with you across providers, hospitals,
          employers, HMOs, and countries. Store, access, and share your medical history anywhere.
        </motion.p>

        {/* CTA row */}
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.78, ease: EASE_OUT, delay: 0.46 }}
          className="hero-cta-row"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          {/* Ghost button */}
          <a
            href="#how-it-works"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: 'rgba(255,255,255,0.18)',
              backdropFilter: 'blur(8px)',
              border: '1.5px solid rgba(255,255,255,0.55)',
              color: '#fff',
              textDecoration: 'none',
              fontWeight: 700,
              fontSize: 13,
              letterSpacing: '0.07em',
              textTransform: 'uppercase',
              padding: '13px 26px',
              borderRadius: 100,
            }}
          >
            See How It Works
          </a>

          {/* Primary pill */}
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
              padding: '12px 12px 12px 24px',
              borderRadius: 100,
            }}
          >
            Create Free Account
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
                <path
                  d="M5 19L19 5M19 5H9M19 5v10"
                  stroke="#6DC43F"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </a>
        </motion.div>
      </div>
      </div>

      {/* ── Round carousel of dashboard cards ── */}
      <motion.div
        initial={reduced ? false : { opacity: 0, y: 56 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.1, ease: EASE_OUT, delay: 0.62 }}
        style={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          height: 'clamp(220px, 32vw, 340px)',
          marginTop: 'clamp(36px, 6vw, 72px)',
          marginBottom: 'clamp(24px, 5vw, 48px)',
        }}
      >
        <style>{`
          @media (max-width: 480px) {
            .hero-cta-row { gap: 8px !important; margin-bottom: 0 !important; }
            .hero-cta-row a {
              font-size: 10px !important;
              padding: 10px 16px !important;
              letter-spacing: 0.05em !important;
            }
            .hero-cta-row a span { width: 24px !important; height: 24px !important; }
          }
        `}</style>

        <RoundCarousel
          images={HERO_CARD_IMAGES}
          imageWidth={220}
          imageHeight={220}
          background="transparent"
          speed={1.5}
        />
      </motion.div>
    </section>
    </div>
  )
}
