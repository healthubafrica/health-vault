import Navbar from '@/components/Navbar'
import FinalCTA from '@/components/FinalCTA'
import Footer from '@/components/Footer'
import HeroSplit from '@/components/HeroSplit'
import { CONTACT } from '@/lib/contact'

const faqGroups = [
  {
    group: 'Getting Started',
    items: [
      { q: 'What is MyHealth Vault+™?', a: 'MyHealth Vault+™ is your personal digital health portal, a secure platform built by Health-Hub Africa® that gives you access to your health records, healthcare bookings, specialist second opinions, and emergency dispatch from one place.' },
      { q: 'How do I register?', a: 'Visit portal.myvaultplus.com/register, enter your details, verify your phone number or email, and your account is ready in under 3 minutes. You will receive a unique Patient ID (HHA-XXXXXXXX) immediately on registration.' },
      { q: 'Is it free?', a: 'Every patient gets a free Starter account with core portal access, their unique Patient ID, and limited health record viewing. Paid services such as TeleCare™ and Expert Review™ are available on a pay-per-use basis or via subscription plans.' },
      { q: 'What is a Patient ID?', a: 'Your Patient ID is a unique identifier (format: HHA-CITY-YEAR-NNNN) assigned to you at registration. It serves as your universal health identifier across all Health-Hub Africa® services and partner facilities.' },
      { q: 'Which services are available?', a: 'Seven services are available: TeleCare™ (remote consultations), Expert Review™ (specialist second opinions), DispatchCare™ (emergency dispatch), MinuteCare™ (fast-track clinic), CareTest™ (lab bookings), HealthConsult™ (preventive care), and NeuroFlex™ (neurology).' },
    ],
  },
  {
    group: 'Account & Records',
    items: [
      { q: 'How are my records stored?', a: 'Your health records are stored on secure, encrypted servers compliant with Nigeria Data Protection Regulation (NDPR) 2019. All data is encrypted at rest and in transit using industry-standard protocols.' },
      { q: 'Who can see my records?', a: 'Only you, and any clinicians or specialists you explicitly authorise, can access your health records. Health-Hub Africa® staff do not access individual patient records except where required by law or for platform support with your consent.' },
      { q: 'Can I download my records?', a: 'Yes. You can download your health records, lab results, Expert Review™ reports, and consultation summaries directly from your Vault at any time in PDF or standard formats.' },
      { q: 'What happens if I lose access?', a: 'Contact our support team via WhatsApp, phone, or email. We will verify your identity and restore access securely. Your data is never deleted unless you explicitly request account closure.' },
    ],
  },
  {
    group: 'Services',
    items: [
      { q: 'How do I book TeleCare™?', a: 'Log in to your Vault, navigate to Services → TeleCare™, choose your date and time, and confirm your booking in 4 steps or fewer. You will receive a confirmation with the video link and reminders.' },
      { q: 'What is Expert Review™?', a: 'Expert Review™ connects you with a qualified specialist panel to review any diagnosis, treatment plan, lab result, or medical document. Submit your case documents, and receive a comprehensive PDF report within 5–10 business days.' },
      { q: 'How does DispatchCare™ work?', a: 'Tap the DispatchCare™ button from any screen in the Vault. The system auto-detects your GPS location, generates a case ID, sends an SMS alert, and notifies the HHA operations team who will coordinate emergency response and call you back immediately.' },
      { q: 'What is NeuroFlex™?', a: 'NeuroFlex™ is a specialist neurology service available within MyHealth Vault+™. It connects patients with qualified neurologists for consultations, second opinions, and follow-up care, integrated with your existing health records.' },
    ],
  },
  {
    group: 'Plans & Billing',
    items: [
      { q: "What's the difference between plans?", a: 'The Starter (Free) plan gives portal access and pay-per-use services. The Growth plan (₦4,900/month) adds TeleCare™ sessions and HealthConsult™. The Enterprise plan (₦9,900/month) adds priority access, 2–4 Expert Reviews/year, and NeuroFlex™. Corporate plans are customised for organisations.' },
      { q: 'Can I upgrade?', a: 'You can upgrade or downgrade your plan at any time from your account settings. Upgrades take effect immediately; downgrades take effect at the start of the next billing cycle.' },
      { q: 'How is billing handled?', a: 'Billing is monthly via card payment, bank transfer, or supported mobile money. All transactions are processed securely. Receipts are emailed and stored in your Vault.' },
      { q: 'Are there corporate plans?', a: 'Health-Hub Africa® offers tailored corporate and HMO plans for employers, estates, schools, and government institutions. Visit our Corporate page or email enquiries@myvaultplus.com for details.' },
    ],
  },
  {
    group: 'Support',
    items: [
      { q: 'How do I contact support?', a: `You can reach us via WhatsApp (${CONTACT.whatsapp.display}), phone, or email (support@myvaultplus.com). You can also use the contact form on our Contact page. Our team is available 7 days a week.` },
      { q: 'What is the response time?', a: 'WhatsApp and phone support typically respond within 30 minutes. Email support typically responds within 2 business hours. Complex queries may take longer but will be acknowledged immediately.' },
    ],
  },
]

export default function FAQPage() {
  return (
    <div style={{ width: '100%', overflowX: 'hidden', background: '#F1F4EF' }}>
      <Navbar forceScrolled />
      <div style={{ height: 80 }} />

      <HeroSplit
        heading={
          <>
            <span style={{ display: 'block' }}>Frequently Asked</span>
            <span style={{ display: 'block', fontFamily: 'var(--font-manrope), sans-serif', fontStyle: 'italic', color: '#137333' }}>Questions.</span>
          </>
        }
        description="Everything you need to know about MyHealth Vault+™ and Health-Hub Africa® services."
        secondaryCta={{ label: 'Contact Support', href: '/contact' }}
        primaryCta={{ label: 'Get Started', href: 'https://portal.myvaultplus.com/register' }}
        image="https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1400&h=1800&fit=crop&q=85"
        imageAlt="FAQ — patient support"
        rightCards={
          <div style={{ position: 'relative', width: 304, height: 420 }}>
            <div style={{ position: 'absolute', top: 0, left: 0, width: 260, background: '#07251C', borderRadius: 24, padding: 24, boxShadow: '0 24px 64px rgba(0,0,0,0.52)', transform: 'rotate(-4deg)' }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6DC43F', marginBottom: 12 }}>FAQ Centre</div>
              <p style={{ color: '#fff', fontSize: 14, lineHeight: 1.55, fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 600, margin: 0 }}>19 questions across 5 categories, regularly updated.</p>
              <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>Updated June 2026</div>
              </div>
            </div>
            <div style={{ position: 'absolute', top: 158, left: 50, width: 232, background: '#fff', borderRadius: 22, padding: 20, boxShadow: '0 20px 48px rgba(0,0,0,0.38)', transform: 'rotate(3deg)' }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#137333', marginBottom: 14 }}>Response Time</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#F7FAF7', borderRadius: 10, padding: '10px 12px' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#6DC43F', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#07251C' }}>WhatsApp &amp; Phone</div>
                    <div style={{ fontSize: 11, color: '#617870' }}>Under 30 minutes</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#F7FAF7', borderRadius: 10, padding: '10px 12px' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#137333', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#07251C' }}>Email</div>
                    <div style={{ fontSize: 11, color: '#617870' }}>Under 2 hours</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        }
      />

      {/* FAQ accordion */}
      <div className="page-card" style={{ background: '#fff' }}>
        <section style={{ maxWidth: 860, margin: '0 auto', padding: '80px 48px' }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#137333', marginBottom: 16 }}>· FAQ</div>
            <h2 style={{ fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 700, fontSize: 'clamp(26px, 3vw, 38px)', lineHeight: 1.1, letterSpacing: '-0.025em', margin: '0 auto 14px', maxWidth: 560, color: '#07251C' }}>
              Frequently asked{' '}
              <em style={{ fontFamily: 'var(--font-manrope), sans-serif', fontStyle: 'italic', fontWeight: 700, color: '#137333' }}>questions</em>
            </h2>
            <p style={{ color: '#617870', fontSize: 15, lineHeight: 1.6, margin: '0 auto', maxWidth: 460 }}>
              Everything you need to know about MyHealth Vault+™ in one place.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {faqGroups.map((group) => (
              <div key={group.group}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#137333', padding: '20px 4px 10px' }}>
                  {group.group}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {group.items.map((item) => (
                    <details key={item.q}>
                      <summary style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 20,
                        background: '#F2F2F2',
                        borderRadius: 16,
                        padding: '18px 18px 18px 24px',
                        fontFamily: 'var(--font-manrope), sans-serif',
                        fontWeight: 600,
                        fontSize: 15.5,
                        color: '#07251C',
                        cursor: 'pointer',
                        listStyle: 'none',
                      }}>
                        <span>{item.q}</span>
                        <span style={{
                          width: 36,
                          height: 36,
                          borderRadius: '50%',
                          background: '#fff',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          fontSize: 22,
                          fontWeight: 300,
                          lineHeight: 1,
                          color: '#07251C',
                          boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                        }}>+</span>
                      </summary>
                      <div style={{ padding: '14px 24px 18px', borderRadius: '0 0 16px 16px', background: '#F8F8F8', marginTop: -4 }}>
                        <p style={{ color: '#41584E', fontSize: 14.5, lineHeight: 1.7, margin: 0 }}>{item.a}</p>
                      </div>
                    </details>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Still have questions */}
      <div className="page-card" style={{ background: '#07251C' }}>
        <section style={{ maxWidth: 1100, margin: '0 auto', padding: '88px 56px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 32, alignItems: 'center' }}>
            <div>
              <h3 style={{ fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 600, fontSize: 26, color: '#fff', margin: '0 0 12px' }}>Still have questions?</h3>
              <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 15, lineHeight: 1.6, margin: 0 }}>Our support team is available 7 days a week: WhatsApp, phone, or email.</p>
            </div>
            <div style={{ display: 'flex', gap: 12, flexShrink: 0, flexWrap: 'wrap' }}>
              <a href={CONTACT.whatsapp.waMe} style={{ display: 'inline-flex', alignItems: 'center', background: '#fff', color: '#07251C', textDecoration: 'none', fontWeight: 700, fontSize: 13, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '12px 22px', borderRadius: 100 }}>WhatsApp Support</a>
              <a href="mailto:support@myvaultplus.com" style={{ display: 'inline-flex', alignItems: 'center', background: '#6DC43F', color: '#07251C', textDecoration: 'none', fontWeight: 700, fontSize: 13, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '12px 22px', borderRadius: 100 }}>Email Support</a>
            </div>
          </div>
        </section>
      </div>

      <FinalCTA />
      <Footer />
    </div>
  )
}
