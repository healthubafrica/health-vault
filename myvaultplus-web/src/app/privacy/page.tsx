import Image from 'next/image'
import Navbar from '@/components/Navbar'
import FinalCTA from '@/components/FinalCTA'
import Footer from '@/components/Footer'
import HeroMarquee from '@/components/HeroMarquee'

const sections = [
  {
    id: 'who-we-are',
    label: 'Who We Are',
    content: `Health-Hub Africa® Limited ("Health-Hub Africa®", "we", "us", or "our") is the data controller responsible for your personal health data collected through MyHealth Vault+™. We are registered in Nigeria and committed to protecting your privacy in accordance with the Nigeria Data Protection Regulation (NDPR) 2019 and all applicable laws.

Our registered address is in Lagos, Nigeria. For all privacy-related inquiries, contact our Data Protection Officer at: dpo@myvaultplus.com.`,
  },
  {
    id: 'data-collected',
    label: 'What Data We Collect',
    content: `We collect the following categories of personal data when you use MyHealth Vault+™:

• Identity data: full name, date of birth, gender, profile photo
• Contact data: email address, phone number, residential address
• Health data: medical records, lab results, diagnoses, medications, consultation notes, imaging reports, and any documents you upload
• Account data: username, password (encrypted), subscription plan, payment information
• Usage data: log files, IP address, device type, browser, and usage patterns within the platform
• Location data: GPS coordinates (only when you activate DispatchCare™)

Health data is classified as sensitive personal data under the NDPR and is afforded the highest level of protection.`,
  },
  {
    id: 'how-we-use',
    label: 'How We Use Your Data',
    content: `We use your personal data only for the following purposes:

• Providing and improving the MyHealth Vault+™ platform and its services
• Enabling TeleCare™ consultations, Expert Review™ submissions, DispatchCare™ activations, and other services
• Processing payments and managing your subscription
• Communicating with you about your account, bookings, and service updates
• Complying with legal and regulatory obligations
• Detecting and preventing fraud or unauthorised access

We do not sell your personal data to third parties. We do not use your health data for advertising or profiling purposes.`,
  },
  {
    id: 'storage-security',
    label: 'Data Storage & Security',
    content: `Your data is stored on secure, encrypted servers. We implement the following security measures:

• End-to-end encryption for all data in transit (TLS 1.3)
• AES-256 encryption for data at rest
• Role-based access controls — only authorised personnel can access your data
• Regular security audits and penetration testing
• Automated intrusion detection and monitoring

Your health records are stored in Nigeria (primary) with encrypted backups. We retain your data for as long as your account remains active. You may request deletion of your account and associated data at any time.`,
  },
  {
    id: 'data-sharing',
    label: 'Data Sharing',
    content: `We share your data only in the following circumstances:

• With clinicians, specialists, or facilities you explicitly authorise through the platform
• With Expert Review™ panel specialists to fulfil your review request
• With payment processors to handle transactions (they receive only what is necessary)
• With trusted technology partners who support platform operations (under strict data processing agreements)
• When required by Nigerian law, court order, or regulatory authority

We do not share your health data with employers, insurers, or third parties without your explicit consent.`,
  },
  {
    id: 'your-rights',
    label: 'Your Rights',
    content: `Under the NDPR 2019, you have the following rights regarding your personal data:

• Right of access: request a copy of the personal data we hold about you
• Right to rectification: request correction of inaccurate or incomplete data
• Right to erasure: request deletion of your personal data (subject to legal obligations)
• Right to restriction: request we limit processing of your data
• Right to data portability: receive your data in a structured, machine-readable format
• Right to object: object to processing based on legitimate interests
• Right to withdraw consent: for consent-based processing, withdraw consent at any time

To exercise any of these rights, contact us at: privacy@myvaultplus.com or write to our DPO at our registered Lagos address.`,
  },
  {
    id: 'cookies',
    label: 'Cookies',
    content: `MyHealth Vault+™ uses cookies and similar tracking technologies to:

• Keep you signed in to your account (session cookies — essential)
• Remember your preferences (functional cookies)
• Analyse platform usage to improve our services (analytics cookies)

You can control cookie settings through your browser settings. Essential cookies cannot be disabled as they are required for the platform to function. You will be asked for consent before any non-essential cookies are set.`,
  },
  {
    id: 'contact',
    label: 'Contact Us',
    content: `For any privacy-related questions, requests, or complaints, contact us:

Data Protection Officer: dpo@myvaultplus.com
Privacy Team: privacy@myvaultplus.com
Address: Health-Hub Africa® Limited, Lagos, Nigeria

If you are dissatisfied with our response, you have the right to lodge a complaint with the Nigeria Data Protection Bureau (NDPB).`,
  },
]

export default function PrivacyPage() {
  return (
    <div style={{ width: '100%', overflowX: 'hidden', background: '#F1F4EF' }}>
      <Navbar />

      <div style={{ margin: '16px 16px 24px', borderRadius: 28, overflow: 'hidden' }}>
        <section style={{ position: 'relative', background: '#041E14', overflow: 'hidden', minHeight: '88vh', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Image src="https://images.unsplash.com/photo-1614064641938-3bbee52942c7?w=1920&h=1080&fit=crop&q=85" alt="Data privacy and security" fill priority style={{ objectFit: 'cover', objectPosition: 'center' }} sizes="100vw" />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(160deg, rgba(4,30,20,0.78) 0%, rgba(7,37,28,0.65) 50%, rgba(4,18,12,0.82) 100%)', pointerEvents: 'none' }} />

          <div style={{ position: 'relative', maxWidth: 760, width: '100%', margin: '0 auto', padding: '120px 32px 0', textAlign: 'center', zIndex: 1 }}>
            <h1 style={{ margin: '0 0 18px', lineHeight: 1.06, fontFamily: 'var(--font-space-grotesk), sans-serif' }}>
              <span style={{ display: 'block', fontWeight: 700, fontSize: 'clamp(32px, 5.5vw, 58px)', color: '#fff', letterSpacing: '-0.03em', lineHeight: 1.06 }}>Your Privacy.</span>
              <span style={{ display: 'block', fontFamily: 'var(--font-playfair-display), serif', fontStyle: 'italic', fontWeight: 700, fontSize: 'clamp(32px, 5.5vw, 58px)', color: '#34E0A0', letterSpacing: '-0.02em', lineHeight: 1.06 }}>Our Commitment.</span>
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.78)', fontSize: 16, lineHeight: 1.65, maxWidth: 520, margin: '0 auto 32px' }}>
              How we collect, use, and protect your personal health data at MyHealth Vault+™.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
              <a href="/terms" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(8px)', border: '1.5px solid rgba(255,255,255,0.55)', color: '#fff', textDecoration: 'none', fontWeight: 700, fontSize: 13, letterSpacing: '0.07em', textTransform: 'uppercase', padding: '13px 26px', borderRadius: 100 }}>
                View Terms
              </a>
              <a href="/contact" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: '#34E0A0', color: '#07251C', textDecoration: 'none', fontWeight: 700, fontSize: 13, letterSpacing: '0.07em', textTransform: 'uppercase', padding: '12px 12px 12px 24px', borderRadius: 100 }}>
                Contact Us
                <span style={{ width: 30, height: 30, borderRadius: '50%', background: '#07251C', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M5 19L19 5M19 5H9M19 5v10" stroke="#34E0A0" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </span>
              </a>
            </div>
          </div>

          <HeroMarquee marginTop={80} />
        </section>
      </div>

      {/* Privacy prose */}
      <div style={{ margin: '0 24px 24px', borderRadius: 28, overflow: 'hidden', background: '#fff' }}>
        <section style={{ maxWidth: 820, margin: '0 auto', padding: '88px 56px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 56 }}>
            {sections.map((section) => (
              <div key={section.id} id={section.id}>
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#0E8567', marginBottom: 12 }}>
                  — {section.label}
                </div>
                <h2 style={{ fontFamily: 'var(--font-space-grotesk), sans-serif', fontWeight: 600, fontSize: 22, color: '#07251C', margin: '0 0 16px', letterSpacing: '-0.01em' }}>
                  {section.label}
                </h2>
                {section.content.split('\n\n').map((para, idx) => (
                  <p key={idx} style={{ color: '#41584E', fontSize: 15, lineHeight: 1.75, margin: '0 0 14px', whiteSpace: 'pre-line' }}>{para}</p>
                ))}
              </div>
            ))}
          </div>
          <p style={{ color: '#7A8C84', fontSize: 13, marginTop: 64 }}>Last updated: June 2026</p>
        </section>
      </div>

      <FinalCTA />
      <Footer />
    </div>
  )
}
