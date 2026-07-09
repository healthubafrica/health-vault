import type { Metadata } from 'next'
import Image from 'next/image'
import Navbar from '@/components/Navbar'
import FinalCTA from '@/components/FinalCTA'
import Footer from '@/components/Footer'
import HeroMarquee from '@/components/HeroMarquee'
import AnimatedSection from '@/components/AnimatedSection'
import AnimatedCard from '@/components/AnimatedCard'
import TravelSafePricing from '@/components/TravelSafePricing'
import { Plane, Shield, FileUp, Globe, Share2, ClipboardList } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export const metadata: Metadata = {
  title: 'TravelSafe™ — Travel Health Preparation | MyHealth Vault+™',
  description:
    'Prepare your health records for international travel with TravelSafe™. Upload documents, build a portable health summary, and share with providers worldwide.',
}

const features: Array<{ icon: LucideIcon; title: string; desc: string }> = [
  {
    icon: Plane,
    title: 'Travel Health Profile',
    desc: 'Build a dedicated health profile for each trip — destination, dates, partner booking reference, and travel purpose.',
  },
  {
    icon: Shield,
    title: 'Emergency-Ready Summary',
    desc: 'Your blood group, allergies, chronic conditions, medications, and next-of-kin — instantly accessible to any care provider.',
  },
  {
    icon: FileUp,
    title: 'Document Upload',
    desc: 'Attach vaccination cards, prescriptions, insurance documents, and imaging results directly to your travel profile.',
  },
  {
    icon: Globe,
    title: 'Partner Integration',
    desc: 'Initiated through travel partners like WakaNow — your booking reference links directly to your TravelSafe profile.',
  },
  {
    icon: Share2,
    title: 'Secure Sharing',
    desc: 'Share your health summary with overseas providers, embassies, or insurers via a secure, time-limited link.',
  },
  {
    icon: ClipboardList,
    title: 'Vault-Backed Records',
    desc: 'All documents are stored in your encrypted MyVault™ — accessible anywhere, anytime, even offline on mobile.',
  },
]

const steps = [
  {
    num: '01',
    title: 'Register or Sign In',
    desc: 'Create your free MyHealth Vault+™ account or sign in. Your health data is encrypted and stored securely.',
  },
  {
    num: '02',
    title: 'Build Your Health Profile',
    desc: 'Add your medical history, blood group, allergies, medications, and emergency contacts to your Vault.',
  },
  {
    num: '03',
    title: 'Upload Travel Documents',
    desc: 'Attach vaccination records, prescriptions, insurance documents, and any relevant medical reports.',
  },
  {
    num: '04',
    title: 'Travel with Confidence',
    desc: 'Your TravelSafe™ summary is ready to share with providers, border health officials, or travel insurers worldwide.',
  },
]

export default function TravelSafePage() {
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
            src="https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=1920&h=1080&fit=crop&q=85"
            alt="Airplane wing at sunset"
            fill
            priority
            style={{ objectFit: 'cover', objectPosition: 'center' }}
            sizes="100vw"
          />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(160deg, rgba(4,30,20,0.85) 0%, rgba(7,37,28,0.72) 50%, rgba(4,18,12,0.88) 100%)', pointerEvents: 'none' }} />

          <div className="hero-content">
            <h1 style={{ margin: '0 0 18px', lineHeight: 1.06, fontFamily: 'var(--font-manrope), sans-serif' }}>
              <span style={{ display: 'block', fontWeight: 700, fontSize: 'clamp(32px, 5.5vw, 58px)', color: '#fff', letterSpacing: '-0.03em', lineHeight: 1.06 }}>Travel Prepared.</span>
              <span style={{ display: 'block', fontFamily: 'var(--font-manrope), sans-serif', fontStyle: 'italic', fontWeight: 700, fontSize: 'clamp(32px, 5.5vw, 58px)', color: '#6DC43F', letterSpacing: '-0.02em', lineHeight: 1.1 }}>Health Protected.</span>
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.78)', fontSize: 16, lineHeight: 1.65, maxWidth: 520, margin: '0 auto 32px' }}>
              TravelSafe™ helps you organise your medical records, build a portable health summary, and share your health profile with providers worldwide — so you&apos;re never unprepared abroad.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
              <a href="/plans" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(8px)', border: '1.5px solid rgba(255,255,255,0.55)', color: '#fff', textDecoration: 'none', fontWeight: 700, fontSize: 13, letterSpacing: '0.07em', textTransform: 'uppercase', padding: '13px 26px', borderRadius: 100 }}>View Plans</a>
              <a href="https://portal.myvaultplus.com/register" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: '#6DC43F', color: '#07251C', textDecoration: 'none', fontWeight: 700, fontSize: 13, letterSpacing: '0.07em', textTransform: 'uppercase', padding: '12px 12px 12px 24px', borderRadius: 100 }}>
                Start TravelSafe Onboarding
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
              Everything you need to travel{' '}
              <em style={{ fontFamily: 'var(--font-manrope), sans-serif', fontStyle: 'italic' }}>with your health in hand.</em>
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
        <section style={{ maxWidth: 1280, margin: '0 auto', padding: '72px 56px' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#6DC43F', marginBottom: 14 }}>— How It Works</div>
            <h2 style={{ fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 600, fontSize: 'clamp(28px, 3.5vw, 40px)', lineHeight: 1.1, letterSpacing: '-0.02em', margin: '0 auto', maxWidth: 520, color: '#fff' }}>
              Ready to travel in{' '}
              <em style={{ fontFamily: 'var(--font-manrope), sans-serif', fontStyle: 'italic' }}>four simple steps.</em>
            </h2>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 24, padding: 16 }}>
            <AnimatedSection stagger className="rg-4" style={{ gap: 12 }}>
              {steps.map((s) => (
                <AnimatedCard key={s.num} hoverLift={false} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 18, padding: '32px 28px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ fontFamily: 'var(--font-manrope), sans-serif', fontSize: 34, fontWeight: 700, color: '#6DC43F', letterSpacing: '-0.02em', marginBottom: 14 }}>{s.num}</div>
                  <h3 style={{ fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 600, fontSize: 17, color: '#fff', margin: '0 0 10px' }}>{s.title}</h3>
                  <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 14, lineHeight: 1.65, margin: 0 }}>{s.desc}</p>
                </AnimatedCard>
              ))}
            </AnimatedSection>
          </div>
        </section>
      </div>

      {/* ── Pricing ── */}
      <div className="page-card" style={{ background: '#EBEBEB' }}>
        <section className="section-inner">
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#137333', marginBottom: 14 }}>— TravelSafe™ Pricing</div>
            <h2 style={{ fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 600, fontSize: 'clamp(28px, 3.5vw, 40px)', lineHeight: 1.1, letterSpacing: '-0.02em', margin: '0 auto 16px', maxWidth: 560, color: '#07251C' }}>
              Choose your level of{' '}
              <em style={{ fontFamily: 'var(--font-manrope), sans-serif', fontStyle: 'italic' }}>travel health protection.</em>
            </h2>
            <p style={{ color: '#41584E', fontSize: 15, lineHeight: 1.7, maxWidth: 520, margin: '0 auto' }}>
              Four tiers, family plans, and corporate coverage — all built on your MyHealth Vault+™ profile.
            </p>
          </div>
          <TravelSafePricing />
        </section>
      </div>

      <FinalCTA />
      <Footer />
    </div>
  )
}
