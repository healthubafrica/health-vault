'use client'
import { motion, useInView, useReducedMotion } from 'framer-motion'
import { useRef } from 'react'
import { EASE_OUT, cardVariant, staggerContainer, labelVariant, headingVariant, bodyVariant } from '@/lib/motion'

export default function HowItWorks() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, amount: 0.08 })
  const reduced = useReducedMotion()
  const initial = reduced ? 'visible' : 'hidden'
  const animate = inView ? 'visible' : 'hidden'

  return (
    <section ref={ref} id="how-it-works" className="section-inner-lg">
      {/* Header — per-element stagger */}
      <motion.div
        style={{ textAlign: 'center', marginBottom: 60 }}
        variants={staggerContainer(0.14)}
        initial={initial}
        animate={animate}
      >
        <motion.div
          variants={labelVariant}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: '#137333',
            marginBottom: 20,
          }}
        >
          <span
            style={{ width: 5, height: 5, borderRadius: '50%', background: '#137333', display: 'inline-block' }}
          />
          How It Works
        </motion.div>
        <motion.h2
          variants={headingVariant}
          style={{
            fontFamily: 'var(--font-manrope), sans-serif',
            fontWeight: 600,
            fontSize: 'clamp(28px, 3.5vw, 44px)',
            lineHeight: 1.12,
            letterSpacing: '-0.02em',
            margin: '0 auto 16px',
            maxWidth: 660,
          }}
        >
          Where secure health records meet{' '}
          <em
            style={{
              fontFamily: 'var(--font-playfair-display), serif',
              fontStyle: 'italic',
              fontWeight: 700,
            }}
          >
            intelligent care delivery.
          </em>
        </motion.h2>
        <motion.p
          variants={bodyVariant}
          style={{
            color: '#5A7068',
            fontSize: 16,
            maxWidth: 530,
            margin: '0 auto',
            lineHeight: 1.65,
          }}
        >
          We help Nigerians access better healthcare, not by replacing human doctors,
          but by amplifying them with technology that is always within reach.
        </motion.p>
      </motion.div>

      {/* Outer container — grey wrapper, same spec as Security section */}
      <div
        style={{
          background: '#DEDEDE',
          borderRadius: 28,
          padding: 16,
        }}
      >
        <motion.div
          variants={staggerContainer(0.1)}
          initial={initial}
          animate={animate}
          className="rg-2"
          style={{ gap: 12 }}
        >
          {/* ── Card 1 — Records ── */}
          <GridCard>
            {/* Mockup: two stacked cards */}
            <div style={{ position: 'relative', height: 196, marginBottom: 32 }}>
              {/* Back card — dark vault summary */}
              <div
                style={{
                  position: 'absolute',
                  top: 8,
                  left: 0,
                  right: 48,
                  background: '#07251C',
                  borderRadius: 16,
                  padding: '16px 18px',
                  transform: 'rotate(-4deg)',
                  boxShadow: '0 10px 28px rgba(7,37,28,0.18)',
                }}
              >
                <div
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    color: '#6DC43F',
                    letterSpacing: '0.1em',
                    marginBottom: 12,
                  }}
                >
                  YOUR VAULT
                </div>
                <div style={{ display: 'flex', gap: 7 }}>
                  {[
                    { l: 'Records', v: '24' },
                    { l: 'Services', v: '6' },
                    { l: 'Plan', v: 'Gold', accent: true },
                  ].map((s) => (
                    <div
                      key={s.l}
                      style={{
                        background: s.accent ? '#6DC43F' : '#0C3328',
                        borderRadius: 9,
                        padding: '8px 10px',
                        flex: 1,
                      }}
                    >
                      <div style={{ fontSize: 9, color: s.accent ? '#0A4E3C' : 'rgba(255,255,255,0.45)', marginBottom: 3 }}>
                        {s.l}
                      </div>
                      <div
                        style={{
                          fontFamily: 'var(--font-manrope), sans-serif',
                          fontSize: 15,
                          fontWeight: 700,
                          color: s.accent ? '#07251C' : '#fff',
                        }}
                      >
                        {s.v}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {/* Front card — recent records */}
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  left: 40,
                  background: '#fff',
                  borderRadius: 14,
                  padding: '14px 16px',
                  boxShadow: '0 4px 20px rgba(7,37,28,0.10)',
                  border: '1px solid #EEF3F0',
                }}
              >
                <div style={{ fontSize: 10, color: '#5A7068', marginBottom: 10, fontWeight: 600 }}>
                  Recent Records
                </div>
                {[
                  'Lab Results · CareTest™ — Jun 14',
                  'TeleCare™ · Dr. Adeyemi — Jun 12',
                ].map((item) => (
                  <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: '#137333',
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ fontSize: 11, color: '#07251C' }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <h3 style={titleStyle}>Your Records, Always Organised</h3>
            <p style={bodyStyle}>
              Every consultation,{' '}
              <Highlight>lab result</Highlight>, prescription, and report, stored securely and
              accessible in seconds.{' '}
              <Highlight>Filter, view, and download</Highlight> at any time.
            </p>
          </GridCard>

          {/* ── Card 2 — Expert Review ── */}
          <GridCard>
            {/* Mockup: review panel + mini bar chart */}
            <div style={{ position: 'relative', height: 196, marginBottom: 32, display: 'flex', gap: 12 }}>
              {/* Left — dark case panel */}
              <div
                style={{
                  flex: 1,
                  background: '#07251C',
                  borderRadius: 16,
                  padding: '16px 18px',
                  boxShadow: '0 8px 24px rgba(7,37,28,0.16)',
                }}
              >
                <div
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    color: '#6DC43F',
                    letterSpacing: '0.08em',
                    marginBottom: 12,
                  }}
                >
                  EXPERT REVIEW™
                </div>
                <div style={{ marginBottom: 10 }}>
                  <div
                    style={{
                      fontFamily: 'var(--font-playfair-display), serif',
                      fontStyle: 'italic',
                      fontSize: 15,
                      fontWeight: 700,
                      color: '#fff',
                      lineHeight: 1.3,
                    }}
                  >
                    Specialist-grade{' '}
                    <span style={{ color: '#6DC43F' }}>cardiac</span>
                    {' '}review.
                  </div>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 12 }}>
                  {['Cardiology', 'In Review', 'FHIR R4'].map((tag, i) => (
                    <span
                      key={tag}
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        padding: '3px 9px',
                        borderRadius: 100,
                        background: i === 0 ? '#6DC43F' : i === 1 ? 'rgba(109,196,63,0.15)' : 'rgba(255,255,255,0.1)',
                        color: i === 0 ? '#07251C' : i === 1 ? '#6DC43F' : 'rgba(255,255,255,0.7)',
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              {/* Right — mini bar chart */}
              <div
                style={{
                  width: 80,
                  background: '#fff',
                  border: '1px solid #EEF3F0',
                  borderRadius: 14,
                  padding: '14px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-end',
                  gap: 5,
                  boxShadow: '0 4px 16px rgba(7,37,28,0.07)',
                }}
              >
                {[40, 65, 55, 80, 72, 90].map((h, i) => (
                  <div
                    key={i}
                    style={{
                      width: '100%',
                      height: h * 0.9,
                      background: i === 5 ? '#137333' : i === 3 ? '#6DC43F' : '#D8E6DF',
                      borderRadius: 4,
                    }}
                  />
                ))}
                <div style={{ fontSize: 9, color: '#5A7068', textAlign: 'center', marginTop: 4 }}>
                  Cases
                </div>
              </div>
            </div>
            <h3 style={titleStyle}>Expert Review™. Always Tracked.</h3>
            <p style={bodyStyle}>
              Submit your case, watch every <Highlight>status update</Highlight> in real time, and
              receive your <Highlight>specialist report</Highlight> directly in your Vault.
            </p>
          </GridCard>

          {/* ── Card 3 — Book Care ── */}
          <GridCard>
            {/* Mockup: dark booking card with tags */}
            <div
              style={{
                background: '#07251C',
                borderRadius: 16,
                padding: '20px 22px',
                marginBottom: 32,
                boxShadow: '0 8px 24px rgba(7,37,28,0.14)',
              }}
            >
              <div
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  color: '#6DC43F',
                  letterSpacing: '0.1em',
                  marginBottom: 10,
                }}
              >
                BOOK CARE
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-manrope), sans-serif',
                  fontWeight: 700,
                  fontSize: 28,
                  color: '#fff',
                  lineHeight: 1.1,
                  marginBottom: 4,
                }}
              >
                4{' '}
                <span style={{ fontSize: 15, fontWeight: 400, color: 'rgba(255,255,255,0.5)' }}>
                  steps
                </span>
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 16 }}>
                Average booking time
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {[
                  { label: 'TeleCare™', primary: true },
                  { label: 'Video-First', primary: false },
                  { label: 'MinuteCare™', primary: false },
                  { label: 'Instant Slot', primary: false },
                ].map((t) => (
                  <span
                    key={t.label}
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      padding: '5px 12px',
                      borderRadius: 100,
                      background: t.primary ? '#6DC43F' : 'rgba(255,255,255,0.1)',
                      color: t.primary ? '#07251C' : 'rgba(255,255,255,0.75)',
                    }}
                  >
                    {t.label}
                  </span>
                ))}
              </div>
            </div>
            <h3 style={titleStyle}>Book Care, Instantly</h3>
            <p style={bodyStyle}>
              Schedule any service in <Highlight>4 steps or fewer</Highlight>, with all bookings{' '}
              <Highlight>confirmed directly</Highlight> in your Vault, with reminders.
            </p>
          </GridCard>

          {/* ── Card 4 — DispatchCare ── */}
          <GridCard>
            {/* Mockup: concentric rings + responder rows */}
            <div style={{ position: 'relative', height: 196, marginBottom: 32 }}>
              {/* Rings */}
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: 60,
                  transform: 'translateY(-50%)',
                  width: 140,
                  height: 140,
                }}
              >
                {[140, 100, 64, 34].map((size, i) => (
                  <span
                    key={size}
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      width: size,
                      height: size,
                      borderRadius: '50%',
                      border: `1px solid rgba(19,115,51,${0.12 + i * 0.1})`,
                      background: i === 3 ? '#137333' : 'transparent',
                      transform: 'translate(-50%,-50%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {i === 3 && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z"
                          stroke="#fff"
                          strokeWidth="2"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </span>
                ))}
              </div>
              {/* Responder cards */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  width: 160,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                {[
                  { name: 'Team Alpha', eta: '4 min', active: true },
                  { name: 'Team Bravo', eta: '8 min', active: false },
                  { name: 'Team Delta', eta: '11 min', active: false },
                ].map((r) => (
                  <div
                    key={r.name}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: '#fff',
                      border: `1px solid ${r.active ? '#137333' : '#EEF3F0'}`,
                      borderRadius: 10,
                      padding: '8px 11px',
                      boxShadow: '0 2px 8px rgba(7,37,28,0.06)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: r.active ? '#137333' : '#D8E6DF',
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#07251C' }}>{r.name}</span>
                    </div>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '2px 7px',
                        borderRadius: 100,
                        background: r.active ? '#6DC43F' : '#F0F4F1',
                        color: r.active ? '#07251C' : '#5A7068',
                      }}
                    >
                      {r.eta}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <h3 style={titleStyle}>Emergency at One Tap</h3>
            <p style={bodyStyle}>
              Auto-detects location, generates a <Highlight>case ID</Highlight>, and alerts the{' '}
              <Highlight>HHA operations team</Highlight> in seconds. Available on all plans, always.
            </p>
          </GridCard>
        </motion.div>
      </div>
    </section>
  )
}

function GridCard({ children }: { children: React.ReactNode }) {
  const reduced = useReducedMotion()
  return (
    <motion.div
      variants={cardVariant}
      whileHover={!reduced ? { y: -5, transition: { duration: 0.18, ease: EASE_OUT } } : undefined}
      style={{
        padding: '40px 40px 36px',
        background: '#fff',
        borderRadius: 18,
      }}
    >
      {children}
    </motion.div>
  )
}

function Highlight({ children }: { children: React.ReactNode }) {
  return <span style={{ color: '#137333', fontWeight: 500 }}>{children}</span>
}

const titleStyle: React.CSSProperties = {
  fontFamily: 'var(--font-manrope), sans-serif',
  fontWeight: 600,
  fontSize: 21,
  margin: '0 0 10px',
  letterSpacing: '-0.01em',
  color: '#07251C',
}

const bodyStyle: React.CSSProperties = {
  color: '#5A7068',
  fontSize: 14.5,
  lineHeight: 1.65,
  margin: 0,
}
