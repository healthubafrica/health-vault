import Image from 'next/image'
import Link from 'next/link'

const ArrowRight = ({ color = '#07251C' }: { color?: string }) => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
    <path d="M5 12h14M13 6l6 6-6 6" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export default function Services() {
  return (
    <section
      style={{
        background: '#F7FAF7',
        borderTop: '1px solid rgba(7,37,28,0.07)',
        borderBottom: '1px solid rgba(7,37,28,0.07)',
      }}
    >
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '104px 32px' }}>
        {/* Section header */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
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
            — Services
          </div>
          <h2
            style={{
              fontFamily: 'var(--font-space-grotesk), sans-serif',
              fontWeight: 600,
              fontSize: 'clamp(28px, 3.5vw, 40px)',
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
              margin: '0 auto 20px',
              maxWidth: 640,
            }}
          >
            Comprehensive care and{' '}
            <em
              style={{
                fontFamily: 'var(--font-playfair-display), serif',
                fontStyle: 'italic',
                fontWeight: 700,
              }}
            >
              intelligent access.
            </em>
          </h2>
          <Link
            href="/services"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              background: '#07251C',
              color: '#fff',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: 14,
              padding: '10px 11px 10px 22px',
              borderRadius: 100,
            }}
          >
            View All Services
            <span
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: '#34E0A0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ArrowRight />
            </span>
          </Link>
        </div>

        {/* Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.1fr 1fr 1fr',
            gap: 16,
          }}
        >
          <div
            style={{
              background: '#07251C',
              borderRadius: 22,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              padding: 16,
              gap: 16,
            }}
          >
            {/* Inset image — padded away from card edges, own border-radius */}
            <div
              style={{
                position: 'relative',
                height: 260,
                borderRadius: 12,
                overflow: 'hidden',
                flexShrink: 0,
              }}
            >
              <Image
                src="https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=800&h=600&fit=crop&crop=faces&q=80"
                alt="Black woman doctor in telehealth video consultation"
                fill
                style={{ objectFit: 'cover', objectPosition: 'center top' }}
                sizes="(max-width: 768px) 100vw, 500px"
              />
            </div>

            {/* Text sits below the image, inside the same padding */}
            <div style={{ padding: '8px 8px 12px' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  background: 'rgba(52,224,160,0.18)',
                  color: '#34E0A0',
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '5px 12px',
                  borderRadius: 100,
                  letterSpacing: '0.04em',
                  marginBottom: 10,
                }}
              >
                TeleCare™
              </span>
              <h3
                style={{
                  fontFamily: 'var(--font-space-grotesk), sans-serif',
                  fontWeight: 600,
                  fontSize: 18,
                  color: '#fff',
                  margin: '0 0 6px',
                }}
              >
                Remote Healthcare, Delivered to You
              </h3>
              <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13.5, lineHeight: 1.55, margin: 0 }}>
                Consult with qualified providers via video — from anywhere in Nigeria.
              </p>
            </div>
          </div>

          {/* Feature card — Expert Review */}
          <ServiceCard
            iconBg="#EAF7F1"
            icon={
              <svg width="21" height="21" viewBox="0 0 24 24" fill="none">
                <path d="M9 11l2 2 4-4" stroke="#0E8567" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" stroke="#0E8567" strokeWidth="2" strokeLinejoin="round" />
              </svg>
            }
            title="Expert Review™"
            desc="Get a specialist second opinion on any diagnosis, treatment plan, or lab result — reviewed by a qualified clinical panel."
            bullets={['18+ specialist fields', 'Full document upload', 'PDF report to your Vault']}
            href="/expert-review"
          />

          {/* Feature card — DispatchCare */}
          <ServiceCard
            iconBg="rgba(255,92,92,0.1)"
            icon={
              <svg width="21" height="21" viewBox="0 0 24 24" fill="none">
                <path d="M5 17h14l-1.5-5A4 4 0 0013.7 9h-3.4A4 4 0 006.5 12L5 17z" stroke="#FF5C5C" strokeWidth="2" strokeLinejoin="round" />
                <circle cx="8" cy="18" r="1.5" stroke="#FF5C5C" strokeWidth="2" />
                <circle cx="16" cy="18" r="1.5" stroke="#FF5C5C" strokeWidth="2" />
              </svg>
            }
            title="DispatchCare™"
            desc="24/7 emergency medical dispatch — one tap from any screen sends your location to the HHA operations team."
            bullets={['Auto-detects your location', 'Instant case ID + SMS alert', 'Available on all plans']}
            href="/dispatchcare"
          />
        </div>

        {/* Services row 2 — smaller 3-column grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 16,
            marginTop: 16,
          }}
        >
          {[
            {
              name: 'MinuteCare™',
              desc: 'Fast-track walk-in clinic scheduling. Skip the queue and arrive at the right time.',
              href: '/services',
            },
            {
              name: 'CareTest™',
              desc: 'Schedule diagnostic tests and lab work. Results linked directly to your Vault.',
              href: '/services',
            },
            {
              name: 'HealthConsult™',
              desc: 'Personalised preventive care programmes and care plan consultations.',
              href: '/services',
            },
          ].map((svc) => (
            <div
              key={svc.name}
              style={{
                background: '#fff',
                border: '1px solid rgba(7,37,28,0.09)',
                borderRadius: 20,
                padding: '24px 26px',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--font-space-grotesk), sans-serif',
                  fontWeight: 600,
                  fontSize: 17,
                  color: '#07251C',
                }}
              >
                {svc.name}
              </div>
              <p style={{ color: '#41584E', fontSize: 14, lineHeight: 1.6, margin: 0, flex: 1 }}>
                {svc.desc}
              </p>
              <Link
                href={svc.href}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  color: '#0E8567',
                  fontWeight: 600,
                  fontSize: 13.5,
                  textDecoration: 'none',
                }}
              >
                Learn more
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                  <path d="M5 12h14M13 6l6 6-6 6" stroke="#0E8567" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function ServiceCard({
  iconBg,
  icon,
  title,
  desc,
  bullets,
  href,
}: {
  iconBg: string
  icon: React.ReactNode
  title: string
  desc: string
  bullets: string[]
  href: string
}) {
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid rgba(7,37,28,0.09)',
        borderRadius: 22,
        padding: 28,
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
      }}
    >
      <div>
        <span
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: iconBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon}
        </span>
        <h3
          style={{
            fontFamily: 'var(--font-space-grotesk), sans-serif',
            fontWeight: 600,
            fontSize: 19,
            margin: '14px 0 7px',
          }}
        >
          {title}
        </h3>
        <p style={{ color: '#41584E', fontSize: 14, lineHeight: 1.6, margin: 0 }}>{desc}</p>
      </div>
      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ height: 1, background: 'rgba(7,37,28,0.08)' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {bullets.map((b) => (
            <div key={b} style={{ display: 'flex', gap: 8, fontSize: 13, color: '#27433A' }}>
              <span style={{ color: '#0E8567', fontWeight: 700 }}>✓</span>
              {b}
            </div>
          ))}
        </div>
        <Link
          href={href}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            color: '#0E8567',
            fontWeight: 600,
            fontSize: 13.5,
            textDecoration: 'none',
            marginTop: 4,
          }}
        >
          Learn more
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <path d="M5 12h14M13 6l6 6-6 6" stroke="#0E8567" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      </div>
    </div>
  )
}
