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
          padding: '120px 32px 0',
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
          MyHealth Vault+™ is your personal digital health portal — access records, book care, get
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

      {/* ── Arc of floating cards (3D perspective fan) ── */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          maxWidth: 1100,
          margin: '52px auto 0',
          /* 3D perspective for the arc effect */
          perspective: '1000px',
          height: 260,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
        }}
      >
        {[
          {
            rotate: -22,
            translateY: -28,
            scale: 0.78,
            zIndex: 1,
            offsetX: -20,
            content: (
              <div style={{ padding: 14, width: 160, background: '#fff', borderRadius: 16 }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: '#0E8567', letterSpacing: '0.06em', marginBottom: 8 }}>CARETEST™</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#07251C', marginBottom: 10 }}>Lab Results</div>
                {[{ l: 'Haemoglobin', pct: '72%' }, { l: 'Glucose', pct: '48%' }, { l: 'WBC', pct: '60%' }].map((r) => (
                  <div key={r.l} style={{ marginBottom: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#5A7068', marginBottom: 2 }}>
                      <span>{r.l}</span>
                    </div>
                    <div style={{ height: 3, background: '#E7ECE7', borderRadius: 3 }}>
                      <div style={{ width: r.pct, height: '100%', background: '#0E8567', borderRadius: 3 }} />
                    </div>
                  </div>
                ))}
              </div>
            ),
          },
          {
            rotate: -11,
            translateY: -12,
            scale: 0.88,
            zIndex: 2,
            offsetX: -10,
            content: (
              <div style={{ padding: 14, width: 175, background: '#fff', borderRadius: 16 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#07251C', marginBottom: 8 }}>Your Vault</div>
                <div style={{ fontFamily: 'var(--font-space-grotesk)', fontSize: 20, fontWeight: 700, color: '#07251C', letterSpacing: '-0.02em', marginBottom: 2 }}>
                  HHA-LAG<span style={{ color: '#0E8567' }}>-2606</span>
                </div>
                <div style={{ fontSize: 9, color: '#7A8C84', marginBottom: 10 }}>Patient ID · Active</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  {[{ l: 'Records', v: '24' }, { l: 'Upcoming', v: '2' }].map((s) => (
                    <div key={s.l} style={{ background: '#F1F4EF', borderRadius: 8, padding: 7 }}>
                      <div style={{ fontSize: 8, color: '#7A8C84' }}>{s.l}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#07251C' }}>{s.v}</div>
                    </div>
                  ))}
                </div>
              </div>
            ),
          },
          {
            rotate: 0,
            translateY: 0,
            scale: 1,
            zIndex: 5,
            offsetX: 0,
            content: (
              <div style={{ padding: 16, width: 210, background: '#fff', borderRadius: 18, boxShadow: '0 24px 80px rgba(0,0,0,0.20)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#0E8567' }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#07251C' }}>Dashboard</span>
                </div>
                {[
                  { icon: '📹', label: 'TeleCare™', sub: 'Today 4:30 PM', bg: '#EAF7F1' },
                  { icon: '🛡', label: 'Expert Review™', sub: 'Report ready', bg: '#F1F4EF' },
                ].map((row) => (
                  <div key={row.label} style={{ background: row.bg, borderRadius: 10, padding: 10, display: 'flex', gap: 9, alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 16 }}>{row.icon}</span>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#07251C' }}>{row.label}</div>
                      <div style={{ fontSize: 10, color: '#5b6b63' }}>{row.sub}</div>
                    </div>
                  </div>
                ))}
                <div style={{ background: '#34E0A0', borderRadius: 9, padding: '8px 10px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#07251C' }}>
                  Emergency Dispatch — 1 tap
                </div>
              </div>
            ),
          },
          {
            rotate: 11,
            translateY: -12,
            scale: 0.88,
            zIndex: 2,
            offsetX: 10,
            content: (
              <div style={{ padding: 14, width: 175, background: '#07251C', borderRadius: 16 }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: '#FF5C5C', letterSpacing: '0.05em', marginBottom: 6 }}>DISPATCHCARE™</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', marginBottom: 2 }}>Emergency case</div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.45)', marginBottom: 10 }}>DC-2026-004419</div>
                <div style={{ height: 44, borderRadius: 10, background: 'linear-gradient(135deg,#0E8567,#063C2C)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8, border: '1px solid rgba(52,224,160,0.2)' }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#34E0A0', display: 'block' }} />
                </div>
                <div style={{ background: 'rgba(255,92,92,0.18)', borderRadius: 8, padding: 7, textAlign: 'center', fontSize: 10, fontWeight: 700, color: '#FF5C5C' }}>HHA team alerted</div>
              </div>
            ),
          },
          {
            rotate: 22,
            translateY: -28,
            scale: 0.78,
            zIndex: 1,
            offsetX: 20,
            content: (
              <div style={{ padding: 14, width: 160, background: '#fff', borderRadius: 16 }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: '#0E8567', letterSpacing: '0.06em', marginBottom: 8 }}>EXPERT REVIEW™</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#07251C', marginBottom: 10 }}>Case status</div>
                {[{ l: 'Documents submitted', done: true }, { l: 'Panel assigned', done: true }, { l: 'In review…', done: false }].map((s) => (
                  <div key={s.l} style={{ display: 'flex', gap: 7, alignItems: 'center', marginBottom: 7 }}>
                    <span style={{ width: 15, height: 15, borderRadius: '50%', background: s.done ? '#34E0A0' : 'transparent', border: s.done ? 'none' : '2px solid #34E0A0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 8, color: '#07251C', fontWeight: 700 }}>
                      {s.done ? '✓' : ''}
                    </span>
                    <span style={{ fontSize: 9, color: s.done ? '#07251C' : '#5b6b63' }}>{s.l}</span>
                  </div>
                ))}
              </div>
            ),
          },
        ].map((card, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              bottom: 0,
              left: '50%',
              transform: `
                translateX(calc(-50% + ${(i - 2) * 190 + card.offsetX}px))
                translateY(${card.translateY}px)
                rotate(${card.rotate}deg)
                scale(${card.scale})
              `,
              transformOrigin: 'bottom center',
              zIndex: card.zIndex,
              boxShadow: '0 16px 48px rgba(0,0,0,0.14)',
              borderRadius: 18,
              overflow: 'hidden',
            }}
          >
            {card.content}
          </div>
        ))}
      </div>

      {/* ── Rating strip ── */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          textAlign: 'center',
          padding: '28px 32px 52px',
        }}
      >
        <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: 13.5, margin: '0 0 6px', fontWeight: 500 }}>
          Rated 4.9/5 by 4,900+ patients
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 4 }}>
          {[1, 2, 3, 4, 5].map((s) => (
            <svg key={s} width="18" height="18" viewBox="0 0 24 24" fill="#F5A623">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          ))}
        </div>
      </div>
    </section>
    </div>
  )
}
