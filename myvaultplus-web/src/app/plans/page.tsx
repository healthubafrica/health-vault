import Link from 'next/link'
import Image from 'next/image'
import Navbar from '@/components/Navbar'
import FinalCTA from '@/components/FinalCTA'
import Footer from '@/components/Footer'
import HeroMarquee from '@/components/HeroMarquee'

const plans = [
  {
    iconBg: '#34E0A0', iconColor: '#07251C',
    badge: 'STARTER PLAN', price: '₦0', priceSub: '/month',
    desc: 'Your Health Vault at no cost. Core portal access with pay-per-use services.',
    highlight: false, ctaHref: 'https://portal.myvaultplus.com/register',
    items: ['Patient portal access', 'Unique Patient ID (HHA-XXXXXXXX)', 'Limited health record viewing', 'TeleCare™ & Expert Review™ pay-per-use'],
  },
  {
    iconBg: '#07251C', iconColor: '#34E0A0',
    badge: 'GROWTH PLAN', price: '₦4,900', priceSub: '/month',
    desc: 'More care, more coverage: HealthConsult™ included plus 1 Expert Review/year.',
    highlight: true, ctaHref: 'https://portal.myvaultplus.com/register',
    items: ['Everything in Starter', 'Expanded TeleCare™ sessions', 'HealthConsult™ plan included', '1 Expert Review™/year + discounts'],
  },
  {
    iconBg: '#34E0A0', iconColor: '#07251C',
    badge: 'ENTERPRISE PLAN', price: '₦9,900', priceSub: '/month',
    desc: 'Complete Health Platform: priority everything, 2–4 Expert Reviews/year.',
    highlight: false, ctaHref: 'https://portal.myvaultplus.com/register',
    items: ['Everything in Growth', 'Priority TeleCare™ & DispatchCare™', '2–4 Expert Reviews™/year', 'NeuroFlex™ add-on available'],
  },
]

const compareRows = [
  { service: 'TeleCare™', free: 'Pay-per-use', basic: '✓', gold: '✓', corp: '✓' },
  { service: 'Expert Review™', free: 'Pay-per-use', basic: '1/year', gold: '2–4/year', corp: 'Custom' },
  { service: 'DispatchCare™', free: '✓', basic: '✓', gold: 'Priority', corp: 'Priority' },
  { service: 'HealthConsult™', free: '—', basic: '✓', gold: '✓', corp: '✓' },
  { service: 'NeuroFlex™', free: '—', basic: 'Add-on', gold: 'Add-on', corp: '✓' },
  { service: 'MinuteCare™', free: 'Pay-per-use', basic: '✓', gold: '✓', corp: '✓' },
  { service: 'CareTest™', free: 'Pay-per-use', basic: '✓', gold: '✓', corp: '✓' },
]

export default function PlansPage() {
  return (
    <div style={{ width: '100%', overflowX: 'hidden', background: '#F1F4EF' }}>
      <Navbar />

      <div style={{ margin: '16px 16px 24px', borderRadius: 28, overflow: 'hidden' }}>
        <section style={{ position: 'relative', background: '#041E14', overflow: 'hidden', minHeight: '88vh', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Image src="https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=1920&h=1080&fit=crop&q=85" alt="Healthcare plans" fill priority style={{ objectFit: 'cover', objectPosition: 'center' }} sizes="100vw" />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(160deg, rgba(4,30,20,0.78) 0%, rgba(7,37,28,0.65) 50%, rgba(4,18,12,0.82) 100%)', pointerEvents: 'none' }} />

          <div style={{ position: 'relative', maxWidth: 760, width: '100%', margin: '0 auto', padding: '120px 32px 0', textAlign: 'center', zIndex: 1 }}>
            <h1 style={{ margin: '0 0 18px', lineHeight: 1.06, fontFamily: 'var(--font-space-grotesk), sans-serif' }}>
              <span style={{ display: 'block', fontWeight: 700, fontSize: 'clamp(32px, 5.5vw, 58px)', color: '#fff', letterSpacing: '-0.03em', lineHeight: 1.06 }}>Start Free.</span>
              <span style={{ display: 'block', fontFamily: 'var(--font-playfair-display), serif', fontStyle: 'italic', fontWeight: 700, fontSize: 'clamp(32px, 5.5vw, 58px)', color: '#34E0A0', letterSpacing: '-0.02em', lineHeight: 1.06 }}>Access More When You Need It.</span>
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.78)', fontSize: 16, lineHeight: 1.65, maxWidth: 520, margin: '0 auto 32px' }}>
              Every patient gets a free MyHealth Vault+™ account. Upgrade when you&apos;re ready; no commitment required.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
              <a href="/corporate" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(8px)', border: '1.5px solid rgba(255,255,255,0.55)', color: '#fff', textDecoration: 'none', fontWeight: 700, fontSize: 13, letterSpacing: '0.07em', textTransform: 'uppercase', padding: '13px 26px', borderRadius: 100 }}>
                View Corporate Plans
              </a>
              <a href="https://portal.myvaultplus.com/register" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: '#34E0A0', color: '#07251C', textDecoration: 'none', fontWeight: 700, fontSize: 13, letterSpacing: '0.07em', textTransform: 'uppercase', padding: '12px 12px 12px 24px', borderRadius: 100 }}>
                Get Started Free
                <span style={{ width: 30, height: 30, borderRadius: '50%', background: '#07251C', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M5 19L19 5M19 5H9M19 5v10" stroke="#34E0A0" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </span>
              </a>
            </div>
          </div>
          <HeroMarquee marginTop={80} />
        </section>
      </div>

      {/* Section 1 — Pricing cards */}
      <div style={{ margin: '0 24px 24px', borderRadius: 28, overflow: 'hidden', background: '#fff' }}>
        <section style={{ maxWidth: 1280, margin: '0 auto', padding: '88px 56px' }}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#0E8567', marginBottom: 18 }}>— Pricing</div>
            <h2 style={{ fontFamily: 'var(--font-space-grotesk), sans-serif', fontWeight: 600, fontSize: 'clamp(28px, 3.5vw, 40px)', lineHeight: 1.1, letterSpacing: '-0.02em', margin: '0 auto 16px', maxWidth: 640 }}>
              Flexible plans built for{' '}
              <em style={{ fontFamily: 'var(--font-playfair-display), serif', fontStyle: 'italic', fontWeight: 700 }}>every stage.</em>
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, alignItems: 'stretch' }}>
            {plans.map((plan) => (
              <div key={plan.badge} style={{ background: plan.highlight ? '#34E0A0' : '#fff', border: plan.highlight ? 'none' : '1.5px solid #D4D4D4', borderRadius: 20, padding: 28, display: 'flex', flexDirection: 'column' }}>
                <div style={{ width: 40, height: 40, borderRadius: 11, background: plan.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20, flexShrink: 0 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" stroke={plan.iconColor} strokeWidth="2" strokeLinejoin="round" /></svg>
                </div>
                <div style={{ fontFamily: 'var(--font-space-grotesk), sans-serif', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: '#07251C', marginBottom: 10 }}>{plan.badge}</div>
                <p style={{ fontSize: 13.5, lineHeight: 1.55, color: plan.highlight ? '#0A4E3C' : '#5A7068', margin: '0 0 22px' }}>{plan.desc}</p>
                <div style={{ marginBottom: 26 }}>
                  <span style={{ fontFamily: 'var(--font-space-grotesk), sans-serif', fontWeight: 700, fontSize: 38, letterSpacing: '-0.03em', color: '#07251C' }}>{plan.price}</span>
                  <span style={{ fontSize: 15, fontWeight: 500, color: plan.highlight ? '#0A4E3C' : '#7A8C84', marginLeft: 5 }}>{plan.priceSub}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 11, flex: 1, marginBottom: 28 }}>
                  {plan.items.map((item) => (
                    <div key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13.5 }}>
                      <span style={{ width: 19, height: 19, borderRadius: '50%', background: '#07251C', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none"><path d="M5 12l4 4L19 7" stroke="#34E0A0" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      </span>
                      <span style={{ color: plan.highlight ? '#07251C' : '#27433A' }}>{item}</span>
                    </div>
                  ))}
                </div>
                <a href={plan.ctaHref} style={{ display: 'block', textAlign: 'center', background: '#07251C', color: plan.highlight ? '#34E0A0' : '#fff', textDecoration: 'none', fontWeight: 700, fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', padding: 14, borderRadius: 100 }}>
                  Get Started
                </a>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 20, background: '#F7FAF7', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 16, padding: '20px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
            <p style={{ margin: 0, color: '#27433A', fontSize: 15, maxWidth: 620 }}>Corporate and HMO plans available for employers, estates, schools, and government organisations.</p>
            <Link href="/corporate" style={{ color: '#0E8567', fontWeight: 600, fontSize: 14.5, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
              Enquire About Corporate Plans →
            </Link>
          </div>
        </section>
      </div>

      {/* Section 2 — Comparison */}
      <div style={{ margin: '0 24px 24px', borderRadius: 28, overflow: 'hidden', background: '#EBEBEB' }}>
        <section style={{ maxWidth: 1280, margin: '0 auto', padding: '88px 56px' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#0E8567', marginBottom: 18 }}>— Compare</div>
            <h2 style={{ fontFamily: 'var(--font-space-grotesk), sans-serif', fontWeight: 600, fontSize: 'clamp(28px, 3.5vw, 40px)', lineHeight: 1.1, letterSpacing: '-0.02em', margin: '0 auto 16px', maxWidth: 640 }}>
              Everything{' '}
              <em style={{ fontFamily: 'var(--font-playfair-display), serif', fontStyle: 'italic', fontWeight: 700 }}>included.</em>
            </h2>
          </div>
          <div style={{ background: '#DEDEDE', borderRadius: 28, padding: 16 }}>
            <div style={{ background: '#fff', borderRadius: 18, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#07251C' }}>
                    <th style={{ padding: '16px 20px', textAlign: 'left', fontFamily: 'var(--font-space-grotesk), sans-serif', fontWeight: 600, fontSize: 13, color: '#34E0A0', letterSpacing: '0.05em' }}>Service</th>
                    {['Free', 'Basic', 'Gold', 'Corporate'].map((h) => (
                      <th key={h} style={{ padding: '16px 20px', textAlign: 'center', fontFamily: 'var(--font-space-grotesk), sans-serif', fontWeight: 600, fontSize: 13, color: '#fff' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {compareRows.map((row, idx) => (
                    <tr key={row.service} style={{ background: idx % 2 === 0 ? '#fff' : '#F7FAF7', borderBottom: '1px solid rgba(7,37,28,0.06)' }}>
                      <td style={{ padding: '14px 20px', fontFamily: 'var(--font-space-grotesk), sans-serif', fontWeight: 600, fontSize: 14, color: '#07251C' }}>{row.service}</td>
                      {[row.free, row.basic, row.gold, row.corp].map((val, vi) => (
                        <td key={vi} style={{ padding: '14px 20px', textAlign: 'center', fontSize: 13.5, color: val === '✓' ? '#0E8567' : val === '—' ? '#C4CEC9' : '#27433A', fontWeight: val === '✓' ? 700 : 500 }}>{val}</td>
                      ))}
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
