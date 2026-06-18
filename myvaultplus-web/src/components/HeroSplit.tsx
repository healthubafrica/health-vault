import Image from 'next/image'
import React from 'react'

interface HeroSplitProps {
  heading: React.ReactNode
  description: string
  primaryCta: { label: string; href: string }
  secondaryCta?: { label: string; href: string }
  image: string
  imageAlt: string
  trustText?: string
  rightCards: React.ReactNode
}

export default function HeroSplit({
  heading,
  description,
  primaryCta,
  secondaryCta,
  image,
  imageAlt,
  trustText,
  rightCards,
}: HeroSplitProps) {
  return (
    <div style={{ margin: '16px 16px 24px', borderRadius: 28, overflow: 'hidden' }}>
      <style>{`
        @media (max-width: 768px) {
          .hero-split-grid { grid-template-columns: 1fr !important; }
          .hero-split-right { min-height: 420px !important; }
        }
      `}</style>
      <div className="hero-split-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: '88vh' }}>

        {/* ── Left panel ─────────────────────────────────── */}
        <div style={{
          background: '#F7FAF7',
          padding: '56px 56px 72px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
        }}>

          {trustText && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 22,
            }}>
              <span style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: '#6DC43F',
                flexShrink: 0,
              }} />
              <span style={{ fontSize: 12.5, color: '#617870', fontWeight: 500 }}>{trustText}</span>
            </div>
          )}

          <h1 style={{
            fontFamily: 'var(--font-manrope), sans-serif',
            fontWeight: 700,
            fontSize: 'clamp(30px, 3.6vw, 54px)',
            color: '#07251C',
            letterSpacing: '-0.03em',
            lineHeight: 1.08,
            margin: '0 0 20px',
          }}>
            {heading}
          </h1>

          <p style={{
            color: '#41584E',
            fontSize: 15.5,
            lineHeight: 1.68,
            maxWidth: 420,
            margin: '0 0 40px',
          }}>
            {description}
          </p>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {secondaryCta && (
              <a
                href={secondaryCta.href}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  border: '1.5px solid rgba(7,37,28,0.22)',
                  color: '#27433A',
                  textDecoration: 'none',
                  fontWeight: 700,
                  fontSize: 13,
                  letterSpacing: '0.07em',
                  textTransform: 'uppercase',
                  padding: '13px 26px',
                  borderRadius: 100,
                  background: 'transparent',
                }}
              >
                {secondaryCta.label}
              </a>
            )}
            <a
              href={primaryCta.href}
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
                padding: '12px 12px 12px 24px',
                borderRadius: 100,
              }}
            >
              {primaryCta.label}
              <span style={{
                width: 30,
                height: 30,
                borderRadius: '50%',
                background: '#6DC43F',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                  <path d="M5 19L19 5M19 5H9M19 5v10" stroke="#07251C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </a>
          </div>
        </div>

        {/* ── Right panel ────────────────────────────────── */}
        <div className="hero-split-right" style={{ position: 'relative', overflow: 'hidden' }}>
          <Image
            src={image}
            alt={imageAlt}
            fill
            priority
            style={{ objectFit: 'cover', objectPosition: 'center' }}
            sizes="50vw"
          />
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(160deg, rgba(4,30,20,0.52) 0%, rgba(7,37,28,0.38) 50%, rgba(4,18,12,0.60) 100%)',
            pointerEvents: 'none',
          }} />

          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1,
          }}>
            {rightCards}
          </div>
        </div>

      </div>
    </div>
  )
}
