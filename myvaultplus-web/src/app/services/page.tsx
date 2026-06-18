import Image from 'next/image'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import FinalCTA from '@/components/FinalCTA'
import Footer from '@/components/Footer'
import HeroMarquee from '@/components/HeroMarquee'

const smallServices = [
  { name: 'MinuteCare™', desc: 'Fast-track walk-in clinic scheduling. Skip the queue and arrive at the right time.', href: '/services/minutecare' },
  { name: 'CareTest™', desc: 'Schedule diagnostic tests and lab work. Results linked directly to your Vault.', href: '/services/caretest' },
  { name: 'HealthConsult™', desc: 'Personalised preventive care programmes and care plan consultations.', href: '/services/healthconsult' },
]


export default function ServicesPage() {
  return (
    <div style={{ width: '100%', overflowX: 'hidden', background: '#F1F4EF' }}>
      <Navbar />

      <div style={{ margin: '16px 16px 24px', borderRadius: 28, overflow: 'hidden' }}>
        <section style={{ position: 'relative', background: '#041E14', overflow: 'hidden', minHeight: '88vh', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Image src="https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=1920&h=1080&fit=crop&q=85" alt="Healthcare services" fill priority style={{ objectFit: 'cover', objectPosition: 'center' }} sizes="100vw" />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(160deg, rgba(4,30,20,0.78) 0%, rgba(7,37,28,0.65) 50%, rgba(4,18,12,0.82) 100%)', pointerEvents: 'none' }} />

          <div style={{ position: 'relative', maxWidth: 760, width: '100%', margin: '0 auto', padding: '120px 32px 0', textAlign: 'center', zIndex: 1 }}>
            <h1 style={{ margin: '0 0 18px', lineHeight: 1.06, fontFamily: 'var(--font-manrope), sans-serif' }}>
              <span style={{ display: 'block', fontWeight: 700, fontSize: 'clamp(32px, 5.5vw, 58px)', color: '#fff', letterSpacing: '-0.03em', lineHeight: 1.06 }}>Everything Your Health Needs.</span>
              <span style={{ display: 'block', fontFamily: 'var(--font-playfair-display), serif', fontStyle: 'italic', fontWeight: 700, fontSize: 'clamp(32px, 5.5vw, 58px)', color: '#34E0A0', letterSpacing: '-0.02em', lineHeight: 1.06 }}>One Platform.</span>
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.78)', fontSize: 16, lineHeight: 1.65, maxWidth: 520, margin: '0 auto 32px' }}>
              Seven interconnected services, from routine consultations to emergency dispatch and specialist second opinions.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
              <a href="/plans" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(8px)', border: '1.5px solid rgba(255,255,255,0.55)', color: '#fff', textDecoration: 'none', fontWeight: 700, fontSize: 13, letterSpacing: '0.07em', textTransform: 'uppercase', padding: '13px 26px', borderRadius: 100 }}>
                View Plans
              </a>
              <a href="https://portal.myvaultplus.com/register" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: '#34E0A0', color: '#07251C', textDecoration: 'none', fontWeight: 700, fontSize: 13, letterSpacing: '0.07em', textTransform: 'uppercase', padding: '12px 12px 12px 24px', borderRadius: 100 }}>
                Get Started
                <span style={{ width: 30, height: 30, borderRadius: '50%', background: '#07251C', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M5 19L19 5M19 5H9M19 5v10" stroke="#34E0A0" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </span>
              </a>
            </div>
          </div>
          <HeroMarquee marginTop={80} />
        </section>
      </div>

      {/* Section 1 — Services grid */}
      <div style={{ margin: '0 24px 24px', borderRadius: 28, overflow: 'hidden', background: '#F7FAF7' }}>
        <section style={{ maxWidth: 1280, margin: '0 auto', padding: '88px 56px' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#0E8567', marginBottom: 18 }}>— Services</div>
            <h2 style={{ fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 600, fontSize: 'clamp(28px, 3.5vw, 40px)', lineHeight: 1.1, letterSpacing: '-0.02em', margin: '0 auto 16px', maxWidth: 640 }}>
              Comprehensive care and{' '}
              <em style={{ fontFamily: 'var(--font-playfair-display), serif', fontStyle: 'italic', fontWeight: 700 }}>intelligent access.</em>
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr 1fr', gap: 16 }}>
            {/* Dark inset-photo card — TeleCare */}
            <div style={{ background: '#07251C', borderRadius: 22, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: 16, gap: 16 }}>
              <div style={{ position: 'relative', height: 260, borderRadius: 12, overflow: 'hidden', flexShrink: 0 }}>
                <Image src="https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=800&h=600&fit=crop&crop=faces&q=80" alt="TeleCare consultation" fill style={{ objectFit: 'cover', objectPosition: 'center top' }} sizes="500px" />
              </div>
              <div style={{ padding: '8px 8px 12px' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', background: 'rgba(52,224,160,0.18)', color: '#34E0A0', fontSize: 11, fontWeight: 700, padding: '5px 12px', borderRadius: 100, letterSpacing: '0.04em', marginBottom: 10 }}>TeleCare™</span>
                <h3 style={{ fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 600, fontSize: 18, color: '#fff', margin: '0 0 6px' }}>Remote Healthcare, Delivered to You</h3>
                <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13.5, lineHeight: 1.55, margin: 0 }}>Consult with qualified providers via video, from anywhere in Nigeria.</p>
              </div>
            </div>

            {/* Expert Review */}
            <div style={{ background: '#fff', border: '1px solid rgba(7,37,28,0.09)', borderRadius: 22, padding: 28, display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div>
                <span style={{ width: 44, height: 44, borderRadius: 12, background: '#EAF7F1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="21" height="21" viewBox="0 0 24 24" fill="none"><path d="M9 11l2 2 4-4" stroke="#0E8567" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" stroke="#0E8567" strokeWidth="2" strokeLinejoin="round" /></svg>
                </span>
                <h3 style={{ fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 600, fontSize: 19, margin: '14px 0 7px' }}>Expert Review™</h3>
                <p style={{ color: '#41584E', fontSize: 14, lineHeight: 1.6, margin: 0 }}>Get a specialist second opinion on any diagnosis, treatment plan, or lab result.</p>
              </div>
              <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ height: 1, background: 'rgba(7,37,28,0.08)' }} />
                {['18+ specialist fields', 'Full document upload', 'PDF report to your Vault'].map((b) => (
                  <div key={b} style={{ display: 'flex', gap: 8, fontSize: 13, color: '#27433A' }}><span style={{ color: '#0E8567', fontWeight: 700 }}>✓</span>{b}</div>
                ))}
                <Link href="/expert-review" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#0E8567', fontWeight: 600, fontSize: 13.5, textDecoration: 'none', marginTop: 4 }}>
                  Learn more →
                </Link>
              </div>
            </div>

            {/* DispatchCare */}
            <div style={{ background: '#fff', border: '1px solid rgba(7,37,28,0.09)', borderRadius: 22, padding: 28, display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div>
                <span style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,92,92,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="21" height="21" viewBox="0 0 24 24" fill="none"><path d="M5 17h14l-1.5-5A4 4 0 0013.7 9h-3.4A4 4 0 006.5 12L5 17z" stroke="#FF5C5C" strokeWidth="2" strokeLinejoin="round" /><circle cx="8" cy="18" r="1.5" stroke="#FF5C5C" strokeWidth="2" /><circle cx="16" cy="18" r="1.5" stroke="#FF5C5C" strokeWidth="2" /></svg>
                </span>
                <h3 style={{ fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 600, fontSize: 19, margin: '14px 0 7px' }}>DispatchCare™</h3>
                <p style={{ color: '#41584E', fontSize: 14, lineHeight: 1.6, margin: 0 }}>24/7 emergency medical dispatch. One tap sends your location to the HHA operations team.</p>
              </div>
              <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ height: 1, background: 'rgba(7,37,28,0.08)' }} />
                {['Auto-detects your location', 'Instant case ID + SMS alert', 'Available on all plans'].map((b) => (
                  <div key={b} style={{ display: 'flex', gap: 8, fontSize: 13, color: '#27433A' }}><span style={{ color: '#0E8567', fontWeight: 700 }}>✓</span>{b}</div>
                ))}
                <Link href="/dispatchcare" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#0E8567', fontWeight: 600, fontSize: 13.5, textDecoration: 'none', marginTop: 4 }}>
                  Learn more →
                </Link>
              </div>
            </div>
          </div>

          {/* Row 2 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginTop: 16 }}>
            {smallServices.map((svc) => (
              <div key={svc.name} style={{ background: '#fff', border: '1px solid rgba(7,37,28,0.09)', borderRadius: 20, padding: '24px 26px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 600, fontSize: 17, color: '#07251C' }}>{svc.name}</div>
                <p style={{ color: '#41584E', fontSize: 14, lineHeight: 1.6, margin: 0, flex: 1 }}>{svc.desc}</p>
                <Link href={svc.href} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#0E8567', fontWeight: 600, fontSize: 13.5, textDecoration: 'none' }}>Learn more →</Link>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Section 2 — Dark band */}
      <div style={{ margin: '0 24px 24px', borderRadius: 28, overflow: 'hidden', background: '#07251C' }}>
        <section style={{ maxWidth: 1280, margin: '0 auto', padding: '88px 56px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ background: '#0C3328', borderRadius: 22, padding: 36 }}>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#34E0A0', marginBottom: 16 }}>Expert Review™</div>
              <h3 style={{ fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 600, fontSize: 24, color: '#fff', margin: '0 0 14px', lineHeight: 1.2 }}>Second opinions that change outcomes</h3>
              <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 14, lineHeight: 1.65, margin: '0 0 20px' }}>Our clinical panels cover 18+ specialist fields. Upload your case documents and receive a comprehensive report within 5–10 business days, delivered to your Vault.</p>
              <Link href="/expert-review" style={{ color: '#34E0A0', fontWeight: 600, fontSize: 14, textDecoration: 'none' }}>Learn about Expert Review™ →</Link>
            </div>
            <div style={{ background: '#1A0C0C', borderRadius: 22, padding: 36 }}>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#FF5C5C', marginBottom: 16 }}>DispatchCare™</div>
              <h3 style={{ fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 600, fontSize: 24, color: '#fff', margin: '0 0 14px', lineHeight: 1.2 }}>Emergency response in seconds</h3>
              <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 14, lineHeight: 1.65, margin: '0 0 20px' }}>One tap sends your GPS location, generates a case ID, and alerts the HHA operations centre. Available on all plans, 24 hours a day, 7 days a week.</p>
              <Link href="/dispatchcare" style={{ color: '#FF5C5C', fontWeight: 600, fontSize: 14, textDecoration: 'none' }}>Learn about DispatchCare™ →</Link>
            </div>
          </div>
        </section>
      </div>

      {/* Section 3 — NeuroFlex */}
      <div style={{ margin: '0 24px 24px', borderRadius: 28, overflow: 'hidden', background: '#fff' }}>
        <section style={{ maxWidth: 1280, margin: '0 auto', padding: '88px 56px' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#0E8567', marginBottom: 18 }}>— NeuroFlex™</div>
            <h2 style={{ fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 600, fontSize: 'clamp(28px, 3.5vw, 40px)', lineHeight: 1.1, letterSpacing: '-0.02em', margin: '0 auto 16px', maxWidth: 640 }}>
              Specialist neurology,{' '}
              <em style={{ fontFamily: 'var(--font-playfair-display), serif', fontStyle: 'italic', fontWeight: 700 }}>within reach.</em>
            </h2>
          </div>
          <div style={{ background: '#fff', border: '1.5px solid #D4D4D4', borderRadius: 22, overflow: 'hidden', display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
            <div style={{ padding: '40px 40px 36px' }}>
              <h3 style={{ fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 600, fontSize: 22, color: '#07251C', margin: '0 0 16px' }}>Neurological care made accessible</h3>
              <p style={{ color: '#41584E', fontSize: 15, lineHeight: 1.7, margin: '0 0 20px' }}>NeuroFlex™ connects patients with qualified neurologists for consultations, second opinions, and follow-up care, all through the MyHealth Vault+™ platform.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {['Qualified neurologists and specialists', 'Consultation and follow-up care', 'Integrated with your health records', 'Expert Review™ integration available'].map((b) => (
                  <div key={b} style={{ display: 'flex', gap: 8, fontSize: 14, color: '#27433A' }}><span style={{ color: '#0E8567', fontWeight: 700 }}>✓</span>{b}</div>
                ))}
              </div>
            </div>
            <div style={{ position: 'relative', minHeight: 300 }}>
              <Image src="https://images.unsplash.com/photo-1576671081837-49000212a370?w=800&h=600&fit=crop&q=80" alt="Neurology specialist" fill style={{ objectFit: 'cover' }} sizes="500px" />
            </div>
          </div>
        </section>
      </div>

      <FinalCTA />
      <Footer />
    </div>
  )
}
