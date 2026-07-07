'use client'

import { useEffect, useState } from 'react'
import { publicShare, type SharePayload, type ShareAccessMode } from '@/lib/api'
import { buildProviderDisplayName } from '@/lib/providerName'
import {
  Shield,
  FileText,
  FlaskConical,
  Scan,
  Pill,
  Stethoscope,
  ClipboardList,
  Star,
  Download,
  AlertTriangle,
  Lock,
  Users,
} from 'lucide-react'

const RECORD_TYPE_ICON: Record<string, React.ReactNode> = {
  visit: <Stethoscope size={14} />,
  prescription: <Pill size={14} />,
  lab: <FlaskConical size={14} />,
  imaging: <Scan size={14} />,
  document: <FileText size={14} />,
  referral: <ClipboardList size={14} />,
  expert_review: <Star size={14} />,
}

const RECORD_TYPE_LABELS: Record<string, string> = {
  visit: 'Visit',
  prescription: 'Prescription',
  lab: 'Lab Result',
  imaging: 'Imaging',
  document: 'Document',
  referral: 'Referral',
  expert_review: 'Expert Review',
}

function RecordCard({ record }: { record: SharePayload['records'][number] }) {
  const providerName = record.provider ? buildProviderDisplayName(record.provider) : null

  return (
    <div
      className="rounded-2xl border p-4"
      style={{ background: '#fff', borderColor: '#E5E9E7' }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: '#EBF5EC', color: '#0E8567' }}
        >
          {RECORD_TYPE_ICON[record.recordType] ?? <FileText size={14} />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span
              className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
              style={{ background: '#EBF5EC', color: '#0E8567' }}
            >
              {RECORD_TYPE_LABELS[record.recordType] ?? record.recordType}
            </span>
            <span className="text-xs" style={{ color: '#7A8C84' }}>
              {new Date(record.recordedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          </div>
          <p className="text-sm font-semibold" style={{ color: '#07251C' }}>{record.title}</p>
          {record.description && (
            <p className="text-xs mt-1 leading-relaxed" style={{ color: '#41584E' }}>{record.description}</p>
          )}
          {providerName && (
            <p className="text-xs mt-1.5" style={{ color: '#7A8C84' }}>
              {providerName} · {record.provider?.specialty}
            </p>
          )}
          {record.fileUrl && record.isDownloadable && (
            <a
              href={record.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 mt-2 text-xs font-semibold px-3 py-1.5 rounded-xl"
              style={{ background: '#0E8567', color: '#fff', textDecoration: 'none' }}
            >
              <Download size={12} />
              Download file
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

function OtpGate({ token, onSuccess }: { token: string; onSuccess: (payload: SharePayload) => void }) {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function requestOtp() {
    if (!email.trim()) { setError('Enter your email'); return }
    setLoading(true)
    setError('')
    try {
      await publicShare.requestOtp(token, email.trim())
      setStep('code')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send code')
    } finally {
      setLoading(false)
    }
  }

  async function verifyOtp() {
    if (code.length !== 6) { setError('Enter the 6-digit code'); return }
    setLoading(true)
    setError('')
    try {
      const payload = await publicShare.verifyOtp(token, email.trim(), code.trim())
      onSuccess(payload)
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
            Verify your access
          </h1>
          <p style={{ fontSize: 14, color: '#41584E' }}>
            {step === 'email'
              ? 'Enter your email to receive a one-time access code'
              : `We sent a 6-digit code to ${email}`}
          </p>
        </div>

        <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #E5E9E7', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {step === 'email' ? (
            <>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#41584E', display: 'block', marginBottom: 6 }}>Email address</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && requestOtp()}
                  placeholder="your@email.com"
                  style={{ width: '100%', borderRadius: 12, border: '1px solid #E5E9E7', padding: '10px 14px', fontSize: 14, color: '#07251C', background: '#F7FAF7', boxSizing: 'border-box' }}
                />
              </div>
              {error && <p style={{ fontSize: 12, color: '#C0392B' }}>{error}</p>}
              <button
                onClick={requestOtp}
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
                  onKeyDown={e => e.key === 'Enter' && verifyOtp()}
                  placeholder="000000"
                  inputMode="numeric"
                  style={{ width: '100%', borderRadius: 12, border: '1px solid #E5E9E7', padding: '10px 14px', fontSize: 22, fontWeight: 700, letterSpacing: 8, color: '#07251C', background: '#F7FAF7', boxSizing: 'border-box', textAlign: 'center' }}
                />
              </div>
              {error && <p style={{ fontSize: 12, color: '#C0392B' }}>{error}</p>}
              <button
                onClick={verifyOtp}
                disabled={loading}
                style={{ background: '#0E8567', color: '#fff', border: 'none', borderRadius: 12, padding: '12px', fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
              >
                {loading ? 'Verifying…' : 'Access records'}
              </button>
              <button
                onClick={() => { setStep('email'); setCode(''); setError('') }}
                style={{ background: 'none', border: 'none', color: '#41584E', fontSize: 13, cursor: 'pointer', textDecoration: 'underline' }}
              >
                Use a different email
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function PasswordGate({ token, onSuccess }: { token: string; onSuccess: (payload: SharePayload) => void }) {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function verify() {
    if (!password) { setError('Enter the password'); return }
    setLoading(true)
    setError('')
    try {
      const payload = await publicShare.verifyPassword(token, password)
      onSuccess(payload)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Incorrect password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F7FAF7', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem' }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: '#EBF5EC', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', color: '#0E8567' }}>
            <Lock size={24} />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#07251C', marginBottom: 8 }}>Password required</h1>
          <p style={{ fontSize: 14, color: '#41584E' }}>Enter the password shared with you to access these records</p>
        </div>

        <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #E5E9E7', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#41584E', display: 'block', marginBottom: 6 }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && verify()}
              placeholder="Enter password"
              style={{ width: '100%', borderRadius: 12, border: '1px solid #E5E9E7', padding: '10px 14px', fontSize: 14, color: '#07251C', background: '#F7FAF7', boxSizing: 'border-box' }}
            />
          </div>
          {error && <p style={{ fontSize: 12, color: '#C0392B' }}>{error}</p>}
          <button
            onClick={verify}
            disabled={loading}
            style={{ background: '#0E8567', color: '#fff', border: 'none', borderRadius: 12, padding: '12px', fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'Verifying…' : 'Access records'}
          </button>
        </div>
      </div>
    </div>
  )
}

function RecordsView({ payload }: { payload: SharePayload }) {
  return (
    <div style={{ minHeight: '100vh', background: '#F7FAF7', padding: '2rem 1rem 4rem' }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1rem' }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: '#07251C', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shield size={16} style={{ color: '#34E0A0' }} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#07251C', letterSpacing: -0.3 }}>Health Hub Africa</span>
          </div>

          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#07251C', marginBottom: 4 }}>
            {payload.patientName}&apos;s health records
          </h1>
          {payload.expiresAt && (
            <p style={{ fontSize: 12, color: '#7A8C84', display: 'flex', alignItems: 'center', gap: 4 }}>
              <AlertTriangle size={12} />
              This link expires on {new Date(payload.expiresAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          )}
        </div>

        {/* Security notice */}
        <div style={{ background: '#EBF5EC', border: '1px solid #C8E8C8', borderRadius: 14, padding: '0.75rem 1rem', marginBottom: '1.5rem', display: 'flex', gap: 10 }}>
          <Shield size={14} style={{ color: '#0E8567', flexShrink: 0, marginTop: 2 }} />
          <p style={{ fontSize: 12, color: '#27433A', lineHeight: 1.5 }}>
            These records were shared with you by the patient. Do not redistribute this link.
          </p>
        </div>

        {/* Records */}
        {payload.records.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 0', color: '#7A8C84' }}>
            <FileText size={40} style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
            <p style={{ fontSize: 14 }}>No records in this share</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {payload.records.map(r => (
              <RecordCard key={r.id} record={r} />
            ))}
          </div>
        )}

        <p style={{ textAlign: 'center', fontSize: 11, color: '#7A8C84', marginTop: '3rem' }}>
          Powered by Health Hub Africa® · Records are confidential
        </p>
      </div>
    </div>
  )
}

interface InitialState {
  requiresAuth: true
  shareId: string
  accessMode: ShareAccessMode
  recordTypes: string[]
}

export function PublicShareScreen({ token }: { token: string }) {
  const [state, setState] = useState<
    | { status: 'loading' }
    | { status: 'error'; message: string }
    | { status: 'gate'; accessMode: ShareAccessMode }
    | { status: 'ready'; payload: SharePayload }
  >({ status: 'loading' })

  useEffect(() => {
    publicShare.resolve(token).then(res => {
      if ('requiresAuth' in res && res.requiresAuth) {
        setState({ status: 'gate', accessMode: (res as InitialState).accessMode })
      } else {
        setState({ status: 'ready', payload: res as SharePayload })
      }
    }).catch(e => {
      setState({ status: 'error', message: e instanceof Error ? e.message : 'Failed to load shared records' })
    })
  }, [token])

  if (state.status === 'loading') {
    return (
      <div style={{ minHeight: '100vh', background: '#F7FAF7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, border: '3px solid #E5E9E7', borderTopColor: '#0E8567', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }} />
          <p style={{ fontSize: 14, color: '#7A8C84' }}>Loading shared records…</p>
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
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#07251C', marginBottom: 8 }}>Link unavailable</h1>
          <p style={{ fontSize: 14, color: '#41584E' }}>{state.message}</p>
        </div>
      </div>
    )
  }

  if (state.status === 'gate') {
    if (state.accessMode === 'email_list') {
      return <OtpGate token={token} onSuccess={payload => setState({ status: 'ready', payload })} />
    }
    if (state.accessMode === 'password') {
      return <PasswordGate token={token} onSuccess={payload => setState({ status: 'ready', payload })} />
    }
  }

  if (state.status === 'ready') {
    return <RecordsView payload={state.payload} />
  }

  return null
}
