import Image from 'next/image'

const checkItems = [
  'Secure health records, always accessible',
  'Book care in 4 steps or fewer',
  'Emergency dispatch — one tap, any screen',
  'Specialist second opinions via Expert Review™',
]

export default function About() {
  return (
    <section style={{ maxWidth: 1280, margin: '0 auto', padding: '104px 32px' }}>
      {/* Section header */}
      <div style={{ textAlign: 'center', marginBottom: 56 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: '#0E8567',
            marginBottom: 18,
          }}
        >
          — About MyVault+
        </div>
        <h2
          style={{
            fontFamily: 'var(--font-space-grotesk), sans-serif',
            fontWeight: 600,
            fontSize: 'clamp(28px, 3.5vw, 40px)',
            lineHeight: 1.1,
            letterSpacing: '-0.02em',
            margin: '0 auto',
            maxWidth: 700,
          }}
        >
          A digital health platform dedicated to making care{' '}
          <em
            style={{
              fontFamily: 'var(--font-playfair-display), serif',
              fontStyle: 'italic',
              fontWeight: 700,
            }}
          >
            simpler and more accessible.
          </em>
        </h2>
      </div>

      {/* Bento grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.4fr 1.3fr 1fr',
          gridTemplateRows: '1fr 1fr',
          gap: 16,
          minHeight: 380,
        }}
      >
        {/* Left — large dark card */}
        <div
          style={{
            gridRow: '1 / 3',
            background: '#07251C',
            borderRadius: 24,
            padding: 32,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: '#34E0A0',
                marginBottom: 18,
              }}
            >
              One Portal
            </div>
            <h3
              style={{
                fontFamily: 'var(--font-space-grotesk), sans-serif',
                fontWeight: 600,
                fontSize: 26,
                lineHeight: 1.2,
                color: '#fff',
                margin: '0 0 16px',
                letterSpacing: '-0.01em',
              }}
            >
              Your complete health journey, organised.
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {checkItems.map((item) => (
                <div key={item} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <span
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 7,
                      background: 'rgba(52,224,160,0.16)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                      <path d="M5 12l4 4L19 7" stroke="#34E0A0" strokeWidth="2.5" strokeLinecap="round" />
                    </svg>
                  </span>
                  <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13.5 }}>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Patient ID badge */}
          <div
            style={{
              background: 'rgba(52,224,160,0.08)',
              border: '1px solid rgba(52,224,160,0.2)',
              borderRadius: 14,
              padding: 14,
            }}
          >
            <div
              style={{
                fontFamily: 'var(--font-space-grotesk), sans-serif',
                fontSize: 18,
                fontWeight: 700,
                color: '#34E0A0',
                letterSpacing: '-0.01em',
              }}
            >
              HHA-LAG-2606-0001
            </div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 3 }}>
              Patient ID · Instant on registration
            </div>
          </div>
        </div>

        {/* Middle — photo card */}
        <div
          style={{
            gridRow: '1 / 3',
            background: '#F7FAF7',
            border: '1px solid rgba(7,37,28,0.08)',
            borderRadius: 24,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ flex: 1, position: 'relative', minHeight: 240 }}>
            <Image
              src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&h=600&fit=crop&q=80"
              alt="Healthcare professional with patient using a digital tablet in a modern clinic"
              fill
              style={{ objectFit: 'cover' }}
              sizes="(max-width: 768px) 100vw, 400px"
            />
          </div>
          <div style={{ padding: 24 }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: '#0E8567',
                marginBottom: 8,
              }}
            >
              Onboard in under 3 minutes
            </div>
            <p style={{ color: '#41584E', fontSize: 14, lineHeight: 1.6, margin: 0 }}>
              Register, access your portal, and start using Health-Hub Africa® services immediately
              — at no cost.
            </p>
          </div>
        </div>

        {/* Top-right accent card */}
        <div
          style={{
            background: '#34E0A0',
            borderRadius: 24,
            padding: 28,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: '#0A4E3C',
            }}
          >
            Specialist Fields
          </div>
          <div>
            <div
              style={{
                fontFamily: 'var(--font-space-grotesk), sans-serif',
                fontSize: 52,
                fontWeight: 700,
                color: '#07251C',
                letterSpacing: '-0.03em',
                lineHeight: 1,
              }}
            >
              18+
            </div>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: '#0A4E3C', marginTop: 6 }}>
              Clinical fields in Expert Review™
            </div>
          </div>
        </div>

        {/* Bottom-right dark card */}
        <div
          style={{
            background: '#07251C',
            borderRadius: 24,
            padding: 28,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: '#34E0A0',
            }}
          >
            Services
          </div>
          <div>
            <div
              style={{
                fontFamily: 'var(--font-space-grotesk), sans-serif',
                fontSize: 52,
                fontWeight: 700,
                color: '#fff',
                letterSpacing: '-0.03em',
                lineHeight: 1,
              }}
            >
              6+
            </div>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: 'rgba(255,255,255,0.65)', marginTop: 6 }}>
              Healthcare services, one portal
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
