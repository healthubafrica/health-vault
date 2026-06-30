import type { Metadata } from 'next'
import Image from 'next/image'
import Navbar from '@/components/Navbar'
import FinalCTA from '@/components/FinalCTA'
import Footer from '@/components/Footer'
import HeroMarquee from '@/components/HeroMarquee'
import AnimatedSection from '@/components/AnimatedSection'
import AnimatedCard from '@/components/AnimatedCard'
import { Zap, Building2, BadgeCheck, Smartphone, FileText, Star } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'


export const metadata: Metadata = {
  title: 'MinuteCare™ — Same-Day Clinic Appointments | MyHealth Vault+™',
  description:
    'Book same-day clinic appointments at 200+ verified partner clinics across Nigeria. Arrive at your slot, skip the queue, get seen.',
}

const features: Array<{ icon: LucideIcon; title: string; desc: string }> = [
  {
    icon: Zap,
    title: 'Same-Day Slots',
    desc: 'Walk-in appointment slots at partner clinics available within hours of booking.',
  },
  {
    icon: Building2,
    title: '200+ Partner Clinics',
    desc: 'A growing network of quality-verified clinics across Lagos, Abuja, and other major cities.',
  },
  {
    icon: BadgeCheck,
    title: 'Queue-Free Arrival',
    desc: 'Your appointment time is guaranteed. Arrive and be seen; no waiting room delays.',
  },
  {
    icon: Smartphone,
    title: 'SMS & App Reminders',
    desc: 'Automated reminders sent before your appointment so you never miss your slot.',
  },
  {
    icon: FileText,
    title: 'Integrated Records',
    desc: 'Consultation notes and results link automatically to your MyVault™ health record.',
  },
  {
    icon: Star,
    title: 'Clinic Ratings',
    desc: 'Community-sourced ratings and reviews help you choose the right clinic for your needs.',
  },
]

const steps = [
  {
    num: '01',
    title: 'Find a Clinic',
    desc: 'Search by location, specialty, distance, and availability. Filter by rating or wait time.',
  },
  {
    num: '02',
    title: 'Book Your Slot',
    desc: 'Select an available time and confirm your appointment in under 60 seconds.',
  },
  {
    num: '03',
    title: 'Arrive On Time',
    desc: 'Walk in at your booked time. Show your confirmation code at reception; no paperwork needed.',
  },
  {
    num: '04',
    title: 'Notes in Your Vault',
    desc: 'Leave with care. Consultation notes and any results sync directly to your health record.',
  },
]

const planRows = [
  { plan: 'Free / Starter', access: 'Pay-per-use', highlight: false },
  { plan: 'Growth', access: 'Discounted rate', highlight: true },
  { plan: 'Enterprise', access: 'Priority booking', highlight: false },
  { plan: 'Corporate & HMO', access: 'Custom allocation', highlight: false },
]

export default function MinuteCarePage() {
  return (
    <div style={{ width: '100%', overflowX: 'hidden', background: '#F1F4EF' }}>
      <Navbar />

      {/* ── Hero ── */}
      <div className="page-card-first">
        <section
          style={{
            position: 'relative',
            background: '#041E14',
            overflow: 'hidden',
            minHeight: '88vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <Image
            src="https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=1920&h=1080&fit=crop&q=85"
            alt="Partner clinic walk-in"
            fill
            priority
            style={{ objectFit: 'cover', objectPosition: 'center' }}
            sizes="100vw"
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(160deg, rgba(4,30,20,0.82) 0%, rgba(7,37,28,0.68) 50%, rgba(4,18,12,0.85) 100%)',
              pointerEvents: 'none',
            }}
          />

          <div className="hero-content">
            <h1 style={{ margin: '0 0 18px', lineHeight: 1.06, fontFamily: 'var(--font-manrope), sans-serif' }}>
              <span style={{ display: 'block', fontWeight: 700, fontSize: 'clamp(32px, 5.5vw, 58px)', color: '#fff', letterSpacing: '-0.03em', lineHeight: 1.06 }}>
                Same-Day Care.
              </span>
              <span style={{ display: 'block', fontFamily: 'var(--font-manrope), sans-serif', fontStyle: 'italic', fontWeight: 700, fontSize: 'clamp(32px, 5.5vw, 58px)', color: '#6DC43F', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                No Long Wait.
              </span>
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.78)', fontSize: 16, lineHeight: 1.65, maxWidth: 520, margin: '0 auto 32px' }}>
              Book a guaranteed appointment at a verified partner clinic today. Arrive at your slot time, skip the queue, and walk out with notes linked to your MyVault™ record.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
              <a
                href="/plans"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(8px)', border: '1.5px solid rgba(255,255,255,0.55)', color: '#fff', textDecoration: 'none', fontWeight: 700, fontSize: 13, letterSpacing: '0.07em', textTransform: 'uppercase', padding: '13px 26px', borderRadius: 100 }}
              >
                View Plans
              </a>
              <a
                href="https://portal.myvaultplus.com/register"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: '#6DC43F', color: '#07251C', textDecoration: 'none', fontWeight: 700, fontSize: 13, letterSpacing: '0.07em', textTransform: 'uppercase', padding: '12px 12px 12px 24px', borderRadius: 100 }}
              >
                Book a Clinic Slot
                <span style={{ width: 30, height: 30, borderRadius: '50%', background: '#07251C', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M5 19L19 5M19 5H9M19 5v10" stroke="#6DC43F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </span>
              </a>
            </div>
          </div>

          <HeroMarquee marginTop={80} />
        </section>
      </div>

      {/* ── Features ── */}
      <div className="page-card" style={{ background: '#fff' }}>
        <section className="section-inner">
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#137333', marginBottom: 14 }}>— What You Get</div>
            <h2 style={{ fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 600, fontSize: 'clamp(28px, 3.5vw, 40px)', lineHeight: 1.1, letterSpacing: '-0.02em', margin: '0 auto 14px', maxWidth: 560, color: '#07251C' }}>
              Clinic-quality care,{' '}
              <em style={{ fontFamily: 'var(--font-manrope), sans-serif', fontStyle: 'italic' }}>without the wait.</em>
            </h2>
          </div>
          <AnimatedSection stagger className="rg-3" style={{ gap: 20 }}>
            {features.map((f) => {
              const Icon = f.icon
              return (
                <AnimatedCard key={f.title} style={{ background: '#F7FAF7', border: '1px solid rgba(7,37,28,0.07)', borderRadius: 20, padding: '28px 26px' }}>
                  <span style={{ width: 44, height: 44, borderRadius: 12, background: '#EAF7F1', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                    <Icon size={22} strokeWidth={1.8} color="#137333" />
                  </span>
                  <h3 style={{ fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 600, fontSize: 16.5, color: '#07251C', margin: '0 0 10px' }}>{f.title}</h3>
                  <p style={{ color: '#41584E', fontSize: 14, lineHeight: 1.65, margin: 0 }}>{f.desc}</p>
                </AnimatedCard>
              )
            })}
          </AnimatedSection>
        </section>
      </div>

      {/* ── How it works ── */}
      <div className="page-card" style={{ background: '#07251C' }}>
        <section className="section-inner">
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#6DC43F', marginBottom: 14 }}>— How It Works</div>
            <h2 style={{ fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 600, fontSize: 'clamp(28px, 3.5vw, 40px)', lineHeight: 1.1, letterSpacing: '-0.02em', margin: '0 auto', maxWidth: 520, color: '#fff' }}>
              Book, arrive, and be seen{' '}
              <em style={{ fontFamily: 'var(--font-manrope), sans-serif', fontStyle: 'italic', color: '#6DC43F' }}>in four steps.</em>
            </h2>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 24, padding: 16 }}>
            <AnimatedSection stagger className="rg-4" style={{ gap: 12 }}>
              {steps.map((s) => (
                <AnimatedCard key={s.num} hoverLift={false} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(109,196,63,0.12)', borderRadius: 18, padding: '32px 28px' }}>
                  <div style={{ fontFamily: 'var(--font-manrope), sans-serif', fontSize: 34, fontWeight: 700, color: '#6DC43F', letterSpacing: '-0.02em', marginBottom: 14 }}>{s.num}</div>
                  <h3 style={{ fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 600, fontSize: 17, color: '#fff', margin: '0 0 10px' }}>{s.title}</h3>
                  <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, lineHeight: 1.65, margin: 0 }}>{s.desc}</p>
                </AnimatedCard>
              ))}
            </AnimatedSection>
          </div>
        </section>
      </div>

      {/* ── Plans ── */}
      <div className="page-card" style={{ background: '#EBEBEB' }}>
        <section className="section-inner">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 56, alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#137333', marginBottom: 14 }}>— Pricing</div>
              <h2 style={{ fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 600, fontSize: 'clamp(28px, 3.5vw, 40px)', lineHeight: 1.1, letterSpacing: '-0.02em', margin: '0 0 16px', color: '#07251C' }}>
                Pay as you go,{' '}
                <em style={{ fontFamily: 'var(--font-manrope), sans-serif', fontStyle: 'italic' }}>or include it in your plan.</em>
              </h2>
              <p style={{ color: '#41584E', fontSize: 15, lineHeight: 1.7, margin: '0 0 28px' }}>
                MinuteCare™ is pay-per-use on the Starter plan with discounted rates and priority booking available on Growth and Enterprise plans.
              </p>
              <a href="/plans" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: '#07251C', color: '#fff', textDecoration: 'none', fontWeight: 700, fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '12px 12px 12px 22px', borderRadius: 100 }}>
                See All Plans
                <span style={{ width: 28, height: 28, borderRadius: '50%', background: '#6DC43F', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M5 19L19 5M19 5H9M19 5v10" stroke="#07251C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </span>
              </a>
            </div>
            <div style={{ background: '#DEDEDE', borderRadius: 20, padding: 12 }}>
              <div style={{ borderRadius: 14, overflow: 'hidden' }}>
                {planRows.map((row, i) => (
                  <div key={row.plan} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', background: row.highlight ? '#07251C' : '#fff', borderBottom: i < planRows.length - 1 ? '1px solid rgba(7,37,28,0.07)' : 'none' }}>
                    <span style={{ fontWeight: 600, fontSize: 14.5, color: row.highlight ? '#fff' : '#07251C' }}>{row.plan}</span>
                    <span style={{ fontWeight: 600, fontSize: 14, color: row.highlight ? '#6DC43F' : '#137333', background: row.highlight ? 'rgba(109,196,63,0.12)' : '#EAF7F1', padding: '5px 14px', borderRadius: 100 }}>{row.access}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>

      <FinalCTA />
      <Footer />
    </div>
  )
}
