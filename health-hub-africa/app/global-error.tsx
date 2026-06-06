'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'
import { RefreshCw } from 'lucide-react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="en">
      <body style={{ margin: 0, background: '#F4F6F5', fontFamily: 'sans-serif' }}>
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            padding: '24px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: '#FDECEA',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#C0392B" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <div>
            <p style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 700, color: '#1A1A1A' }}>
              Something went wrong
            </p>
            <p style={{ margin: 0, fontSize: 13, color: '#6B6B6B', maxWidth: 320 }}>
              An unexpected error occurred. Our team has been notified and is looking into it.
            </p>
          </div>
          <button
            onClick={reset}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 20px',
              borderRadius: 12,
              border: '1px solid #EBEFEF',
              background: '#fff',
              color: '#137333',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={14} />
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
