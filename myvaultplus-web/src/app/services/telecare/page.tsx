import type { Metadata } from 'next'
import Image from 'next/image'
import Navbar from '@/components/Navbar'
import FinalCTA from '@/components/FinalCTA'
import Footer from '@/components/Footer'
import HeroMarquee from '@/components/HeroMarquee'
import { Clock, GraduationCap, Video, Pill, Share2, FileText } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'


export const metadata: Metadata = {
  title: 'TeleCare™ — Remote Consultations | MyHealth Vault+™',
  description:
    'Consult board-certified clinicians via HD video or phone call, anytime, anywhere in Nigeria. Get prescriptions and referrals without leaving your home.',
}

const features: Array<{ icon: LucideIcon; title: string; desc: string }> = [
  {
    icon: Clock,
    title: 'Available 24 / 7',
    desc: 'Consult a verified clinician any time, day or night, from any location across Nigeria.',
  },
  {
    icon: GraduationCap,
    title: 'Board-Certified Clinicians',
    desc: 'Every TeleCare™ practitioner is a licensed, credentialed medical professional.',
  },
  {
    icon: Video,
    title: 'HD Video & Voice',
    desc: 'Crystal-clear, end-to-end encrypted video or phone consultations. Your choice.',
  },
  {
    icon: Pill,
    title: 'Digital Prescriptions',
    desc: 'Receive e-prescriptions sent to your preferred pharmacy immediately after the session.',
  },
  {
    icon: Share2,
    title: 'Specialist Referrals',
    desc: 'Get referred to the right specialist or service without needing a physical appointment first.',
  },
  {
    icon: FileText,
    title: 'Consultation History',
    desc: 'Every session is logged and stored in your MyVault™ record for complete continuity of care.',
  },
]

const steps = [
  {
    num: '01',
    title: 'Choose a Clinician',
    desc: 'Browse available practitioners filtered by specialty, experience, language, and availability.',
  },
  {
    num: '02',
    title: 'Book Your Slot',
    desc: 'Select a time that suits you; same-day options are usually available around the clock.',
  },
  {
    num: '03',
    title: 'Join the Call',
    desc: 'Connect via HD video or phone at your scheduled time. No installation needed; it is entirely browser-based.',
  },
  {
    num: '04',
    title: 'Get Your Prescription',
    desc: 'Receive an e-prescription, referral letter, or clinical summary directly to your Vault.',
  },
]

const planRows = [
  { plan: 'Free / Starter', access: 'Pay-per-use', highlight: false },
  { plan: 'Growth', access: 'Sessions included', highlight: true },
  { plan: 'Enterprise', access: 'Priority access', highlight: false },
  { plan: 'Corporate & HMO', access: 'Custom allocation', highlight: false },
]

export default function TeleCarePage() {
  return (
    <div style={{ width: '100%', overflowX: 'hidden', background: '#F1F4EF' }}>
      <Navbar />

      {/* ── Hero ── */}
      <div style={{ margin: '16px 16px 24px', borderRadius: 28, overflow: 'hidden' }}>
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
            src="https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=1920&h=1080&fit=crop&q=85"
            alt="Doctor on video call"
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

          <div
            style={{
              position: 'relative',
              maxWidth: 760,
              width: '100%',
              margin: '0 auto',
              padding: '120px 32px 0',
              textAlign: 'center',
              zIndex: 1,
            }}
          >
            <h1 style={{ margin: '0 0 18px', lineHeight: 1.06, fontFamily: 'var(--font-manrope), sans-serif' }}>
              <span style={{ display: 'block', fontWeight: 700, fontSize: 'clamp(32px, 5.5vw, 58px)', color: '#fff', letterSpacing: '-0.03em', lineHeight: 1.06 }}>
                Consult Any Doctor.
              </span>
              <span style={{ display: 'block', fontFamily: 'var(--font-playfair-display), serif', fontStyle: 'italic', fontWeight: 700, fontSize: 'clamp(32px, 5.5vw, 58px)', color: '#34E0A0', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                Anywhere. Anytime.
              </span>
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.78)', fontSize: 16, lineHeight: 1.65, maxWidth: 520, margin: '0 auto 32px' }}>
              Connect with qualified, board-certified clinicians via HD video or phone, without leaving your home. Prescriptions, referrals, and consultation notes go straight to your Vault.
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
                style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: '#34E0A0', color: '#07251C', textDecoration: 'none', fontWeight: 700, fontSize: 13, letterSpacing: '0.07em', textTransform: 'uppercase', padding: '12px 12px 12px 24px', borderRadius: 100 }}
              >
                Book a Consultation
                <span style={{ width: 30, height: 30, borderRadius: '50%', background: '#07251C', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M5 19L19 5M19 5H9M19 5v10" stroke="#34E0A0" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </span>
              </a>
            </div>
          </div>

          <HeroMarquee marginTop={80} />
        </section>
      </div>

      {/* ── Features ── */}
      <div style={{ margin: '0 24px 24px', borderRadius: 28, overflow: 'hidden', background: '#fff' }}>
        <section style={{ maxWidth: 1280, margin: '0 auto', padding: '88px 56px' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#0E8567', marginBottom: 14 }}>— What You Get</div>
            <h2 style={{ fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 600, fontSize: 'clamp(28px, 3.5vw, 40px)', lineHeight: 1.1, letterSpacing: '-0.02em', margin: '0 auto 14px', maxWidth: 560, color: '#07251C' }}>
              Everything a clinic visit gives you,{' '}
              <em style={{ fontFamily: 'var(--font-playfair-display), serif', fontStyle: 'italic' }}>from your phone.</em>
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
            {features.map((f) => {
              const Icon = f.icon
              return (
                <div key={f.title} style={{ background: '#F7FAF7', border: '1px solid rgba(7,37,28,0.07)', borderRadius: 20, padding: '28px 26px' }}>
                  <span style={{ width: 44, height: 44, borderRadius: 12, background: '#EAF7F1', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                    <Icon size={22} strokeWidth={1.8} color="#0E8567" />
                  </span>
                  <h3 style={{ fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 600, fontSize: 16.5, color: '#07251C', margin: '0 0 10px' }}>{f.title}</h3>
                  <p style={{ color: '#41584E', fontSize: 14, lineHeight: 1.65, margin: 0 }}>{f.desc}</p>
                </div>
              )
            })}
          </div>
        </section>
      </div>

      {/* ── How it works ── */}
      <div style={{ margin: '0 24px 24px', borderRadius: 28, overflow: 'hidden', background: '#07251C' }}>
        <section style={{ maxWidth: 1280, margin: '0 auto', padding: '88px 56px' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#34E0A0', marginBottom: 14 }}>— How It Works</div>
            <h2 style={{ fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 600, fontSize: 'clamp(28px, 3.5vw, 40px)', lineHeight: 1.1, letterSpacing: '-0.02em', margin: '0 auto', maxWidth: 520, color: '#fff' }}>
              From booking to prescription{' '}
              <em style={{ fontFamily: 'var(--font-playfair-display), serif', fontStyle: 'italic', color: '#34E0A0' }}>in four steps.</em>
            </h2>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 24, padding: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              {steps.map((s) => (
                <div key={s.num} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(52,224,160,0.12)', borderRadius: 18, padding: '32px 28px' }}>
                  <div style={{ fontFamily: 'var(--font-manrope), sans-serif', fontSize: 34, fontWeight: 700, color: '#34E0A0', letterSpacing: '-0.02em', marginBottom: 14 }}>{s.num}</div>
                  <h3 style={{ fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 600, fontSize: 17, color: '#fff', margin: '0 0 10px' }}>{s.title}</h3>
                  <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, lineHeight: 1.65, margin: 0 }}>{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* ── Plans ── */}
      <div style={{ margin: '0 24px 24px', borderRadius: 28, overflow: 'hidden', background: '#EBEBEB' }}>
        <section style={{ maxWidth: 1280, margin: '0 auto', padding: '88px 56px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 56, alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#0E8567', marginBottom: 14 }}>— Pricing</div>
              <h2 style={{ fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 600, fontSize: 'clamp(28px, 3.5vw, 40px)', lineHeight: 1.1, letterSpacing: '-0.02em', margin: '0 0 16px', color: '#07251C' }}>
                Available on{' '}
                <em style={{ fontFamily: 'var(--font-playfair-display), serif', fontStyle: 'italic' }}>every plan.</em>
              </h2>
              <p style={{ color: '#41584E', fontSize: 15, lineHeight: 1.7, margin: '0 0 28px' }}>
                TeleCare™ is accessible pay-per-use on the Starter plan, and included with session credits on Growth and Enterprise plans.
              </p>
              <a
                href="/plans"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: '#07251C', color: '#fff', textDecoration: 'none', fontWeight: 700, fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '12px 12px 12px 22px', borderRadius: 100 }}
              >
                See All Plans
                <span style={{ width: 28, height: 28, borderRadius: '50%', background: '#34E0A0', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M5 19L19 5M19 5H9M19 5v10" stroke="#07251C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </span>
              </a>
            </div>
            <div style={{ background: '#DEDEDE', borderRadius: 20, padding: 12 }}>
              <div style={{ borderRadius: 14, overflow: 'hidden' }}>
                {planRows.map((row, i) => (
                  <div
                    key={row.plan}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '18px 24px',
                      background: row.highlight ? '#07251C' : '#fff',
                      borderBottom: i < planRows.length - 1 ? '1px solid rgba(7,37,28,0.07)' : 'none',
                    }}
                  >
                    <span style={{ fontWeight: 600, fontSize: 14.5, color: row.highlight ? '#fff' : '#07251C' }}>{row.plan}</span>
                    <span style={{ fontWeight: 600, fontSize: 14, color: row.highlight ? '#34E0A0' : '#0E8567', background: row.highlight ? 'rgba(52,224,160,0.12)' : '#EAF7F1', padding: '5px 14px', borderRadius: 100 }}>{row.access}</span>
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
