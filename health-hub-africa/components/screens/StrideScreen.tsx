import { Card, CardTitle } from '@/components/ui/Card'
import { Pill } from '@/components/ui/Pill'
import { Brain, Network, Radio } from 'lucide-react'

const PHASES = [
  {
    icon: Brain,
    name: 'STRIDE™',
    subtitle: 'AI Triage Engine',
    description: 'Symptom scoring, priority classification, and intelligent care pathway routing powered by advanced ML models.',
    status: 'active' as const,
    version: 'v2.1',
  },
  {
    icon: Network,
    name: 'HPACS™',
    subtitle: 'Hospital Capacity Awareness',
    description: 'Real-time facility capacity monitoring, bed availability tracking, and optimal routing to the nearest suitable care unit.',
    status: 'active' as const,
    version: 'v1.4',
  },
  {
    icon: Radio,
    name: 'EFCE™',
    subtitle: 'Emergency Coordination',
    description: 'Multi-agency emergency command integration, responder dispatch coordination, and real-time status broadcasting.',
    status: 'beta' as const,
    version: 'v0.9',
  },
]

export function StrideScreen() {
  return (
    <div className="flex flex-col gap-5 pb-20 md:pb-5">
      <div>
        <h1 className="text-xl font-bold" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-display)' }}>
          STRIDE™ AI Intelligence
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
          Powering the next generation of African emergency healthcare
        </p>
      </div>

      {/* Phase cards */}
      {PHASES.map((phase, i) => {
        const Icon = phase.icon
        return (
          <Card key={i} className="relative overflow-hidden">
            {/* accent bar */}
            <div
              className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl"
              style={{ background: phase.status === 'active' ? '#6DC43F' : 'var(--color-gold)' }}
              aria-hidden="true"
            />
            <div className="pl-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: 'var(--color-success-bg)' }}
                  >
                    <Icon size={18} style={{ color: '#006022' }} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-bold" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-display)' }}>
                        {phase.name}
                      </h2>
                      <Pill variant={phase.status === 'active' ? 'success' : 'warning'}>{phase.status}</Pill>
                      <span className="text-[10px] font-mono" style={{ color: 'var(--color-text-faint)', fontFamily: 'var(--font-mono)' }}>
                        {phase.version}
                      </span>
                    </div>
                    <p className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>{phase.subtitle}</p>
                  </div>
                </div>
              </div>
              <p className="text-sm mt-3 leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                {phase.description}
              </p>
            </div>
          </Card>
        )
      })}

      {/* Architecture flow */}
      <Card>
        <CardTitle>System Architecture</CardTitle>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          {['Patient Input', 'STRIDE™ AI', 'HPACS™', 'EFCE™', 'Response Unit'].map((node, i, arr) => (
            <div key={i} className="flex items-center gap-2">
              <div
                className="px-3 py-1.5 rounded-xl text-[11px] font-semibold text-center"
                style={{
                  background: i === 0 || i === arr.length - 1 ? 'var(--color-bg)' : 'var(--color-success-bg)',
                  color: i === 0 || i === arr.length - 1 ? 'var(--color-text-muted)' : '#006022',
                  border: '1px solid var(--color-border)',
                }}
              >
                {node}
              </div>
              {i < arr.length - 1 && (
                <span style={{ color: 'var(--color-text-faint)', fontSize: 14 }}>→</span>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
