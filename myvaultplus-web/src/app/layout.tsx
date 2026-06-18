import type { Metadata } from 'next'
import { Space_Grotesk, Hanken_Grotesk, Playfair_Display } from 'next/font/google'
import './globals.css'

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-space-grotesk',
  display: 'swap',
})

const hankenGrotesk = Hanken_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-hanken-grotesk',
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
    'MyHealth Vault+™ is your personal digital health portal — built for Africa. Access records, book care, get specialist second opinions, and activate emergency dispatch from one secure place.',
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
      'Your personal digital health portal — built for Africa. Access records, book care, get specialist second opinions, and activate emergency dispatch.',
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
      className={`${spaceGrotesk.variable} ${hankenGrotesk.variable} ${playfairDisplay.variable}`}
    >
      <body style={{ fontFamily: 'var(--font-hanken-grotesk), sans-serif' }}>
        {children}
      </body>
    </html>
  )
}
