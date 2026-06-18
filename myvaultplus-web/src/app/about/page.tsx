import Image from 'next/image'
import Navbar from '@/components/Navbar'
import FinalCTA from '@/components/FinalCTA'
import Footer from '@/components/Footer'

const checkItems = [
  'Secure health records, always accessible',
  'Book care in 4 steps or fewer',
  'Emergency dispatch — one tap, any screen',
  'Specialist second opinions via Expert Review™',
]

const pillars = [
  { title: 'Patient-Centred Design', desc: 'Every feature is built around the patient experience — intuitive, fast, and always accessible from any device.' },
  { title: 'Clinical Accuracy', desc: 'Our specialist networks and review panels maintain the highest standards of clinical rigour in every interaction.' },
  { title: 'Data Sovereignty', desc: 'Your health data belongs to you — stored securely, NDPR-compliant, and never sold or shared without consent.' },
  { title: 'Scalable Infrastructure', desc: "Built on modern, scalable technology that grows with Nigeria's healthcare needs — from individual patients to enterprise." },
]

const layers = [
  { num: '01', title: 'MyHealth Vault+™ UI', desc: 'The patient-facing portal — health records, bookings, communications, and emergency dispatch in one secure interface.' },
  { num: '02', title: 'HHA Middleware', desc: 'Intelligent routing, authentication, FHIR R4 compliance, and real-time data synchronisation across all services.' },
  { num: '03', title: 'Clinical Infrastructure', desc: 'Hospital integrations, specialist networks, lab partnerships, and emergency operations — the backbone of care delivery.' },
]

const heroCards = [
  {
    rotate: -12, translateY: -12, scale: 0.88, zIndex: 2, offsetX: -10,
    bg: '#fff', w: 170,
    inner: (
      <div style={{ padding: 16 }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: '#0E8567', letterSpacing: '0.06em', marginBottom: 8 }}>PLATFORM</div>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#07251C', marginBottom: 10 }}>Launched 2023</div>
        {['Secure records', 'Book care fast', 'Emergency dispatch'].map((it) => (
          <div key={it} style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 5 }}>
            <span style={{ color: '#0E8567', fontSize: 10, fontWeight: 700 }}>✓</span>
            <span style={{ fontSize: 10, color: '#41584E' }}>{it}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    rotate: 0, translateY: 0, scale: 1, zIndex: 5, offsetX: 0,
    bg: '#07251C', w: 200,
    inner: (
      <div style={{ padding: 18 }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: '#34E0A0', letterSpacing: '0.08em', marginBottom: 10 }}>ACTIVE RECORDS</div>
        <div style={{ fontFamily: 'var(--font-space-grotesk), sans-serif', fontSize: 44, fontWeight: 700, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1 }}>5k+</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 6 }}>Active Patient Records</div>
      </div>
    ),
  },
  {
    rotate: 12, translateY: -12, scale: 0.88, zIndex: 2, offsetX: 10,
    bg: '#fff', w: 170,
    inner: (
      <div style={{ padding: 16 }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: '#0E8567', letterSpacing: '0.06em', marginBottom: 8 }}>SERVICES</div>
        <div style={{ fontFamily: 'var(--font-space-grotesk), sans-serif', fontSize: 28, fontWeight: 700, color: '#07251C', letterSpacing: '-0.02em' }}>7</div>
        <div style={{ fontSize: 11, color: '#41584E', marginTop: 4 }}>Healthcare services, one portal</div>
      </div>
    ),
  },
]

export default function AboutPage() {
  return (
    <div style={{ width: '100%', overflowX: 'hidden', background: '#F1F4EF' }}>
      <Navbar />

      <div style={{ margin: '16px 16px 24px', borderRadius: 28, overflow: 'hidden' }}>
        <section style={{ position: 'relative', background: '#041E14', overflow: 'hidden', minHeight: '88vh', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Image src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=1920&h=1080&fit=crop&q=85" alt="Healthcare professional with patient" fill priority style={{ objectFit: 'cover', objectPosition: 'center' }} sizes="100vw" />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(160deg, rgba(4,30,20,0.78) 0%, rgba(7,37,28,0.65) 50%, rgba(4,18,12,0.82) 100%)', pointerEvents: 'none' }} />

          <div style={{ position: 'relative', maxWidth: 760, width: '100%', margin: '0 auto', padding: '120px 32px 0', textAlign: 'center', zIndex: 1 }}>
            <h1 style={{ margin: '0 0 18px', lineHeight: 1.06, fontFamily: 'var(--font-space-grotesk), sans-serif' }}>
              <span style={{ display: 'block', fontWeight: 700, fontSize: 'clamp(32px, 5.5vw, 58px)', color: '#fff', letterSpacing: '-0.03em', lineHeight: 1.06 }}>
                About MyHealth Vault+™
              </span>
              <span style={{ display: 'block', fontFamily: 'var(--font-playfair-display), serif', fontStyle: 'italic', fontWeight: 700, fontSize: 'clamp(28px, 4vw, 48px)', color: '#34E0A0', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                by Health-Hub Africa®
              </span>
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.78)', fontSize: 16, lineHeight: 1.65, maxWidth: 520, margin: '0 auto 32px' }}>
              The patient-facing digital health portal — a secure, intelligent, and personalised digital home for healthcare in Africa.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
              <a href="/services" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(8px)', border: '1.5px solid rgba(255,255,255,0.55)', color: '#fff', textDecoration: 'none', fontWeight: 700, fontSize: 13, letterSpacing: '0.07em', textTransform: 'uppercase', padding: '13px 26px', borderRadius: 100 }}>
                Our Services
              </a>
              <a href="https://portal.myvaultplus.com/register" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: '#34E0A0', color: '#07251C', textDecoration: 'none', fontWeight: 700, fontSize: 13, letterSpacing: '0.07em', textTransform: 'uppercase', padding: '12px 12px 12px 24px', borderRadius: 100 }}>
                Get Started
                <span style={{ width: 30, height: 30, borderRadius: '50%', background: '#07251C', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M5 19L19 5M19 5H9M19 5v10" stroke="#34E0A0" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </span>
              </a>
            </div>
          </div>

          <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 1100, margin: '52px auto 0', perspective: '1000px', height: 220, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
            {heroCards.map((card, i) => (
              <div key={i} style={{ position: 'absolute', bottom: 0, left: '50%', transform: `translateX(calc(-50% + ${(i - 1) * 210 + card.offsetX}px)) translateY(${card.translateY}px) rotate(${card.rotate}deg) scale(${card.scale})`, transformOrigin: 'bottom center', zIndex: card.zIndex, boxShadow: '0 16px 48px rgba(0,0,0,0.14)', borderRadius: 16, overflow: 'hidden', background: card.bg, width: card.w }}>
                {card.inner}
              </div>
            ))}
          </div>

          <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', padding: '28px 32px 52px' }}>
            <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13.5, margin: 0 }}>
              Built and operated by Health-Hub Africa® — Nigeria&apos;s integrated healthcare platform
            </p>
          </div>
        </section>
      </div>

      {/* Section 1 — Bento */}
      <div style={{ margin: '0 24px 24px', borderRadius: 28, overflow: 'hidden', background: '#F7FAF7' }}>
        <section style={{ maxWidth: 1280, margin: '0 auto', padding: '88px 56px' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#0E8567', marginBottom: 18 }}>— About MyVault+</div>
            <h2 style={{ fontFamily: 'var(--font-space-grotesk), sans-serif', fontWeight: 600, fontSize: 'clamp(28px, 3.5vw, 40px)', lineHeight: 1.1, letterSpacing: '-0.02em', margin: '0 auto 16px', maxWidth: 640 }}>
              A digital health platform dedicated to making care{' '}
              <em style={{ fontFamily: 'var(--font-playfair-display), serif', fontStyle: 'italic', fontWeight: 700 }}>simpler and more accessible.</em>
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1.3fr 1fr', gridTemplateRows: '1fr 1fr', gap: 16, minHeight: 380 }}>
            <div style={{ gridRow: '1 / 3', background: '#07251C', borderRadius: 24, padding: 32, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#34E0A0', marginBottom: 18 }}>One Portal</div>
                <h3 style={{ fontFamily: 'var(--font-space-grotesk), sans-serif', fontWeight: 600, fontSize: 22, lineHeight: 1.2, color: '#fff', margin: '0 0 20px', letterSpacing: '-0.01em' }}>Your complete health journey, organised.</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {checkItems.map((item) => (
                    <div key={item} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <span style={{ width: 24, height: 24, borderRadius: 7, background: 'rgba(52,224,160,0.16)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M5 12l4 4L19 7" stroke="#34E0A0" strokeWidth="2.5" strokeLinecap="round" /></svg>
                      </span>
                      <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13.5 }}>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ background: 'rgba(52,224,160,0.08)', border: '1px solid rgba(52,224,160,0.2)', borderRadius: 14, padding: 14 }}>
                <div style={{ fontFamily: 'var(--font-space-grotesk), sans-serif', fontSize: 17, fontWeight: 700, color: '#34E0A0' }}>HHA-LAG-2606-0001</div>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 3 }}>Patient ID · Instant on registration</div>
              </div>
            </div>
            <div style={{ gridRow: '1 / 3', background: '#F7FAF7', border: '1px solid rgba(7,37,28,0.08)', borderRadius: 24, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ flex: 1, position: 'relative', minHeight: 240 }}>
                <Image src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&h=600&fit=crop&q=80" alt="Healthcare professional with patient" fill style={{ objectFit: 'cover' }} sizes="400px" />
              </div>
              <div style={{ padding: 24 }}>
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#0E8567', marginBottom: 8 }}>Onboard in under 3 minutes</div>
                <p style={{ color: '#41584E', fontSize: 14, lineHeight: 1.6, margin: 0 }}>Register, access your portal, and start using Health-Hub Africa® services immediately — at no cost.</p>
              </div>
            </div>
            <div style={{ background: '#34E0A0', borderRadius: 24, padding: 28, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#0A4E3C' }}>Specialist Fields</div>
              <div>
                <div style={{ fontFamily: 'var(--font-space-grotesk), sans-serif', fontSize: 52, fontWeight: 700, color: '#07251C', letterSpacing: '-0.03em', lineHeight: 1 }}>18+</div>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: '#0A4E3C', marginTop: 6 }}>Clinical fields in Expert Review™</div>
              </div>
            </div>
            <div style={{ background: '#07251C', borderRadius: 24, padding: 28, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#34E0A0' }}>Services</div>
              <div>
                <div style={{ fontFamily: 'var(--font-space-grotesk), sans-serif', fontSize: 52, fontWeight: 700, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1 }}>7</div>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: 'rgba(255,255,255,0.65)', marginTop: 6 }}>Healthcare services, one portal</div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Section 2 — Layers */}
      <div style={{ margin: '0 24px 24px', borderRadius: 28, overflow: 'hidden', background: '#EBEBEB' }}>
        <section style={{ maxWidth: 1280, margin: '0 auto', padding: '88px 56px' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#0E8567', marginBottom: 18 }}>— Infrastructure</div>
            <h2 style={{ fontFamily: 'var(--font-space-grotesk), sans-serif', fontWeight: 600, fontSize: 'clamp(28px, 3.5vw, 40px)', lineHeight: 1.1, letterSpacing: '-0.02em', margin: '0 auto 16px', maxWidth: 640 }}>
              Three integrated{' '}
              <em style={{ fontFamily: 'var(--font-playfair-display), serif', fontStyle: 'italic', fontWeight: 700 }}>layers of care.</em>
            </h2>
          </div>
          <div style={{ background: '#DEDEDE', borderRadius: 28, padding: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {layers.map((layer) => (
                <div key={layer.num} style={{ padding: '40px 36px 36px', background: '#fff', borderRadius: 18 }}>
                  <div style={{ fontFamily: 'var(--font-space-grotesk), sans-serif', fontSize: 36, fontWeight: 700, color: '#34E0A0', letterSpacing: '-0.02em', marginBottom: 16 }}>{layer.num}</div>
                  <h3 style={{ fontFamily: 'var(--font-space-grotesk), sans-serif', fontWeight: 600, fontSize: 21, color: '#07251C', margin: '0 0 10px', letterSpacing: '-0.01em' }}>{layer.title}</h3>
                  <p style={{ color: '#5A7068', fontSize: 14.5, lineHeight: 1.65, margin: 0 }}>{layer.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* Section 3 — Pillars */}
      <div style={{ margin: '0 24px 24px', borderRadius: 28, overflow: 'hidden', background: '#fff' }}>
        <section style={{ maxWidth: 1280, margin: '0 auto', padding: '88px 56px' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#0E8567', marginBottom: 18 }}>— Pillars</div>
            <h2 style={{ fontFamily: 'var(--font-space-grotesk), sans-serif', fontWeight: 600, fontSize: 'clamp(28px, 3.5vw, 40px)', lineHeight: 1.1, letterSpacing: '-0.02em', margin: '0 auto 16px', maxWidth: 640 }}>
              What we stand{' '}
              <em style={{ fontFamily: 'var(--font-playfair-display), serif', fontStyle: 'italic', fontWeight: 700 }}>for.</em>
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {pillars.map((pillar) => (
              <div key={pillar.title} style={{ background: '#fff', border: '1px solid rgba(7,37,28,0.09)', borderRadius: 20, padding: 28, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <span style={{ width: 44, height: 44, borderRadius: 12, background: '#EAF7F1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M9 11l2 2 4-4M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" stroke="#0E8567" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </span>
                <h3 style={{ fontFamily: 'var(--font-space-grotesk), sans-serif', fontWeight: 600, fontSize: 18, color: '#07251C', margin: 0 }}>{pillar.title}</h3>
                <p style={{ color: '#41584E', fontSize: 14.5, lineHeight: 1.65, margin: 0 }}>{pillar.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Section 4 — Organisation */}
      <div style={{ margin: '0 24px 24px', borderRadius: 28, overflow: 'hidden', background: '#07251C' }}>
        <section style={{ maxWidth: 1280, margin: '0 auto', padding: '88px 56px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 48, alignItems: 'start' }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#34E0A0', marginBottom: 18 }}>— Organisation</div>
              <h2 style={{ fontFamily: 'var(--font-space-grotesk), sans-serif', fontWeight: 600, fontSize: 'clamp(28px, 3.5vw, 40px)', lineHeight: 1.1, letterSpacing: '-0.02em', color: '#fff', margin: '0 0 20px' }}>
                Built by{' '}
                <em style={{ fontFamily: 'var(--font-playfair-display), serif', fontStyle: 'italic', fontWeight: 700, color: '#34E0A0' }}>Health-Hub Africa®</em>
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.72)', fontSize: 15, lineHeight: 1.7, margin: '0 0 16px' }}>
                Health-Hub Africa® is an integrated healthcare technology company based in Lagos, Nigeria. We build the infrastructure that connects patients to quality care — combining clinical expertise with world-class digital product development.
              </p>
              <p style={{ color: 'rgba(255,255,255,0.72)', fontSize: 15, lineHeight: 1.7, margin: 0 }}>
                MyHealth Vault+™ is our flagship patient-facing platform, designed to give every Nigerian access to a secure, intelligent digital health home.
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[{ label: 'Parent Organisation', value: 'Health-Hub Africa® Ltd' }, { label: 'Location', value: 'Lagos, Nigeria' }, { label: 'Registration', value: 'RC 1234567' }].map((item) => (
                <div key={item.label} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(52,224,160,0.15)', borderRadius: 16, padding: '18px 22px' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#34E0A0', marginBottom: 6 }}>{item.label}</div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: '#fff' }}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      <FinalCTA />
      <Footer />
    </div>
  )
}
