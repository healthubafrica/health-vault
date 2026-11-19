'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { CheckCircle2, Circle, ChevronRight, Compass, X } from 'lucide-react'
import { patients, analytics, type GettingStartedKey } from '@/lib/api'
import { useApi } from '@/lib/hooks/useApi'
import { useFeatureFlags } from '@/lib/hooks/useFeatureFlags'
import { startPortalTour } from '@/lib/portalTour'

const ITEMS: Record<GettingStartedKey, { label: string; hint: string; href: string }> = {
  'health-profile': { label: 'Add your blood group and genotype', hint: 'Doctors need these in an emergency.', href: '/profile' },
  'emergency-contact': { label: 'Add an emergency contact', hint: 'Who we should call if something happens.', href: '/profile' },
  'upload-record': { label: 'Upload a health document', hint: 'A past result, scan or prescription, kept safe in My Vault.', href: '/vault' },
  'book-appointment': { label: 'Book your first appointment', hint: 'Choose a doctor and a time that suits you.', href: '/appointments' },
  'two-factor': { label: 'Turn on two-step sign-in', hint: 'Extra protection for your health records.', href: '/settings' },
}

// Waits for the dashboard and sidebar to finish rendering before spotlighting them.
const TOUR_START_DELAY_MS = 700

/**
 * Dashboard "Getting started" checklist. Also launches the welcome tour on a
 * patient's first visit, or whenever the page is opened with ?tour=1 (the
 * "Take the tour" links in Support and on this card).
 */
export function GettingStarted() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isEnabled, loaded: flagsLoaded } = useFeatureFlags()
  const { data, refetch } = useApi(() => patients.getGettingStarted(), [], { pollIntervalMs: 60_000 })
  const [hidden, setHidden] = useState(false)
  const tourRan = useRef(false)

  const state = data?.data
  const replayRequested = searchParams.get('tour') === '1'

  const runTour = () => {
    tourRan.current = true
    startPortalTour(isEnabled, () => {
      void patients.updateGettingStarted({ tourCompleted: true }).catch(() => undefined)
    })
  }

  useEffect(() => {
    if (tourRan.current || !state || !flagsLoaded) return
    if (state.tourCompleted && !replayRequested) return
    if (replayRequested) router.replace('/dashboard', { scroll: false })
    const t = setTimeout(runTour, TOUR_START_DELAY_MS)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, flagsLoaded, replayRequested])

  if (!state || hidden || state.dismissed) return null
  const doneCount = state.items.filter((i) => i.done).length
  if (doneCount === state.items.length) return null

  const hide = () => {
    setHidden(true)
    analytics.track('ui_click', { element_id: 'getting_started_hide', feature_area: 'onboarding' })
    void patients.updateGettingStarted({ dismissed: true }).catch(() => {
      setHidden(false)
      refetch()
    })
  }

  return (
    <section
      data-tour="getting-started"
      aria-labelledby="getting-started-heading"
      className="rounded-[24px] border shadow-sm p-5"
      style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
    >
      <div className="flex items-start justify-between gap-3 mb-1">
        <div>
          <h2 id="getting-started-heading" className="text-sm font-extrabold text-[var(--color-text)] uppercase tracking-wider">
            Getting started
          </h2>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            {doneCount} of {state.items.length} done · set up your account at your own pace
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={runTour}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-[#137333] bg-[#EBF5EC] hover:bg-[#dcefdf] transition-colors cursor-pointer"
          >
            <Compass size={13} strokeWidth={2.5} />
            Take the tour
          </button>
          <button
            onClick={hide}
            aria-label="Hide getting started"
            title="Hide"
            className="p-1.5 rounded-xl text-[var(--color-text-faint)] hover:bg-[var(--color-bg)] transition-colors cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      <div
        className="h-1.5 rounded-full overflow-hidden my-3"
        style={{ background: 'var(--color-bg)' }}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={state.items.length}
        aria-valuenow={doneCount}
        aria-label="Getting started progress"
      >
        <div className="h-full rounded-full bg-[#6DC43F] transition-all duration-500" style={{ width: `${(doneCount / state.items.length) * 100}%` }} />
      </div>

      <ul className="flex flex-col gap-1">
        {state.items.map(({ key, done }) => {
          const item = ITEMS[key]
          if (!item) return null
          return (
            <li key={key}>
              <Link
                href={item.href}
                onClick={() => analytics.track('ui_click', { element_id: `getting_started_${key}`, feature_area: 'onboarding', destination: item.href })}
                className="group flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-[var(--color-bg)] transition-colors"
              >
                {done ? (
                  <CheckCircle2 size={20} className="text-[#6DC43F] shrink-0" aria-label="Done" />
                ) : (
                  <Circle size={20} className="text-[var(--color-text-faint)] shrink-0" aria-label="Not done yet" />
                )}
                <span className="flex-1 min-w-0">
                  <span className={`block text-sm font-semibold ${done ? 'line-through text-[var(--color-text-muted)]' : 'text-[var(--color-text)]'}`}>
                    {item.label}
                  </span>
                  {!done && <span className="block text-xs text-[var(--color-text-muted)]">{item.hint}</span>}
                </span>
                {!done && <ChevronRight size={16} className="text-[var(--color-text-faint)] group-hover:translate-x-0.5 transition-transform shrink-0" />}
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
