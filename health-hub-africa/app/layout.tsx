import type { Metadata } from 'next'
import { JetBrains_Mono, Manrope } from 'next/font/google'
import { ThemeProvider } from 'next-themes'
import { Toaster } from 'sonner'
import './globals.css'

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
  weight: ['400', '600'],
})

export const metadata: Metadata = {
  title: 'MyHealth Vault+™ | Health-Hub Africa®',
  description: 'Your secure patient portal for comprehensive health management.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${manrope.variable} ${jetbrainsMono.variable} h-full`}
    >
      <head />
      <body className="h-full antialiased">
        <ThemeProvider attribute="class" defaultTheme="light" disableTransitionOnChange>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                fontFamily: 'var(--font-body)',
                borderRadius: '12px',
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  )
}
