import type { Metadata } from 'next'
import { Manrope, Playfair_Display } from 'next/font/google'
import './globals.css'

const manrope = Manrope({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-manrope',
  display: 'swap',
})

const playfairDisplay = Playfair_Display({
  subsets: ['latin'],
  weight: ['600', '700'],
  style: ['italic'],
  variable: '--font-playfair-display',
  display: 'swap',
})

export const metadata: Metadata = {
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
  },
  title: 'MyHealth Vault+™ — Your Health. Secure. Always Within Reach.',
  description:
    'MyHealth Vault+™ is your personal digital health portal, built for Africa. Access records, book care, get specialist second opinions, and activate emergency dispatch from one secure place.',
  keywords: [
    'digital health',
    'health portal',
    'telemedicine',
    'Africa',
    'Nigeria',
    'medical records',
    'Expert Review',
    'DispatchCare',
  ],
  openGraph: {
    title: 'MyHealth Vault+™ — Your Health. Secure. Always Within Reach.',
    description:
      'Your personal digital health portal, built for Africa. Access records, book care, get specialist second opinions, and activate emergency dispatch.',
    url: 'https://www.myvaultplus.com',
    siteName: 'MyHealth Vault+™',
    type: 'website',
  },
  metadataBase: new URL('https://www.myvaultplus.com'),
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${manrope.variable} ${playfairDisplay.variable}`}
    >
      <body style={{ fontFamily: 'var(--font-manrope), sans-serif' }}>
        {children}
      </body>
    </html>
  )
}
