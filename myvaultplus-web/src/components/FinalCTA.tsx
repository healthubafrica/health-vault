import Image from 'next/image'

export default function FinalCTA() {
  return (
    <section
      style={{
        position: 'relative',
        overflow: 'hidden',
        /* Card-style with rounded corners and outer margin like the template */
        margin: '0 24px 24px',
        borderRadius: 28,
        minHeight: 340,
      }}
    >
      {/* Full-bleed background photo */}
      <Image
        src="https://images.unsplash.com/photo-1504813184591-01572f98c85f?w=1600&h=700&fit=crop&q=80"
        alt="Healthcare background"
        fill
        style={{ objectFit: 'cover', objectPosition: 'center' }}
        sizes="100vw"
        priority
      />

      {/* Left-side dark overlay for text legibility */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(to right, rgba(4,18,12,0.82) 0%, rgba(4,18,12,0.55) 55%, rgba(4,18,12,0.10) 100%)',
        }}
      />

      {/* Content */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          maxWidth: 1280,
          margin: '0 auto',
          padding: '72px 64px',
        }}
      >
        {/* Trust badge */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 20,
          }}
        >
          {/* Avatar stack */}
          <div style={{ display: 'flex' }}>
            {[
              'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=64&h=64&fit=crop&crop=faces&q=80',
              'https://images.unsplash.com/photo-1506634572416-48cdfe530110?w=64&h=64&fit=crop&crop=faces&q=80',
              'https://images.unsplash.com/photo-1523464862212-d6631d073194?w=64&h=64&fit=crop&crop=faces&q=80',
            ].map((src, i) => (
              <div
                key={i}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  overflow: 'hidden',
                  border: '2px solid rgba(255,255,255,0.6)',
                  marginLeft: i > 0 ? -10 : 0,
                  position: 'relative',
                  flexShrink: 0,
                }}
              >
                <Image src={src} alt="Patient" fill style={{ objectFit: 'cover' }} sizes="32px" />
              </div>
            ))}
          </div>
          <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: 500 }}>
            Trusted by 5,000+ patients
          </span>
        </div>

        <h2
          style={{
            fontFamily: 'var(--font-manrope), sans-serif',
            fontWeight: 700,
            fontSize: 'clamp(28px, 4vw, 48px)',
            color: '#fff',
            lineHeight: 1.1,
            letterSpacing: '-0.02em',
            margin: '0 0 16px',
            maxWidth: 520,
          }}
        >
          We combine clinical infrastructure{' '}
          <em
            style={{
              fontFamily: 'var(--font-playfair-display), serif',
              fontStyle: 'italic',
              fontWeight: 700,
            }}
          >
            with intelligent patient experience
          </em>
        </h2>

        <p
          style={{
            color: 'rgba(255,255,255,0.75)',
            fontSize: 16,
            lineHeight: 1.6,
            maxWidth: 440,
            margin: '0 0 32px',
          }}
        >
          Join thousands of patients across Nigeria who have secured their health records, simplified
          their care, and put specialist expertise within reach.
        </p>

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
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            padding: '13px 13px 13px 26px',
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
                stroke="#6DC43F"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </a>
      </div>
    </section>
  )
}
