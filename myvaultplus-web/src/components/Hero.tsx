'use client'
import { motion, useReducedMotion } from 'framer-motion'
import Image from 'next/image'
import { EASE_OUT } from '@/lib/motion'

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
              fontFamily: 'var(--font-playfair-display), serif',
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

      {/* ── Marquee dashboard cards ── */}
      <motion.div
        initial={reduced ? false : { opacity: 0, y: 56 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.1, ease: EASE_OUT, delay: 0.62 }}
        style={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          overflow: 'hidden',
        }}
      >
        <style>{`
          @keyframes heroMarquee {
            0%   { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          .hero-marquee-track {
            display: flex;
            gap: 14px;
            width: max-content;
            padding: 0 7px 40px;
            animation: heroMarquee 38s linear infinite;
          }
          .hero-marquee-track:hover { animation-play-state: paused; }

          @media (max-width: 480px) {
            .hero-cta-row { gap: 8px !important; }
            .hero-cta-row a {
              font-size: 10px !important;
              padding: 10px 16px !important;
              letter-spacing: 0.05em !important;
            }
            .hero-cta-row a span { width: 24px !important; height: 24px !important; }
            .hero-marquee-track {
              gap: 10px !important;
              padding-bottom: 24px !important;
            }
            .hero-marquee-track > div {
              transform: scale(0.82);
              transform-origin: top left;
            }
          }
        `}</style>

        <div className="hero-marquee-track">
          {[
            /* 1 — Service tags */
            <div key="tags" style={{ background: '#fff', borderRadius: 18, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10, width: 270, flexShrink: 0 }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: '#137333', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Health-Hub Africa®</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                {['TeleCare™','Expert Review™','DispatchCare™','Secure Vault','CareTest™','NeuroFlex™'].map(t => (
                  <span key={t} style={{ background: t === 'Expert Review™' ? '#07251C' : '#F1F4EF', color: t === 'Expert Review™' ? '#6DC43F' : '#27433A', borderRadius: 100, padding: '5px 12px', fontSize: 11, fontWeight: 600 }}>{t}</span>
                ))}
              </div>
            </div>,

            /* 2 — Patient profile */
            <div key="profile" style={{ background: '#fff', borderRadius: 18, overflow: 'hidden', width: 172, flexShrink: 0 }}>
              <div style={{ height: 100, position: 'relative', background: '#E8F0EC' }}>
                <Image src="https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=200&h=120&fit=crop&crop=faces&q=80" alt="Patient" fill style={{ objectFit: 'cover' }} sizes="172px" />
              </div>
              <div style={{ padding: '12px 14px' }}>
                <div style={{ fontFamily: 'var(--font-manrope)', fontWeight: 700, fontSize: 13, color: '#07251C', letterSpacing: '-0.02em' }}>HHA-LAG<span style={{ color: '#137333' }}>-2606</span></div>
                <div style={{ fontSize: 10, color: '#7A8C84', margin: '2px 0 10px' }}>Patient ID · Active</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  {[['Records','24'],['Upcoming','2']].map(([l,v]) => (
                    <div key={l} style={{ background: '#F1F4EF', borderRadius: 8, padding: '6px 8px' }}>
                      <div style={{ fontSize: 8, color: '#7A8C84' }}>{l}</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#07251C' }}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>,

            /* 3 — Dark expertise card */
            <div key="dark" style={{ background: '#07251C', borderRadius: 18, padding: '20px 22px', width: 238, flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 160 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#6DC43F', letterSpacing: '0.06em' }}>Healthcare <span style={{ color: '#6DC43F' }}>●</span></div>
              <div style={{ fontFamily: 'var(--font-manrope)', fontSize: 17, fontWeight: 700, color: '#fff', lineHeight: 1.3, letterSpacing: '-0.02em', marginTop: 12 }}>
                that Combines <span style={{ color: '#6DC43F' }}>Records</span>, Specialists, and Intelligent Care.
              </div>
              <div style={{ marginTop: 16, fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>MyHealth Vault+™ · Health-Hub Africa®</div>
            </div>,

            /* 4 — Founding Member Program */
            <div key="founding" style={{ background: '#07251C', borderRadius: 18, padding: '18px 20px', width: 200, flexShrink: 0 }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: '#6DC43F', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>Founding Member Program</div>
              <div style={{ fontFamily: 'var(--font-manrope)', fontSize: 14, fontWeight: 700, color: '#fff', lineHeight: 1.35, marginBottom: 14 }}>Be among the first to experience the future of connected healthcare in Africa.</div>
              <div style={{ background: '#6DC43F', borderRadius: 100, padding: '6px 14px', display: 'inline-block', fontSize: 10, fontWeight: 700, color: '#07251C' }}>Join Before Launch</div>
            </div>,

            /* 5 — Appointment */
            <div key="appt" style={{ background: '#fff', borderRadius: 18, padding: '16px 18px', width: 200, flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <div style={{ width: 30, height: 30, borderRadius: 9, background: '#EAF7F1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="18" rx="3" stroke="#137333" strokeWidth="1.8"/><path d="M16 2v4M8 2v4M3 10h18" stroke="#137333" strokeWidth="1.8" strokeLinecap="round"/></svg>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#07251C' }}>TeleCare™</div>
                  <div style={{ fontSize: 10, color: '#7A8C84' }}>Today · 4:30 PM</div>
                </div>
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#07251C', marginBottom: 4 }}>Dr. Adaeze Okonkwo</div>
              <div style={{ fontSize: 10, color: '#617870', marginBottom: 12 }}>General Practice · Lagos</div>
              <div style={{ background: '#EAF7F1', borderRadius: 100, padding: '5px 12px', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#137333', display: 'block' }} />
                <span style={{ fontSize: 10, fontWeight: 700, color: '#137333' }}>Confirmed</span>
              </div>
            </div>,

            /* 6 — Early Access */
            <div key="earlyaccess" style={{ background: '#6DC43F', borderRadius: 18, padding: '20px 22px', width: 158, flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 148 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#07251C', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Early Access</div>
              <div style={{ fontFamily: 'var(--font-manrope)', fontSize: 20, fontWeight: 700, color: '#07251C', letterSpacing: '-0.02em', lineHeight: 1.2 }}>Now Accepting Registrations</div>
              <div style={{ fontSize: 10, color: 'rgba(7,37,28,0.6)' }}>Health Passport · 2026</div>
            </div>,

            /* 7 — Laboratory Services */
            <div key="lab" style={{ background: '#fff', borderRadius: 18, padding: '16px 18px', width: 200, flexShrink: 0 }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: '#137333', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>CareTest™</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#07251C', marginBottom: 12 }}>Laboratory Services</div>
              {['Complete Blood Count','Blood Chemistry','Diabetes Screening','Cholesterol Panel','Kidney Function'].map((svc) => (
                <div key={svc} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7 }}>
                  <span style={{ width: 14, height: 14, borderRadius: '50%', background: '#EAF7F1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="7" height="7" viewBox="0 0 24 24" fill="none"><path d="M5 12l4 4L19 7" stroke="#137333" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </span>
                  <span style={{ fontSize: 10, color: '#617870' }}>{svc}</span>
                </div>
              ))}
            </div>,

            /* 8 — How DispatchCare Works */
            <div key="dispatch" style={{ background: '#0D0D0D', borderRadius: 18, padding: '18px 20px', width: 185, flexShrink: 0 }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: '#6DC43F', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>DispatchCare™</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', marginBottom: 12 }}>How It Works</div>
              {[['1','Patient requests help'],['2','Location identified'],['3','Team activated'],['4','Care dispatched'],['5','Patient updated']].map(([n, step]) => (
                <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
                  <span style={{ width: 17, height: 17, borderRadius: '50%', background: '#6DC43F', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#07251C', flexShrink: 0 }}>{n}</span>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)' }}>{step}</span>
                </div>
              ))}
            </div>,

            /* 9 — Expert Review with doctor photo */
            <div key="review" style={{ background: '#fff', borderRadius: 18, overflow: 'hidden', width: 185, flexShrink: 0 }}>
              <div style={{ height: 88, position: 'relative', background: '#E8F0EC' }}>
                <Image src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=200&h=100&fit=crop&crop=faces&q=80" alt="Specialist" fill style={{ objectFit: 'cover' }} sizes="185px" />
              </div>
              <div style={{ padding: '12px 14px' }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: '#137333', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Expert Review™</div>
                {[['Documents submitted', true],['Panel assigned', true],['In review…', false]].map(([l, done]) => (
                  <div key={String(l)} style={{ display: 'flex', gap: 7, alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ width: 14, height: 14, borderRadius: '50%', background: done ? '#6DC43F' : 'transparent', border: done ? 'none' : '1.5px solid #6DC43F', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 8, color: '#07251C', fontWeight: 700 }}>{done ? '✓' : ''}</span>
                    <span style={{ fontSize: 10, color: done ? '#07251C' : '#7A8C84' }}>{String(l)}</span>
                  </div>
                ))}
              </div>
            </div>,

            /* 10 — Health score */
            <div key="score" style={{ background: '#F7FAF7', borderRadius: 18, padding: '18px 20px', width: 178, flexShrink: 0 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#07251C', marginBottom: 14 }}>Health Score</div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, marginBottom: 10 }}>
                <div style={{ fontFamily: 'var(--font-manrope)', fontSize: 56, fontWeight: 700, color: '#07251C', letterSpacing: '-0.05em', lineHeight: 1 }}>92</div>
                <div style={{ paddingBottom: 6 }}>
                  <div style={{ fontSize: 12, color: '#7A8C84' }}>/ 100</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#137333' }}>Excellent</div>
                </div>
              </div>
              <div style={{ height: 6, background: '#E8F0EC', borderRadius: 6 }}>
                <div style={{ width: '92%', height: '100%', background: 'linear-gradient(90deg,#137333,#6DC43F)', borderRadius: 6 }} />
              </div>
              <div style={{ fontSize: 10, color: '#7A8C84', marginTop: 8 }}>Updated · June 2026</div>
            </div>,
          ].concat([
            /* duplicate set for seamless loop */
            <div key="tags2" style={{ background: '#fff', borderRadius: 18, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10, width: 270, flexShrink: 0 }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: '#137333', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Health-Hub Africa®</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                {['TeleCare™','Expert Review™','DispatchCare™','Secure Vault','CareTest™','NeuroFlex™'].map(t => (
                  <span key={t} style={{ background: t === 'Expert Review™' ? '#07251C' : '#F1F4EF', color: t === 'Expert Review™' ? '#6DC43F' : '#27433A', borderRadius: 100, padding: '5px 12px', fontSize: 11, fontWeight: 600 }}>{t}</span>
                ))}
              </div>
            </div>,
            <div key="profile2" style={{ background: '#fff', borderRadius: 18, overflow: 'hidden', width: 172, flexShrink: 0 }}>
              <div style={{ height: 100, position: 'relative', background: '#E8F0EC' }}>
                <Image src="https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=200&h=120&fit=crop&crop=faces&q=80" alt="Patient" fill style={{ objectFit: 'cover' }} sizes="172px" />
              </div>
              <div style={{ padding: '12px 14px' }}>
                <div style={{ fontFamily: 'var(--font-manrope)', fontWeight: 700, fontSize: 13, color: '#07251C', letterSpacing: '-0.02em' }}>HHA-LAG<span style={{ color: '#137333' }}>-2606</span></div>
                <div style={{ fontSize: 10, color: '#7A8C84', margin: '2px 0 10px' }}>Patient ID · Active</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  {[['Records','24'],['Upcoming','2']].map(([l,v]) => (
                    <div key={l} style={{ background: '#F1F4EF', borderRadius: 8, padding: '6px 8px' }}>
                      <div style={{ fontSize: 8, color: '#7A8C84' }}>{l}</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#07251C' }}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>,
            <div key="dark2" style={{ background: '#07251C', borderRadius: 18, padding: '20px 22px', width: 238, flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 160 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#6DC43F', letterSpacing: '0.06em' }}>Healthcare <span style={{ color: '#6DC43F' }}>●</span></div>
              <div style={{ fontFamily: 'var(--font-manrope)', fontSize: 17, fontWeight: 700, color: '#fff', lineHeight: 1.3, letterSpacing: '-0.02em', marginTop: 12 }}>
                that Combines <span style={{ color: '#6DC43F' }}>Records</span>, Specialists, and Intelligent Care.
              </div>
              <div style={{ marginTop: 16, fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>MyHealth Vault+™ · Health-Hub Africa®</div>
            </div>,
            <div key="founding2" style={{ background: '#07251C', borderRadius: 18, padding: '18px 20px', width: 200, flexShrink: 0 }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: '#6DC43F', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>Founding Member Program</div>
              <div style={{ fontFamily: 'var(--font-manrope)', fontSize: 14, fontWeight: 700, color: '#fff', lineHeight: 1.35, marginBottom: 14 }}>Be among the first to experience the future of connected healthcare in Africa.</div>
              <div style={{ background: '#6DC43F', borderRadius: 100, padding: '6px 14px', display: 'inline-block', fontSize: 10, fontWeight: 700, color: '#07251C' }}>Join Before Launch</div>
            </div>,
            <div key="appt2" style={{ background: '#fff', borderRadius: 18, padding: '16px 18px', width: 200, flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <div style={{ width: 30, height: 30, borderRadius: 9, background: '#EAF7F1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="18" rx="3" stroke="#137333" strokeWidth="1.8"/><path d="M16 2v4M8 2v4M3 10h18" stroke="#137333" strokeWidth="1.8" strokeLinecap="round"/></svg>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#07251C' }}>TeleCare™</div>
                  <div style={{ fontSize: 10, color: '#7A8C84' }}>Today · 4:30 PM</div>
                </div>
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#07251C', marginBottom: 4 }}>Dr. Adaeze Okonkwo</div>
              <div style={{ fontSize: 10, color: '#617870', marginBottom: 12 }}>General Practice · Lagos</div>
              <div style={{ background: '#EAF7F1', borderRadius: 100, padding: '5px 12px', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#137333', display: 'block' }} />
                <span style={{ fontSize: 10, fontWeight: 700, color: '#137333' }}>Confirmed</span>
              </div>
            </div>,
            <div key="earlyaccess2" style={{ background: '#6DC43F', borderRadius: 18, padding: '20px 22px', width: 158, flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 148 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#07251C', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Early Access</div>
              <div style={{ fontFamily: 'var(--font-manrope)', fontSize: 20, fontWeight: 700, color: '#07251C', letterSpacing: '-0.02em', lineHeight: 1.2 }}>Now Accepting Registrations</div>
              <div style={{ fontSize: 10, color: 'rgba(7,37,28,0.6)' }}>Health Passport · 2026</div>
            </div>,
            <div key="lab2" style={{ background: '#fff', borderRadius: 18, padding: '16px 18px', width: 200, flexShrink: 0 }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: '#137333', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>CareTest™</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#07251C', marginBottom: 12 }}>Laboratory Services</div>
              {['Complete Blood Count','Blood Chemistry','Diabetes Screening','Cholesterol Panel','Kidney Function'].map((svc) => (
                <div key={svc} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7 }}>
                  <span style={{ width: 14, height: 14, borderRadius: '50%', background: '#EAF7F1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="7" height="7" viewBox="0 0 24 24" fill="none"><path d="M5 12l4 4L19 7" stroke="#137333" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </span>
                  <span style={{ fontSize: 10, color: '#617870' }}>{svc}</span>
                </div>
              ))}
            </div>,
            <div key="dispatch2" style={{ background: '#0D0D0D', borderRadius: 18, padding: '18px 20px', width: 185, flexShrink: 0 }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: '#6DC43F', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>DispatchCare™</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', marginBottom: 12 }}>How It Works</div>
              {[['1','Patient requests help'],['2','Location identified'],['3','Team activated'],['4','Care dispatched'],['5','Patient updated']].map(([n, step]) => (
                <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
                  <span style={{ width: 17, height: 17, borderRadius: '50%', background: '#6DC43F', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#07251C', flexShrink: 0 }}>{n}</span>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)' }}>{step}</span>
                </div>
              ))}
            </div>,
            <div key="review2" style={{ background: '#fff', borderRadius: 18, overflow: 'hidden', width: 185, flexShrink: 0 }}>
              <div style={{ height: 88, position: 'relative', background: '#E8F0EC' }}>
                <Image src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=200&h=100&fit=crop&crop=faces&q=80" alt="Specialist" fill style={{ objectFit: 'cover' }} sizes="185px" />
              </div>
              <div style={{ padding: '12px 14px' }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: '#137333', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Expert Review™</div>
                {[['Documents submitted', true],['Panel assigned', true],['In review…', false]].map(([l, done]) => (
                  <div key={String(l)} style={{ display: 'flex', gap: 7, alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ width: 14, height: 14, borderRadius: '50%', background: done ? '#6DC43F' : 'transparent', border: done ? 'none' : '1.5px solid #6DC43F', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 8, color: '#07251C', fontWeight: 700 }}>{done ? '✓' : ''}</span>
                    <span style={{ fontSize: 10, color: done ? '#07251C' : '#7A8C84' }}>{String(l)}</span>
                  </div>
                ))}
              </div>
            </div>,
            <div key="score2" style={{ background: '#F7FAF7', borderRadius: 18, padding: '18px 20px', width: 178, flexShrink: 0 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#07251C', marginBottom: 14 }}>Health Score</div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, marginBottom: 10 }}>
                <div style={{ fontFamily: 'var(--font-manrope)', fontSize: 56, fontWeight: 700, color: '#07251C', letterSpacing: '-0.05em', lineHeight: 1 }}>92</div>
                <div style={{ paddingBottom: 6 }}>
                  <div style={{ fontSize: 12, color: '#7A8C84' }}>/ 100</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#137333' }}>Excellent</div>
                </div>
              </div>
              <div style={{ height: 6, background: '#E8F0EC', borderRadius: 6 }}>
                <div style={{ width: '92%', height: '100%', background: 'linear-gradient(90deg,#137333,#6DC43F)', borderRadius: 6 }} />
              </div>
              <div style={{ fontSize: 10, color: '#7A8C84', marginTop: 8 }}>Updated · June 2026</div>
            </div>,
          ])}
        </div>
      </motion.div>
    </section>
    </div>
  )
}
