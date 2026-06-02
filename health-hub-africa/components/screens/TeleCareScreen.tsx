import { Card, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Pill } from '@/components/ui/Pill'
import { Avatar } from '@/components/ui/Avatar'
import { PATIENT } from '@/lib/data/patient'
import { Video, Mic, MicOff, PhoneOff, Clock } from 'lucide-react'

export function TeleCareScreen() {
  return (
    <div className="flex flex-col gap-5 pb-20 md:pb-5">
      <div>
        <h1 className="text-xl font-bold" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-display)' }}>
          TeleCare™
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
          Virtual health consultations
        </p>
      </div>

      {/* Video area */}
      <Card className="relative overflow-hidden" padding="none">
        <div
          className="h-[280px] flex flex-col items-center justify-center gap-4"
          style={{ background: '#0a1a0a' }}
          aria-label="Video consultation area"
        >
          <Avatar seed={PATIENT.doctor.name} size="lg" shape="circle" alt={PATIENT.doctor.name} />
          <div className="text-center">
            <p className="text-white font-semibold text-sm">{PATIENT.doctor.name}</p>
            <p className="text-white/50 text-xs">{PATIENT.doctor.specialty}</p>
          </div>
          <Pill variant="success">Available Now</Pill>
        </div>
        {/* Controls */}
        <div
          className="flex items-center justify-center gap-4 p-4"
          style={{ background: 'var(--color-surface)' }}
        >
          <button
            aria-label="Toggle microphone"
            className="flex items-center justify-center w-11 h-11 rounded-full border transition-colors hover:bg-[var(--color-bg)]"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
          >
            <Mic size={18} />
          </button>
          <Button size="lg" className="px-6 gap-2">
            <Video size={16} /> Start Session
          </Button>
          <button
            aria-label="End call"
            className="flex items-center justify-center w-11 h-11 rounded-full transition-colors hover:bg-[#FDECEA]"
            style={{ background: 'var(--color-error-bg)', color: 'var(--color-emergency)' }}
          >
            <PhoneOff size={18} />
          </button>
        </div>
      </Card>

      {/* Session history */}
      <Card>
        <CardTitle>Recent Sessions</CardTitle>
        <div className="flex flex-col gap-0">
          {[
            { date: 'May 10, 2026', duration: '22 mins', topic: 'Medication review', status: 'completed' },
            { date: 'Apr 2, 2026', duration: '35 mins', topic: 'Hypertension check-in', status: 'completed' },
            { date: 'Mar 15, 2026', duration: '18 mins', topic: 'General consultation', status: 'completed' },
          ].map((session, i) => (
            <div key={i} className="flex items-center gap-3 py-3 border-b last:border-b-0" style={{ borderColor: 'var(--color-border)' }}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--color-bg)' }}>
                <Clock size={14} style={{ color: 'var(--color-text-muted)' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{session.topic}</p>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{session.date} · {session.duration}</p>
              </div>
              <Pill variant="neutral">{session.status}</Pill>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
