import Navbar from '@/components/Navbar'
import FinalCTA from '@/components/FinalCTA'
import Footer from '@/components/Footer'
import HeroSplit from '@/components/HeroSplit'

const sections = [
  {
    id: 'acceptance',
    label: 'Acceptance of Terms',
    content: `By accessing, registering for, or using MyHealth Vault+™ (the "Platform"), you agree to be bound by these Terms of Use ("Terms"). These Terms constitute a legally binding agreement between you and Health-Hub Africa® Limited ("Health-Hub Africa®", "we", "us", or "our").

If you do not agree to these Terms in their entirety, you must not use the Platform. Your continued use of the Platform after any amendment to these Terms constitutes your acceptance of the updated Terms.

These Terms apply to all users of the Platform, including patients, corporate account holders, and any other persons who access or use the Platform in any capacity.`,
  },
  {
    id: 'services',
    label: 'The Services',
    content: `MyHealth Vault+™ provides a digital health portal offering the following services: TeleCare™ (remote medical consultations), Expert Review™ (specialist second opinion reviews), DispatchCare™ (emergency medical dispatch coordination), MinuteCare™ (clinic fast-track scheduling), CareTest™ (diagnostic test bookings), HealthConsult™ (preventive care), and NeuroFlex™ (neurology specialist access).

IMPORTANT HEALTH DISCLAIMER: The services provided through this Platform are intended to supplement (not replace) your relationship with qualified healthcare providers. Nothing on the Platform constitutes medical advice, diagnosis, or treatment. Always seek the advice of a qualified physician or other qualified health provider with any questions about a medical condition. In the event of a medical emergency, call emergency services immediately.

Health-Hub Africa® does not employ the specialists, physicians, or healthcare providers who deliver services through the Platform. These professionals are independent contractors or affiliated partners who operate under their own professional licences and standards.`,
  },
  {
    id: 'registration',
    label: 'Account Registration',
    content: `To use most features of the Platform, you must create an account. You agree to:

• Provide accurate, complete, and current information during registration
• Maintain the accuracy of your account information and update it promptly if it changes
• Maintain the security and confidentiality of your login credentials
• Immediately notify us at support@myvaultplus.com if you suspect unauthorised access to your account
• Accept responsibility for all activities that occur under your account

You must be at least 18 years of age to create an account. Accounts for minors must be created and managed by a parent or legal guardian.

Health-Hub Africa® reserves the right to suspend or terminate accounts that violate these Terms or where we reasonably suspect fraudulent activity.`,
  },
  {
    id: 'billing',
    label: 'Subscription & Billing',
    content: `Certain features of the Platform are available only on paid subscription plans. By subscribing to a paid plan, you agree to pay the applicable fees as set out on the Plans page.

Subscriptions are billed monthly in advance. All fees are quoted and charged in Nigerian Naira (₦) unless otherwise stated. Fees are non-refundable except where required by law or where we have made an error.

You may upgrade or downgrade your plan at any time. Upgrades take effect immediately; downgrades take effect at the start of the next billing cycle. You may cancel your subscription at any time; cancellation takes effect at the end of the current billing period.

Health-Hub Africa® reserves the right to change pricing with 30 days' notice. Continued use of paid services after a pricing change constitutes acceptance of the new pricing.`,
  },
  {
    id: 'disclaimer',
    label: 'Health Information Disclaimer',
    content: `The content available through MyHealth Vault+™, including Expert Review™ reports, HealthConsult™ programmes, and any other health information, is provided for informational purposes only and does not constitute medical advice.

Expert Review™ reports represent the independent professional opinion of the specialist(s) who reviewed your case. These opinions are provided to inform your decision-making and should be discussed with your treating physician. Health-Hub Africa® makes no warranty as to the accuracy or completeness of any clinical opinion provided.

DispatchCare™ coordinates emergency response but cannot guarantee specific response times. Emergency response is subject to availability of responders, traffic conditions, and other factors outside our control. DispatchCare™ is not a substitute for calling emergency services (e.g. 112 or local emergency numbers).`,
  },
  {
    id: 'prohibited',
    label: 'Prohibited Use',
    content: `You agree not to use the Platform to:

• Violate any applicable law or regulation
• Upload or transmit false, misleading, or fraudulent health information
• Impersonate any person or entity, or misrepresent your affiliation
• Attempt to gain unauthorised access to any part of the Platform or its systems
• Interfere with or disrupt the Platform's operation or the servers and networks connected to it
• Use the Platform for any purpose other than your personal healthcare management (or organisation management for corporate accounts)
• Scrape, copy, or extract data from the Platform without written authorisation
• Upload malware, viruses, or any other harmful code

Violation of these prohibitions may result in immediate account suspension or termination and may be reported to relevant authorities.`,
  },
  {
    id: 'ip',
    label: 'Intellectual Property',
    content: `All content on the Platform (including the MyHealth Vault+™ name and trademark, Health-Hub Africa® name and trademark, software, design, text, graphics, logos, and service names) are the intellectual property of Health-Hub Africa® Limited or its licensors and are protected by Nigerian and international intellectual property laws.

You are granted a limited, non-exclusive, non-transferable licence to access and use the Platform for personal healthcare management purposes. You may not copy, reproduce, modify, distribute, or create derivative works from any content on the Platform without our prior written consent.

Your health data remains your property. By uploading data to the Platform, you grant Health-Hub Africa® a limited licence to process and store that data for the purpose of providing the services.`,
  },
  {
    id: 'liability',
    label: 'Limitation of Liability',
    content: `To the maximum extent permitted by applicable Nigerian law, Health-Hub Africa® shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Platform or any services provided through it.

Our total cumulative liability to you for any claims arising out of or relating to these Terms or your use of the Platform shall not exceed the total fees you have paid to us in the 12 months preceding the claim.

Nothing in these Terms limits our liability for death or personal injury caused by our negligence, fraud or fraudulent misrepresentation, or any other liability that cannot be excluded by law.`,
  },
  {
    id: 'governing-law',
    label: 'Governing Law',
    content: `These Terms shall be governed by and construed in accordance with the laws of the Federal Republic of Nigeria. Any dispute arising out of or in connection with these Terms or your use of the Platform shall be subject to the exclusive jurisdiction of the courts of the Federal Republic of Nigeria.

If any provision of these Terms is found to be unlawful, void, or unenforceable, the remaining provisions shall continue in full force and effect.`,
  },
  {
    id: 'changes',
    label: 'Changes to Terms',
    content: `Health-Hub Africa® reserves the right to modify these Terms at any time. We will notify you of material changes by email (to the address associated with your account) or by posting a notice on the Platform at least 30 days before the changes take effect.

Your continued use of the Platform after the effective date of any changes constitutes your acceptance of the revised Terms. If you do not agree to the revised Terms, you must stop using the Platform and may request account closure.

For questions about these Terms, contact us at: legal@myvaultplus.com`,
  },
]

export default function TermsPage() {
  return (
    <div style={{ width: '100%', overflowX: 'hidden', background: '#F1F4EF' }}>
      <Navbar forceScrolled />
      <div style={{ height: 80 }} />

      <HeroSplit
        heading={
          <>
            <span style={{ display: 'block' }}>Terms of Use</span>
            <span style={{ display: 'block', fontFamily: 'var(--font-playfair-display), serif', fontStyle: 'italic', color: '#0E8567' }}>Your Rights and Ours.</span>
          </>
        }
        description="The terms governing your use of MyHealth Vault+™ and Health-Hub Africa® services."
        secondaryCta={{ label: 'View Privacy Policy', href: '/privacy' }}
        primaryCta={{ label: 'Get Started', href: 'https://portal.myvaultplus.com/register' }}
        image="https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=1400&h=1800&fit=crop&q=85"
        imageAlt="Legal terms document"
        rightCards={
          <div style={{ position: 'relative', width: 304, height: 420 }}>
            <div style={{ position: 'absolute', top: 0, left: 0, width: 260, background: '#07251C', borderRadius: 24, padding: 24, boxShadow: '0 24px 64px rgba(0,0,0,0.52)', transform: 'rotate(-4deg)' }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#34E0A0', marginBottom: 12 }}>Terms of Use</div>
              <p style={{ color: '#fff', fontSize: 14, lineHeight: 1.55, fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 600, margin: 0 }}>10 sections covering your rights, obligations, and platform governance.</p>
              <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>Updated June 2026</div>
              </div>
            </div>
            <div style={{ position: 'absolute', top: 158, left: 50, width: 232, background: '#fff', borderRadius: 22, padding: 20, boxShadow: '0 20px 48px rgba(0,0,0,0.38)', transform: 'rotate(3deg)' }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#0E8567', marginBottom: 14 }}>Jurisdiction</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#F7FAF7', borderRadius: 10, padding: '10px 12px' }}>
                  <span style={{ width: 22, height: 22, borderRadius: '50%', background: '#07251C', color: '#34E0A0', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, flexShrink: 0 }}>NG</span>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#07251C' }}>Federal Republic of Nigeria</div>
                    <div style={{ fontSize: 11, color: '#617870' }}>Governing Law</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#F7FAF7', borderRadius: 10, padding: '10px 12px' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#34E0A0', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#07251C' }}>NDPR 2019 Compliant</div>
                    <div style={{ fontSize: 11, color: '#617870' }}>Data Protection</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        }
      />

      {/* Terms prose */}
      <div style={{ margin: '0 24px 24px', borderRadius: 28, overflow: 'hidden', background: '#fff' }}>
        <section style={{ maxWidth: 820, margin: '0 auto', padding: '88px 56px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 56 }}>
            {sections.map((section) => (
              <div key={section.id} id={section.id}>
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#0E8567', marginBottom: 12 }}>
                  — {section.label}
                </div>
                <h2 style={{ fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 600, fontSize: 22, color: '#07251C', margin: '0 0 16px', letterSpacing: '-0.01em' }}>
                  {section.label}
                </h2>
                {section.content.split('\n\n').map((para, idx) => (
                  <p key={idx} style={{ color: '#41584E', fontSize: 15, lineHeight: 1.75, margin: '0 0 14px', whiteSpace: 'pre-line' }}>{para}</p>
                ))}
              </div>
            ))}
          </div>
          <p style={{ color: '#7A8C84', fontSize: 13, marginTop: 64 }}>
            Last updated: June 2026 · These Terms are governed by the laws of the Federal Republic of Nigeria.
          </p>
        </section>
      </div>

      <FinalCTA />
      <Footer />
    </div>
  )
}
