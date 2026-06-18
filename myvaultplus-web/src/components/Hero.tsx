import Image from 'next/image'

export default function Hero() {
  return (
    /* Outer wrapper: margin + border-radius gives the card look */
    <div style={{ margin: '16px 16px 0', borderRadius: 28, overflow: 'hidden' }}>
    <section
      style={{
        position: 'relative',
        background: '#041E14',
        overflow: 'hidden',
        minHeight: '92vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      {/* Full-bleed background photo */}
      <Image
        src="https://images.unsplash.com/photo-1684607631667-7502878ad293?w=1920&h=1080&fit=crop&q=85"
        alt="Healthcare professional in surgical mask and gloves"
        fill
        priority
        style={{ objectFit: 'cover', objectPosition: 'center' }}
        sizes="100vw"
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
          position: 'relative',
          maxWidth: 760,
          width: '100%',
          margin: '0 auto',
          /* Extra top padding for the fixed transparent navbar (≈76px tall) */
          padding: '180px 32px 0',
          textAlign: 'center',
          zIndex: 1,
        }}
      >
        {/* Headline */}
        <h1
          style={{
            margin: '0 0 18px',
            lineHeight: 1.06,
            fontFamily: 'var(--font-space-grotesk), sans-serif',
          }}
        >
          <span
            style={{
              display: 'block',
              fontWeight: 700,
              fontSize: 'clamp(32px, 5.5vw, 58px)',
              color: '#fff',
              textShadow: '0 2px 20px rgba(0,0,0,0.18)',
              letterSpacing: '-0.03em',
              lineHeight: 1.06,
            }}
          >
            Your health records,
          </span>
          <span
            style={{
              display: 'block',
              fontFamily: 'var(--font-playfair-display), serif',
              fontStyle: 'italic',
              fontWeight: 700,
              fontSize: 'clamp(32px, 5.5vw, 58px)',
              color: '#34E0A0',
              letterSpacing: '-0.02em',
              lineHeight: 1.06,
            }}
          >
            secure and within reach
          </span>
        </h1>

        <p
          style={{
            color: 'rgba(255,255,255,0.78)',
            fontSize: 16,
            lineHeight: 1.65,
            maxWidth: 520,
            margin: '0 auto 32px',
          }}
        >
          MyHealth Vault+™ is your personal digital health portal: access records, book care, get
          specialist second opinions, and activate emergency dispatch from one secure place.
        </p>

        {/* CTA row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          {/* Outline / ghost button */}
          <a
            href="/services"
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
            View Services
          </a>

          {/* Primary lime-green pill */}
          <a
            href="https://portal.myvaultplus.com/register"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              background: '#34E0A0',
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
            Get Started
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
                  stroke="#34E0A0"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </a>
        </div>
      </div>

      {/* ── Marquee dashboard cards ── */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          marginTop: 120,
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
        `}</style>

        <div className="hero-marquee-track">
          {[
            /* 1 — Service tags */
            <div key="tags" style={{ background: '#fff', borderRadius: 18, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10, width: 270, flexShrink: 0 }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: '#0E8567', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Health-Hub Africa®</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                {['TeleCare™','Expert Review™','DispatchCare™','Secure Vault','CareTest™','NeuroFlex™'].map(t => (
                  <span key={t} style={{ background: t === 'Expert Review™' ? '#07251C' : '#F1F4EF', color: t === 'Expert Review™' ? '#34E0A0' : '#27433A', borderRadius: 100, padding: '5px 12px', fontSize: 11, fontWeight: 600 }}>{t}</span>
                ))}
              </div>
            </div>,

            /* 2 — Patient profile */
            <div key="profile" style={{ background: '#fff', borderRadius: 18, overflow: 'hidden', width: 172, flexShrink: 0 }}>
              <div style={{ height: 100, position: 'relative', background: '#E8F0EC' }}>
                <Image src="https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=200&h=120&fit=crop&crop=faces&q=80" alt="Patient" fill style={{ objectFit: 'cover' }} sizes="172px" />
              </div>
              <div style={{ padding: '12px 14px' }}>
                <div style={{ fontFamily: 'var(--font-space-grotesk)', fontWeight: 700, fontSize: 13, color: '#07251C', letterSpacing: '-0.02em' }}>HHA-LAG<span style={{ color: '#0E8567' }}>-2606</span></div>
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
              <div style={{ fontSize: 11, fontWeight: 700, color: '#34E0A0', letterSpacing: '0.06em' }}>Healthcare <span style={{ color: '#34E0A0' }}>●</span></div>
              <div style={{ fontFamily: 'var(--font-space-grotesk)', fontSize: 17, fontWeight: 700, color: '#fff', lineHeight: 1.3, letterSpacing: '-0.02em', marginTop: 12 }}>
                that Combines <span style={{ color: '#34E0A0' }}>Records</span>, Specialists, and Intelligent Care.
              </div>
              <div style={{ marginTop: 16, fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>MyHealth Vault+™ · Health-Hub Africa®</div>
            </div>,

            /* 4 — Satisfaction % */
            <div key="satisfaction" style={{ background: '#fff', borderRadius: 18, padding: '18px 20px', width: 175, flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#07251C' }}>Patient Satisfaction</div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M7 17l10-10M17 17V7H7" stroke="#34E0A0" strokeWidth="2" strokeLinecap="round"/></svg>
              </div>
              <div style={{ fontFamily: 'var(--font-space-grotesk)', fontSize: 44, fontWeight: 700, color: '#07251C', letterSpacing: '-0.04em', lineHeight: 1 }}>98<span style={{ fontSize: 22, color: '#0E8567' }}>%</span></div>
              <div style={{ fontSize: 10, color: '#7A8C84', marginTop: 6 }}>In the past 30 days</div>
              <div style={{ marginTop: 10, height: 3, background: '#F1F4EF', borderRadius: 3 }}>
                <div style={{ width: '98%', height: '100%', background: 'linear-gradient(90deg,#0E8567,#34E0A0)', borderRadius: 3 }} />
              </div>
            </div>,

            /* 5 — Appointment */
            <div key="appt" style={{ background: '#fff', borderRadius: 18, padding: '16px 18px', width: 200, flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <div style={{ width: 30, height: 30, borderRadius: 9, background: '#EAF7F1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="18" rx="3" stroke="#0E8567" strokeWidth="1.8"/><path d="M16 2v4M8 2v4M3 10h18" stroke="#0E8567" strokeWidth="1.8" strokeLinecap="round"/></svg>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#07251C' }}>TeleCare™</div>
                  <div style={{ fontSize: 10, color: '#7A8C84' }}>Today · 4:30 PM</div>
                </div>
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#07251C', marginBottom: 4 }}>Dr. Adaeze Okonkwo</div>
              <div style={{ fontSize: 10, color: '#617870', marginBottom: 12 }}>General Practice · Lagos</div>
              <div style={{ background: '#EAF7F1', borderRadius: 100, padding: '5px 12px', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#0E8567', display: 'block' }} />
                <span style={{ fontSize: 10, fontWeight: 700, color: '#0E8567' }}>Confirmed</span>
              </div>
            </div>,

            /* 6 — Big mint stat */
            <div key="stat" style={{ background: '#34E0A0', borderRadius: 18, padding: '20px 22px', width: 158, flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 148 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#07251C', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Active Patients</div>
              <div style={{ fontFamily: 'var(--font-space-grotesk)', fontSize: 52, fontWeight: 700, color: '#07251C', letterSpacing: '-0.04em', lineHeight: 1 }}>4.9k<span style={{ fontSize: 28 }}>+</span></div>
              <div style={{ fontSize: 10, color: 'rgba(7,37,28,0.6)' }}>Across Nigeria · 2026</div>
            </div>,

            /* 7 — Lab results */
            <div key="lab" style={{ background: '#fff', borderRadius: 18, padding: '16px 18px', width: 200, flexShrink: 0 }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: '#0E8567', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>CareTest™</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#07251C', marginBottom: 14 }}>Lab Results</div>
              {[['Haemoglobin','72%','#0E8567'],['Glucose','48%','#F5A623'],['WBC Count','60%','#34E0A0']].map(([label, pct, color]) => (
                <div key={label} style={{ marginBottom: 9 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#617870', marginBottom: 4 }}>
                    <span>{label}</span><span style={{ fontWeight: 600, color: '#07251C' }}>{pct}</span>
                  </div>
                  <div style={{ height: 4, background: '#F1F4EF', borderRadius: 4 }}>
                    <div style={{ width: pct, height: '100%', background: color, borderRadius: 4 }} />
                  </div>
                </div>
              ))}
            </div>,

            /* 8 — DispatchCare alert */
            <div key="dispatch" style={{ background: '#0D0D0D', borderRadius: 18, padding: '18px 20px', width: 185, flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 14 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#FF5C5C', boxShadow: '0 0 0 3px rgba(255,92,92,0.25)' }} />
                <div style={{ fontSize: 9, fontWeight: 700, color: '#FF5C5C', letterSpacing: '0.1em', textTransform: 'uppercase' }}>DispatchCare™</div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 3 }}>Emergency Active</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 14 }}>DC-2026-004419 · 2 min ago</div>
              <div style={{ background: 'linear-gradient(135deg,#0E8567,#063C2C)', borderRadius: 10, padding: '10px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#34E0A0"/></svg>
                <span style={{ fontSize: 10, color: '#34E0A0', fontWeight: 600 }}>Location detected</span>
              </div>
              <div style={{ background: 'rgba(255,92,92,0.15)', borderRadius: 8, padding: '6px 10px', textAlign: 'center', fontSize: 10, fontWeight: 700, color: '#FF5C5C' }}>HHA team alerted</div>
            </div>,

            /* 9 — Expert Review with doctor photo */
            <div key="review" style={{ background: '#fff', borderRadius: 18, overflow: 'hidden', width: 185, flexShrink: 0 }}>
              <div style={{ height: 88, position: 'relative', background: '#E8F0EC' }}>
                <Image src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=200&h=100&fit=crop&crop=faces&q=80" alt="Specialist" fill style={{ objectFit: 'cover' }} sizes="185px" />
              </div>
              <div style={{ padding: '12px 14px' }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: '#0E8567', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Expert Review™</div>
                {[['Documents submitted', true],['Panel assigned', true],['In review…', false]].map(([l, done]) => (
                  <div key={String(l)} style={{ display: 'flex', gap: 7, alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ width: 14, height: 14, borderRadius: '50%', background: done ? '#34E0A0' : 'transparent', border: done ? 'none' : '1.5px solid #34E0A0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 8, color: '#07251C', fontWeight: 700 }}>{done ? '✓' : ''}</span>
                    <span style={{ fontSize: 10, color: done ? '#07251C' : '#7A8C84' }}>{String(l)}</span>
                  </div>
                ))}
              </div>
            </div>,

            /* 10 — Health score */
            <div key="score" style={{ background: '#F7FAF7', borderRadius: 18, padding: '18px 20px', width: 178, flexShrink: 0 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#07251C', marginBottom: 14 }}>Health Score</div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, marginBottom: 10 }}>
                <div style={{ fontFamily: 'var(--font-space-grotesk)', fontSize: 56, fontWeight: 700, color: '#07251C', letterSpacing: '-0.05em', lineHeight: 1 }}>92</div>
                <div style={{ paddingBottom: 6 }}>
                  <div style={{ fontSize: 12, color: '#7A8C84' }}>/ 100</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#0E8567' }}>Excellent</div>
                </div>
              </div>
              <div style={{ height: 6, background: '#E8F0EC', borderRadius: 6 }}>
                <div style={{ width: '92%', height: '100%', background: 'linear-gradient(90deg,#0E8567,#34E0A0)', borderRadius: 6 }} />
              </div>
              <div style={{ fontSize: 10, color: '#7A8C84', marginTop: 8 }}>Updated · June 2026</div>
            </div>,
          ].concat([
            /* duplicate set for seamless loop */
            <div key="tags2" style={{ background: '#fff', borderRadius: 18, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10, width: 270, flexShrink: 0 }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: '#0E8567', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Health-Hub Africa®</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                {['TeleCare™','Expert Review™','DispatchCare™','Secure Vault','CareTest™','NeuroFlex™'].map(t => (
                  <span key={t} style={{ background: t === 'Expert Review™' ? '#07251C' : '#F1F4EF', color: t === 'Expert Review™' ? '#34E0A0' : '#27433A', borderRadius: 100, padding: '5px 12px', fontSize: 11, fontWeight: 600 }}>{t}</span>
                ))}
              </div>
            </div>,
            <div key="profile2" style={{ background: '#fff', borderRadius: 18, overflow: 'hidden', width: 172, flexShrink: 0 }}>
              <div style={{ height: 100, position: 'relative', background: '#E8F0EC' }}>
                <Image src="https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=200&h=120&fit=crop&crop=faces&q=80" alt="Patient" fill style={{ objectFit: 'cover' }} sizes="172px" />
              </div>
              <div style={{ padding: '12px 14px' }}>
                <div style={{ fontFamily: 'var(--font-space-grotesk)', fontWeight: 700, fontSize: 13, color: '#07251C', letterSpacing: '-0.02em' }}>HHA-LAG<span style={{ color: '#0E8567' }}>-2606</span></div>
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
              <div style={{ fontSize: 11, fontWeight: 700, color: '#34E0A0', letterSpacing: '0.06em' }}>Healthcare <span style={{ color: '#34E0A0' }}>●</span></div>
              <div style={{ fontFamily: 'var(--font-space-grotesk)', fontSize: 17, fontWeight: 700, color: '#fff', lineHeight: 1.3, letterSpacing: '-0.02em', marginTop: 12 }}>
                that Combines <span style={{ color: '#34E0A0' }}>Records</span>, Specialists, and Intelligent Care.
              </div>
              <div style={{ marginTop: 16, fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>MyHealth Vault+™ · Health-Hub Africa®</div>
            </div>,
            <div key="satisfaction2" style={{ background: '#fff', borderRadius: 18, padding: '18px 20px', width: 175, flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#07251C' }}>Patient Satisfaction</div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M7 17l10-10M17 17V7H7" stroke="#34E0A0" strokeWidth="2" strokeLinecap="round"/></svg>
              </div>
              <div style={{ fontFamily: 'var(--font-space-grotesk)', fontSize: 44, fontWeight: 700, color: '#07251C', letterSpacing: '-0.04em', lineHeight: 1 }}>98<span style={{ fontSize: 22, color: '#0E8567' }}>%</span></div>
              <div style={{ fontSize: 10, color: '#7A8C84', marginTop: 6 }}>In the past 30 days</div>
              <div style={{ marginTop: 10, height: 3, background: '#F1F4EF', borderRadius: 3 }}>
                <div style={{ width: '98%', height: '100%', background: 'linear-gradient(90deg,#0E8567,#34E0A0)', borderRadius: 3 }} />
              </div>
            </div>,
            <div key="appt2" style={{ background: '#fff', borderRadius: 18, padding: '16px 18px', width: 200, flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <div style={{ width: 30, height: 30, borderRadius: 9, background: '#EAF7F1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="18" rx="3" stroke="#0E8567" strokeWidth="1.8"/><path d="M16 2v4M8 2v4M3 10h18" stroke="#0E8567" strokeWidth="1.8" strokeLinecap="round"/></svg>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#07251C' }}>TeleCare™</div>
                  <div style={{ fontSize: 10, color: '#7A8C84' }}>Today · 4:30 PM</div>
                </div>
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#07251C', marginBottom: 4 }}>Dr. Adaeze Okonkwo</div>
              <div style={{ fontSize: 10, color: '#617870', marginBottom: 12 }}>General Practice · Lagos</div>
              <div style={{ background: '#EAF7F1', borderRadius: 100, padding: '5px 12px', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#0E8567', display: 'block' }} />
                <span style={{ fontSize: 10, fontWeight: 700, color: '#0E8567' }}>Confirmed</span>
              </div>
            </div>,
            <div key="stat2" style={{ background: '#34E0A0', borderRadius: 18, padding: '20px 22px', width: 158, flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 148 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#07251C', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Active Patients</div>
              <div style={{ fontFamily: 'var(--font-space-grotesk)', fontSize: 52, fontWeight: 700, color: '#07251C', letterSpacing: '-0.04em', lineHeight: 1 }}>4.9k<span style={{ fontSize: 28 }}>+</span></div>
              <div style={{ fontSize: 10, color: 'rgba(7,37,28,0.6)' }}>Across Nigeria · 2026</div>
            </div>,
            <div key="lab2" style={{ background: '#fff', borderRadius: 18, padding: '16px 18px', width: 200, flexShrink: 0 }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: '#0E8567', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>CareTest™</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#07251C', marginBottom: 14 }}>Lab Results</div>
              {[['Haemoglobin','72%','#0E8567'],['Glucose','48%','#F5A623'],['WBC Count','60%','#34E0A0']].map(([label, pct, color]) => (
                <div key={label} style={{ marginBottom: 9 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#617870', marginBottom: 4 }}>
                    <span>{label}</span><span style={{ fontWeight: 600, color: '#07251C' }}>{pct}</span>
                  </div>
                  <div style={{ height: 4, background: '#F1F4EF', borderRadius: 4 }}>
                    <div style={{ width: pct, height: '100%', background: color, borderRadius: 4 }} />
                  </div>
                </div>
              ))}
            </div>,
            <div key="dispatch2" style={{ background: '#0D0D0D', borderRadius: 18, padding: '18px 20px', width: 185, flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 14 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#FF5C5C', boxShadow: '0 0 0 3px rgba(255,92,92,0.25)' }} />
                <div style={{ fontSize: 9, fontWeight: 700, color: '#FF5C5C', letterSpacing: '0.1em', textTransform: 'uppercase' }}>DispatchCare™</div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 3 }}>Emergency Active</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 14 }}>DC-2026-004419 · 2 min ago</div>
              <div style={{ background: 'linear-gradient(135deg,#0E8567,#063C2C)', borderRadius: 10, padding: '10px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#34E0A0"/></svg>
                <span style={{ fontSize: 10, color: '#34E0A0', fontWeight: 600 }}>Location detected</span>
              </div>
              <div style={{ background: 'rgba(255,92,92,0.15)', borderRadius: 8, padding: '6px 10px', textAlign: 'center', fontSize: 10, fontWeight: 700, color: '#FF5C5C' }}>HHA team alerted</div>
            </div>,
            <div key="review2" style={{ background: '#fff', borderRadius: 18, overflow: 'hidden', width: 185, flexShrink: 0 }}>
              <div style={{ height: 88, position: 'relative', background: '#E8F0EC' }}>
                <Image src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=200&h=100&fit=crop&crop=faces&q=80" alt="Specialist" fill style={{ objectFit: 'cover' }} sizes="185px" />
              </div>
              <div style={{ padding: '12px 14px' }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: '#0E8567', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Expert Review™</div>
                {[['Documents submitted', true],['Panel assigned', true],['In review…', false]].map(([l, done]) => (
                  <div key={String(l)} style={{ display: 'flex', gap: 7, alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ width: 14, height: 14, borderRadius: '50%', background: done ? '#34E0A0' : 'transparent', border: done ? 'none' : '1.5px solid #34E0A0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 8, color: '#07251C', fontWeight: 700 }}>{done ? '✓' : ''}</span>
                    <span style={{ fontSize: 10, color: done ? '#07251C' : '#7A8C84' }}>{String(l)}</span>
                  </div>
                ))}
              </div>
            </div>,
            <div key="score2" style={{ background: '#F7FAF7', borderRadius: 18, padding: '18px 20px', width: 178, flexShrink: 0 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#07251C', marginBottom: 14 }}>Health Score</div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, marginBottom: 10 }}>
                <div style={{ fontFamily: 'var(--font-space-grotesk)', fontSize: 56, fontWeight: 700, color: '#07251C', letterSpacing: '-0.05em', lineHeight: 1 }}>92</div>
                <div style={{ paddingBottom: 6 }}>
                  <div style={{ fontSize: 12, color: '#7A8C84' }}>/ 100</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#0E8567' }}>Excellent</div>
                </div>
              </div>
              <div style={{ height: 6, background: '#E8F0EC', borderRadius: 6 }}>
                <div style={{ width: '92%', height: '100%', background: 'linear-gradient(90deg,#0E8567,#34E0A0)', borderRadius: 6 }} />
              </div>
              <div style={{ fontSize: 10, color: '#7A8C84', marginTop: 8 }}>Updated · June 2026</div>
            </div>,
          ])}
        </div>
      </div>
    </section>
    </div>
  )
}
