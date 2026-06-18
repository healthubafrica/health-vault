import Image from 'next/image'
import Navbar from '@/components/Navbar'
import FinalCTA from '@/components/FinalCTA'
import Footer from '@/components/Footer'
import HeroMarquee from '@/components/HeroMarquee'
import { Ambulance, MessageCircle } from 'lucide-react'

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


export default function DispatchCarePage() {
  return (
    <div style={{ width: '100%', overflowX: 'hidden', background: '#F1F4EF' }}>
      <Navbar />

      <div style={{ margin: '16px 16px 24px', borderRadius: 28, overflow: 'hidden' }}>
        <section style={{ position: 'relative', background: '#041E14', overflow: 'hidden', minHeight: '88vh', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Image src="https://images.unsplash.com/photo-1587745416684-47953f16f02f?w=1920&h=1080&fit=crop&q=85" alt="Emergency medical dispatch" fill priority style={{ objectFit: 'cover', objectPosition: 'center' }} sizes="100vw" />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(160deg, rgba(10,20,15,0.85) 0%, rgba(7,37,28,0.70) 50%, rgba(10,15,12,0.88) 100%)', pointerEvents: 'none' }} />

          <div style={{ position: 'relative', maxWidth: 760, width: '100%', margin: '0 auto', padding: '120px 32px 0', textAlign: 'center', zIndex: 1 }}>
            <h1 style={{ margin: '0 0 18px', lineHeight: 1.06, fontFamily: 'var(--font-manrope), sans-serif' }}>
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
          <HeroMarquee marginTop={80} />
        </section>
      </div>

      {/* Section 1 — How it works */}
      <div style={{ margin: '0 24px 24px', borderRadius: 28, overflow: 'hidden', background: '#EBEBEB' }}>
        <section style={{ maxWidth: 1280, margin: '0 auto', padding: '88px 56px' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#137333', marginBottom: 18 }}>— Process</div>
            <h2 style={{ fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 600, fontSize: 'clamp(28px, 3.5vw, 40px)', lineHeight: 1.1, letterSpacing: '-0.02em', margin: '0 auto 16px', maxWidth: 640 }}>
              From tap to{' '}
              <em style={{ fontFamily: 'var(--font-playfair-display), serif', fontStyle: 'italic', fontWeight: 700 }}>team in seconds.</em>
            </h2>
          </div>
          <div style={{ background: '#DEDEDE', borderRadius: 28, padding: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
              {steps.map((step) => (
                <div key={step.num} style={{ padding: '32px 24px 28px', background: '#fff', borderRadius: 18 }}>
                  <div style={{ fontFamily: 'var(--font-manrope), sans-serif', fontSize: 32, fontWeight: 700, color: '#6DC43F', letterSpacing: '-0.02em', marginBottom: 14 }}>{step.num}</div>
                  <h3 style={{ fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 600, fontSize: 17, color: '#07251C', margin: '0 0 8px', letterSpacing: '-0.01em' }}>{step.title}</h3>
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
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#137333', marginBottom: 18 }}>— Coverage</div>
            <h2 style={{ fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 600, fontSize: 'clamp(28px, 3.5vw, 40px)', lineHeight: 1.1, letterSpacing: '-0.02em', margin: '0 auto 16px', maxWidth: 640 }}>
              What DispatchCare™{' '}
              <em style={{ fontFamily: 'var(--font-playfair-display), serif', fontStyle: 'italic', fontWeight: 700 }}>covers.</em>
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ background: '#fff', border: '1.5px solid #D4D4D4', borderRadius: 22, padding: 36 }}>
              <h3 style={{ fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 600, fontSize: 20, color: '#07251C', margin: '0 0 20px' }}>Emergency Types Covered</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {emergencyTypes.map((type) => (
                  <span key={type} style={{ fontSize: 13, fontWeight: 500, padding: '6px 14px', borderRadius: 100, background: '#F1F4EF', color: '#07251C', border: '1px solid rgba(7,37,28,0.09)' }}>{type}</span>
                ))}
              </div>
            </div>
            <div style={{ background: '#07251C', borderRadius: 22, padding: 36 }}>
              <h3 style={{ fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 600, fontSize: 20, color: '#fff', margin: '0 0 20px' }}>Emergency Contacts</h3>
              <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 14, lineHeight: 1.65, margin: '0 0 24px' }}>For immediate life-threatening emergencies, use the DispatchCare™ button in your Vault, or contact us directly:</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <a href="tel:+2341234567890" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#FF5C5C', color: '#fff', textDecoration: 'none', fontWeight: 700, fontSize: 14, padding: '14px 24px', borderRadius: 100 }}>
                  <Ambulance size={18} strokeWidth={2} color="#fff" /> Call Emergency Line
                </a>
                <a href="https://wa.me/2341234567890" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#6DC43F', color: '#07251C', textDecoration: 'none', fontWeight: 700, fontSize: 14, padding: '14px 24px', borderRadius: 100 }}>
                  <MessageCircle size={18} strokeWidth={2} color="#07251C" /> WhatsApp Operations
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
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#137333', marginBottom: 18 }}>— Access</div>
            <h2 style={{ fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 600, fontSize: 'clamp(28px, 3.5vw, 40px)', lineHeight: 1.1, letterSpacing: '-0.02em', margin: '0 auto 16px', maxWidth: 640 }}>
              Available across{' '}
              <em style={{ fontFamily: 'var(--font-playfair-display), serif', fontStyle: 'italic', fontWeight: 700 }}>all plans.</em>
            </h2>
          </div>
          <div style={{ background: '#DEDEDE', borderRadius: 28, padding: 16 }}>
            <div style={{ background: '#fff', borderRadius: 18, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#07251C' }}>
                    <th style={{ padding: '14px 20px', textAlign: 'left', fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 600, fontSize: 13, color: '#6DC43F' }}>Plan</th>
                    <th style={{ padding: '14px 20px', textAlign: 'center', fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 600, fontSize: 13, color: '#fff' }}>DispatchCare™ Access</th>
                  </tr>
                </thead>
                <tbody>
                  {planAccess.map((row, idx) => (
                    <tr key={row.plan} style={{ background: row.highlight ? '#F0FDF4' : idx % 2 === 0 ? '#fff' : '#F7FAF7', borderBottom: '1px solid rgba(7,37,28,0.06)' }}>
                      <td style={{ padding: '14px 20px', fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 600, fontSize: 15, color: '#07251C' }}>{row.plan}</td>
                      <td style={{ padding: '14px 20px', textAlign: 'center', fontSize: 14, color: row.access.includes('✓') ? '#137333' : '#27433A', fontWeight: row.access.includes('✓') ? 700 : 500 }}>{row.access}</td>
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
