import Image from 'next/image'
import Navbar from '@/components/Navbar'
import FinalCTA from '@/components/FinalCTA'
import Footer from '@/components/Footer'

const steps = [
  { num: '1', title: 'One Tap', desc: 'Press the DispatchCare™ button from any screen in the MyHealth Vault+™ portal or app.' },
  { num: '2', title: 'Location Detected', desc: 'The system auto-detects your GPS coordinates and shares your live position with the operations centre.' },
  { num: '3', title: 'Team Dispatched', desc: 'A unique case ID is generated, an SMS alert is sent to you, and the HHA operations team is immediately notified.' },
  { num: '4', title: 'ETA Confirmed', desc: 'The nearest available response team is assigned and their estimated arrival time is communicated to you.' },
  { num: '5', title: 'We Call You', desc: 'An HHA operations coordinator calls you within 60 seconds to confirm details and stay with you until help arrives.' },
]

const emergencyTypes = [
  'Cardiac Emergency', 'Road Traffic Accident', 'Stroke', 'Respiratory Distress',
  'Severe Allergic Reaction', 'Trauma / Injury', 'Obstetric Emergency', 'Seizure / Epilepsy',
  'Poisoning / Overdose', 'Unconscious Patient',
]

const planAccess = [
  { plan: 'Free', access: 'Pay-per-use', highlight: false },
  { plan: 'Basic', access: '✓ Included', highlight: false },
  { plan: 'Mid-Level', access: '✓ Included', highlight: true },
  { plan: 'Gold', access: 'Priority', highlight: false },
  { plan: 'Corporate', access: 'Priority', highlight: false },
]

const heroCards = [
  { rotate: -20, translateY: -24, scale: 0.80, zIndex: 1, offsetX: -16, bg: '#fff', w: 155, inner: (<div style={{ padding: 14 }}><div style={{ fontSize: 9, fontWeight: 700, color: '#0E8567', marginBottom: 8 }}>STEP 1</div><div style={{ fontSize: 12, fontWeight: 700, color: '#07251C', marginBottom: 6 }}>One Tap</div><div style={{ fontSize: 22, textAlign: 'center', marginTop: 4 }}>📱</div></div>) },
  { rotate: -10, translateY: -12, scale: 0.88, zIndex: 2, offsetX: -8, bg: '#fff', w: 170, inner: (<div style={{ padding: 14 }}><div style={{ fontSize: 9, fontWeight: 700, color: '#0E8567', marginBottom: 8 }}>STEP 2</div><div style={{ fontSize: 12, fontWeight: 700, color: '#07251C', marginBottom: 6 }}>Location Sent</div><div style={{ fontSize: 22, textAlign: 'center', marginTop: 4 }}>📍</div></div>) },
  { rotate: 0, translateY: 0, scale: 1, zIndex: 5, offsetX: 0, bg: '#07251C', w: 190, inner: (<div style={{ padding: 16 }}><div style={{ display: 'inline-block', fontSize: 9, fontWeight: 700, color: '#FF5C5C', background: 'rgba(255,92,92,0.15)', padding: '3px 10px', borderRadius: 100, marginBottom: 10 }}>DISPATCHED</div><div style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 4 }}>Case DC-2026-4419</div><div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>HHA team alerted</div></div>) },
  { rotate: 10, translateY: -12, scale: 0.88, zIndex: 2, offsetX: 8, bg: '#fff', w: 170, inner: (<div style={{ padding: 14 }}><div style={{ fontSize: 9, fontWeight: 700, color: '#0E8567', marginBottom: 8 }}>STEP 4</div><div style={{ fontSize: 12, fontWeight: 700, color: '#07251C', marginBottom: 6 }}>Team Alpha</div><div style={{ fontSize: 11, color: '#41584E' }}>ETA: 4 min</div></div>) },
  { rotate: 20, translateY: -24, scale: 0.80, zIndex: 1, offsetX: 16, bg: '#fff', w: 155, inner: (<div style={{ padding: 14 }}><div style={{ fontSize: 9, fontWeight: 700, color: '#0E8567', marginBottom: 8 }}>STEP 5</div><div style={{ fontSize: 12, fontWeight: 700, color: '#07251C', marginBottom: 6 }}>We Call You</div><div style={{ width: 24, height: 24, borderRadius: '50%', background: '#34E0A0', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 4 }}><svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M5 12l4 4L19 7" stroke="#07251C" strokeWidth="2.5" strokeLinecap="round" /></svg></div></div>) },
]

export default function DispatchCarePage() {
  return (
    <div style={{ width: '100%', overflowX: 'hidden', background: '#F1F4EF' }}>
      <Navbar />

      <div style={{ margin: '16px 16px 24px', borderRadius: 28, overflow: 'hidden' }}>
        <section style={{ position: 'relative', background: '#041E14', overflow: 'hidden', minHeight: '88vh', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Image src="https://images.unsplash.com/photo-1589740896598-12c41b6de1f6?w=1920&h=1080&fit=crop&q=85" alt="Emergency medical dispatch" fill priority style={{ objectFit: 'cover', objectPosition: 'center' }} sizes="100vw" />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(160deg, rgba(10,20,15,0.85) 0%, rgba(7,37,28,0.70) 50%, rgba(10,15,12,0.88) 100%)', pointerEvents: 'none' }} />

          <div style={{ position: 'relative', maxWidth: 760, width: '100%', margin: '0 auto', padding: '120px 32px 0', textAlign: 'center', zIndex: 1 }}>
            <h1 style={{ margin: '0 0 18px', lineHeight: 1.06, fontFamily: 'var(--font-space-grotesk), sans-serif' }}>
              <span style={{ display: 'block', fontWeight: 700, fontSize: 'clamp(32px, 5.5vw, 58px)', color: '#fff', letterSpacing: '-0.03em', lineHeight: 1.06 }}>Emergency Help.</span>
              <span style={{ display: 'block', fontFamily: 'var(--font-playfair-display), serif', fontStyle: 'italic', fontWeight: 700, fontSize: 'clamp(32px, 5.5vw, 58px)', color: '#FF5C5C', letterSpacing: '-0.02em', lineHeight: 1.06 }}>One Tap.</span>
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.78)', fontSize: 16, lineHeight: 1.65, maxWidth: 520, margin: '0 auto 32px' }}>
              DispatchCare™ sends your location, generates a case ID, and alerts the HHA operations team in seconds.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
              <a href="/plans" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(8px)', border: '1.5px solid rgba(255,255,255,0.55)', color: '#fff', textDecoration: 'none', fontWeight: 700, fontSize: 13, letterSpacing: '0.07em', textTransform: 'uppercase', padding: '13px 26px', borderRadius: 100 }}>
                View Plans
              </a>
              <a href="https://portal.myvaultplus.com/register" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: '#FF5C5C', color: '#fff', textDecoration: 'none', fontWeight: 700, fontSize: 13, letterSpacing: '0.07em', textTransform: 'uppercase', padding: '12px 12px 12px 24px', borderRadius: 100 }}>
                Activate DispatchCare™
                <span style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M5 19L19 5M19 5H9M19 5v10" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </span>
              </a>
            </div>
          </div>

          <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 1100, margin: '52px auto 0', perspective: '1000px', height: 210, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
            {heroCards.map((card, i) => (
              <div key={i} style={{ position: 'absolute', bottom: 0, left: '50%', transform: `translateX(calc(-50% + ${(i - 2) * 175 + card.offsetX}px)) translateY(${card.translateY}px) rotate(${card.rotate}deg) scale(${card.scale})`, transformOrigin: 'bottom center', zIndex: card.zIndex, boxShadow: '0 16px 48px rgba(0,0,0,0.14)', borderRadius: 16, overflow: 'hidden', background: card.bg, width: card.w }}>
                {card.inner}
              </div>
            ))}
          </div>

          <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', padding: '28px 32px 52px' }}>
            <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13.5, margin: 0 }}>
              Available on all plans · 24/7 operations · Lagos coverage expanding nationwide
            </p>
          </div>
        </section>
      </div>

      {/* Section 1 — How it works */}
      <div style={{ margin: '0 24px 24px', borderRadius: 28, overflow: 'hidden', background: '#EBEBEB' }}>
        <section style={{ maxWidth: 1280, margin: '0 auto', padding: '88px 56px' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#0E8567', marginBottom: 18 }}>— Process</div>
            <h2 style={{ fontFamily: 'var(--font-space-grotesk), sans-serif', fontWeight: 600, fontSize: 'clamp(28px, 3.5vw, 40px)', lineHeight: 1.1, letterSpacing: '-0.02em', margin: '0 auto 16px', maxWidth: 640 }}>
              From tap to{' '}
              <em style={{ fontFamily: 'var(--font-playfair-display), serif', fontStyle: 'italic', fontWeight: 700 }}>team in seconds.</em>
            </h2>
          </div>
          <div style={{ background: '#DEDEDE', borderRadius: 28, padding: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
              {steps.map((step) => (
                <div key={step.num} style={{ padding: '32px 24px 28px', background: '#fff', borderRadius: 18 }}>
                  <div style={{ fontFamily: 'var(--font-space-grotesk), sans-serif', fontSize: 32, fontWeight: 700, color: '#34E0A0', letterSpacing: '-0.02em', marginBottom: 14 }}>{step.num}</div>
                  <h3 style={{ fontFamily: 'var(--font-space-grotesk), sans-serif', fontWeight: 600, fontSize: 17, color: '#07251C', margin: '0 0 8px', letterSpacing: '-0.01em' }}>{step.title}</h3>
                  <p style={{ color: '#5A7068', fontSize: 13.5, lineHeight: 1.6, margin: 0 }}>{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* Section 2 — Emergency types + contact */}
      <div style={{ margin: '0 24px 24px', borderRadius: 28, overflow: 'hidden', background: '#fff' }}>
        <section style={{ maxWidth: 1280, margin: '0 auto', padding: '88px 56px' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#0E8567', marginBottom: 18 }}>— Coverage</div>
            <h2 style={{ fontFamily: 'var(--font-space-grotesk), sans-serif', fontWeight: 600, fontSize: 'clamp(28px, 3.5vw, 40px)', lineHeight: 1.1, letterSpacing: '-0.02em', margin: '0 auto 16px', maxWidth: 640 }}>
              What DispatchCare™{' '}
              <em style={{ fontFamily: 'var(--font-playfair-display), serif', fontStyle: 'italic', fontWeight: 700 }}>covers.</em>
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ background: '#fff', border: '1.5px solid #D4D4D4', borderRadius: 22, padding: 36 }}>
              <h3 style={{ fontFamily: 'var(--font-space-grotesk), sans-serif', fontWeight: 600, fontSize: 20, color: '#07251C', margin: '0 0 20px' }}>Emergency Types Covered</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {emergencyTypes.map((type) => (
                  <span key={type} style={{ fontSize: 13, fontWeight: 500, padding: '6px 14px', borderRadius: 100, background: '#F1F4EF', color: '#07251C', border: '1px solid rgba(7,37,28,0.09)' }}>{type}</span>
                ))}
              </div>
            </div>
            <div style={{ background: '#07251C', borderRadius: 22, padding: 36 }}>
              <h3 style={{ fontFamily: 'var(--font-space-grotesk), sans-serif', fontWeight: 600, fontSize: 20, color: '#fff', margin: '0 0 20px' }}>Emergency Contacts</h3>
              <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 14, lineHeight: 1.65, margin: '0 0 24px' }}>For immediate life-threatening emergencies, use the DispatchCare™ button in your Vault, or contact us directly:</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <a href="tel:+2341234567890" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#FF5C5C', color: '#fff', textDecoration: 'none', fontWeight: 700, fontSize: 14, padding: '14px 24px', borderRadius: 100 }}>
                  🚑 Call Emergency Line
                </a>
                <a href="https://wa.me/2341234567890" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#34E0A0', color: '#07251C', textDecoration: 'none', fontWeight: 700, fontSize: 14, padding: '14px 24px', borderRadius: 100 }}>
                  💬 WhatsApp Operations
                </a>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Section 3 — Plan access table */}
      <div style={{ margin: '0 24px 24px', borderRadius: 28, overflow: 'hidden', background: '#F7FAF7' }}>
        <section style={{ maxWidth: 900, margin: '0 auto', padding: '88px 56px' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#0E8567', marginBottom: 18 }}>— Access</div>
            <h2 style={{ fontFamily: 'var(--font-space-grotesk), sans-serif', fontWeight: 600, fontSize: 'clamp(28px, 3.5vw, 40px)', lineHeight: 1.1, letterSpacing: '-0.02em', margin: '0 auto 16px', maxWidth: 640 }}>
              Available across{' '}
              <em style={{ fontFamily: 'var(--font-playfair-display), serif', fontStyle: 'italic', fontWeight: 700 }}>all plans.</em>
            </h2>
          </div>
          <div style={{ background: '#DEDEDE', borderRadius: 28, padding: 16 }}>
            <div style={{ background: '#fff', borderRadius: 18, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#07251C' }}>
                    <th style={{ padding: '14px 20px', textAlign: 'left', fontFamily: 'var(--font-space-grotesk), sans-serif', fontWeight: 600, fontSize: 13, color: '#34E0A0' }}>Plan</th>
                    <th style={{ padding: '14px 20px', textAlign: 'center', fontFamily: 'var(--font-space-grotesk), sans-serif', fontWeight: 600, fontSize: 13, color: '#fff' }}>DispatchCare™ Access</th>
                  </tr>
                </thead>
                <tbody>
                  {planAccess.map((row, idx) => (
                    <tr key={row.plan} style={{ background: row.highlight ? '#F0FDF4' : idx % 2 === 0 ? '#fff' : '#F7FAF7', borderBottom: '1px solid rgba(7,37,28,0.06)' }}>
                      <td style={{ padding: '14px 20px', fontFamily: 'var(--font-space-grotesk), sans-serif', fontWeight: 600, fontSize: 15, color: '#07251C' }}>{row.plan}</td>
                      <td style={{ padding: '14px 20px', textAlign: 'center', fontSize: 14, color: row.access.includes('✓') ? '#0E8567' : '#27433A', fontWeight: row.access.includes('✓') ? 700 : 500 }}>{row.access}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>

      <FinalCTA />
      <Footer />
    </div>
  )
}
