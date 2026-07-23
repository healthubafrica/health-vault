'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Video, VideoOff, Mic, MicOff, AlertCircle, Sparkles } from 'lucide-react'

interface DeviceCheckScreenProps {
  providerName?: string
  onJoin: (opts: { blurBackground: boolean }) => void
  onCancel: () => void
}

/**
 * Pre-call camera/mic preview. Catching a blocked device *here* — before the
 * consult starts eating into paid call time — is the whole point: this is
 * exactly the failure mode the permission-error tooltip in TeleCareScreen
 * exists to explain after the fact.
 */
export function DeviceCheckScreen({ providerName, onJoin, onCancel }: DeviceCheckScreenProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [error, setError] = useState<'permission' | 'device' | null>(null)
  const [ready, setReady] = useState(false)
  const [camOn, setCamOn] = useState(true)
  const [micOn, setMicOn] = useState(true)
  const [micLevel, setMicLevel] = useState(0)
  const [blurBackground, setBlurBackground] = useState(false)

  useEffect(() => {
    let cancelled = false
    let audioCtx: AudioContext | null = null
    let rafId: number | null = null

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) videoRef.current.srcObject = stream
        setReady(true)

        // Simple level meter so the patient gets visual proof their mic is
        // actually picking up sound, not just a silent "granted" state.
        audioCtx = new AudioContext()
        const source = audioCtx.createMediaStreamSource(stream)
        const analyser = audioCtx.createAnalyser()
        analyser.fftSize = 256
        source.connect(analyser)
        const data = new Uint8Array(analyser.frequencyBinCount)
        const tick = () => {
          analyser.getByteFrequencyData(data)
          const avg = data.reduce((a, b) => a + b, 0) / data.length
          setMicLevel(Math.min(100, Math.round((avg / 255) * 100 * 3)))
          rafId = requestAnimationFrame(tick)
        }
        tick()
      } catch (err) {
        const isPermission =
          err instanceof DOMException &&
          (err.name === 'NotAllowedError' || err.name === 'SecurityError')
        setError(isPermission ? 'permission' : 'device')
      }
    }
    start()

    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach((t) => t.stop())
      if (rafId) cancelAnimationFrame(rafId)
      audioCtx?.close().catch(() => null)
    }
  }, [])

  useEffect(() => {
    streamRef.current?.getVideoTracks().forEach((t) => { t.enabled = camOn })
  }, [camOn])

  useEffect(() => {
    streamRef.current?.getAudioTracks().forEach((t) => { t.enabled = micOn })
  }, [micOn])

  const handleJoin = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    onJoin({ blurBackground })
  }

  return (
    <div className="flex flex-col gap-5 pb-20 md:pb-5">
      <div>
        <h1 className="text-xl font-bold" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-display)' }}>
          Ready to join{providerName ? ` ${providerName}` : ' your consultation'}?
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
          Check your camera and microphone before the call starts.
        </p>
      </div>

      <Card padding="none" className="overflow-hidden">
        <div className="relative h-[320px] flex items-center justify-center" style={{ background: '#0a1a0a' }}>
          {error ? (
            <div className="text-center px-6 max-w-sm">
              <AlertCircle size={28} style={{ color: 'var(--color-emergency)' }} className="mx-auto mb-3" />
              {error === 'permission' ? (
                <div className="text-left text-xs rounded-xl border p-4 flex flex-col gap-2" style={{ borderColor: 'rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.8)' }}>
                  <p className="font-semibold text-white">Your browser is blocking camera/microphone access. Here&apos;s the fix:</p>
                  <p><strong>Chrome / Edge:</strong> click the padlock icon left of the address bar → Site settings → set Camera and Microphone to &quot;Allow&quot; → reload this page.</p>
                  <p><strong>Safari:</strong> Safari menu → Settings → Websites → Camera / Microphone → set this site to &quot;Allow&quot; → reload this page.</p>
                </div>
              ) : (
                <p className="text-sm text-white/70">
                  Couldn&apos;t access your camera or microphone. Check that no other app or browser tab is using them, then try again.
                </p>
              )}
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
                style={{ transform: 'scaleX(-1)', display: camOn ? 'block' : 'none' }}
              />
              {!camOn && (
                <div className="flex flex-col items-center gap-2 text-white/50">
                  <VideoOff size={28} />
                  <p className="text-xs font-semibold">Camera off</p>
                </div>
              )}
            </>
          )}
        </div>

        {!error && (
          <div className="flex flex-col gap-3 p-4" style={{ background: 'var(--color-surface)' }}>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setCamOn((v) => !v)}
                aria-label={camOn ? 'Turn camera off' : 'Turn camera on'}
                aria-pressed={camOn}
                className="w-11 h-11 rounded-full flex items-center justify-center border transition-colors"
                style={{
                  borderColor: 'var(--color-border)',
                  background: camOn ? 'var(--color-bg)' : 'var(--color-emergency)',
                  color: camOn ? 'var(--color-text)' : '#fff',
                }}
              >
                {camOn ? <Video size={16} /> : <VideoOff size={16} />}
              </button>
              <button
                onClick={() => setMicOn((v) => !v)}
                aria-label={micOn ? 'Mute microphone' : 'Unmute microphone'}
                aria-pressed={micOn}
                className="w-11 h-11 rounded-full flex items-center justify-center border transition-colors"
                style={{
                  borderColor: 'var(--color-border)',
                  background: micOn ? 'var(--color-bg)' : 'var(--color-emergency)',
                  color: micOn ? 'var(--color-text)' : '#fff',
                }}
              >
                {micOn ? <Mic size={16} /> : <MicOff size={16} />}
              </button>
              <div className="flex-1 max-w-[120px] h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-border)' }} aria-hidden="true">
                <div
                  className="h-full rounded-full transition-all duration-100"
                  style={{ width: `${micOn ? micLevel : 0}%`, background: '#6DC43F' }}
                />
              </div>
            </div>
            <label className="flex items-center justify-center gap-2 text-xs cursor-pointer" style={{ color: 'var(--color-text-muted)' }}>
              <input
                type="checkbox"
                checked={blurBackground}
                onChange={(e) => setBlurBackground(e.target.checked)}
                className="w-3.5 h-3.5 rounded"
              />
              <Sparkles size={13} />
              Blur my background
            </label>
          </div>
        )}
      </Card>

      <div className="flex gap-3">
        <Button variant="secondary" onClick={onCancel} fullWidth>Cancel</Button>
        <Button onClick={handleJoin} disabled={!ready && !error} fullWidth>
          {error ? 'Join Anyway' : 'Join Now'}
        </Button>
      </div>
    </div>
  )
}
