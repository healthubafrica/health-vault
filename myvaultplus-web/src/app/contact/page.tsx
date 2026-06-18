import Image from 'next/image'
import Navbar from '@/components/Navbar'
import FinalCTA from '@/components/FinalCTA'
import Footer from '@/components/Footer'
import HeroMarquee from '@/components/HeroMarquee'
import { MessageCircle, Phone, Mail } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const channels: Array<{ icon: LucideIcon; color: string; bg: string; title: string; desc: string; link: string; label: string }> = [
  { icon: MessageCircle, color: '#137333', bg: '#EAF7F1', title: 'WhatsApp Support', desc: 'Chat with our support team directly. Fastest response time, typically under 30 minutes.', link: 'https://wa.me/2341234567890', label: 'Chat Now →' },
  { icon: Phone, color: '#2563EB', bg: '#EFF6FF', title: 'Phone Support', desc: 'Call us during business hours and speak directly with a patient support representative.', link: 'tel:+2341234567890', label: 'Call Now →' },
  { icon: Mail, color: '#7C3AED', bg: '#F5F3FF', title: 'Email Support', desc: 'Send a detailed message and receive a thorough response within 2 business hours.', link: 'mailto:support@myvaultplus.com', label: 'Send Email →' },
]

export default function ContactPage() {
  return (
    <div style={{ width: '100%', overflowX: 'hidden', background: '#F1F4EF' }}>
      <Navbar />

      <div style={{ margin: '16px 16px 24px', borderRadius: 28, overflow: 'hidden' }}>
        <section style={{ position: 'relative', background: '#041E14', overflow: 'hidden', minHeight: '88vh', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Image src="https://images.unsplash.com/photo-1576671081837-49000212a370?w=1920&h=1080&fit=crop&q=85" alt="Healthcare support team" fill priority style={{ objectFit: 'cover', objectPosition: 'center' }} sizes="100vw" />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(160deg, rgba(4,30,20,0.78) 0%, rgba(7,37,28,0.65) 50%, rgba(4,18,12,0.82) 100%)', pointerEvents: 'none' }} />

          <div style={{ position: 'relative', maxWidth: 760, width: '100%', margin: '0 auto', padding: '120px 32px 0', textAlign: 'center', zIndex: 1 }}>
            <h1 style={{ margin: '0 0 18px', lineHeight: 1.06, fontFamily: 'var(--font-manrope), sans-serif' }}>
              <span style={{ display: 'block', fontWeight: 700, fontSize: 'clamp(32px, 5.5vw, 58px)', color: '#fff', letterSpacing: '-0.03em', lineHeight: 1.06 }}>Get in Touch,</span>
              <span style={{ display: 'block', fontFamily: 'var(--font-playfair-display), serif', fontStyle: 'italic', fontWeight: 700, fontSize: 'clamp(32px, 5.5vw, 58px)', color: '#6DC43F', letterSpacing: '-0.02em', lineHeight: 1.06 }}>
                We&apos;re Here to Help
              </span>
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.78)', fontSize: 16, lineHeight: 1.65, maxWidth: 520, margin: '0 auto 32px' }}>
              Reach the Health-Hub Africa® team by WhatsApp, phone, or email. Most queries resolved within 2 hours.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
              <a href="/faq" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(8px)', border: '1.5px solid rgba(255,255,255,0.55)', color: '#fff', textDecoration: 'none', fontWeight: 700, fontSize: 13, letterSpacing: '0.07em', textTransform: 'uppercase', padding: '13px 26px', borderRadius: 100 }}>
                View FAQ
              </a>
              <a href="https://wa.me/2341234567890" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: '#6DC43F', color: '#07251C', textDecoration: 'none', fontWeight: 700, fontSize: 13, letterSpacing: '0.07em', textTransform: 'uppercase', padding: '12px 12px 12px 24px', borderRadius: 100 }}>
                WhatsApp Us
                <span style={{ width: 30, height: 30, borderRadius: '50%', background: '#07251C', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M5 19L19 5M19 5H9M19 5v10" stroke="#6DC43F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </span>
              </a>
            </div>
          </div>
          <HeroMarquee marginTop={80} />
        </section>
      </div>

      {/* Section 1 — Channels */}
      <div style={{ margin: '0 24px 24px', borderRadius: 28, overflow: 'hidden', background: '#fff' }}>
        <section style={{ maxWidth: 1280, margin: '0 auto', padding: '88px 56px' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#137333', marginBottom: 18 }}>— Contact</div>
            <h2 style={{ fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 600, fontSize: 'clamp(28px, 3.5vw, 40px)', lineHeight: 1.1, letterSpacing: '-0.02em', margin: '0 auto 16px', maxWidth: 640 }}>
              Three ways to{' '}
              <em style={{ fontFamily: 'var(--font-playfair-display), serif', fontStyle: 'italic', fontWeight: 700 }}>reach us.</em>
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {channels.map((ch) => {
              const Icon = ch.icon
              return (
                <div key={ch.title} style={{ background: '#fff', border: '1px solid rgba(7,37,28,0.09)', borderRadius: 22, padding: 28, display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <span style={{ width: 44, height: 44, borderRadius: 12, background: ch.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={22} strokeWidth={1.8} color={ch.color} />
                  </span>
                  <h3 style={{ fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 600, fontSize: 19, color: '#07251C', margin: 0 }}>{ch.title}</h3>
                  <p style={{ color: '#41584E', fontSize: 14, lineHeight: 1.6, margin: 0, flex: 1 }}>{ch.desc}</p>
                  <a href={ch.link} style={{ color: ch.color, fontWeight: 600, fontSize: 14, textDecoration: 'none' }}>{ch.label}</a>
                </div>
              )
            })}
          </div>
        </section>
      </div>

      {/* Section 2 — Contact form */}
      <div style={{ margin: '0 24px 24px', borderRadius: 28, overflow: 'hidden', background: '#EBEBEB' }}>
        <section style={{ maxWidth: 1280, margin: '0 auto', padding: '88px 56px' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#137333', marginBottom: 18 }}>— Message Us</div>
            <h2 style={{ fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 600, fontSize: 'clamp(28px, 3.5vw, 40px)', lineHeight: 1.1, letterSpacing: '-0.02em', margin: '0 auto 16px', maxWidth: 640 }}>
              Send a{' '}
              <em style={{ fontFamily: 'var(--font-playfair-display), serif', fontStyle: 'italic', fontWeight: 700 }}>direct message.</em>
            </h2>
          </div>

          <div style={{ background: '#DEDEDE', borderRadius: 28, padding: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 12 }}>
              {/* Form */}
              <div style={{ background: '#fff', borderRadius: 18, padding: '40px 40px 36px' }}>
                <form style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    {[{ label: 'Full Name', type: 'text', placeholder: 'Your full name' }, { label: 'Email Address', type: 'email', placeholder: 'you@example.com' }].map((f) => (
                      <div key={f.label}>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#07251C', marginBottom: 6 }}>{f.label}</label>
                        <input type={f.type} placeholder={f.placeholder} style={{ width: '100%', border: '1px solid rgba(7,37,28,0.15)', borderRadius: 10, padding: '11px 14px', fontSize: 14, color: '#07251C', background: '#F7FAF7', boxSizing: 'border-box', outline: 'none' }} />
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#07251C', marginBottom: 6 }}>Phone Number</label>
                      <input type="tel" placeholder="+234 XXX XXX XXXX" style={{ width: '100%', border: '1px solid rgba(7,37,28,0.15)', borderRadius: 10, padding: '11px 14px', fontSize: 14, color: '#07251C', background: '#F7FAF7', boxSizing: 'border-box', outline: 'none' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#07251C', marginBottom: 6 }}>I am a</label>
                      <select style={{ width: '100%', border: '1px solid rgba(7,37,28,0.15)', borderRadius: 10, padding: '11px 14px', fontSize: 14, color: '#07251C', background: '#F7FAF7', boxSizing: 'border-box', outline: 'none' }}>
                        <option>Patient</option>
                        <option>Corporate</option>
                        <option>HMO</option>
                        <option>Other</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#07251C', marginBottom: 6 }}>Subject</label>
                    <input type="text" placeholder="How can we help?" style={{ width: '100%', border: '1px solid rgba(7,37,28,0.15)', borderRadius: 10, padding: '11px 14px', fontSize: 14, color: '#07251C', background: '#F7FAF7', boxSizing: 'border-box', outline: 'none' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#07251C', marginBottom: 6 }}>Message</label>
                    <textarea placeholder="Tell us more..." rows={4} style={{ width: '100%', border: '1px solid rgba(7,37,28,0.15)', borderRadius: 10, padding: '11px 14px', fontSize: 14, color: '#07251C', background: '#F7FAF7', boxSizing: 'border-box', outline: 'none', resize: 'vertical' }} />
                  </div>
                  <button type="button" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 10, background: '#07251C', color: '#fff', fontWeight: 700, fontSize: 13, letterSpacing: '0.07em', textTransform: 'uppercase', padding: '14px 28px', borderRadius: 100, border: 'none', cursor: 'pointer' }}>
                    Send Message
                    <span style={{ width: 28, height: 28, borderRadius: '50%', background: '#6DC43F', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M5 19L19 5M19 5H9M19 5v10" stroke="#07251C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </span>
                  </button>
                </form>
              </div>

              {/* Quick info */}
              <div style={{ background: '#07251C', borderRadius: 18, padding: '40px 36px' }}>
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#6DC43F', marginBottom: 20 }}>Quick Contact</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {[
                    { label: 'Address', value: 'Health-Hub Africa® Ltd\nLagos, Nigeria' },
                    { label: 'Corporate Email', value: 'enquiries@myvaultplus.com' },
                    { label: 'Support Email', value: 'support@myvaultplus.com' },
                    { label: 'WhatsApp', value: '+234 XXX XXX XXXX' },
                  ].map((item) => (
                    <div key={item.label}>
                      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(109,196,63,0.7)', marginBottom: 6 }}>{item.label}</div>
                      <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', lineHeight: 1.5, whiteSpace: 'pre-line' }}>{item.value}</div>
                    </div>
                  ))}
                  <div style={{ marginTop: 8, padding: '14px 16px', background: 'rgba(109,196,63,0.08)', border: '1px solid rgba(109,196,63,0.2)', borderRadius: 12 }}>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.55 }}>
                      Typical response time: <span style={{ color: '#6DC43F', fontWeight: 600 }}>under 2 hours</span>
                      <br />Available 7 days a week
                    </div>
                  </div>
                </div>
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
