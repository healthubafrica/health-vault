import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import Navbar from '@/components/Navbar'
import FinalCTA from '@/components/FinalCTA'
import Footer from '@/components/Footer'
import HeroMarquee from '@/components/HeroMarquee'
import PlanCards from '@/components/PlanCards'
import SavingsCalculator from '@/components/SavingsCalculator'
import PlanWizard from '@/components/PlanWizard'
import { COMPARE_ROWS, PAY_PER_USE, CORPORATE_TIERS, formatKobo } from '@/lib/planData'

export const metadata: Metadata = {
  title: 'Membership Plans — MyHealth Vault+™',
  description: 'Choose from FREE, BasicCare™, SilverCare™, GoldCare™, or ConciergeCare™. Founding member pricing available for the first 1,000 members.',
}

export default function PlansPage() {
  return (
    <div style={{ width: '100%', overflowX: 'hidden', background: '#F1F4EF' }}>
      <Navbar />

      {/* Hero */}
      <div className="page-card-first">
        <section style={{ position: 'relative', background: '#041E14', overflow: 'hidden', minHeight: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Image src="https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=1920&h=1080&fit=crop&q=85" alt="Healthcare plans" fill priority style={{ objectFit: 'cover', objectPosition: 'center' }} sizes="100vw" />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(160deg, rgba(4,30,20,0.82) 0%, rgba(7,37,28,0.70) 50%, rgba(4,18,12,0.88) 100%)', pointerEvents: 'none' }} />
          <div className="hero-content">
            {/* Founding member badge */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(109,196,63,0.15)', border: '1px solid rgba(109,196,63,0.5)', borderRadius: 100, padding: '6px 16px', marginBottom: 24 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#6DC43F', display: 'inline-block' }} />
              <span style={{ color: '#6DC43F', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em' }}>Founding Member Pricing — First 1,000 Members</span>
            </div>
            <h1 style={{ margin: '0 0 18px', lineHeight: 1.06, fontFamily: 'var(--font-manrope), sans-serif' }}>
              <span style={{ display: 'block', fontWeight: 700, fontSize: 'clamp(30px, 5vw, 56px)', color: '#fff', letterSpacing: '-0.03em' }}>Premium Healthcare Access.</span>
              <span style={{ display: 'block', fontFamily: 'var(--font-playfair-display), serif', fontStyle: 'italic', fontWeight: 700, fontSize: 'clamp(30px, 5vw, 56px)', color: '#6DC43F', letterSpacing: '-0.02em' }}>Built for Every Stage of Life.</span>
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 16, lineHeight: 1.65, maxWidth: 520, margin: '0 auto 32px' }}>
              Five plans — from a free Health Passport to concierge care management. Choose the coverage that fits your life.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
              <a href="/corporate" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', border: '1.5px solid rgba(255,255,255,0.5)', color: '#fff', textDecoration: 'none', fontWeight: 700, fontSize: 13, letterSpacing: '0.07em', textTransform: 'uppercase', padding: '13px 26px', borderRadius: 100 }}>
                Corporate Plans
              </a>
              <a href="https://portal.myvaultplus.com/register" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: '#6DC43F', color: '#07251C', textDecoration: 'none', fontWeight: 700, fontSize: 13, letterSpacing: '0.07em', textTransform: 'uppercase', padding: '12px 12px 12px 24px', borderRadius: 100 }}>
                Get Started Free
                <span style={{ width: 30, height: 30, borderRadius: '50%', background: '#07251C', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M5 19L19 5M19 5H9M19 5v10" stroke="#6DC43F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </span>
              </a>
            </div>
          </div>
          <HeroMarquee marginTop={60} />
        </section>
      </div>

      {/* Section 1 — Plan cards (interactive, client component) */}
      <div className="page-card" style={{ background: '#fff' }}>
        <section className="section-inner">
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#137333', marginBottom: 14 }}>— Pricing</div>
            <h2 style={{ fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 700, fontSize: 'clamp(26px, 3.5vw, 40px)', lineHeight: 1.08, letterSpacing: '-0.02em', margin: '0 auto 16px', maxWidth: 600 }}>
              Five plans. <em style={{ fontFamily: 'var(--font-playfair-display), serif', fontStyle: 'italic' }}>One platform.</em>
            </h2>
            <p style={{ color: '#5A7068', fontSize: 15, maxWidth: 480, margin: '0 auto', lineHeight: 1.65 }}>
              Start free and upgrade when you&apos;re ready. Annual plans include founding member pricing for the first 1,000 members.
            </p>
          </div>
          <PlanCards />
          <div style={{ marginTop: 20, background: '#F7FAF7', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 16, padding: '20px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
            <p style={{ margin: 0, color: '#27433A', fontSize: 15, maxWidth: 600 }}>Corporate and HMO plans available for employers, estates, schools, and government organisations.</p>
            <Link href="/corporate" style={{ color: '#137333', fontWeight: 600, fontSize: 14.5, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
              Enquire About Corporate Plans →
            </Link>
          </div>
        </section>
      </div>

      {/* Section 2 — Plan recommendation wizard */}
      <div className="page-card" style={{ background: '#EBEBEB' }}>
        <section className="section-inner">
          <PlanWizard />
        </section>
      </div>

      {/* Section 3 — Comparison table */}
      <div className="page-card" style={{ background: '#fff' }}>
        <section className="section-inner">
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#137333', marginBottom: 14 }}>— Compare</div>
            <h2 style={{ fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 700, fontSize: 'clamp(26px, 3.5vw, 40px)', lineHeight: 1.08, letterSpacing: '-0.02em', margin: '0 auto', maxWidth: 560 }}>
              Everything <em style={{ fontFamily: 'var(--font-playfair-display), serif', fontStyle: 'italic' }}>included.</em>
            </h2>
          </div>
          <div style={{ background: '#DEDEDE', borderRadius: 28, padding: 16, overflowX: 'auto' }}>
            <div style={{ background: '#fff', borderRadius: 18, overflow: 'hidden', minWidth: 700 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#07251C' }}>
                    <th style={{ padding: '16px 20px', textAlign: 'left', fontSize: 13, color: '#6DC43F', fontWeight: 600 }}>Service</th>
                    {['FREE', 'BasicCare™', 'SilverCare™', 'GoldCare™', 'ConciergeCare™'].map((h) => (
                      <th key={h} style={{ padding: '16px 14px', textAlign: 'center', fontSize: 12, color: '#fff', fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {COMPARE_ROWS.map((row, idx) => (
                    <tr key={row.service} style={{ background: idx % 2 === 0 ? '#fff' : '#F7FAF7', borderBottom: '1px solid rgba(7,37,28,0.06)' }}>
                      <td style={{ padding: '13px 20px', fontWeight: 600, fontSize: 13.5, color: '#07251C' }}>{row.service}</td>
                      {[row.free, row.basiccare, row.silvercare, row.goldcare, row.conciergecare].map((val, vi) => (
                        <td key={vi} style={{ padding: '13px 14px', textAlign: 'center', fontSize: 13, color: val === '✓' ? '#137333' : val === '—' ? '#C4CEC9' : '#27433A', fontWeight: val === '✓' ? 700 : 500 }}>{val}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>

      {/* Section 4 — Savings calculator */}
      <div className="page-card" style={{ background: '#07251C' }}>
        <section className="section-inner">
          <SavingsCalculator />
        </section>
      </div>

      {/* Section 5 — Pay-per-use pricing */}
      <div className="page-card" style={{ background: '#EBEBEB' }}>
        <section className="section-inner">
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#137333', marginBottom: 14 }}>— Pay-Per-Use</div>
            <h2 style={{ fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 700, fontSize: 'clamp(26px, 3.5vw, 40px)', lineHeight: 1.08, letterSpacing: '-0.02em', margin: '0 auto 16px', maxWidth: 520 }}>
              Flexible access, <em style={{ fontFamily: 'var(--font-playfair-display), serif', fontStyle: 'italic' }}>no commitment.</em>
            </h2>
            <p style={{ color: '#5A7068', fontSize: 15, maxWidth: 480, margin: '0 auto', lineHeight: 1.65 }}>
              Every service is available individually. Members on paid plans get preferred pricing.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
            {PAY_PER_USE.map((item) => (
              <div key={item.service} style={{ background: '#fff', borderRadius: 14, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                <span style={{ fontSize: 14, color: '#27433A', fontWeight: 500 }}>{item.service}</span>
                <span style={{ fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 700, fontSize: 16, color: '#07251C', whiteSpace: 'nowrap' }}>{formatKobo(item.priceKobo)}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Section 6 — Corporate teaser */}
      <div className="page-card" style={{ background: '#07251C' }}>
        <section className="section-inner" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#6DC43F', marginBottom: 16 }}>— Corporate (Coming Soon)</div>
          <h2 style={{ fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 700, fontSize: 'clamp(26px, 3.5vw, 40px)', color: '#fff', margin: '0 auto 20px', maxWidth: 560, lineHeight: 1.08 }}>
            Group plans for <em style={{ fontFamily: 'var(--font-playfair-display), serif', fontStyle: 'italic', color: '#6DC43F' }}>employers.</em>
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 15, maxWidth: 460, margin: '0 auto 36px', lineHeight: 1.65 }}>
            Volume pricing for SMEs, mid-market, and enterprise organisations across Nigeria.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap', marginBottom: 36 }}>
            {CORPORATE_TIERS.map((tier) => (
              <div key={tier.label} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 16, padding: '20px 28px', textAlign: 'center', minWidth: 180 }}>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', fontWeight: 600, marginBottom: 8 }}>{tier.label}</div>
                <div style={{ fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 700, fontSize: 22, color: '#6DC43F' }}>{formatKobo(tier.priceKobo)}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 4 }}>per member/year</div>
              </div>
            ))}
          </div>
          <Link href="/corporate" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: '#6DC43F', color: '#07251C', textDecoration: 'none', fontWeight: 700, fontSize: 13, letterSpacing: '0.07em', textTransform: 'uppercase', padding: '13px 13px 13px 28px', borderRadius: 100 }}>
            Enquire About Corporate
            <span style={{ width: 32, height: 32, borderRadius: '50%', background: '#07251C', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M5 19L19 5M19 5H9M19 5v10" stroke="#6DC43F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </span>
          </Link>
        </section>
      </div>

      <FinalCTA />
      <Footer />
    </div>
  )
}
