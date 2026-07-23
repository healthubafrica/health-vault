'use client'

import { useEffect, useState } from 'react'
import { LiveKitRoom, VideoConference } from '@livekit/components-react'
import '@livekit/components-styles'
import { telecareGuest, TelecareGuestPublicInfo, TelecareGuestLivekitJoin } from '@/lib/api'
import { Users, AlertTriangle, PhoneOff, Clock, Shield } from 'lucide-react'

function OtpGate({
  token,
  info,
  onJoined,
}: {
  token: string
  info: TelecareGuestPublicInfo
  onJoined: (join: TelecareGuestLivekitJoin) => void
}) {
  const [step, setStep] = useState<'request' | 'code'>('request')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function requestCode() {
    setLoading(true)
    setError('')
    try {
      await telecareGuest.requestOtp(token)
      setStep('code')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send code')
    } finally {
      setLoading(false)
    }
  }

  async function verifyCode() {
    if (code.length !== 6) { setError('Enter the 6-digit code'); return }
    setLoading(true)
    setError('')
    try {
      const join = await telecareGuest.verifyOtp(token, code.trim())
      onJoined(join)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Invalid code')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F7FAF7', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem' }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: '#EBF5EC', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', color: '#0E8567' }}>
            <Users size={24} />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#07251C', marginBottom: 8 }}>
            Hi {info.guestName}, you&apos;re invited to a video call
          </h1>
          <p style={{ fontSize: 14, color: '#41584E' }}>
            {info.patientFirstName} invited you to their consultation
            {info.providerName ? ` with ${info.providerName}` : ''} on Health Hub Africa.
          </p>
        </div>

        <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #E5E9E7', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {!info.canJoin ? (
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <Clock size={16} style={{ color: '#41584E', flexShrink: 0, marginTop: 2 }} />
              <p style={{ fontSize: 13, color: '#41584E' }}>
                This call isn&apos;t open yet. You can join starting 15 minutes before the scheduled time.
              </p>
            </div>
          ) : step === 'request' ? (
            <>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: '#EBF5EC', borderRadius: 14, padding: '0.75rem 1rem' }}>
                <Shield size={14} style={{ color: '#0E8567', flexShrink: 0, marginTop: 2 }} />
                <p style={{ fontSize: 12, color: '#27433A', lineHeight: 1.5 }}>
                  We&apos;ll email a one-time code to confirm it&apos;s really you before letting you into the call.
                </p>
              </div>
              {error && <p style={{ fontSize: 12, color: '#C0392B' }}>{error}</p>}
              <button
                onClick={requestCode}
                disabled={loading}
                style={{ background: '#0E8567', color: '#fff', border: 'none', borderRadius: 12, padding: '12px', fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
              >
                {loading ? 'Sending…' : 'Send access code'}
              </button>
            </>
          ) : (
            <>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#41584E', display: 'block', marginBottom: 6 }}>Access code</label>
                <input
                  type="text"
                  value={code}
                  onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  onKeyDown={e => e.key === 'Enter' && verifyCode()}
                  placeholder="000000"
                  inputMode="numeric"
                  style={{ width: '100%', borderRadius: 12, border: '1px solid #E5E9E7', padding: '10px 14px', fontSize: 22, fontWeight: 700, letterSpacing: 8, color: '#07251C', background: '#F7FAF7', boxSizing: 'border-box', textAlign: 'center' }}
                />
              </div>
              {error && <p style={{ fontSize: 12, color: '#C0392B' }}>{error}</p>}
              <button
                onClick={verifyCode}
                disabled={loading}
                style={{ background: '#0E8567', color: '#fff', border: 'none', borderRadius: 12, padding: '12px', fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
              >
                {loading ? 'Joining…' : 'Join call'}
              </button>
              <button
                onClick={requestCode}
                style={{ background: 'none', border: 'none', color: '#41584E', fontSize: 13, cursor: 'pointer', textDecoration: 'underline' }}
              >
                Resend code
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function GuestCallView({ join }: { join: TelecareGuestLivekitJoin }) {
  const [left, setLeft] = useState(false)

  if (left) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a1a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', textAlign: 'center', padding: '2rem' }}>
        <p style={{ fontSize: 16, fontWeight: 600 }}>You&apos;ve left the call. You can close this tab.</p>
      </div>
    )
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#0a0a0a' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1.25rem', borderBottom: '1px solid #222' }}>
        <span style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>Joined as {join.guestName} (guest)</span>
        <button
          onClick={() => setLeft(true)}
          style={{ background: '#dc2626', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <PhoneOff size={14} /> Leave Call
        </button>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <LiveKitRoom
          token={join.token}
          serverUrl={join.serverUrl}
          connect
          video
          audio
          onDisconnected={() => setLeft(true)}
          data-lk-theme="default"
          style={{ height: '100%' }}
        >
          <VideoConference />
        </LiveKitRoom>
      </div>
    </div>
  )
}

export function TelecareGuestScreen({ token }: { token: string }) {
  const [state, setState] = useState<
    | { status: 'loading' }
    | { status: 'error'; message: string }
    | { status: 'gate'; info: TelecareGuestPublicInfo }
    | { status: 'in-call'; join: TelecareGuestLivekitJoin }
  >({ status: 'loading' })

  useEffect(() => {
    telecareGuest.resolve(token)
      .then(info => setState({ status: 'gate', info }))
      .catch(e => setState({ status: 'error', message: e instanceof Error ? e.message : 'Failed to load invite' }))
  }, [token])

  if (state.status === 'loading') {
    return (
      <div style={{ minHeight: '100vh', background: '#F7FAF7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, border: '3px solid #E5E9E7', borderTopColor: '#0E8567', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }} />
          <p style={{ fontSize: 14, color: '#7A8C84' }}>Loading your invite…</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <div style={{ minHeight: '100vh', background: '#F7FAF7', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem' }}>
        <div style={{ textAlign: 'center', maxWidth: 380 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: '#FEF0EE', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
            <AlertTriangle size={24} style={{ color: '#C0392B' }} />
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#07251C', marginBottom: 8 }}>Invite unavailable</h1>
          <p style={{ fontSize: 14, color: '#41584E' }}>{state.message}</p>
        </div>
      </div>
    )
  }

  if (state.status === 'gate') {
    return <OtpGate token={token} info={state.info} onJoined={join => setState({ status: 'in-call', join })} />
  }

  return <GuestCallView join={state.join} />
}
