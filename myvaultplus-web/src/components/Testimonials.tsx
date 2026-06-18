'use client'

import { useRef } from 'react'
import Image from 'next/image'

const testimonials = [
  {
    photo: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=400&h=400&fit=crop&crop=faces&q=80',
    company: 'Lagos Family Care',
    quote:
      '"MyHealth Vault+ brought clarity to managing my family\'s health records, breaking down every barrier and delivering real peace of mind."',
    name: 'Adaeze Okonkwo',
  },
  {
    photo: 'https://images.unsplash.com/photo-1506634572416-48cdfe530110?w=400&h=400&fit=crop&crop=faces&q=80',
    company: 'Abuja Tech Innovations',
    quote:
      '"Their TeleCare service resolved a difficult health situation quickly, opening new paths and connecting me with the right specialist."',
    name: 'Emeka Nwosu',
  },
  {
    photo: 'https://images.unsplash.com/photo-1607746882042-944635dfe10e?w=400&h=400&fit=crop&crop=faces&q=80',
    company: 'HealthBridge Nigeria',
    quote:
      '"We found focus for a tricky diagnosis — cutting through the noise and getting truly advanced expert review responses."',
    name: 'Chiamaka Bello',
  },
  {
    photo: 'https://images.unsplash.com/photo-1523464862212-d6631d073194?w=400&h=400&fit=crop&crop=faces&q=80',
    company: 'Kano MedGroup',
    quote:
      '"DispatchCare gave us simple, fast emergency access — removing all delays while building confidence in every critical moment."',
    name: 'Yusuf Ibrahim',
  },
  {
    photo: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=400&h=400&fit=crop&crop=faces&q=80',
    company: 'Port Harcourt Health Co.',
    quote:
      '"From booking MinuteCare to getting my CareTest results in the Vault — everything was seamless and stress-free."',
    name: 'Ngozi Effiong',
  },
]

const CARD_W = 300
const GAP = 16

export default function Testimonials() {
  const trackRef = useRef<HTMLDivElement>(null)

  const scroll = (dir: 'prev' | 'next') => {
    if (!trackRef.current) return
    const amount = CARD_W + GAP
    trackRef.current.scrollBy({ left: dir === 'next' ? amount : -amount, behavior: 'smooth' })
  }

  return (
    <section style={{ background: '#fff', padding: '96px 0' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 32px' }}>

        {/* ── Header row ── */}
        <div
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
            <div
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
            </div>

            <h2
              style={{
                fontFamily: 'var(--font-space-grotesk), sans-serif',
                fontWeight: 700,
                fontSize: 'clamp(28px, 4vw, 46px)',
                lineHeight: 1.08,
                letterSpacing: '-0.03em',
                margin: '0 0 14px',
                color: '#07251C',
              }}
            >
              What they say about us?
            </h2>
            <p style={{ color: '#5A7068', fontSize: 15, lineHeight: 1.6, margin: 0 }}>
              Here&apos;s what they shared about their experience using MyHealth Vault+.
            </p>
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
        </div>

        {/* ── Scrollable card track ── */}
        <div
          ref={trackRef}
          style={{
            display: 'flex',
            gap: GAP,
            overflowX: 'auto',
            scrollSnapType: 'x mandatory',
            scrollbarWidth: 'none',
            /* pull slightly outside so cards bleed to edges */
            marginLeft: -4,
            marginRight: -4,
            paddingLeft: 4,
            paddingRight: 4,
            paddingBottom: 4,
          }}
        >
          {testimonials.map((t, i) => (
            <div
              key={i}
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
              {/* Full card photo */}
              <Image
                src={t.photo}
                alt={t.name}
                fill
                style={{ objectFit: 'cover', objectPosition: 'center top' }}
                sizes="300px"
              />

              {/* Dark gradient overlay — bottom half only for readability */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background:
                    'linear-gradient(to bottom, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.10) 40%, rgba(0,0,0,0.78) 100%)',
                }}
              />

              {/* Company logo area — top left */}
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
                {t.company}
              </div>

              {/* Quote + name — bottom */}
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  padding: '0 20px 22px',
                }}
              >
                {/* Quote mark */}
                <div
                  style={{
                    fontFamily: 'Georgia, serif',
                    fontSize: 36,
                    lineHeight: 1,
                    color: '#34E0A0',
                    marginBottom: 6,
                  }}
                >
                  ❝
                </div>
                <p
                  style={{
                    fontSize: 13,
                    lineHeight: 1.6,
                    color: '#fff',
                    margin: '0 0 10px',
                    fontWeight: 400,
                  }}
                >
                  {t.quote}
                </p>
                <p
                  style={{
                    fontSize: 12,
                    color: 'rgba(255,255,255,0.6)',
                    margin: 0,
                    fontWeight: 500,
                  }}
                >
                  — {t.name}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Hide scrollbar globally for this component */}
      <style>{`
        div::-webkit-scrollbar { display: none; }
      `}</style>
    </section>
  )
}
