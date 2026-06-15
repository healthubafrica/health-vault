import { Pill } from '@/components/ui/Pill'

interface TimelineStep {
  title: string
  description: string
  status: 'done' | 'current' | 'pending'
}

// Static placeholder displayed before any real dispatch has been created
const PLACEHOLDER_STEPS: TimelineStep[] = [
  { title: 'STRIDE™ Triage',    description: 'AI symptom assessment & priority scoring',  status: 'done'    },
  { title: 'HPACS™ Routing',    description: 'Nearest available unit identified',         status: 'current' },
  { title: 'EFCE™ Command',     description: 'Emergency coordination centre notified',    status: 'pending' },
  { title: 'Unit Dispatched',   description: 'Responder en route to your location',       status: 'pending' },
]

// Maps backend DispatchStatus values to a friendly display label
const STATUS_LABEL: Record<string, string> = {
  requested:          'Requested',
  triaged:            'Triaged',
  unit_assigned:      'Unit Assigned',
  en_route:           'En Route',
  on_scene:           'On Scene',
  patient_stabilised: 'Stabilised',
  transported:        'Transported',
  closed:             'Closed',
}

interface LiveEvent {
  id: string
  status: string
  notes?: string
  createdAt: string
}

interface DispatchTimelineProps {
  /** Pass DispatchCase.events to show real-time status events. Omit to show placeholder. */
  events?: LiveEvent[]
}

export function DispatchTimeline({ events }: DispatchTimelineProps) {
  // If we have real events from the backend, render them
  if (events && events.length > 0) {
    return (
      <div className="flex flex-col gap-0">
        {events.map((event, i) => (
          <div key={event.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div
                className={[
                  'w-3 h-3 rounded-full shrink-0 mt-0.5 z-10',
                  i === 0 ? 'bg-[#6DC43F] dot-pulse ring-2 ring-[#6DC43F]/30' : 'bg-[#6DC43F]',
                ].join(' ')}
                aria-hidden="true"
              />
              {i < events.length - 1 && (
                <div
                  className="w-px flex-1 mt-1"
                  style={{ background: 'var(--color-border)', minHeight: 24 }}
                  aria-hidden="true"
                />
              )}
            </div>
            <div className="pb-4 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                  {STATUS_LABEL[event.status] ?? event.status}
                </span>
                {i === 0 && <Pill variant="warning">Latest</Pill>}
              </div>
              {event.notes && (
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                  {event.notes}
                </p>
              )}
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                {new Date(event.createdAt).toLocaleTimeString('en-NG', {
                  hour: '2-digit', minute: '2-digit',
                })}
              </p>
            </div>
          </div>
        ))}
      </div>
    )
  }

  // Fall back to static placeholder when no real events exist yet
  return (
    <div className="flex flex-col gap-0">
      {PLACEHOLDER_STEPS.map((step, i) => (
        <div key={i} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div
              className={[
                'w-3 h-3 rounded-full shrink-0 mt-0.5 z-10',
                step.status === 'done'    ? 'bg-[#6DC43F]' :
                step.status === 'current' ? 'bg-[#6DC43F] dot-pulse ring-2 ring-[#6DC43F]/30' :
                'bg-[var(--color-border)]',
              ].join(' ')}
              aria-hidden="true"
            />
            {i < PLACEHOLDER_STEPS.length - 1 && (
              <div
                className="w-px flex-1 mt-1"
                style={{ background: 'var(--color-border)', minHeight: 24 }}
                aria-hidden="true"
              />
            )}
          </div>
          <div className="pb-4 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="text-sm font-semibold"
                style={{ color: step.status === 'pending' ? 'var(--color-text-muted)' : 'var(--color-text)' }}
              >
                {step.title}
              </span>
              {step.status === 'done'    && <Pill variant="success">Done</Pill>}
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
