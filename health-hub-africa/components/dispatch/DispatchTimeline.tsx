import { Pill } from '@/components/ui/Pill'

interface TimelineStep {
  title: string
  description: string
  status: 'done' | 'current' | 'pending'
}

const STEPS: TimelineStep[] = [
  { title: 'STRIDE™ Triage', description: 'AI symptom assessment & priority scoring', status: 'done' },
  { title: 'HPACS™ Routing', description: 'Nearest available unit identified', status: 'current' },
  { title: 'EFCE™ Command', description: 'Emergency coordination centre notified', status: 'pending' },
  { title: 'Unit Dispatched', description: 'Responder en route to your location', status: 'pending' },
]

export function DispatchTimeline() {
  return (
    <div className="flex flex-col gap-0">
      {STEPS.map((step, i) => (
        <div key={i} className="flex gap-3">
          {/* Dot + line */}
          <div className="flex flex-col items-center">
            <div
              className={[
                'w-3 h-3 rounded-full shrink-0 mt-0.5 z-10',
                step.status === 'done' ? 'bg-[#6DC43F]' :
                step.status === 'current' ? 'bg-[#6DC43F] dot-pulse ring-2 ring-[#6DC43F]/30' :
                'bg-[var(--color-border)]',
              ].join(' ')}
              aria-hidden="true"
            />
            {i < STEPS.length - 1 && (
              <div
                className="w-px flex-1 mt-1"
                style={{ background: 'var(--color-border)', minHeight: 24 }}
                aria-hidden="true"
              />
            )}
          </div>
          {/* Content */}
          <div className="pb-4 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="text-sm font-semibold"
                style={{ color: step.status === 'pending' ? 'var(--color-text-muted)' : 'var(--color-text)' }}
              >
                {step.title}
              </span>
              {step.status === 'done' && <Pill variant="success">Done</Pill>}
              {step.status === 'current' && <Pill variant="warning">In Progress</Pill>}
            </div>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              {step.description}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
